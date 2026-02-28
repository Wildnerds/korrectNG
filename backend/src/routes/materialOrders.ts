import { Router } from 'express';
import { createMaterialOrderSchema, reportDefectSchema } from '@korrectng/shared';
import { MaterialOrder, Product, MerchantProfile } from '../models';
import Booking from '../models/Booking';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notifications';
import { createMaterialEscrow, fundMaterialEscrow, releaseMaterialEscrow, requestRelease } from '../services/materialEscrowStateMachine';
import { recordResponseTime, onOrderCompleted, onOrderCancelled, onDefectReported } from '../services/merchantTrustService';

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// POST /api/v1/material-orders - Create order
router.post(
  '/',
  protect,
  authorize('customer'),
  validate(createMaterialOrderSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { merchant: merchantProfileId, items, booking: bookingId, deliveryType, deliveryAddress, deliveryInstructions, scheduledDeliveryDate } = req.body;

      // Get merchant profile
      const merchantProfile = await MerchantProfile.findById(merchantProfileId);
      if (!merchantProfile) {
        throw new AppError('Merchant not found', 404);
      }

      if (merchantProfile.verificationStatus !== 'approved') {
        throw new AppError('Merchant is not verified', 400);
      }

      // Process items and calculate totals
      const processedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new AppError(`Product ${item.product} not found`, 404);
        }

        if (!product.isActive || !product.isApproved) {
          throw new AppError(`Product ${product.name} is not available`, 400);
        }

        if (product.merchant.toString() !== merchantProfileId) {
          throw new AppError(`Product ${product.name} does not belong to this merchant`, 400);
        }

        // Check stock
        if (product.trackInventory && product.stockQuantity < item.quantity) {
          throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`, 400);
        }

        // Check minimum order quantity
        if (item.quantity < product.minOrderQuantity) {
          throw new AppError(`Minimum order quantity for ${product.name} is ${product.minOrderQuantity}`, 400);
        }

        // Check maximum order quantity
        if (product.maxOrderQuantity && item.quantity > product.maxOrderQuantity) {
          throw new AppError(`Maximum order quantity for ${product.name} is ${product.maxOrderQuantity}`, 400);
        }

        // Calculate price (with bulk discounts)
        let unitPrice = product.price;
        if (product.bulkDiscounts && product.bulkDiscounts.length > 0) {
          const sortedDiscounts = [...product.bulkDiscounts].sort((a, b) => b.qty - a.qty);
          for (const discount of sortedDiscounts) {
            if (item.quantity >= discount.qty) {
              unitPrice = discount.price;
              break;
            }
          }
        }

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        processedItems.push({
          product: product._id,
          productSnapshot: {
            name: product.name,
            price: product.price,
            unit: product.unit,
            merchantId: merchantProfile._id,
            merchantName: merchantProfile.businessName,
            image: product.images[0]?.url,
          },
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      }

      // Calculate delivery fee
      let deliveryFee = deliveryType === 'pickup' ? 0 : merchantProfile.defaultDeliveryFee;
      if (merchantProfile.freeDeliveryThreshold && subtotal >= merchantProfile.freeDeliveryThreshold) {
        deliveryFee = 0;
      }

      const totalAmount = subtotal + deliveryFee;

      // Get booking and artisan info
      const booking = bookingId ? await Booking.findById(bookingId) : null;
      const artisanId = booking?.artisan;

      if (!artisanId) {
        throw new AppError('This order must be linked to a booking with an artisan', 400);
      }

      // Get artisan's address for delivery
      const { ArtisanProfile } = await import('../models/ArtisanProfile');
      const artisanProfile = await ArtisanProfile.findOne({ user: artisanId });
      const artisanDeliveryAddress = artisanProfile?.address || deliveryAddress;

      // Create order - starts with pending_artisan_approval
      const order = await MaterialOrder.create({
        customer: req.user!._id,
        merchant: merchantProfile.user,
        merchantProfile: merchantProfile._id,
        booking: bookingId,
        artisan: artisanId,
        items: processedItems,
        subtotal,
        deliveryFee,
        totalAmount,
        deliveryType: 'artisan_location', // Always deliver to artisan
        deliveryAddress: artisanDeliveryAddress,
        deliveryInstructions,
        scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : undefined,
        status: 'pending_artisan_approval',
        artisanApprovalStatus: 'pending',
        statusHistory: [{
          status: 'pending_artisan_approval',
          timestamp: new Date(),
          by: req.user!._id,
        }],
      });

      // Link order to booking
      await Booking.findByIdAndUpdate(bookingId, {
        $push: { linkedMaterialOrders: order._id },
      });

      // Notify artisan to verify item selection
      await createNotification(artisanId.toString(), {
        type: 'material_order_verification' as any,
        title: 'Verify Material Selection',
        message: `Customer selected materials for your job. Please verify the items are correct.`,
        link: `/dashboard/artisan/material-orders/${order._id}`,
        data: { orderId: order._id, totalAmount },
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/material-orders - List orders
router.get('/', protect, async (req: AuthRequest, res, next) => {
  try {
    const { status, page, limit } = req.query as any;

    const filter: any = {};

    // Filter based on user role
    if (req.user!.role === 'customer') {
      filter.customer = req.user!._id;
    } else if (req.user!.role === 'merchant') {
      filter.merchant = req.user!._id;
    } else if (req.user!.role === 'artisan') {
      filter.artisan = req.user!._id;
    }

    if (status) filter.status = status;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      MaterialOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customer', 'firstName lastName')
        .populate('merchantProfile', 'businessName slug')
        .populate('booking', 'jobType'),
      MaterialOrder.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/material-orders/:id - Order details
router.get('/:id', protect, async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('merchant', 'firstName lastName')
      .populate('merchantProfile', 'businessName slug location phoneNumber whatsappNumber')
      .populate('artisan', 'firstName lastName')
      .populate('booking', 'jobType description')
      .populate('escrow');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Authorization check
    const isCustomer = order.customer._id.toString() === req.user!._id.toString();
    const isMerchant = order.merchant.toString() === req.user!._id.toString();
    const isArtisan = order.artisan?.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomer && !isMerchant && !isArtisan && !isAdmin) {
      throw new AppError('Not authorized to view this order', 403);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/artisan-approve - Artisan approves item selection
router.post('/:id/artisan-approve', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { note } = req.body;
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.artisan?.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized - only the assigned artisan can approve', 403);
    }

    if (order.status !== 'pending_artisan_approval') {
      throw new AppError('Order is not awaiting artisan approval', 400);
    }

    // Approve and move to pending (merchant confirmation)
    order.status = 'pending';
    order.artisanApprovalStatus = 'approved';
    order.artisanApprovalNote = note;
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Get merchant profile for notification
    const merchantProfile = await MerchantProfile.findById(order.merchantProfile);
    merchantProfile!.totalOrdersReceived += 1;
    await merchantProfile!.save();

    // Notify merchant about new order
    await createNotification(order.merchant.toString(), {
      type: 'new_material_order' as any,
      title: 'New Order Received!',
      message: `You have a new order for NGN${order.totalAmount.toLocaleString()}. Please confirm availability.`,
      link: `/dashboard/merchant/orders/${order._id}`,
      data: { orderId: order._id, totalAmount: order.totalAmount },
    });

    // Notify customer that artisan approved
    await createNotification(order.customer.toString(), {
      type: 'material_order_artisan_approved' as any,
      title: 'Item Selection Verified!',
      message: `The artisan confirmed your material selection is correct. Waiting for merchant to confirm availability.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/artisan-reject - Artisan rejects item selection
router.post('/:id/artisan-reject', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { note } = req.body;
    if (!note) {
      throw new AppError('Please provide a reason for rejection', 400);
    }

    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.artisan?.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized - only the assigned artisan can reject', 403);
    }

    if (order.status !== 'pending_artisan_approval') {
      throw new AppError('Order is not awaiting artisan approval', 400);
    }

    // Reject - customer needs to select different items
    order.status = 'cancelled';
    order.artisanApprovalStatus = 'rejected';
    order.artisanApprovalNote = note;
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Notify customer that artisan rejected the selection
    await createNotification(order.customer.toString(), {
      type: 'material_order_artisan_rejected' as any,
      title: 'Item Selection Not Correct',
      message: `The artisan says the selected items are not correct: "${note}". Please select different items.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id, reason: note },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/confirm - Merchant confirms availability
router.post('/:id/confirm', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.merchant.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'pending') {
      throw new AppError('Order cannot be confirmed in current state. Artisan must approve first.', 400);
    }

    // Calculate response time
    const responseTimeMinutes = Math.round((Date.now() - (order.artisanApprovedAt || order.createdAt).getTime()) / 60000);
    await recordResponseTime(order.merchantProfile.toString(), responseTimeMinutes);

    order.status = 'confirmed';
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Create escrow
    await createMaterialEscrow(order._id.toString(), req.user!._id);

    // Notify customer
    await createNotification(order.customer.toString(), {
      type: 'material_order_confirmed' as any,
      title: 'Order Confirmed!',
      message: `Your order ${order.orderNumber} has been confirmed. Please proceed with payment.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/pay - Initialize payment
router.post('/:id/pay', protect, authorize('customer'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id).populate('escrow');
    if (!order) throw new AppError('Order not found', 404);

    if (order.customer.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'payment_pending' && order.status !== 'confirmed') {
      throw new AppError('Order is not awaiting payment', 400);
    }

    // Initialize Paystack payment
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user!.email,
        amount: order.totalAmount * 100, // Kobo
        currency: 'NGN',
        reference: order.paymentReference,
        callback_url: `${process.env.CLIENT_URL}/dashboard/customer/material-orders/${order._id}?payment=success`,
        metadata: {
          type: 'material_escrow',
          orderId: order._id.toString(),
          escrowId: order.escrow?.toString(),
          customerId: req.user!._id.toString(),
          merchantId: order.merchant.toString(),
        },
      }),
    });

    const data = await response.json() as { status: boolean; data: any; message?: string };
    if (!data.status) {
      throw new AppError(data.message || 'Failed to initialize payment', 500);
    }

    res.status(200).json({ success: true, data: data.data });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/ship - Mark shipped (delivering to artisan)
router.post('/:id/ship', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.merchant.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'paid' && order.status !== 'preparing') {
      throw new AppError('Order cannot be shipped in current state', 400);
    }

    order.status = 'shipped';
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Notify artisan (materials are being delivered to them)
    if (order.artisan) {
      await createNotification(order.artisan.toString(), {
        type: 'material_order_shipped' as any,
        title: 'Materials On The Way!',
        message: `Materials for your job are being delivered to you. Order: ${order.orderNumber}`,
        link: `/dashboard/artisan/material-orders/${order._id}`,
        data: { orderId: order._id },
      });
    }

    // Notify customer
    await createNotification(order.customer.toString(), {
      type: 'material_order_shipped' as any,
      title: 'Order Shipped!',
      message: `Your order ${order.orderNumber} is on the way to the artisan!`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/deliver - Mark delivered (to artisan)
router.post('/:id/deliver', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.merchant.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'shipped') {
      throw new AppError('Order cannot be marked delivered in current state', 400);
    }

    order.status = 'delivered';
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Notify artisan to confirm receipt
    if (order.artisan) {
      await createNotification(order.artisan.toString(), {
        type: 'material_order_delivered' as any,
        title: 'Materials Delivered!',
        message: `Materials for order ${order.orderNumber} have been delivered. Please confirm receipt and condition.`,
        link: `/dashboard/artisan/material-orders/${order._id}`,
        data: { orderId: order._id },
      });
    }

    // Notify customer
    await createNotification(order.customer.toString(), {
      type: 'material_order_delivered' as any,
      title: 'Order Delivered to Artisan!',
      message: `Your order ${order.orderNumber} has been delivered to the artisan. Waiting for receipt confirmation.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/receive - Artisan confirms receipt and item condition
router.post('/:id/receive', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { note } = req.body;
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    // Only the assigned artisan can confirm receipt
    if (order.artisan?.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized - only the assigned artisan can confirm receipt', 403);
    }

    if (order.status !== 'delivered') {
      throw new AppError('Order is not in delivered state', 400);
    }

    order.status = 'received';
    order.receivedBy = req.user!._id;
    order.receivedByType = 'artisan';
    order.receiptNote = note;
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Request escrow release and auto-release
    if (order.escrow) {
      await requestRelease(order.escrow.toString(), req.user!._id, 'Order received and confirmed by artisan');
      await releaseMaterialEscrow(order.escrow.toString(), req.user!._id, 'Receipt confirmed by artisan - item intact');
    }

    // Check if delivery was on time
    let wasOnTime = true;
    if (order.scheduledDeliveryDate && order.deliveredAt) {
      wasOnTime = order.deliveredAt <= order.scheduledDeliveryDate;
    }
    await onOrderCompleted(order.merchantProfile.toString(), wasOnTime);

    // Notify merchant - payment released
    await createNotification(order.merchant.toString(), {
      type: 'material_order_received' as any,
      title: 'Delivery Confirmed - Payment Released!',
      message: `Artisan confirmed receipt for order ${order.orderNumber}. Payment has been released to your account.`,
      link: `/dashboard/merchant/orders/${order._id}`,
      data: { orderId: order._id },
    });

    // Notify customer - materials received by artisan
    await createNotification(order.customer.toString(), {
      type: 'material_order_received' as any,
      title: 'Materials Received by Artisan!',
      message: `The artisan has received and verified the materials for order ${order.orderNumber}. Job can now proceed.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/report-defect - Report defect
router.post(
  '/:id/report-defect',
  protect,
  validate(reportDefectSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { description, images } = req.body;

      const order = await MaterialOrder.findById(req.params.id);
      if (!order) throw new AppError('Order not found', 404);

      // Customer or artisan can report defect
      const isCustomer = order.customer.toString() === req.user!._id.toString();
      const isArtisan = order.artisan?.toString() === req.user!._id.toString();

      if (!isCustomer && !isArtisan) {
        throw new AppError('Not authorized', 403);
      }

      if (!['delivered', 'received'].includes(order.status)) {
        throw new AppError('Can only report defect for delivered/received orders', 400);
      }

      order.hasDefect = true;
      order.defectReportedAt = new Date();
      order.defectDescription = description;
      order.defectImages = images || [];
      order.status = 'disputed';
      (order as any)._statusChangedBy = req.user!._id;
      await order.save();

      // Update merchant stats
      await onDefectReported(order.merchantProfile.toString());

      // Notify merchant
      await createNotification(order.merchant.toString(), {
        type: 'defect_reported' as any,
        title: 'Defect Reported',
        message: `A defect has been reported for order ${order.orderNumber}.`,
        link: `/dashboard/merchant/orders/${order._id}`,
        data: { orderId: order._id, description },
      });

      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/material-orders/:id/cancel - Cancel order
router.post('/:id/cancel', protect, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    const isCustomer = order.customer.toString() === req.user!._id.toString();
    const isMerchant = order.merchant.toString() === req.user!._id.toString();

    if (!isCustomer && !isMerchant) {
      throw new AppError('Not authorized', 403);
    }

    // Only cancellable in certain states
    if (!['pending_artisan_approval', 'pending', 'confirmed', 'payment_pending'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled in current state', 400);
    }

    order.status = 'cancelled';
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Update merchant stats if cancelled by merchant
    if (isMerchant) {
      await onOrderCancelled(order.merchantProfile.toString());
    }

    // Notify the other party
    const notifyUserId = isCustomer ? order.merchant.toString() : order.customer.toString();
    await createNotification(notifyUserId, {
      type: 'material_order_cancelled' as any,
      title: 'Order Cancelled',
      message: `Order ${order.orderNumber} has been cancelled. ${reason || ''}`,
      link: isCustomer ? `/dashboard/merchant/orders/${order._id}` : `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id, reason },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-orders/:id/preparing - Mark as preparing
router.post('/:id/preparing', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.merchant.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'paid') {
      throw new AppError('Order must be paid before preparing', 400);
    }

    order.status = 'preparing';
    (order as any)._statusChangedBy = req.user!._id;
    await order.save();

    // Reduce stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: -item.quantity },
      });
    }

    // Notify customer
    await createNotification(order.customer.toString(), {
      type: 'material_order_preparing' as any,
      title: 'Order Being Prepared',
      message: `Your order ${order.orderNumber} is being prepared for delivery.`,
      link: `/dashboard/customer/material-orders/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;

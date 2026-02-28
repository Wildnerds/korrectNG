import { MaterialOrder, MaterialEscrow, MerchantProfile, User } from '../models';
import { createNotificationWithPush } from '../services/notifications';
import { releaseMaterialEscrow } from '../services/materialEscrowStateMachine';
import { onOrderCompleted } from '../services/merchantTrustService';
import { log } from '../utils/logger';
import { sendEmail } from '../utils/email';

const AUTO_CONFIRM_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes

let autoConfirmInterval: NodeJS.Timeout | null = null;

/**
 * Auto-confirm material orders that have been delivered but not confirmed:
 * - delivered: Auto-confirm receipt after 72 hours if customer/artisan doesn't respond
 */
export async function runMaterialAutoConfirmCheck(): Promise<void> {
  try {
    const now = new Date();
    const autoConfirmThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

    // Find all orders delivered more than 72 hours ago without confirmation
    const deliveredOrders = await MaterialOrder.find({
      status: 'delivered',
      deliveredAt: { $lt: autoConfirmThreshold },
    });

    if (deliveredOrders.length === 0) {
      return;
    }

    log.info('Material auto-confirm job found orders to confirm', { count: deliveredOrders.length });

    let confirmedCount = 0;

    for (const order of deliveredOrders) {
      try {
        // Update order status to received
        order.status = 'received';
        order.receivedAt = now;
        order.receivedBy = order.customer; // Auto-confirm as customer
        order.receivedByType = 'customer';
        order.statusHistory.push({
          status: 'received',
          timestamp: now,
          note: 'Auto-confirmed: No response within 72 hours after delivery',
          by: order.customer,
        });

        await order.save();

        // Get escrow and release payment
        const escrow = await MaterialEscrow.findOne({ order: order._id });
        if (escrow && escrow.status === 'funded') {
          try {
            // Request release (auto-triggered)
            escrow.status = 'release_requested';
            escrow.releaseRequestedAt = now;
            escrow.statusHistory.push({
              status: 'release_requested',
              timestamp: now,
              note: 'Auto-requested release after 72h auto-confirm',
              by: order.customer,
            });
            await escrow.save();

            // Release the escrow
            await releaseMaterialEscrow(escrow._id.toString(), order.customer, 'Auto-released after 72h auto-confirm');

            log.info('Auto-released escrow for material order', {
              orderId: order._id,
              escrowId: escrow._id,
            });
          } catch (escrowError) {
            log.error('Failed to auto-release escrow', {
              orderId: order._id,
              escrowId: escrow._id,
              error: escrowError,
            });
          }
        }

        // Update merchant trust metrics
        const merchantProfile = await MerchantProfile.findById(order.merchantProfile);
        if (merchantProfile) {
          // Check if delivery was on time
          const wasOnTime = order.scheduledDeliveryDate
            ? order.deliveredAt! <= order.scheduledDeliveryDate
            : true; // If no scheduled date, consider on time

          await onOrderCompleted(merchantProfile._id.toString(), wasOnTime);
        }

        // Mark order as completed
        order.status = 'completed';
        order.completedAt = now;
        order.statusHistory.push({
          status: 'completed',
          timestamp: now,
          note: 'Order completed after auto-confirm',
          by: order.customer,
        });
        await order.save();

        // Send notifications
        const customer = await User.findById(order.customer);
        const merchant = await User.findById(order.merchant);

        await createNotificationWithPush(
          order.customer.toString(),
          {
            type: 'material_order_completed' as any,
            title: 'Order Auto-Confirmed',
            message: `Your order ${order.orderNumber} has been auto-confirmed as received. Payment has been released to the merchant.`,
            link: `/dashboard/customer/orders/${order._id}`,
          }
        );

        await createNotificationWithPush(
          order.merchant.toString(),
          {
            type: 'material_order_completed' as any,
            title: 'Order Completed!',
            message: `Order ${order.orderNumber} has been auto-confirmed. Payment will be transferred to your account.`,
            link: `/dashboard/merchant/orders/${order._id}`,
          }
        );

        // Send emails
        if (customer) {
          await sendEmail({
            to: customer.email,
            subject: `Order ${order.orderNumber} Auto-Confirmed`,
            html: `
              <h2>Order Auto-Confirmed</h2>
              <p>Hi ${customer.firstName || 'Customer'},</p>
              <p>Your material order <strong>${order.orderNumber}</strong> has been automatically confirmed as received since no issues were reported within 72 hours of delivery.</p>
              <p>Payment of <strong>NGN${order.totalAmount.toLocaleString()}</strong> has been released to the merchant.</p>
              <p>If you have any issues with the products, please contact support.</p>
              <p>Best regards,<br>KorrectNG Team</p>
            `,
          }).catch(() => {});
        }

        if (merchant) {
          await sendEmail({
            to: merchant.email,
            subject: `Order ${order.orderNumber} Completed - Payment Released`,
            html: `
              <h2>Order Completed!</h2>
              <p>Hi ${merchant.firstName || 'Merchant'},</p>
              <p>Order <strong>${order.orderNumber}</strong> has been auto-confirmed by the system.</p>
              <p>Your earnings of <strong>NGN${order.merchantEarnings.toLocaleString()}</strong> will be transferred to your bank account.</p>
              <p>Thank you for your service!</p>
              <p>Best regards,<br>KorrectNG Team</p>
            `,
          }).catch(() => {});
        }

        confirmedCount++;
        log.info('Auto-confirmed material order', {
          orderId: order._id,
          orderNumber: order.orderNumber,
        });
      } catch (orderError) {
        log.error('Failed to auto-confirm material order', {
          orderId: order._id,
          error: orderError,
        });
      }
    }

    if (confirmedCount > 0) {
      log.info('Material auto-confirm job completed', { confirmedCount });
    }
  } catch (error) {
    log.error('Material auto-confirm job failed', { error });
  }
}

/**
 * Start the auto-confirm job (runs every 30 minutes)
 */
export function startMaterialAutoConfirmJob(): void {
  if (autoConfirmInterval) {
    log.warn('Material auto-confirm job already running');
    return;
  }

  log.info('Starting material auto-confirm job', { intervalMs: AUTO_CONFIRM_INTERVAL_MS });

  // Run immediately on start
  runMaterialAutoConfirmCheck();

  // Then run periodically
  autoConfirmInterval = setInterval(runMaterialAutoConfirmCheck, AUTO_CONFIRM_INTERVAL_MS);
}

/**
 * Stop the auto-confirm job
 */
export function stopMaterialAutoConfirmJob(): void {
  if (autoConfirmInterval) {
    clearInterval(autoConfirmInterval);
    autoConfirmInterval = null;
    log.info('Material auto-confirm job stopped');
  }
}

export default {
  runMaterialAutoConfirmCheck,
  startMaterialAutoConfirmJob,
  stopMaterialAutoConfirmJob,
};

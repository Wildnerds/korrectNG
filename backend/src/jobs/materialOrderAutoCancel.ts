import { MaterialOrder, MaterialEscrow, User } from '../models';
import { createNotificationWithPush } from '../services/notifications';
import { log } from '../utils/logger';
import { sendEmail } from '../utils/email';

const AUTO_CANCEL_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

let autoCancelInterval: NodeJS.Timeout | null = null;

/**
 * Auto-cancel material orders that have expired without action:
 * - pending: Merchant didn't confirm within 24 hours
 * - confirmed: Customer didn't pay within 24 hours
 */
export async function runMaterialOrderAutoCancelCheck(): Promise<void> {
  try {
    const now = new Date();

    // Find all orders that have passed their expiry time
    const expiredOrders = await MaterialOrder.find({
      status: { $in: ['pending', 'confirmed'] },
      expiresAt: { $lt: now },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    log.info('Material order auto-cancel job found expired orders', { count: expiredOrders.length });

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      try {
        const previousStatus = order.status;

        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: now,
          note: `Auto-cancelled: No action taken within the required timeframe`,
          by: order.customer,
        });
        order.expiresAt = undefined;

        await order.save();

        // Cancel any associated escrow
        if (order.escrow) {
          await MaterialEscrow.findByIdAndUpdate(order.escrow, {
            status: 'refunded',
            $push: {
              statusHistory: {
                status: 'refunded',
                timestamp: now,
                note: 'Order auto-cancelled',
              },
            },
          });
        }

        const customer = await User.findById(order.customer);
        const merchant = await User.findById(order.merchant);

        // Send notifications based on why it was cancelled
        if (previousStatus === 'pending') {
          // Merchant didn't confirm - notify both
          await createNotificationWithPush(
            order.customer.toString(),
            {
              type: 'material_order_cancelled' as any,
              title: 'Order Expired',
              message: `Your material order ${order.orderNumber} was cancelled because the merchant didn't confirm in time.`,
              link: '/dashboard/customer/orders',
            }
          );
          await createNotificationWithPush(
            order.merchant.toString(),
            {
              type: 'material_order_cancelled' as any,
              title: 'Order Expired',
              message: `Order ${order.orderNumber} expired because you didn't confirm within 24 hours.`,
              link: '/dashboard/merchant/orders',
            }
          );

          // Send emails
          if (customer) {
            await sendEmail({
              to: customer.email,
              subject: `Order ${order.orderNumber} Cancelled - Merchant Did Not Respond`,
              html: `
                <h2>Order Cancelled</h2>
                <p>Hi ${customer.firstName || 'Customer'},</p>
                <p>Your material order <strong>${order.orderNumber}</strong> has been automatically cancelled because the merchant did not confirm availability within 24 hours.</p>
                <p>You can try ordering from a different merchant.</p>
                <p>Best regards,<br>KorrectNG Team</p>
              `,
            }).catch(() => {});
          }
          if (merchant) {
            await sendEmail({
              to: merchant.email,
              subject: `Order ${order.orderNumber} Expired - No Response`,
              html: `
                <h2>Order Expired</h2>
                <p>Hi ${merchant.firstName || 'Merchant'},</p>
                <p>Order <strong>${order.orderNumber}</strong> has been automatically cancelled because you did not confirm availability within 24 hours.</p>
                <p>Please respond to orders promptly to avoid losing sales.</p>
                <p>Best regards,<br>KorrectNG Team</p>
              `,
            }).catch(() => {});
          }
        } else if (previousStatus === 'confirmed') {
          // Customer didn't pay - notify both
          await createNotificationWithPush(
            order.customer.toString(),
            {
              type: 'material_order_cancelled' as any,
              title: 'Order Cancelled',
              message: `Your material order ${order.orderNumber} was cancelled because payment wasn't completed in time.`,
              link: '/dashboard/customer/orders',
            }
          );
          await createNotificationWithPush(
            order.merchant.toString(),
            {
              type: 'material_order_cancelled' as any,
              title: 'Order Cancelled',
              message: `Order ${order.orderNumber} was cancelled because the customer didn't complete payment in time.`,
              link: '/dashboard/merchant/orders',
            }
          );

          // Send emails
          if (customer) {
            await sendEmail({
              to: customer.email,
              subject: `Order ${order.orderNumber} Cancelled - Payment Not Completed`,
              html: `
                <h2>Order Cancelled</h2>
                <p>Hi ${customer.firstName || 'Customer'},</p>
                <p>Your material order <strong>${order.orderNumber}</strong> has been automatically cancelled because payment was not completed within 24 hours.</p>
                <p>You can create a new order if you still need the materials.</p>
                <p>Best regards,<br>KorrectNG Team</p>
              `,
            }).catch(() => {});
          }
          if (merchant) {
            await sendEmail({
              to: merchant.email,
              subject: `Order ${order.orderNumber} Cancelled - Customer Did Not Pay`,
              html: `
                <h2>Order Cancelled</h2>
                <p>Hi ${merchant.firstName || 'Merchant'},</p>
                <p>Order <strong>${order.orderNumber}</strong> has been automatically cancelled because the customer did not complete payment within 24 hours.</p>
                <p>Best regards,<br>KorrectNG Team</p>
              `,
            }).catch(() => {});
          }
        }

        cancelledCount++;
        log.info('Auto-cancelled material order', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          previousStatus,
        });
      } catch (orderError) {
        log.error('Failed to auto-cancel material order', {
          orderId: order._id,
          error: orderError,
        });
      }
    }

    if (cancelledCount > 0) {
      log.info('Material order auto-cancel job completed', { cancelledCount });
    }
  } catch (error) {
    log.error('Material order auto-cancel job failed', { error });
  }
}

/**
 * Start the auto-cancel job (runs every 15 minutes)
 */
export function startMaterialOrderAutoCancelJob(): void {
  if (autoCancelInterval) {
    log.warn('Material order auto-cancel job already running');
    return;
  }

  log.info('Starting material order auto-cancel job', { intervalMs: AUTO_CANCEL_INTERVAL_MS });

  // Run immediately on start
  runMaterialOrderAutoCancelCheck();

  // Then run periodically
  autoCancelInterval = setInterval(runMaterialOrderAutoCancelCheck, AUTO_CANCEL_INTERVAL_MS);
}

/**
 * Stop the auto-cancel job
 */
export function stopMaterialOrderAutoCancelJob(): void {
  if (autoCancelInterval) {
    clearInterval(autoCancelInterval);
    autoCancelInterval = null;
    log.info('Material order auto-cancel job stopped');
  }
}

export default {
  runMaterialOrderAutoCancelCheck,
  startMaterialOrderAutoCancelJob,
  stopMaterialOrderAutoCancelJob,
};

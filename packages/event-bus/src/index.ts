import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventPayload {
  [key: string]: unknown;
}

export interface Event<T extends EventPayload = EventPayload> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  source: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface EventBusConfig {
  redisUrl: string;
  serviceName: string;
  consumerGroup?: string;
  maxRetries?: number;
  retryDelay?: number;
  blockTimeout?: number;
}

export type EventHandler<T extends EventPayload = EventPayload> = (
  event: Event<T>
) => Promise<void>;

export interface Subscription {
  eventType: string;
  handler: EventHandler;
  unsubscribe: () => void;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

// Define all known event types for type safety
export const EVENT_TYPES = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_EMAIL_VERIFIED: 'user.email_verified',

  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',

  // Review events
  REVIEW_CREATED: 'review.created',
  REVIEW_UPDATED: 'review.updated',

  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',

  // Escrow events
  ESCROW_FUNDED: 'escrow.funded',
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_REFUNDED: 'escrow.refunded',

  // Dispute events
  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_RESOLVED: 'dispute.resolved',
  DISPUTE_ESCALATED: 'dispute.escalated',

  // Verification events
  VERIFICATION_SUBMITTED: 'verification.submitted',
  VERIFICATION_APPROVED: 'verification.approved',
  VERIFICATION_REJECTED: 'verification.rejected',

  // Message events
  MESSAGE_SENT: 'message.sent',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// ─── Event Bus Class ─────────────────────────────────────────────────────────

export class EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private config: Required<EventBusConfig>;
  private subscriptions: Map<string, EventHandler[]> = new Map();
  private isConsuming = false;
  private consumePromise: Promise<void> | null = null;

  constructor(config: EventBusConfig) {
    this.config = {
      consumerGroup: config.serviceName,
      maxRetries: 3,
      retryDelay: 1000,
      blockTimeout: 5000,
      ...config,
    };

    this.publisher = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.subscriber = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  }

  // ─── Publishing ──────────────────────────────────────────────────────────────

  /**
   * Publish an event to a Redis Stream
   */
  async publish<T extends EventPayload>(
    eventType: string,
    payload: T,
    options?: {
      correlationId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    const event: Event<T> = {
      id: uuidv4(),
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      source: this.config.serviceName,
      correlationId: options?.correlationId,
      metadata: options?.metadata,
    };

    const streamKey = this.getStreamKey(eventType);
    const eventData = JSON.stringify(event);

    await this.publisher.xadd(
      streamKey,
      'MAXLEN',
      '~',
      '10000', // Keep max 10000 events per stream
      '*',
      'data',
      eventData
    );

    return event.id;
  }

  /**
   * Publish multiple events atomically
   */
  async publishBatch<T extends EventPayload>(
    events: Array<{
      eventType: string;
      payload: T;
      correlationId?: string;
    }>
  ): Promise<string[]> {
    const pipeline = this.publisher.pipeline();
    const eventIds: string[] = [];

    for (const { eventType, payload, correlationId } of events) {
      const event: Event<T> = {
        id: uuidv4(),
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
        source: this.config.serviceName,
        correlationId,
      };

      eventIds.push(event.id);
      const streamKey = this.getStreamKey(eventType);
      const eventData = JSON.stringify(event);

      pipeline.xadd(streamKey, 'MAXLEN', '~', '10000', '*', 'data', eventData);
    }

    await pipeline.exec();
    return eventIds;
  }

  // ─── Subscribing ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to an event type
   */
  async subscribe<T extends EventPayload>(
    eventType: string,
    handler: EventHandler<T>
  ): Promise<Subscription> {
    const streamKey = this.getStreamKey(eventType);

    // Create consumer group if it doesn't exist
    try {
      await this.subscriber.xgroup(
        'CREATE',
        streamKey,
        this.config.consumerGroup,
        '0',
        'MKSTREAM'
      );
    } catch (err: unknown) {
      // Ignore error if group already exists
      if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) {
        throw err;
      }
    }

    // Store handler
    const handlers = this.subscriptions.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.subscriptions.set(eventType, handlers);

    // Start consuming if not already
    if (!this.isConsuming) {
      this.startConsuming();
    }

    return {
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => {
        const handlers = this.subscriptions.get(eventType) || [];
        const index = handlers.indexOf(handler as EventHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      },
    };
  }

  /**
   * Subscribe to multiple event types
   */
  async subscribeMany(
    subscriptions: Array<{ eventType: string; handler: EventHandler }>
  ): Promise<Subscription[]> {
    return Promise.all(
      subscriptions.map(({ eventType, handler }) => this.subscribe(eventType, handler))
    );
  }

  // ─── Consuming ───────────────────────────────────────────────────────────────

  private startConsuming(): void {
    if (this.isConsuming) return;
    this.isConsuming = true;
    this.consumePromise = this.consumeLoop();
  }

  private async consumeLoop(): Promise<void> {
    const consumerId = `${this.config.serviceName}-${uuidv4().slice(0, 8)}`;

    while (this.isConsuming) {
      const streams = Array.from(this.subscriptions.keys()).map((eventType) =>
        this.getStreamKey(eventType)
      );

      if (streams.length === 0) {
        await this.sleep(1000);
        continue;
      }

      try {
        // Read from multiple streams
        const results = await this.subscriber.xreadgroup(
          'GROUP',
          this.config.consumerGroup,
          consumerId,
          'COUNT',
          '10',
          'BLOCK',
          this.config.blockTimeout,
          'STREAMS',
          ...streams,
          ...streams.map(() => '>')
        );

        if (!results) continue;

        for (const [streamKey, messages] of results) {
          for (const [messageId, fields] of messages) {
            await this.processMessage(streamKey, messageId, fields);
          }
        }
      } catch (err) {
        console.error('[EventBus] Consume error:', err);
        await this.sleep(1000);
      }
    }
  }

  private async processMessage(
    streamKey: string,
    messageId: string,
    fields: string[]
  ): Promise<void> {
    const dataIndex = fields.indexOf('data');
    if (dataIndex === -1) return;

    const eventData = fields[dataIndex + 1];
    const event: Event = JSON.parse(eventData);

    const handlers = this.subscriptions.get(event.type) || [];

    for (const handler of handlers) {
      let retries = 0;

      while (retries < this.config.maxRetries) {
        try {
          await handler(event);
          break;
        } catch (err) {
          retries++;
          console.error(
            `[EventBus] Handler error (attempt ${retries}/${this.config.maxRetries}):`,
            err
          );

          if (retries < this.config.maxRetries) {
            await this.sleep(this.config.retryDelay * retries);
          }
        }
      }
    }

    // Acknowledge the message
    await this.subscriber.xack(streamKey, this.config.consumerGroup, messageId);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  private getStreamKey(eventType: string): string {
    return `korrect:events:${eventType}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get pending messages count for a stream
   */
  async getPendingCount(eventType: string): Promise<number> {
    const streamKey = this.getStreamKey(eventType);
    try {
      const info = await this.subscriber.xpending(streamKey, this.config.consumerGroup);
      return (info as unknown[])[0] as number;
    } catch {
      return 0;
    }
  }

  /**
   * Get stream info
   */
  async getStreamInfo(eventType: string): Promise<Record<string, unknown> | null> {
    const streamKey = this.getStreamKey(eventType);
    try {
      const info = await this.subscriber.xinfo('STREAM', streamKey);
      const result: Record<string, unknown> = {};
      for (let i = 0; i < info.length; i += 2) {
        result[info[i] as string] = info[i + 1];
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    this.isConsuming = false;

    if (this.consumePromise) {
      await this.consumePromise;
    }

    await this.publisher.quit();
    await this.subscriber.quit();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.publisher.status === 'ready' && this.subscriber.status === 'ready';
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

export function createEventBus(config: EventBusConfig): EventBus {
  eventBusInstance = new EventBus(config);
  return eventBusInstance;
}

export function getEventBus(): EventBus | null {
  return eventBusInstance;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export default EventBus;

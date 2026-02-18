import { Logger } from '@korrect/logger';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  channelId?: string;
}

export interface PushResult {
  success: boolean;
  ticketIds?: string[];
  errors?: { token: string; error: string }[];
}

export class PushService {
  private logger: Logger;
  private expoBaseUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async send(tokens: string[], notification: PushNotification): Promise<PushResult> {
    try {
      if (tokens.length === 0) {
        return { success: true, ticketIds: [] };
      }

      // Filter valid Expo push tokens
      const validTokens = tokens.filter((token) => this.isValidExpoToken(token));

      if (validTokens.length === 0) {
        this.logger.warn('No valid Expo push tokens provided');
        return { success: true, ticketIds: [] };
      }

      // Prepare messages for Expo
      const messages = validTokens.map((token) => ({
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || 'default',
        badge: notification.badge,
        channelId: notification.channelId || 'default',
      }));

      // Send in chunks of 100 (Expo limit)
      const chunks = this.chunkArray(messages, 100);
      const ticketIds: string[] = [];
      const errors: { token: string; error: string }[] = [];

      for (const chunk of chunks) {
        try {
          const response = await fetch(this.expoBaseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(chunk),
          });

          const data = await response.json();

          if (data.data) {
            for (let i = 0; i < data.data.length; i++) {
              const ticket = data.data[i];
              if (ticket.status === 'ok') {
                ticketIds.push(ticket.id);
              } else {
                errors.push({
                  token: chunk[i].to,
                  error: ticket.message || 'Unknown error',
                });
              }
            }
          }
        } catch (chunkError) {
          this.logger.error('Failed to send push notification chunk', {
            error: chunkError instanceof Error ? chunkError.message : chunkError,
          });
        }
      }

      this.logger.info('Push notifications sent', {
        total: validTokens.length,
        successful: ticketIds.length,
        failed: errors.length,
      });

      return {
        success: errors.length === 0,
        ticketIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Push service error', {
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, errors: [{ token: 'all', error: 'Push service unavailable' }] };
    }
  }

  async sendToUser(userId: string, notification: PushNotification, usersClient: any): Promise<PushResult> {
    try {
      // Fetch user's push tokens from users service
      const response = await usersClient.get(`/internal/users/${userId}/push-tokens`);
      const tokens: string[] = response.data?.tokens || [];

      if (tokens.length === 0) {
        this.logger.debug('No push tokens for user', { userId });
        return { success: true, ticketIds: [] };
      }

      return this.send(tokens, notification);
    } catch (error) {
      this.logger.error('Failed to fetch user push tokens', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, errors: [{ token: userId, error: 'Failed to fetch tokens' }] };
    }
  }

  async checkReceipts(ticketIds: string[]): Promise<{ success: boolean; receipts: Record<string, any> }> {
    try {
      if (ticketIds.length === 0) {
        return { success: true, receipts: {} };
      }

      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      const data = await response.json();

      return {
        success: true,
        receipts: data.data || {},
      };
    } catch (error) {
      this.logger.error('Failed to check push receipts', {
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, receipts: {} };
    }
  }

  private isValidExpoToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

import { Logger } from '@korrect/logger';

export interface SmsConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SmsService {
  private config: SmsConfig;
  private logger: Logger;
  private baseUrl: string;

  constructor(config: SmsConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.baseUrl = config.baseUrl || 'https://api.ng.termii.com/api';
  }

  async send(phone: string, message: string): Promise<SmsResult> {
    try {
      // Format phone number (ensure Nigerian format)
      const formattedPhone = this.formatPhoneNumber(phone);

      if (!this.config.apiKey) {
        this.logger.warn('SMS not sent - API key not configured', { phone: formattedPhone });
        return { success: true, messageId: 'mock_' + Date.now() };
      }

      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          from: this.config.senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: this.config.apiKey,
        }),
      });

      const data = await response.json();

      if (data.code === 'ok' || response.ok) {
        this.logger.info('SMS sent successfully', {
          phone: formattedPhone,
          messageId: data.message_id,
        });
        return { success: true, messageId: data.message_id };
      } else {
        this.logger.error('SMS send failed', {
          phone: formattedPhone,
          error: data.message || 'Unknown error',
        });
        return { success: false, error: data.message || 'Failed to send SMS' };
      }
    } catch (error) {
      this.logger.error('SMS service error', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, error: 'SMS service unavailable' };
    }
  }

  async sendOtp(phone: string): Promise<SmsResult & { pinId?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      if (!this.config.apiKey) {
        this.logger.warn('OTP not sent - API key not configured', { phone: formattedPhone });
        return { success: true, pinId: 'mock_pin_' + Date.now() };
      }

      const response = await fetch(`${this.baseUrl}/sms/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.config.apiKey,
          message_type: 'NUMERIC',
          to: formattedPhone,
          from: this.config.senderId,
          channel: 'generic',
          pin_attempts: 3,
          pin_time_to_live: 10,
          pin_length: 6,
          pin_placeholder: '< 1234 >',
          message_text: 'Your Korrect verification code is < 1234 >. Valid for 10 minutes.',
          pin_type: 'NUMERIC',
        }),
      });

      const data = await response.json();

      if (data.pinId) {
        this.logger.info('OTP sent successfully', {
          phone: formattedPhone,
          pinId: data.pinId,
        });
        return { success: true, pinId: data.pinId };
      } else {
        this.logger.error('OTP send failed', {
          phone: formattedPhone,
          error: data.message || 'Unknown error',
        });
        return { success: false, error: data.message || 'Failed to send OTP' };
      }
    } catch (error) {
      this.logger.error('OTP service error', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, error: 'OTP service unavailable' };
    }
  }

  async verifyOtp(pinId: string, pin: string): Promise<{ success: boolean; verified: boolean; error?: string }> {
    try {
      if (!this.config.apiKey) {
        // Mock verification for development
        return { success: true, verified: pin === '123456' };
      }

      const response = await fetch(`${this.baseUrl}/sms/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.config.apiKey,
          pin_id: pinId,
          pin,
        }),
      });

      const data = await response.json();

      if (data.verified) {
        this.logger.info('OTP verified successfully', { pinId });
        return { success: true, verified: true };
      } else {
        this.logger.warn('OTP verification failed', { pinId });
        return { success: true, verified: false };
      }
    } catch (error) {
      this.logger.error('OTP verification error', {
        pinId,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, verified: false, error: 'Verification service unavailable' };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove spaces and special characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Handle Nigerian numbers
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }

    return cleaned;
  }

  async sendBulk(phones: string[], message: string): Promise<{ success: boolean; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const phone of phones) {
      const result = await this.send(phone, message);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { success: failed === 0, sent, failed };
  }
}

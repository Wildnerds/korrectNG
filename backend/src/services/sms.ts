import axios from 'axios';
import { log as logger } from '../utils/logger';

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'KorrectNG';
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// SMS Templates for critical notifications
const SMS_TEMPLATES = {
  booking_accepted: (artisanName: string) =>
    `KorrectNG: Your booking with ${artisanName} has been ACCEPTED! Open the app to make payment and proceed.`,

  booking_completed: (artisanName: string) =>
    `KorrectNG: ${artisanName} has marked your job as complete. Please confirm in the app to release payment.`,

  payment_received: (amount: number) =>
    `KorrectNG: Payment of NGN${amount.toLocaleString()} received! Your 30-day warranty is now active.`,

  new_booking: (customerName: string) =>
    `KorrectNG: New booking request from ${customerName}! Open the app to accept or decline.`,

  verification_approved: () =>
    `KorrectNG: Congratulations! Your verification is APPROVED. You can now receive bookings.`,

  verification_rejected: () =>
    `KorrectNG: Your verification was not approved. Please check the app for details and resubmit.`,

  warranty_claim: (jobType: string) =>
    `KorrectNG: A warranty claim has been filed for "${jobType}". Please respond within 48 hours.`,

  otp: (code: string) =>
    `KorrectNG: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`,
};

export type SMSTemplate = keyof typeof SMS_TEMPLATES;

/**
 * Format Nigerian phone number to international format
 */
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and other characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+234')) {
    return cleaned;
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '+234' + cleaned.substring(1);
  }
  // Assume it's already local format without leading 0
  if (cleaned.length === 10) {
    return '+234' + cleaned;
  }

  return '+234' + cleaned;
}

/**
 * Send SMS via Termii API
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResponse> {
  if (!TERMII_API_KEY) {
    logger.warn('Termii API key not configured, SMS not sent');
    return { success: false, error: 'SMS service not configured' };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);

  try {
    const response = await axios.post(`${TERMII_BASE_URL}/sms/send`, {
      api_key: TERMII_API_KEY,
      to: formattedPhone,
      from: TERMII_SENDER_ID,
      sms: message,
      type: 'plain',
      channel: 'generic',
    });

    if (response.data.message_id) {
      logger.info('SMS sent successfully', {
        to: formattedPhone,
        messageId: response.data.message_id,
      });
      return { success: true, messageId: response.data.message_id };
    }

    logger.error('SMS send failed', { response: response.data });
    return { success: false, error: response.data.message || 'Unknown error' };
  } catch (error: any) {
    logger.error('SMS send error', {
      error: error.message,
      phone: formattedPhone,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send templated SMS notification
 */
export async function sendTemplateSMS(
  phoneNumber: string,
  template: SMSTemplate,
  ...args: any[]
): Promise<SMSResponse> {
  const templateFn = SMS_TEMPLATES[template];
  if (!templateFn) {
    return { success: false, error: `Unknown template: ${template}` };
  }

  const message = (templateFn as Function)(...args);
  return sendSMS(phoneNumber, message);
}

/**
 * Send OTP via Termii
 */
export async function sendOTP(phoneNumber: string): Promise<{
  success: boolean;
  pinId?: string;
  error?: string;
}> {
  if (!TERMII_API_KEY) {
    logger.warn('Termii API key not configured, OTP not sent');
    return { success: false, error: 'SMS service not configured' };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);

  try {
    const response = await axios.post(`${TERMII_BASE_URL}/sms/otp/send`, {
      api_key: TERMII_API_KEY,
      message_type: 'NUMERIC',
      to: formattedPhone,
      from: TERMII_SENDER_ID,
      channel: 'generic',
      pin_attempts: 3,
      pin_time_to_live: 10, // 10 minutes
      pin_length: 6,
      pin_placeholder: '< 1234 >',
      message_text: 'KorrectNG: Your verification code is < 1234 >. Valid for 10 minutes.',
      pin_type: 'NUMERIC',
    });

    if (response.data.pinId) {
      logger.info('OTP sent successfully', {
        to: formattedPhone,
        pinId: response.data.pinId,
      });
      return { success: true, pinId: response.data.pinId };
    }

    return { success: false, error: response.data.message || 'Failed to send OTP' };
  } catch (error: any) {
    logger.error('OTP send error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Verify OTP via Termii
 */
export async function verifyOTP(
  pinId: string,
  pin: string
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  if (!TERMII_API_KEY) {
    return { success: false, verified: false, error: 'SMS service not configured' };
  }

  try {
    const response = await axios.post(`${TERMII_BASE_URL}/sms/otp/verify`, {
      api_key: TERMII_API_KEY,
      pin_id: pinId,
      pin,
    });

    const verified = response.data.verified === true || response.data.verified === 'True';
    return { success: true, verified };
  } catch (error: any) {
    logger.error('OTP verify error', { error: error.message });
    return { success: false, verified: false, error: error.message };
  }
}

/**
 * Get SMS balance from Termii
 */
export async function getSMSBalance(): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  if (!TERMII_API_KEY) {
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const response = await axios.get(`${TERMII_BASE_URL}/get-balance`, {
      params: { api_key: TERMII_API_KEY },
    });

    return { success: true, balance: response.data.balance };
  } catch (error: any) {
    logger.error('Get SMS balance error', { error: error.message });
    return { success: false, error: error.message };
  }
}

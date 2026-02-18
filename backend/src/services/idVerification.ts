/**
 * ID Verification Service
 *
 * This service provides a structure for integrating with Nigerian ID
 * verification APIs. Currently a placeholder for future implementation.
 *
 * Supported providers (to be implemented):
 * - Smile Identity (https://smileidentity.com)
 * - Dojah (https://dojah.io)
 * - Prembly/Identitypass (https://prembly.com)
 * - Youverify (https://youverify.co)
 *
 * Environment variables needed:
 * - ID_VERIFICATION_PROVIDER: 'smile' | 'dojah' | 'prembly' | 'youverify' | 'manual'
 * - SMILE_API_KEY, SMILE_PARTNER_ID (for Smile Identity)
 * - DOJAH_API_KEY, DOJAH_APP_ID (for Dojah)
 * - PREMBLY_API_KEY (for Prembly)
 */

import { log } from '../utils/logger';

export type VerificationProvider = 'smile' | 'dojah' | 'prembly' | 'youverify' | 'manual';

export type IdType = 'nin' | 'bvn' | 'voters_card' | 'drivers_license' | 'passport';

export interface VerificationRequest {
  idType: IdType;
  idNumber: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  selfieImage?: Buffer;
  idImage?: Buffer;
}

export interface VerificationResponse {
  success: boolean;
  verified: boolean;
  provider: VerificationProvider;
  confidence?: number;
  data?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    photo?: string;
  };
  error?: string;
  rawResponse?: any;
}

/**
 * Get the configured verification provider
 */
export function getProvider(): VerificationProvider {
  const provider = process.env.ID_VERIFICATION_PROVIDER || 'manual';
  return provider as VerificationProvider;
}

/**
 * Verify an ID using the configured provider
 */
export async function verifyId(request: VerificationRequest): Promise<VerificationResponse> {
  const provider = getProvider();

  switch (provider) {
    case 'smile':
      return verifyWithSmileIdentity(request);
    case 'dojah':
      return verifyWithDojah(request);
    case 'prembly':
      return verifyWithPrembly(request);
    case 'youverify':
      return verifyWithYouverify(request);
    case 'manual':
    default:
      return manualVerification(request);
  }
}

/**
 * Manual verification (placeholder - always returns pending)
 */
async function manualVerification(_request: VerificationRequest): Promise<VerificationResponse> {
  return {
    success: true,
    verified: false,
    provider: 'manual',
    error: 'Manual verification required - admin will review documents',
  };
}

/**
 * Smile Identity Integration
 * Docs: https://docs.smileidentity.com
 *
 * To enable:
 * 1. Sign up at https://smileidentity.com
 * 2. Get API key and Partner ID
 * 3. Set environment variables:
 *    - ID_VERIFICATION_PROVIDER=smile
 *    - SMILE_API_KEY=your_api_key
 *    - SMILE_PARTNER_ID=your_partner_id
 */
async function verifyWithSmileIdentity(request: VerificationRequest): Promise<VerificationResponse> {
  const apiKey = process.env.SMILE_API_KEY;
  const partnerId = process.env.SMILE_PARTNER_ID;

  if (!apiKey || !partnerId) {
    log.warn('Smile Identity not configured - falling back to manual verification');
    return manualVerification(request);
  }

  // TODO: Implement Smile Identity API call
  // Documentation: https://docs.smileidentity.com/products/id-verification
  //
  // Example implementation:
  // const response = await fetch('https://api.smileidentity.com/v1/id_verification', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     partner_id: partnerId,
  //     id_type: mapIdType(request.idType),
  //     id_number: request.idNumber,
  //     first_name: request.firstName,
  //     last_name: request.lastName,
  //   }),
  // });

  log.info('Smile Identity verification not yet implemented');
  return manualVerification(request);
}

/**
 * Dojah Integration
 * Docs: https://docs.dojah.io
 *
 * To enable:
 * 1. Sign up at https://dojah.io
 * 2. Get API key and App ID
 * 3. Set environment variables:
 *    - ID_VERIFICATION_PROVIDER=dojah
 *    - DOJAH_API_KEY=your_api_key
 *    - DOJAH_APP_ID=your_app_id
 */
async function verifyWithDojah(request: VerificationRequest): Promise<VerificationResponse> {
  const apiKey = process.env.DOJAH_API_KEY;
  const appId = process.env.DOJAH_APP_ID;

  if (!apiKey || !appId) {
    log.warn('Dojah not configured - falling back to manual verification');
    return manualVerification(request);
  }

  try {
    const endpoint = getDojahEndpoint(request.idType);
    const params = getDojahParams(request);

    const response = await fetch(`https://api.dojah.io/api/v1/${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'AppId': appId,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      log.error('Dojah API error', { error: data });
      return {
        success: false,
        verified: false,
        provider: 'dojah',
        error: data.error || 'Verification failed',
        rawResponse: data,
      };
    }

    // Check if verification was successful
    const entity = data.entity;
    if (!entity) {
      return {
        success: true,
        verified: false,
        provider: 'dojah',
        error: 'No data found for this ID',
        rawResponse: data,
      };
    }

    // Compare names if provided
    let nameMatch = true;
    if (request.firstName && request.lastName) {
      const firstNameMatch = entity.first_name?.toLowerCase() === request.firstName.toLowerCase() ||
                            entity.firstName?.toLowerCase() === request.firstName.toLowerCase();
      const lastNameMatch = entity.last_name?.toLowerCase() === request.lastName.toLowerCase() ||
                           entity.lastName?.toLowerCase() === request.lastName.toLowerCase();
      nameMatch = firstNameMatch && lastNameMatch;
    }

    return {
      success: true,
      verified: nameMatch,
      provider: 'dojah',
      confidence: nameMatch ? 100 : 50,
      data: {
        firstName: entity.first_name || entity.firstName,
        lastName: entity.last_name || entity.lastName,
        dateOfBirth: entity.date_of_birth || entity.dateOfBirth,
        gender: entity.gender,
        phoneNumber: entity.phone_number || entity.phoneNumber,
        photo: entity.photo || entity.image,
      },
      rawResponse: data,
    };
  } catch (error) {
    log.error('Dojah verification error', { error: error instanceof Error ? error.message : error });
    return {
      success: false,
      verified: false,
      provider: 'dojah',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Dojah API endpoint based on ID type
 */
function getDojahEndpoint(idType: IdType): string {
  const endpoints: Record<IdType, string> = {
    nin: 'kyc/nin',
    bvn: 'kyc/bvn/full',
    voters_card: 'kyc/vin',
    drivers_license: 'kyc/dl',
    passport: 'kyc/passport',
  };
  return endpoints[idType] || 'kyc/nin';
}

/**
 * Build query params for Dojah API
 */
function getDojahParams(request: VerificationRequest): string {
  const params = new URLSearchParams();

  switch (request.idType) {
    case 'nin':
      params.append('nin', request.idNumber);
      break;
    case 'bvn':
      params.append('bvn', request.idNumber);
      break;
    case 'voters_card':
      params.append('vin', request.idNumber);
      if (request.lastName) params.append('last_name', request.lastName);
      if (request.firstName) params.append('first_name', request.firstName);
      break;
    case 'drivers_license':
      params.append('license_number', request.idNumber);
      if (request.dateOfBirth) params.append('dob', request.dateOfBirth);
      break;
    case 'passport':
      params.append('passport_number', request.idNumber);
      if (request.lastName) params.append('surname', request.lastName);
      break;
  }

  return params.toString();
}

/**
 * Prembly (Identitypass) Integration
 * Docs: https://docs.prembly.com
 *
 * To enable:
 * 1. Sign up at https://prembly.com
 * 2. Get API key
 * 3. Set environment variables:
 *    - ID_VERIFICATION_PROVIDER=prembly
 *    - PREMBLY_API_KEY=your_api_key
 */
async function verifyWithPrembly(request: VerificationRequest): Promise<VerificationResponse> {
  const apiKey = process.env.PREMBLY_API_KEY;

  if (!apiKey) {
    log.warn('Prembly not configured - falling back to manual verification');
    return manualVerification(request);
  }

  // TODO: Implement Prembly API call
  // Documentation: https://docs.prembly.com
  //
  // Example for NIN verification:
  // const response = await fetch('https://api.prembly.com/identitypass/verification/nin', {
  //   method: 'POST',
  //   headers: {
  //     'x-api-key': apiKey,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     number: request.idNumber,
  //   }),
  // });

  log.info('Prembly verification not yet implemented');
  return manualVerification(request);
}

/**
 * Youverify Integration
 * Docs: https://docs.youverify.co
 *
 * To enable:
 * 1. Sign up at https://youverify.co
 * 2. Get API key
 * 3. Set environment variables:
 *    - ID_VERIFICATION_PROVIDER=youverify
 *    - YOUVERIFY_API_KEY=your_api_key
 */
async function verifyWithYouverify(request: VerificationRequest): Promise<VerificationResponse> {
  const apiKey = process.env.YOUVERIFY_API_KEY;

  if (!apiKey) {
    log.warn('Youverify not configured - falling back to manual verification');
    return manualVerification(request);
  }

  // TODO: Implement Youverify API call

  log.info('Youverify verification not yet implemented');
  return manualVerification(request);
}

/**
 * Check if automated ID verification is available
 */
export function isAutomatedVerificationAvailable(): boolean {
  const provider = getProvider();
  if (provider === 'manual') return false;

  switch (provider) {
    case 'smile':
      return !!(process.env.SMILE_API_KEY && process.env.SMILE_PARTNER_ID);
    case 'dojah':
      return !!(process.env.DOJAH_API_KEY && process.env.DOJAH_APP_ID);
    case 'prembly':
      return !!process.env.PREMBLY_API_KEY;
    case 'youverify':
      return !!process.env.YOUVERIFY_API_KEY;
    default:
      return false;
  }
}

/**
 * Get verification pricing info (approximate)
 */
export function getVerificationPricing(): { provider: string; pricePerVerification: string } {
  const provider = getProvider();
  const pricing: Record<VerificationProvider, string> = {
    smile: '~₦50-100 per verification',
    dojah: '~₦50-100 per verification',
    prembly: '~₦50-100 per verification',
    youverify: '~₦50-150 per verification',
    manual: 'Free (manual review)',
  };

  return {
    provider,
    pricePerVerification: pricing[provider],
  };
}

export default {
  verifyId,
  getProvider,
  isAutomatedVerificationAvailable,
  getVerificationPricing,
};

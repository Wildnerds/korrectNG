import { ArtisanProfile } from '../models';
import { log } from '../utils/logger';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface Bank {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

interface ResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

interface CreateRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    id: number;
    name: string;
    recipient_code: string;
    type: string;
  };
}

interface TransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Get list of Nigerian banks from Paystack
 */
export async function getBanks(): Promise<Bank[]> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/bank?country=nigeria`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json() as { status: boolean; data: Bank[] };

    if (!data.status) {
      throw new Error('Failed to fetch banks');
    }

    // Filter to active banks and sort by name
    return data.data
      .filter((bank) => bank.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    log.error('Failed to fetch banks from Paystack', { error });
    throw error;
  }
}

/**
 * Verify a bank account using Paystack's resolve endpoint
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ accountName: string; accountNumber: string }> {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json() as ResolveAccountResponse;

    if (!data.status) {
      throw new Error(data.message || 'Could not verify account');
    }

    return {
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    };
  } catch (error: any) {
    log.error('Failed to verify bank account', { error: error.message, accountNumber, bankCode });
    throw new Error(error.message || 'Could not verify bank account');
  }
}

/**
 * Create a transfer recipient in Paystack
 */
export async function createTransferRecipient(
  name: string,
  accountNumber: string,
  bankCode: string
): Promise<string> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    const data = await response.json() as CreateRecipientResponse;

    if (!data.status) {
      throw new Error(data.message || 'Failed to create transfer recipient');
    }

    log.info('Transfer recipient created', {
      recipientCode: data.data.recipient_code,
      name,
    });

    return data.data.recipient_code;
  } catch (error: any) {
    log.error('Failed to create transfer recipient', { error: error.message });
    throw error;
  }
}

/**
 * Save bank details for an artisan (verify, create recipient, save to DB)
 */
export async function saveArtisanBankDetails(
  artisanProfileId: string,
  accountNumber: string,
  bankCode: string
): Promise<{ accountName: string; recipientCode: string }> {
  // 1. Verify the account
  const verified = await verifyBankAccount(accountNumber, bankCode);

  // 2. Create transfer recipient
  const recipientCode = await createTransferRecipient(
    verified.accountName,
    accountNumber,
    bankCode
  );

  // 3. Save to artisan profile
  await ArtisanProfile.findByIdAndUpdate(artisanProfileId, {
    bankCode,
    accountNumber,
    accountName: verified.accountName,
    paystackRecipientCode: recipientCode,
  });

  log.info('Artisan bank details saved', {
    artisanProfileId,
    accountName: verified.accountName,
  });

  return {
    accountName: verified.accountName,
    recipientCode,
  };
}

/**
 * Initiate a transfer to an artisan
 */
export async function initiateTransfer(
  recipientCode: string,
  amount: number, // in Naira
  reason: string,
  reference?: string
): Promise<{ transferCode: string; reference: string; status: string }> {
  try {
    const transferReference = reference || `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason,
        reference: transferReference,
      }),
    });

    const data = await response.json() as TransferResponse;

    if (!data.status) {
      throw new Error(data.message || 'Transfer failed');
    }

    log.info('Transfer initiated', {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      amount,
      status: data.data.status,
    });

    return {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      status: data.data.status,
    };
  } catch (error: any) {
    log.error('Transfer failed', { error: error.message, recipientCode, amount });
    throw error;
  }
}

/**
 * Pay artisan for a completed job
 */
export async function payArtisan(
  artisanProfileId: string,
  amount: number, // Amount in Naira (after platform fee deduction)
  jobReference: string,
  jobDescription: string
): Promise<{ success: boolean; transferCode?: string; error?: string }> {
  try {
    const artisan = await ArtisanProfile.findById(artisanProfileId);

    if (!artisan) {
      return { success: false, error: 'Artisan not found' };
    }

    if (!artisan.paystackRecipientCode) {
      log.warn('Artisan has no bank details configured', { artisanProfileId });
      return { success: false, error: 'Artisan has not set up bank account for payouts' };
    }

    const result = await initiateTransfer(
      artisan.paystackRecipientCode,
      amount,
      `Payment for: ${jobDescription}`,
      `PAY-${jobReference}`
    );

    return {
      success: true,
      transferCode: result.transferCode,
    };
  } catch (error: any) {
    log.error('Failed to pay artisan', { error: error.message, artisanProfileId, amount });
    return { success: false, error: error.message };
  }
}

/**
 * Check if artisan has bank details configured
 */
export async function hasArtisanBankDetails(artisanProfileId: string): Promise<boolean> {
  const artisan = await ArtisanProfile.findById(artisanProfileId).select('paystackRecipientCode');
  return !!artisan?.paystackRecipientCode;
}

export default {
  getBanks,
  verifyBankAccount,
  createTransferRecipient,
  saveArtisanBankDetails,
  initiateTransfer,
  payArtisan,
  hasArtisanBankDetails,
};

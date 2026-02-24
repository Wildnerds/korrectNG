'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Bank {
  code: string;
  name: string;
}

interface BankAccount {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isConfigured: boolean;
}

export function BankAccountForm() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [existingAccount, setExistingAccount] = useState<BankAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch banks list
  useEffect(() => {
    async function fetchBanks() {
      try {
        const res = await apiFetch<Bank[]>('/payout/banks');
        setBanks(res.data || []);
      } catch (err) {
        console.error('Failed to fetch banks:', err);
      } finally {
        setLoadingBanks(false);
      }
    }
    fetchBanks();
  }, []);

  // Fetch existing bank account
  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await apiFetch<BankAccount>('/payout/bank-account');
        if (res.data) {
          setExistingAccount(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch bank account:', err);
      } finally {
        setLoadingAccount(false);
      }
    }
    fetchAccount();
  }, []);

  const handleVerify = async () => {
    if (!bankCode || accountNumber.length !== 10) {
      setMessage({ type: 'error', text: 'Please select a bank and enter a 10-digit account number' });
      return;
    }

    setVerifying(true);
    setMessage(null);
    setVerifiedName('');

    try {
      const res = await apiFetch<{ accountName: string; accountNumber: string }>('/payout/verify-account', {
        method: 'POST',
        body: JSON.stringify({ bankCode, accountNumber }),
      });

      if (res.data?.accountName) {
        setVerifiedName(res.data.accountName);
        setMessage({ type: 'success', text: `Account verified: ${res.data.accountName}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Could not verify account. Please check the details.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!verifiedName) {
      setMessage({ type: 'error', text: 'Please verify your account first' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await apiFetch('/payout/bank-account', {
        method: 'POST',
        body: JSON.stringify({ bankCode, accountNumber }),
      });

      setMessage({ type: 'success', text: 'Bank account saved successfully!' });

      // Update existing account display
      const selectedBank = banks.find(b => b.code === bankCode);
      setExistingAccount({
        bankCode,
        accountNumber: '******' + accountNumber.slice(-4),
        accountName: verifiedName,
        isConfigured: true,
      });

      // Reset form
      setBankCode('');
      setAccountNumber('');
      setVerifiedName('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save bank account' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your bank account?')) return;

    try {
      await apiFetch('/payout/bank-account', { method: 'DELETE' });
      setExistingAccount(null);
      setMessage({ type: 'success', text: 'Bank account removed' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove bank account' });
    }
  };

  if (loadingBanks || loadingAccount) {
    return (
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Bank Account for Payouts</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Bank Account for Payouts</h2>
      <p className="text-gray-600 text-sm mb-4">
        Add your bank account to receive automatic payouts when jobs are completed.
      </p>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Show existing account */}
      {existingAccount?.isConfigured && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Current Bank Account</p>
              <p className="text-green-700">{existingAccount.accountName}</p>
              <p className="text-green-600 text-sm">
                {banks.find(b => b.code === existingAccount.bankCode)?.name || 'Bank'} - {existingAccount.accountNumber}
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Add/Update bank account form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Bank</label>
          <select
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              setVerifiedName('');
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
          >
            <option value="">Choose your bank</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Number</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setAccountNumber(value);
              setVerifiedName('');
            }}
            placeholder="Enter 10-digit account number"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
            maxLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">
            {accountNumber.length}/10 digits
          </p>
        </div>

        {/* Verify button */}
        {!verifiedName && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || !bankCode || accountNumber.length !== 10}
            className="w-full py-3 bg-brand-orange text-white rounded-md hover:opacity-90 transition-colors font-medium disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify Account'}
          </button>
        )}

        {/* Show verified name and save button */}
        {verifiedName && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600">Account Name:</p>
              <p className="font-medium text-blue-800">{verifiedName}</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Bank Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

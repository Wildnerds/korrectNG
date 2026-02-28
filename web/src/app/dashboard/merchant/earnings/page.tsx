'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

interface EarningsStats {
  totalEarnings: number;
  pendingEarnings: number;
  completedOrders: number;
  totalOrders: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface BankAccount {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  paystackRecipientCode?: string;
}

const BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '014', name: 'Afribank' },
  { code: '023', name: 'Citibank' },
  { code: '050', name: 'Ecobank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'FCMB' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'UBA' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export default function MerchantEarningsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [bankForm, setBankForm] = useState({
    bankCode: '',
    accountNumber: '',
  });
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const token = Cookies.get('token');
      try {
        // Fetch stats
        const statsRes = await apiFetch<EarningsStats>('/merchants/stats/overview', { token });
        if (statsRes.data) {
          setStats(statsRes.data);
        }

        // Fetch profile for bank details
        const profileRes = await apiFetch<any>('/merchants/my-profile', { token });
        if (profileRes.data) {
          setBankAccount({
            bankCode: profileRes.data.bankCode,
            accountNumber: profileRes.data.accountNumber,
            accountName: profileRes.data.accountName,
            paystackRecipientCode: profileRes.data.paystackRecipientCode,
          });
          if (profileRes.data.bankCode) {
            setBankForm({
              bankCode: profileRes.data.bankCode,
              accountNumber: profileRes.data.accountNumber || '',
            });
          }
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const verifyAccount = async () => {
    if (!bankForm.bankCode || bankForm.accountNumber.length !== 10) {
      showToast('Please enter a valid bank and 10-digit account number', 'error');
      return;
    }

    setVerifying(true);
    const token = Cookies.get('token');

    try {
      const res = await apiFetch<{ accountName: string }>('/payout/verify-account', {
        method: 'POST',
        body: JSON.stringify({
          bankCode: bankForm.bankCode,
          accountNumber: bankForm.accountNumber,
        }),
        token,
      });

      if (res.data?.accountName) {
        setVerifiedAccountName(res.data.accountName);
        showToast('Account verified successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to verify account', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const saveBankDetails = async () => {
    if (!verifiedAccountName) {
      showToast('Please verify your account first', 'error');
      return;
    }

    setSaving(true);
    const token = Cookies.get('token');

    try {
      await apiFetch('/merchants/bank-account', {
        method: 'POST',
        body: JSON.stringify({
          bankCode: bankForm.bankCode,
          accountNumber: bankForm.accountNumber,
          accountName: verifiedAccountName,
        }),
        token,
      });

      setBankAccount({
        bankCode: bankForm.bankCode,
        accountNumber: bankForm.accountNumber,
        accountName: verifiedAccountName,
      });
      showToast('Bank details saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save bank details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Earnings & Payouts</h1>
          <p className="text-brand-gray">Track your earnings and manage payout settings</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-brand-gray mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">
              NGN{(stats?.totalEarnings || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-brand-gray mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              NGN{(stats?.pendingEarnings || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-brand-gray mb-1">This Month</p>
            <p className="text-2xl font-bold text-brand-green">
              NGN{(stats?.thisMonthEarnings || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-brand-gray mb-1">Orders</p>
            <p className="text-2xl font-bold">
              {stats?.completedOrders || 0}
              <span className="text-sm text-brand-gray font-normal">
                /{stats?.totalOrders || 0}
              </span>
            </p>
          </div>
        </div>

        {/* How Payouts Work */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-800 mb-3">How Payouts Work</h2>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>Customer places an order and pays - funds are held in escrow</li>
            <li>You prepare and deliver the order</li>
            <li>Customer confirms receipt or auto-confirmed after 72 hours</li>
            <li>Funds are released to your bank account (minus 5% platform fee)</li>
          </ol>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Payout Account</h2>

          {bankAccount?.accountName ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 mb-2">Bank account configured</p>
                <p className="font-semibold">{bankAccount.accountName}</p>
                <p className="text-sm text-brand-gray">
                  {BANKS.find(b => b.code === bankAccount.bankCode)?.name || bankAccount.bankCode} - ****{bankAccount.accountNumber?.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => {
                  setBankAccount(null);
                  setVerifiedAccountName(null);
                  setBankForm({ bankCode: '', accountNumber: '' });
                }}
                className="text-brand-green text-sm hover:underline"
              >
                Change bank account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-gray mb-4">
                Add your bank account to receive payouts. Your earnings will be transferred here when orders are completed.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bank</label>
                  <select
                    value={bankForm.bankCode}
                    onChange={(e) => {
                      setBankForm({ ...bankForm, bankCode: e.target.value });
                      setVerifiedAccountName(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  >
                    <option value="">Select bank</option>
                    {BANKS.map((bank) => (
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
                    value={bankForm.accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setBankForm({ ...bankForm, accountNumber: val });
                      setVerifiedAccountName(null);
                    }}
                    maxLength={10}
                    placeholder="10-digit account number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
              </div>

              {verifiedAccountName ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">Account verified:</p>
                    <p className="font-semibold">{verifiedAccountName}</p>
                  </div>
                  <button
                    onClick={saveBankDetails}
                    disabled={saving}
                    className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={verifyAccount}
                  disabled={verifying || !bankForm.bankCode || bankForm.accountNumber.length !== 10}
                  className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify Account'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

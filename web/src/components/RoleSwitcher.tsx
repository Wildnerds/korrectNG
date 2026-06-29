'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';

const roleLabels: Record<string, string> = {
  customer: 'Customer',
  artisan: 'Skilled Professional',
  merchant: 'Merchant',
  admin: 'Admin',
};

const roleDashboards: Record<string, string> = {
  customer: '/dashboard/customer',
  artisan: '/dashboard/artisan',
  merchant: '/dashboard/merchant',
  admin: '/admin',
};

export default function RoleSwitcher() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [switching, setSwitching] = useState(false);

  // Only show if user has multiple roles
  if (!user?.roles || user.roles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = async (targetRole: string) => {
    if (targetRole === user.role) return;

    setSwitching(true);
    const token = Cookies.get('token');
    try {
      await apiFetch('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role: targetRole }),
        token,
      });
      await refreshUser();
      showToast(`Switched to ${roleLabels[targetRole]} mode`, 'success');
      // Navigate to the appropriate dashboard
      router.push(roleDashboards[targetRole] || '/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Failed to switch role', 'error');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
      <span className="text-xs text-brand-gray">Mode:</span>
      {user.roles.map((role) => (
        <button
          key={role}
          onClick={() => handleRoleSwitch(role)}
          disabled={switching}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            role === user.role
              ? 'bg-brand-green text-white'
              : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {roleLabels[role] || role}
        </button>
      ))}
    </div>
  );
}

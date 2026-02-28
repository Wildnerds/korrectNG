'use client';

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface GoogleSignInButtonProps {
  onSuccess: (user: any, token: string) => void;
  onError?: (error: string) => void;
  role?: 'customer' | 'artisan' | 'merchant';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  role = 'customer',
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      onError?.('No credential received from Google');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<{ user: any; token: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: credentialResponse.credential,
          role,
        }),
      });

      if (response.data) {
        onSuccess(response.data.user, response.data.token);
      }
    } catch (error: any) {
      onError?.(error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    onError?.('Google sign-in was cancelled or failed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-md">
        <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-600">Signing in...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text={text}
        shape="rectangular"
        size="large"
        width={400}
        useOneTap={false}
      />
    </div>
  );
}

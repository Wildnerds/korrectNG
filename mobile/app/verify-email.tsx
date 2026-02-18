import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { apiFetch } from '../src/lib/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    async function verifyEmail() {
      try {
        await apiFetch('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email. The link may have expired.');
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={Colors.green} style={styles.icon} />
          <Text style={styles.title}>Verifying Your Email</Text>
          <Text style={styles.message}>Please wait while we verify your email address...</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.emoji}>❌</Text>
          <Text style={[styles.title, styles.errorTitle]}>Verification Failed</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Need a new verification link? Sign in and request one from your dashboard.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: { marginBottom: 20 },
  emoji: { fontSize: 60, marginBottom: 20 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.green,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorTitle: { color: '#dc2626' },
  message: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 300,
  },
  button: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  hint: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 20,
    maxWidth: 280,
  },
});

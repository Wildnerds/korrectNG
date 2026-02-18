import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getToken } from '../lib/api';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.isEmailVerified) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      const token = await getToken();
      await apiFetch('/auth/resend-verification', {
        method: 'POST',
        token,
      });
      setSent(true);
    } catch {
      // Handle error silently
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.text}>Please verify your email address</Text>
      </View>
      {sent ? (
        <Text style={styles.sentText}>✓ Email sent!</Text>
      ) : (
        <TouchableOpacity onPress={handleResend} disabled={sending}>
          <Text style={[styles.link, sending && styles.linkDisabled]}>
            {sending ? 'Sending...' : 'Resend'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: { marginRight: 8 },
  text: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  link: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkDisabled: { opacity: 0.5 },
  sentText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
});

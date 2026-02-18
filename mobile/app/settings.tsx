import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { apiFetch } from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';

interface UserSettings {
  smsNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, logout, refreshUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    smsNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!token) return;

    try {
      const res = await apiFetch<{ user: { settings: UserSettings } }>('/account', { token });
      if (res.data?.user?.settings) {
        setSettings(res.data.user.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!token) return;

    const prevSettings = { ...settings };
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      await apiFetch('/account/settings', {
        token,
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
    } catch (error) {
      setSettings(prevSettings);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/account/password', {
        token,
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!token) return;

    try {
      await apiFetch('/account/verify-phone/send', {
        token,
        method: 'POST',
      });

      Alert.prompt(
        'Verify Phone',
        'Enter the OTP sent to your phone',
        async (otp) => {
          if (!otp) return;

          try {
            await apiFetch('/account/verify-phone/confirm', {
              token,
              method: 'POST',
              body: JSON.stringify({ otp }),
            });

            Alert.alert('Success', 'Phone verified successfully');
            refreshUser();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Invalid OTP');
          }
        },
        'plain-text',
        '',
        'number-pad'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be hidden but your data is saved. You can reactivate by logging in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Password',
              'Enter your password to deactivate',
              async (password) => {
                if (!password) return;

                try {
                  await apiFetch('/account/deactivate', {
                    token,
                    method: 'POST',
                    body: JSON.stringify({ password }),
                  });

                  await logout();
                  router.replace('/');
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to deactivate');
                }
              },
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account Permanently',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Type "DELETE MY ACCOUNT" to confirm',
              async (confirmText) => {
                if (confirmText !== 'DELETE MY ACCOUNT') {
                  Alert.alert('Error', 'Please type exactly "DELETE MY ACCOUNT"');
                  return;
                }

                Alert.prompt(
                  'Enter Password',
                  'Enter your password to confirm',
                  async (password) => {
                    if (!password) return;

                    try {
                      await apiFetch('/account', {
                        token,
                        method: 'DELETE',
                        body: JSON.stringify({ password, confirmText }),
                      });

                      await logout();
                      router.replace('/');
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to delete account');
                    }
                  },
                  'secure-text'
                );
              }
            );
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    if (!token) return;

    try {
      const res = await apiFetch('/account/export', { token });
      Alert.alert(
        'Data Export',
        'Your data has been prepared. In a full implementation, this would be emailed to you.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>🔐</Text>
        <Text style={styles.errorTitle}>Login Required</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <ScrollView style={styles.container}>
        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user.firstName} {user.lastName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{user.email}</Text>
                {user.isEmailVerified && (
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                )}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{user.phone}</Text>
                {user.isPhoneVerified ? (
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                ) : (
                  <TouchableOpacity onPress={handleVerifyPhone}>
                    <Text style={styles.verifyLink}>Verify</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.actionText}>Edit Profile</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={styles.actionText}>Change Password</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive app notifications</Text>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) => updateSetting('pushNotifications', value)}
                trackColor={{ false: '#E5E7EB', true: Colors.green }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDesc}>Important updates via SMS</Text>
              </View>
              <Switch
                value={settings.smsNotifications}
                onValueChange={(value) => updateSetting('smsNotifications', value)}
                trackColor={{ false: '#E5E7EB', true: Colors.green }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Updates via email</Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={(value) => updateSetting('emailNotifications', value)}
                trackColor={{ false: '#E5E7EB', true: Colors.green }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.settingLabel}>Marketing Emails</Text>
                <Text style={styles.settingDesc}>Promotions and news</Text>
              </View>
              <Switch
                value={settings.marketingEmails}
                onValueChange={(value) => updateSetting('marketingEmails', value)}
                trackColor={{ false: '#E5E7EB', true: Colors.green }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
              <Text style={styles.actionText}>Export My Data</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/privacy')}
            >
              <Text style={styles.actionText}>Privacy Policy</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/terms')}
            >
              <Text style={styles.actionText}>Terms of Service</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
              <Text style={[styles.actionText, { color: Colors.green }]}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={handleDeactivate}>
              <Text style={[styles.actionText, { color: '#F59E0B' }]}>Deactivate Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />

        {/* Password Modal */}
        {showPasswordModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Change Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Change</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.green,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.gray,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.black,
    fontWeight: '500',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    fontSize: 12,
    color: Colors.green,
    marginLeft: 8,
    fontWeight: '600',
  },
  verifyLink: {
    fontSize: 13,
    color: Colors.green,
    marginLeft: 8,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 15,
    color: Colors.black,
  },
  arrow: {
    fontSize: 18,
    color: Colors.gray,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.black,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.gray,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.lightGray,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.gray,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: Colors.gray,
  },
});

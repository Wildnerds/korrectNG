import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, getToken } from '../../src/lib/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await apiFetch('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
        token,
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      await apiFetch('/auth/update-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
        token,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please sign in to edit your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={profile.firstName}
          onChangeText={(text) => setProfile({ ...profile, firstName: text })}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={profile.lastName}
          onChangeText={(text) => setProfile({ ...profile, lastName: text })}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user.email}
          editable={false}
        />
        <Text style={styles.hint}>Email cannot be changed</Text>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={profile.phone}
          onChangeText={(text) => setProfile({ ...profile, phone: text })}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleProfileUpdate}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          value={passwords.currentPassword}
          onChangeText={(text) => setPasswords({ ...passwords, currentPassword: text })}
          secureTextEntry
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          value={passwords.newPassword}
          onChangeText={(text) => setPasswords({ ...passwords, newPassword: text })}
          secureTextEntry
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          value={passwords.confirmPassword}
          onChangeText={(text) => setPasswords({ ...passwords, confirmPassword: text })}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, styles.buttonOrange, saving && styles.buttonDisabled]}
          onPress={handlePasswordUpdate}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Updating...' : 'Update Password'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    backgroundColor: Colors.white,
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  inputDisabled: { backgroundColor: '#e5e5e5', color: Colors.gray },
  hint: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  button: {
    backgroundColor: Colors.green,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonOrange: { backgroundColor: Colors.orange },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});

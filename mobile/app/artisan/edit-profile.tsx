import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, getToken } from '../../src/lib/api';
import { TRADES, LOCATIONS } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';

export default function ArtisanEditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    businessName: '',
    trade: '',
    description: '',
    location: '',
    address: '',
    whatsappNumber: '',
    phoneNumber: '',
    yearsOfExperience: 0,
    workingHours: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const artisansRes = await apiFetch<{ data: ArtisanProfile[] }>('/artisans?limit=100');
        const artisanProfile = artisansRes.data?.data?.find(
          (a: any) => (a.user as any)?._id === user?._id || a.user === user?._id
        );

        if (artisanProfile) {
          setProfile({
            businessName: artisanProfile.businessName || '',
            trade: artisanProfile.trade || '',
            description: artisanProfile.description || '',
            location: artisanProfile.location || '',
            address: artisanProfile.address || '',
            whatsappNumber: artisanProfile.whatsappNumber || '',
            phoneNumber: artisanProfile.phoneNumber || '',
            yearsOfExperience: artisanProfile.yearsOfExperience || 0,
            workingHours: artisanProfile.workingHours || '',
          });
        }
      } catch {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (profile.description.length < 20) {
      Alert.alert('Error', 'Description must be at least 20 characters');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      await apiFetch('/artisans/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...profile,
          yearsOfExperience: Number(profile.yearsOfExperience),
        }),
        token,
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Business Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>

        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          value={profile.businessName}
          onChangeText={(text) => setProfile({ ...profile, businessName: text })}
          placeholder="Your business name"
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.label}>Trade</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={profile.trade}
            onValueChange={(value) => setProfile({ ...profile, trade: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select a trade" value="" />
            {TRADES.map((trade) => (
              <Picker.Item
                key={trade.value}
                label={`${trade.icon} ${trade.label}`}
                value={trade.value}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={profile.description}
          onChangeText={(text) => setProfile({ ...profile, description: text })}
          placeholder="Tell customers about your experience, skills, and services..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.hint}>Minimum 20 characters</Text>

        <Text style={styles.label}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          value={String(profile.yearsOfExperience)}
          onChangeText={(text) =>
            setProfile({ ...profile, yearsOfExperience: parseInt(text) || 0 })
          }
          keyboardType="numeric"
          placeholderTextColor={Colors.gray}
        />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>

        <Text style={styles.label}>Area</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={profile.location}
            onValueChange={(value) => setProfile({ ...profile, location: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select your area" value="" />
            {LOCATIONS.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Full Address</Text>
        <TextInput
          style={styles.input}
          value={profile.address}
          onChangeText={(text) => setProfile({ ...profile, address: text })}
          placeholder="e.g., 123 Main Street, Lekki Phase 1"
          placeholderTextColor={Colors.gray}
        />
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={styles.input}
          value={profile.whatsappNumber}
          onChangeText={(text) => setProfile({ ...profile, whatsappNumber: text })}
          placeholder="e.g., 2348012345678"
          placeholderTextColor={Colors.gray}
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>Include country code (e.g., 234 for Nigeria)</Text>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={profile.phoneNumber}
          onChangeText={(text) => setProfile({ ...profile, phoneNumber: text })}
          placeholder="e.g., 08012345678"
          placeholderTextColor={Colors.gray}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Working Hours</Text>
        <TextInput
          style={styles.input}
          value={profile.workingHours}
          onChangeText={(text) => setProfile({ ...profile, workingHours: text })}
          placeholder="e.g., Mon-Sat: 8AM - 6PM"
          placeholderTextColor={Colors.gray}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  pickerContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: Colors.green,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    margin: 15,
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});

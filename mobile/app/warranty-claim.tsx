import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/context/AuthContext';
import { apiFetch, getToken } from '../src/lib/api';

export default function WarrantyClaimScreen() {
  const router = useRouter();
  const { artisanId, artisanName } = useLocalSearchParams<{ artisanId: string; artisanName: string }>();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    jobDescription: '',
    issueDescription: '',
  });

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to submit a warranty claim');
      return;
    }

    if (form.jobDescription.length < 10) {
      Alert.alert('Error', 'Job description must be at least 10 characters');
      return;
    }

    if (form.issueDescription.length < 10) {
      Alert.alert('Error', 'Issue description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch('/warranty/claim', {
        method: 'POST',
        body: JSON.stringify({
          artisanId,
          ...form,
        }),
        token,
      });

      Alert.alert(
        'Success',
        'Warranty claim submitted successfully! The artisan will be notified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit warranty claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Submit Warranty Claim</Text>
          <Text style={styles.subtitle}>Against {artisanName || 'Artisan'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            If you've had work done by this artisan and there's an issue with the quality or service,
            you can submit a warranty claim. The artisan will be notified and can respond.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>What job was done?</Text>
          <TextInput
            style={styles.input}
            value={form.jobDescription}
            onChangeText={(text) => setForm({ ...form, jobDescription: text })}
            placeholder="e.g., AC repair, car brake replacement"
            placeholderTextColor={Colors.gray}
          />

          <Text style={styles.label}>What's the issue?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.issueDescription}
            onChangeText={(text) => setForm({ ...form, issueDescription: text })}
            placeholder="Describe the problem in detail..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.hint}>Minimum 10 characters</Text>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: Colors.orange,
    padding: 20,
    paddingTop: 10,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  subtitle: { fontSize: 14, color: Colors.white, opacity: 0.9, marginTop: 4 },
  infoBox: {
    backgroundColor: '#dbeafe',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 20 },
  form: { padding: 15 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  submitButton: {
    backgroundColor: Colors.orange,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 25,
  },
  buttonDisabled: { opacity: 0.5 },
  submitButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: { color: Colors.gray, fontWeight: '500', fontSize: 16 },
});

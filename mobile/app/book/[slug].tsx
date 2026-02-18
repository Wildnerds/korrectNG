import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch, getToken } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { LOCATIONS, getTradeLabel } from '@korrectng/shared';

interface ArtisanProfile {
  _id: string;
  businessName: string;
  trade: string;
  location: string;
  averageRating: number;
  totalReviews: number;
}

export default function BookArtisanScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [jobType, setJobType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    fetchArtisan();
  }, [slug]);

  const fetchArtisan = async () => {
    try {
      const res = await apiFetch<ArtisanProfile>(`/artisans/${slug}`);
      setArtisan(res.data || null);
      if (res.data) {
        setLocation(res.data.location);
        setJobType(getTradeLabel(res.data.trade));
      }
    } catch (error) {
      console.error('Failed to fetch artisan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to book an artisan', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!jobType.trim() || !description.trim() || !address.trim() || !estimatedPrice) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const price = parseInt(estimatedPrice.replace(/,/g, ''), 10);
    if (isNaN(price) || price < 1000) {
      Alert.alert('Invalid Price', 'Minimum booking price is ₦1,000');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ _id: string }>('/bookings', {
        token,
        method: 'POST',
        body: JSON.stringify({
          artisanProfileId: artisan?._id,
          jobType: jobType.trim(),
          description: description.trim(),
          location,
          address: address.trim(),
          estimatedPrice: price,
          scheduledDate: scheduledDate || undefined,
        }),
      });

      Alert.alert(
        'Booking Submitted!',
        'Your booking request has been sent to the artisan. You\'ll be notified when they respond.',
        [
          {
            text: 'View Booking',
            onPress: () => router.replace(`/booking/${res.data?._id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (!artisan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Artisan not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Book Artisan',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container}>
          {/* Artisan Info */}
          <View style={styles.artisanCard}>
            <Text style={styles.artisanName}>{artisan.businessName}</Text>
            <Text style={styles.artisanTrade}>{getTradeLabel(artisan.trade)}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>★</Text>
              <Text style={styles.rating}>{artisan.averageRating.toFixed(1)}</Text>
              <Text style={styles.reviews}>({artisan.totalReviews} reviews)</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Type *</Text>
              <TextInput
                style={styles.input}
                value={jobType}
                onChangeText={setJobType}
                placeholder="e.g., Car Engine Repair, House Wiring"
                placeholderTextColor={Colors.gray}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the job in detail. Include any specific requirements or issues."
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {LOCATIONS.slice(0, 6).map((loc) => (
                    <TouchableOpacity
                      key={loc.value}
                      style={[
                        styles.locationChip,
                        location === loc.value && styles.locationChipActive,
                      ]}
                      onPress={() => setLocation(loc.value)}
                    >
                      <Text
                        style={[
                          styles.locationChipText,
                          location === loc.value && styles.locationChipTextActive,
                        ]}
                      >
                        {loc.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Address *</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g., 15 Admiralty Way, Lekki Phase 1"
                placeholderTextColor={Colors.gray}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Budget (₦) *</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceField}
                  value={estimatedPrice}
                  onChangeText={(text) => setEstimatedPrice(formatPrice(text))}
                  placeholder="5,000"
                  placeholderTextColor={Colors.gray}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.helperText}>Minimum ₦1,000. The artisan may adjust the final price.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Date (Optional)</Text>
              <TextInput
                style={styles.input}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="e.g., Tomorrow, Next Monday, 15th January"
                placeholderTextColor={Colors.gray}
              />
            </View>
          </View>

          {/* Submit */}
          <View style={styles.submitSection}>
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                After submitting, the artisan will review your request and either accept or
                negotiate. You only pay after they accept.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Booking Request</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.gray,
  },
  artisanCard: {
    backgroundColor: Colors.green,
    padding: 20,
    alignItems: 'center',
  },
  artisanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  artisanTrade: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    color: Colors.star,
    fontSize: 16,
    marginRight: 4,
  },
  rating: {
    color: Colors.white,
    fontWeight: 'bold',
    marginRight: 4,
  },
  reviews: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  pickerContainer: {
    marginTop: 4,
  },
  locationChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationChipActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  locationChipText: {
    fontSize: 14,
    color: Colors.gray,
  },
  locationChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    paddingLeft: 14,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.green,
  },
  priceField: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 6,
  },
  submitSection: {
    padding: 20,
    paddingTop: 0,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: Colors.green,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

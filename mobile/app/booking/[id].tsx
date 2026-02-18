import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch, getToken } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface Booking {
  _id: string;
  jobType: string;
  description: string;
  location: string;
  address: string;
  status: string;
  paymentStatus: string;
  estimatedPrice: number;
  finalPrice?: number;
  platformFee: number;
  artisanEarnings: number;
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  completedAt?: string;
  confirmedAt?: string;
  warrantyExpiresAt?: string;
  artisanProfile: {
    _id: string;
    businessName: string;
    trade: string;
    slug: string;
    whatsappNumber?: string;
  };
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  payment_pending: '#F59E0B',
  paid: '#10B981',
  in_progress: '#3B82F6',
  completed: '#10B981',
  confirmed: '#059669',
  cancelled: '#EF4444',
  rejected: '#EF4444',
  disputed: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Artisan Response',
  accepted: 'Accepted',
  payment_pending: 'Awaiting Your Payment',
  paid: 'Payment Received',
  in_progress: 'Work In Progress',
  completed: 'Work Completed',
  confirmed: 'Confirmed & Paid',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  disputed: 'Under Dispute',
};

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!token || !id) return;

    try {
      const res = await apiFetch<Booking>(`/bookings/${id}`, { token });
      setBooking(res.data || null);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const isCustomer = user?.role === 'customer';
  const isArtisan = user?.role === 'artisan';

  const handlePayment = async () => {
    if (!token || !id) return;

    setActionLoading(true);
    try {
      const res = await apiFetch<{ authorization_url: string }>(`/bookings/${id}/pay`, {
        token,
        method: 'POST',
      });

      if (res.data?.authorization_url) {
        Linking.openURL(res.data.authorization_url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initialize payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, note?: string) => {
    if (!token || !id) return;

    setActionLoading(true);
    try {
      await apiFetch(`/bookings/${id}/status`, {
        token,
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, note }),
      });
      fetchBooking();
      Alert.alert('Success', `Booking ${newStatus}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    Alert.alert(
      'Confirm Completion',
      'By confirming, you acknowledge that the job is done satisfactorily. Payment will be released to the artisan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Release Payment',
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiFetch(`/bookings/${id}/confirm`, {
                token,
                method: 'POST',
              });
              fetchBooking();
              Alert.alert('Success', 'Job confirmed! Payment has been released.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to confirm');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiFetch(`/bookings/${id}/cancel`, {
                token,
                method: 'POST',
                body: JSON.stringify({ reason: 'Cancelled by user' }),
              });
              fetchBooking();
              Alert.alert('Success', 'Booking cancelled');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking Details',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <ScrollView style={styles.container}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[booking.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[booking.status]}</Text>
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.card}>
            <Text style={styles.jobType}>{booking.jobType}</Text>
            <Text style={styles.description}>{booking.description}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{booking.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{booking.address}</Text>
            </View>
            {booking.scheduledDate && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Scheduled:</Text>
                <Text style={styles.value}>
                  {formatDate(booking.scheduledDate)} {booking.scheduledTime && `at ${booking.scheduledTime}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {booking.finalPrice ? 'Final Price' : 'Estimated Price'}
              </Text>
              <Text style={styles.priceValue}>
                {formatPrice(booking.finalPrice || booking.estimatedPrice)}
              </Text>
            </View>
            {booking.status === 'confirmed' && isArtisan && (
              <>
                <View style={styles.divider} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Platform Fee (10%)</Text>
                  <Text style={styles.feeValue}>-{formatPrice(booking.platformFee)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.earningsLabel}>Your Earnings</Text>
                  <Text style={styles.earningsValue}>{formatPrice(booking.artisanEarnings)}</Text>
                </View>
              </>
            )}
            <View style={styles.paymentStatus}>
              <Text style={styles.paymentStatusText}>
                Payment Status: {booking.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Person Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isCustomer ? 'Artisan' : 'Customer'}
          </Text>
          <View style={styles.card}>
            <Text style={styles.personName}>
              {isCustomer
                ? booking.artisanProfile.businessName
                : `${booking.customer.firstName} ${booking.customer.lastName}`}
            </Text>
            {isCustomer && (
              <Text style={styles.tradeBadge}>{booking.artisanProfile.trade}</Text>
            )}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => {
                const phone = isCustomer ? booking.artisan.phone : booking.customer.phone;
                Linking.openURL(`tel:${phone}`);
              }}
            >
              <Text style={styles.contactButtonText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Warranty Info */}
        {booking.status === 'confirmed' && booking.warrantyExpiresAt && (
          <View style={styles.section}>
            <View style={styles.warrantyCard}>
              <Text style={styles.warrantyIcon}>🛡️</Text>
              <Text style={styles.warrantyTitle}>30-Day Warranty Active</Text>
              <Text style={styles.warrantyText}>
                Expires on {formatDate(booking.warrantyExpiresAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Customer Actions */}
          {isCustomer && booking.status === 'payment_pending' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePayment}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Pay {formatPrice(booking.finalPrice || booking.estimatedPrice)}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {isCustomer && booking.status === 'completed' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm & Release Payment</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Artisan Actions */}
          {isArtisan && booking.status === 'pending' && (
            <View style={styles.artisanActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleStatusUpdate('rejected')}
                disabled={actionLoading}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleStatusUpdate('accepted')}
                disabled={actionLoading}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}

          {isArtisan && booking.status === 'paid' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleStatusUpdate('in_progress')}
              disabled={actionLoading}
            >
              <Text style={styles.primaryButtonText}>Start Work</Text>
            </TouchableOpacity>
          )}

          {isArtisan && booking.status === 'in_progress' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleStatusUpdate('completed')}
              disabled={actionLoading}
            >
              <Text style={styles.primaryButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          {['pending', 'accepted', 'payment_pending'].includes(booking.status) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    color: Colors.white,
    fontSize: 16,
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
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  jobType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.gray,
    width: 80,
  },
  value: {
    fontSize: 14,
    color: Colors.black,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.gray,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.green,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  feeValue: {
    fontSize: 14,
    color: Colors.gray,
  },
  earningsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.green,
  },
  paymentStatus: {
    backgroundColor: Colors.lightGray,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray,
  },
  personName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 4,
  },
  tradeBadge: {
    fontSize: 13,
    color: Colors.green,
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  contactButton: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  warrantyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  warrantyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warrantyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.green,
    marginBottom: 4,
  },
  warrantyText: {
    fontSize: 13,
    color: Colors.gray,
  },
  actions: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: Colors.green,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  artisanActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  rejectButtonText: {
    color: Colors.gray,
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.green,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

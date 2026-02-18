import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch, getToken } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface Booking {
  _id: string;
  jobType: string;
  description: string;
  status: string;
  estimatedPrice: number;
  finalPrice?: number;
  scheduledDate?: string;
  createdAt: string;
  artisanProfile: {
    businessName: string;
    trade: string;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  artisan: {
    firstName: string;
    lastName: string;
  };
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
  pending: 'Pending',
  accepted: 'Accepted',
  payment_pending: 'Awaiting Payment',
  paid: 'Paid',
  in_progress: 'In Progress',
  completed: 'Completed',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  disputed: 'Disputed',
};

export default function BookingsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchBookings = useCallback(async () => {
    if (!token) return;

    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiFetch<{ bookings: Booking[] }>(`/bookings${params}`, { token });
      setBookings(res.data?.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const isCustomer = user?.role === 'customer';

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptyText}>Please login to view your bookings</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => router.push(`/booking/${item._id}`)}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.jobType}>{item.jobType}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.bookingInfo}>
        <Text style={styles.infoLabel}>
          {isCustomer ? 'Artisan' : 'Customer'}:
        </Text>
        <Text style={styles.infoValue}>
          {isCustomer
            ? item.artisanProfile?.businessName
            : `${item.customer?.firstName} ${item.customer?.lastName}`}
        </Text>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.price}>
          {item.finalPrice ? formatPrice(item.finalPrice) : formatPrice(item.estimatedPrice)}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'in_progress', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptyText}>
            {isCustomer
              ? 'Find an artisan and make your first booking!'
              : 'You haven\'t received any bookings yet.'}
          </Text>
          {isCustomer && (
            <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
              <Text style={styles.searchButtonText}>Find Artisans</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
  },
  filterTabActive: {
    backgroundColor: Colors.green,
  },
  filterText: {
    fontSize: 13,
    color: Colors.gray,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 10,
    lineHeight: 20,
  },
  bookingInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.gray,
    marginRight: 5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.black,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.green,
  },
  date: {
    fontSize: 12,
    color: Colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  searchButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
  },
  searchButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

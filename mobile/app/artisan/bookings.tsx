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
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface Booking {
  _id: string;
  customer: { _id: string; firstName: string; lastName: string; phone: string };
  jobType: string;
  description: string;
  status: string;
  estimatedPrice: number;
  finalPrice?: number;
  location: string;
  address: string;
  createdAt: string;
  scheduledDate?: string;
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed';

export default function ArtisanBookingsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const fetchBookings = useCallback(async () => {
    if (!token) return;

    try {
      const params = filter !== 'all' ? `?status=${filter}&role=artisan` : '?role=artisan';
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      accepted: '#3B82F6',
      rejected: '#EF4444',
      payment_pending: '#8B5CF6',
      paid: '#10B981',
      in_progress: '#3B82F6',
      completed: '#10B981',
      confirmed: Colors.green,
      disputed: '#EF4444',
      cancelled: '#6B7280',
    };
    return colors[status] || Colors.gray;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'New Request',
      accepted: 'Accepted',
      rejected: 'Declined',
      payment_pending: 'Awaiting Payment',
      paid: 'Paid',
      in_progress: 'In Progress',
      completed: 'Completed',
      confirmed: 'Confirmed',
      disputed: 'Disputed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'New' },
    { key: 'accepted', label: 'Active' },
    { key: 'in_progress', label: 'Ongoing' },
    { key: 'completed', label: 'Done' },
  ];

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => router.push(`/booking/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>
            {item.customer.firstName} {item.customer.lastName}
          </Text>
          <Text style={styles.jobType}>{item.jobType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        {item.scheduledDate && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>{item.scheduledDate}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.price}>
          ₦{(item.finalPrice || item.estimatedPrice).toLocaleString()}
        </Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>Tap to respond to this request</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
          title: 'My Bookings',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <View style={styles.container}>
        {/* Filters */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filters}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text
                  style={[styles.filterText, filter === item.key && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Bookings</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? "You don't have any bookings yet."
                : `No ${filter.replace('_', ' ')} bookings.`}
            </Text>
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
  },
  filterContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: Colors.green,
  },
  filterText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
  },
  jobType: {
    fontSize: 14,
    color: Colors.green,
    marginTop: 2,
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
    lineHeight: 20,
    marginBottom: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.gray,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.green,
  },
  date: {
    fontSize: 12,
    color: Colors.gray,
  },
  actionHint: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  actionHintText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
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
  },
});

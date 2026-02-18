import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalEarnings: number;
  monthlyEarnings: number;
  profileViews: number;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  subscriptionStatus: 'active' | 'expired' | 'none';
  subscriptionExpiresAt?: string;
}

interface RecentBooking {
  _id: string;
  customer: { firstName: string; lastName: string };
  jobType: string;
  status: string;
  estimatedPrice: number;
  createdAt: string;
}

export default function ArtisanDashboardScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;

    try {
      const [statsRes, bookingsRes] = await Promise.all([
        apiFetch<DashboardStats>('/artisans/my-profile/stats', { token }),
        apiFetch<{ bookings: RecentBooking[] }>('/bookings?limit=5&role=artisan', { token }),
      ]);

      setStats(statsRes.data || null);
      setRecentBookings(bookingsRes.data?.bookings || []);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      accepted: Colors.green,
      rejected: '#EF4444',
      in_progress: '#3B82F6',
      completed: '#10B981',
      confirmed: Colors.green,
    };
    return colors[status] || Colors.gray;
  };

  if (!user || user.role !== 'artisan') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>👷</Text>
        <Text style={styles.errorTitle}>Artisan Access Only</Text>
        <Text style={styles.errorText}>This dashboard is for artisans.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
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
          title: 'Dashboard',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
        }
      >
        {/* Verification Banner */}
        {!stats?.isVerified && (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/artisan/verification')}
          >
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Complete Verification</Text>
              <Text style={styles.bannerText}>Get verified to start receiving bookings</Text>
            </View>
            <Text style={styles.bannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₦{(stats?.monthlyEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.pendingBookings || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.completedBookings || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ★ {(stats?.averageRating || 0).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>{stats?.totalReviews || 0} Reviews</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/artisan/bookings')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionLabel}>Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/artisan/earnings')}
            >
              <Text style={styles.actionIcon}>💰</Text>
              <Text style={styles.actionLabel}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/artisan/profile')}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/artisan/reviews')}
            >
              <Text style={styles.actionIcon}>⭐</Text>
              <Text style={styles.actionLabel}>Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/artisan/bookings')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentBookings.length === 0 ? (
            <View style={styles.emptyBookings}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            recentBookings.map((booking) => (
              <TouchableOpacity
                key={booking._id}
                style={styles.bookingCard}
                onPress={() => router.push(`/booking/${booking._id}`)}
              >
                <View style={styles.bookingHeader}>
                  <Text style={styles.customerName}>
                    {booking.customer.firstName} {booking.customer.lastName}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>{booking.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.jobType}>{booking.jobType}</Text>
                <View style={styles.bookingFooter}>
                  <Text style={styles.price}>₦{booking.estimatedPrice.toLocaleString()}</Text>
                  <Text style={styles.date}>
                    {new Date(booking.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Profile Views</Text>
              <Text style={styles.insightValue}>{stats?.profileViews || 0}</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Earnings</Text>
              <Text style={styles.insightValue}>₦{(stats?.totalEarnings || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Bookings</Text>
              <Text style={styles.insightValue}>{stats?.totalBookings || 0}</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Verification</Text>
              <Text style={[styles.insightValue, { color: stats?.isVerified ? Colors.green : '#F59E0B' }]}>
                {stats?.isVerified ? '✓ Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
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
    backgroundColor: Colors.white,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
  },
  bannerText: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 20,
    color: '#92400E',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: 16,
    margin: '1%',
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.green,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.green,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -12,
  },
  actionCard: {
    width: '23%',
    backgroundColor: Colors.white,
    padding: 14,
    margin: '1%',
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.gray,
    textAlign: 'center',
  },
  emptyBookings: {
    backgroundColor: Colors.white,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.black,
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
    textTransform: 'capitalize',
  },
  jobType: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.green,
  },
  date: {
    fontSize: 12,
    color: Colors.gray,
  },
  insightCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
});

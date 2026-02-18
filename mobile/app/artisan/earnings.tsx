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
import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  pendingPayouts: number;
  completedJobs: number;
}

interface Transaction {
  _id: string;
  type: 'earning' | 'payout';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  booking?: {
    _id: string;
    jobType: string;
    customer: { firstName: string; lastName: string };
  };
  createdAt: string;
}

type TimeFilter = 'week' | 'month' | 'year' | 'all';

export default function ArtisanEarningsScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  const fetchEarnings = useCallback(async () => {
    if (!token) return;

    try {
      const [statsRes, transactionsRes] = await Promise.all([
        apiFetch<EarningsStats>('/artisans/my-profile/earnings', { token }),
        apiFetch<{ transactions: Transaction[] }>(`/artisans/my-profile/transactions?period=${timeFilter}`, { token }),
      ]);

      setStats(statsRes.data || null);
      setTransactions(transactionsRes.data?.transactions || []);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, timeFilter]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const filters: { key: TimeFilter; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ];

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Text style={styles.iconText}>
          {item.type === 'earning' ? '💰' : '🏦'}
        </Text>
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle}>
          {item.type === 'earning' ? 'Payment Received' : 'Payout'}
        </Text>
        <Text style={styles.transactionDesc}>
          {item.booking
            ? `${item.booking.customer.firstName} - ${item.booking.jobType}`
            : item.description}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.createdAt).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text
          style={[
            styles.amountText,
            { color: item.type === 'earning' ? Colors.green : '#3B82F6' },
          ]}
        >
          {item.type === 'earning' ? '+' : '-'}₦{item.amount.toLocaleString()}
        </Text>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                item.status === 'completed'
                  ? Colors.green
                  : item.status === 'pending'
                  ? '#F59E0B'
                  : '#EF4444',
            },
          ]}
        />
      </View>
    </View>
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
          title: 'Earnings',
          headerStyle: { backgroundColor: Colors.green },
          headerTintColor: Colors.white,
        }}
      />
      <View style={styles.container}>
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Total Earnings</Text>
            <Text style={styles.mainStatValue}>
              ₦{(stats?.totalEarnings || 0).toLocaleString()}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ₦{(stats?.weeklyEarnings || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ₦{(stats?.monthlyEarnings || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.completedJobs || 0}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
          </View>

          {(stats?.pendingPayouts || 0) > 0 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <Text style={styles.pendingText}>
                ₦{stats?.pendingPayouts.toLocaleString()} pending payout
              </Text>
            </View>
          )}
        </View>

        {/* Time Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filters}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, timeFilter === item.key && styles.filterChipActive]}
                onPress={() => setTimeFilter(item.key)}
              >
                <Text
                  style={[styles.filterText, timeFilter === item.key && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyText}>
              Your earnings and payouts will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
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
  statsHeader: {
    backgroundColor: Colors.green,
    padding: 20,
    paddingTop: 10,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  mainStatValue: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
  },
  pendingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pendingText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.white,
  },
  section: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 2,
  },
  transactionDesc: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: Colors.gray,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
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

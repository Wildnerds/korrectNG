import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, getToken } from '../../src/lib/api';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile, WarrantyClaim } from '@korrectng/shared';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks] = useState<ArtisanProfile[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    if (!user) return;
    const token = await getToken();
    try {
      if (user.role === 'customer') {
        const claimsRes = await apiFetch<WarrantyClaim[]>('/warranty/my-claims', { token });
        setClaims(claimsRes.data || []);
      }
    } catch {
      // Handle error
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading || dataLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in to access your dashboard</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (user.role === 'artisan') {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Artisan Dashboard</Text>
          <Text style={styles.subtitle}>Manage your profile and track performance</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionText}>Complete Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/artisan/edit-profile')}
          >
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/artisan/gallery')}
          >
            <Text style={styles.actionText}>Manage Gallery</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Customer dashboard
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user.firstName}!</Text>
        <Text style={styles.subtitle}>Your dashboard</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Artisans</Text>
        {user.bookmarkedArtisans?.length > 0 ? (
          <Text style={styles.emptyText}>{user.bookmarkedArtisans.length} saved</Text>
        ) : (
          <Text style={styles.emptyText}>No saved artisans yet</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Warranty Claims</Text>
        {claims.length > 0 ? (
          claims.map((claim) => (
            <View key={claim._id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimTitle}>{claim.jobDescription}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    claim.status === 'resolved' ? styles.statusResolved : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>{claim.status}</Text>
                </View>
              </View>
              <Text style={styles.claimDesc}>{claim.issueDescription}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No warranty claims</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: Colors.green, padding: 20, paddingTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  subtitle: { fontSize: 14, color: Colors.white, opacity: 0.9, marginTop: 4 },
  statsRow: { flexDirection: 'row', padding: 15, justifyContent: 'space-between' },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.green },
  statLabel: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  actionText: { fontSize: 14, fontWeight: '500' },
  emptyText: { color: Colors.gray, textAlign: 'center', padding: 20 },
  claimCard: { backgroundColor: Colors.white, borderRadius: 8, padding: 15, marginBottom: 10 },
  claimHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  claimTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  claimDesc: { fontSize: 12, color: Colors.gray },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusResolved: { backgroundColor: '#d1fae5' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 10, fontWeight: '600' },
  button: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  buttonText: { color: Colors.white, fontWeight: 'bold' },
});

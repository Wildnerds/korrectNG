import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { apiFetch } from '../src/lib/api';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile, PaginatedResponse } from '@korrectng/shared';

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ trade?: string; location?: string; q?: string }>();
  const [artisans, setArtisans] = useState<ArtisanProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchArtisans(1);
  }, [params.trade, params.location, params.q]);

  async function fetchArtisans(pageNum: number) {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params.trade) queryParams.set('trade', params.trade);
      if (params.location) queryParams.set('location', params.location);
      if (params.q) queryParams.set('q', params.q);
      queryParams.set('page', pageNum.toString());
      queryParams.set('limit', '12');

      const res = await apiFetch<PaginatedResponse<ArtisanProfile>>(`/artisans?${queryParams.toString()}`);
      const data = res.data?.data || [];

      if (pageNum === 1) {
        setArtisans(data);
      } else {
        setArtisans((prev) => [...prev, ...data]);
      }
      setPage(pageNum);
      setHasMore(data.length === 12);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchArtisans(page + 1);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArtisans(1);
    setRefreshing(false);
  };

  const renderArtisan = ({ item }: { item: ArtisanProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/artisan/${item.slug}`)}
    >
      <View style={styles.cardImage}>
        <Text style={styles.emoji}>
          {item.trade === 'mechanic' ? '🔧' :
           item.trade === 'electrician' ? '⚡' :
           item.trade === 'ac-tech' ? '❄️' : '🔧'}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VERIFIED</Text>
        </View>
        <Text style={styles.name}>{item.businessName}</Text>
        <Text style={styles.trade}>
          {getTradeLabel(item.trade)} - {item.location}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.stars}>★★★★★</Text>
          <Text style={styles.ratingText}>
            {formatRating(item.averageRating)} ({item.totalReviews} reviews)
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{item.yearsOfExperience} yrs exp</Text>
          <Text style={styles.stat}>{item.jobsCompleted}+ jobs</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const title = params.trade
    ? `${getTradeLabel(params.trade)}${params.location ? ` in ${params.location}` : ''}`
    : 'Search Results';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerCount}>{artisans.length} results</Text>
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : artisans.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No artisans found</Text>
          <Text style={styles.emptyText}>Try adjusting your search</Text>
        </View>
      ) : (
        <FlatList
          data={artisans}
          keyExtractor={(item) => item._id}
          renderItem={renderArtisan}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
          }
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator size="small" color={Colors.green} style={{ padding: 20 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerCount: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: Colors.gray },
  list: { padding: 15 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    height: 120,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 50 },
  cardContent: { padding: 15 },
  badge: {
    backgroundColor: Colors.green,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  trade: { fontSize: 13, color: Colors.gray, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stars: { color: Colors.star, marginRight: 6 },
  ratingText: { fontSize: 13, color: Colors.gray },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: { fontSize: 12, color: Colors.gray },
});

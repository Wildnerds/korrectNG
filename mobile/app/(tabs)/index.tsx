import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch } from '../../src/lib/api';
import { TRADES, getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';

export default function HomeScreen() {
  const router = useRouter();
  const [searchTrade, setSearchTrade] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [featuredArtisans, setFeaturedArtisans] = useState<ArtisanProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchFeatured() {
    try {
      const res = await apiFetch<ArtisanProfile[]>('/artisans/featured');
      setFeaturedArtisans(res.data || []);
    } catch {
      // Handle error
    }
  }

  useEffect(() => {
    fetchFeatured();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeatured();
    setRefreshing(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTrade) params.set('trade', searchTrade);
    if (searchLocation) params.set('location', searchLocation);
    router.push(`/search-results?${params.toString()}`);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Find Verified Artisans You Can Trust</Text>
        <Text style={styles.heroSubtitle}>
          Mechanics, Electricians, Plumbers & More - All Verified
        </Text>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="What do you need?"
            value={searchTrade}
            onChangeText={setSearchTrade}
            placeholderTextColor={Colors.gray}
          />
          <TextInput
            style={styles.input}
            placeholder="Location (e.g., Lekki)"
            value={searchLocation}
            onChangeText={setSearchLocation}
            placeholderTextColor={Colors.gray}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trade Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Trade</Text>
        <View style={styles.tradesGrid}>
          {TRADES.slice(0, 8).map((trade) => (
            <TouchableOpacity
              key={trade.value}
              style={styles.tradeCard}
              onPress={() => router.push(`/search-results?trade=${trade.value}`)}
            >
              <Text style={styles.tradeIcon}>{trade.icon}</Text>
              <Text style={styles.tradeLabel}>{trade.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured Artisans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Artisans</Text>
        {featuredArtisans.length > 0 ? (
          <FlatList
            horizontal
            data={featuredArtisans}
            keyExtractor={(item) => item._id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.artisanCard}
                onPress={() => router.push(`/artisan/${item.slug}`)}
              >
                <View style={styles.artisanImagePlaceholder}>
                  <Text style={styles.artisanEmoji}>
                    {item.trade === 'mechanic' ? '🔧' :
                     item.trade === 'electrician' ? '⚡' :
                     item.trade === 'ac-tech' ? '❄️' : '🔧'}
                  </Text>
                </View>
                <View style={styles.artisanInfo}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>VERIFIED</Text>
                  </View>
                  <Text style={styles.artisanName}>{item.businessName}</Text>
                  <Text style={styles.artisanTrade}>
                    {getTradeLabel(item.trade)} - {item.location}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.ratingText}>
                      {formatRating(item.averageRating)} ({item.totalReviews})
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <Text style={styles.emptyText}>No featured artisans yet</Text>
        )}
      </View>

      {/* Trust Badges */}
      <View style={styles.section}>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>✓</Text>
          <Text style={styles.trustTitle}>500+ Verified Artisans</Text>
          <Text style={styles.trustDesc}>Background checked & skills tested</Text>
        </View>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>⭐</Text>
          <Text style={styles.trustTitle}>4.8 Average Rating</Text>
          <Text style={styles.trustDesc}>Real reviews from customers</Text>
        </View>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>🛡️</Text>
          <Text style={styles.trustTitle}>30-Day Warranty</Text>
          <Text style={styles.trustDesc}>Every job protected</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  hero: {
    backgroundColor: Colors.green,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
  },
  searchBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: Colors.green,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  searchButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  tradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tradeCard: {
    width: '23%',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  tradeIcon: { fontSize: 28, marginBottom: 5 },
  tradeLabel: { fontSize: 10, textAlign: 'center', color: Colors.black },
  artisanCard: {
    width: 200,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artisanImagePlaceholder: {
    height: 100,
    backgroundColor: Colors.green,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artisanEmoji: { fontSize: 40 },
  artisanInfo: { padding: 12 },
  verifiedBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  verifiedText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  artisanName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  artisanTrade: { fontSize: 12, color: Colors.gray, marginBottom: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  stars: { color: Colors.star, fontSize: 12, marginRight: 5 },
  ratingText: { fontSize: 12, color: Colors.gray },
  emptyText: { color: Colors.gray, textAlign: 'center', padding: 20 },
  trustBadge: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  trustIcon: { fontSize: 32, marginBottom: 8 },
  trustTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.green, marginBottom: 4 },
  trustDesc: { fontSize: 12, color: Colors.gray, textAlign: 'center' },
});

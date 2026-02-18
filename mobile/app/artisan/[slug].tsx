import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, getToken } from '../../src/lib/api';
import { getTradeLabel, formatRating, getWhatsAppLink, getPhoneLink, timeAgo } from '@korrectng/shared';
import type { ArtisanProfile, Review, PaginatedResponse } from '@korrectng/shared';

export default function ArtisanProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteReview = async (reviewId: string) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            await apiFetch(`/reviews/${reviewId}`, { method: 'DELETE', token });
            setReviews(reviews.filter((r) => r._id !== reviewId));
          } catch {
            Alert.alert('Error', 'Failed to delete review');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const artisanRes = await apiFetch<ArtisanProfile>(`/artisans/${slug}`);
        setArtisan(artisanRes.data || null);

        if (artisanRes.data?._id) {
          const reviewsRes = await apiFetch<PaginatedResponse<Review>>(
            `/reviews/artisan/${artisanRes.data._id}?limit=5`
          );
          setReviews(reviewsRes.data?.data || []);
        }
      } catch {
        Alert.alert('Error', 'Failed to load artisan profile');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const handleWhatsApp = () => {
    if (!artisan) return;
    const link = getWhatsAppLink(
      artisan.whatsappNumber,
      `Hi, I found you on KorrectNG. I need a ${getTradeLabel(artisan.trade)}.`
    );
    Linking.openURL(link).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleCall = () => {
    if (!artisan) return;
    const link = getPhoneLink(artisan.phoneNumber);
    Linking.openURL(link).catch(() => Alert.alert('Error', 'Could not make call'));
  };

  const handleBookmark = async () => {
    if (!artisan) return;
    const token = await getToken();
    if (!token) {
      Alert.alert('Sign In', 'Please sign in to bookmark artisans');
      return;
    }
    try {
      await apiFetch(`/artisans/${artisan._id}/bookmark`, { method: 'POST', token });
      Alert.alert('Success', 'Artisan bookmarked!');
    } catch {
      Alert.alert('Error', 'Failed to bookmark');
    }
  };

  const handleShare = async () => {
    if (!artisan) return;
    try {
      await Share.share({
        message: `Check out ${artisan.businessName} on KorrectNG - a verified ${getTradeLabel(artisan.trade)} you can trust! https://korrectng.com/artisan/${artisan.slug}`,
        title: artisan.businessName,
      });
    } catch {
      // Handle error
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (!artisan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Artisan not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerImage}>
          <Text style={styles.headerEmoji}>
            {artisan.trade === 'mechanic' ? '🔧' :
             artisan.trade === 'electrician' ? '⚡' :
             artisan.trade === 'ac-tech' ? '❄️' : '🔧'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VERIFIED</Text>
        </View>
        <Text style={styles.name}>{artisan.businessName}</Text>
        <Text style={styles.trade}>
          {getTradeLabel(artisan.trade)} - {artisan.location}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.stars}>
            {'★'.repeat(Math.round(artisan.averageRating))}
          </Text>
          <Text style={styles.ratingText}>
            {formatRating(artisan.averageRating)} ({artisan.totalReviews} reviews)
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
          <Text style={styles.btnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Text style={styles.callBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookmarkBtn} onPress={handleBookmark}>
          <Text style={styles.bookmarkText}>☆</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* Report Issue Button */}
      <TouchableOpacity
        style={styles.reportBtn}
        onPress={() => {
          if (!user) {
            Alert.alert('Sign In', 'Please sign in to submit a warranty claim');
            return;
          }
          router.push({
            pathname: '/warranty-claim',
            params: { artisanId: artisan._id, artisanName: artisan.businessName },
          });
        }}
      >
        <Text style={styles.reportBtnText}>Report Issue / Warranty Claim</Text>
      </TouchableOpacity>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{artisan.description}</Text>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience</Text>
          <Text style={styles.detailValue}>{artisan.yearsOfExperience} years</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Jobs Completed</Text>
          <Text style={styles.detailValue}>{artisan.jobsCompleted}+</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{artisan.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Working Hours</Text>
          <Text style={styles.detailValue}>{artisan.workingHours}</Text>
        </View>
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews ({artisan.totalReviews})</Text>
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <View key={review._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </Text>
                <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
              </View>
              <Text style={styles.reviewTitle}>{review.title}</Text>
              <Text style={styles.reviewText}>{review.text}</Text>
              {user && ((review.customer as any)?._id === user._id || (review.customer as string) === user._id) && (
                <TouchableOpacity onPress={() => handleDeleteReview(review._id)}>
                  <Text style={styles.deleteButton}>Delete my review</Text>
                </TouchableOpacity>
              )}
              {review.artisanResponse && (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Artisan Response:</Text>
                  <Text style={styles.responseText}>{review.artisanResponse}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No reviews yet</Text>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.gray },
  header: {
    backgroundColor: Colors.green,
    padding: 20,
    alignItems: 'center',
  },
  headerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerEmoji: { fontSize: 50 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  trade: { fontSize: 15, color: Colors.white, opacity: 0.9, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  stars: { color: Colors.star, fontSize: 16, marginRight: 6 },
  ratingText: { color: Colors.white, fontSize: 14 },
  actions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: Colors.whatsapp,
    padding: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  callBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  bookmarkBtn: {
    width: 50,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
  callBtnText: { color: Colors.green, fontWeight: 'bold', fontSize: 15 },
  bookmarkText: { fontSize: 24, color: Colors.orange },
  shareBtn: {
    width: 50,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  shareText: { fontSize: 20, color: Colors.green },
  reportBtn: {
    marginHorizontal: 15,
    marginTop: 10,
    borderWidth: 2,
    borderColor: Colors.orange,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  reportBtnText: { color: Colors.orange, fontWeight: 'bold', fontSize: 14 },
  section: {
    backgroundColor: Colors.white,
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 14, color: Colors.gray, lineHeight: 22 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: { color: Colors.gray, fontSize: 14 },
  detailValue: { fontWeight: '500', fontSize: 14 },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewStars: { color: Colors.star },
  reviewDate: { fontSize: 12, color: Colors.gray },
  reviewTitle: { fontWeight: '600', marginBottom: 4 },
  reviewText: { fontSize: 13, color: Colors.gray, lineHeight: 20 },
  responseBox: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: Colors.green,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 4,
  },
  responseLabel: { fontSize: 12, fontWeight: '600', color: Colors.green, marginBottom: 4 },
  responseText: { fontSize: 13, color: Colors.gray },
  emptyText: { color: Colors.gray, textAlign: 'center', padding: 20 },
  deleteButton: { color: '#dc2626', fontSize: 12, marginTop: 8 },
});

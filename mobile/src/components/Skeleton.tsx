import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Colors } from '../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ArtisanCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={120} borderRadius={0} />
      <View style={styles.cardContent}>
        <Skeleton width={60} height={16} style={styles.mb8} />
        <Skeleton width="80%" height={18} style={styles.mb8} />
        <Skeleton width="60%" height={14} style={styles.mb8} />
        <View style={styles.row}>
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} style={styles.ml8} />
        </View>
      </View>
    </View>
  );
}

export function ArtisanProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle}>
          <Skeleton width={100} height={100} borderRadius={50} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>
        <Skeleton width={150} height={24} style={[styles.mb8, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        <Skeleton width={120} height={16} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Skeleton width="40%" height={44} borderRadius={8} />
        <Skeleton width="40%" height={44} borderRadius={8} />
        <Skeleton width={50} height={44} borderRadius={8} />
      </View>

      {/* Content sections */}
      <View style={styles.section}>
        <Skeleton width={80} height={20} style={styles.mb12} />
        <Skeleton height={14} style={styles.mb8} />
        <Skeleton height={14} style={styles.mb8} />
        <Skeleton width="70%" height={14} />
      </View>

      <View style={styles.section}>
        <Skeleton width={80} height={20} style={styles.mb12} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.row, styles.detailRow]}>
            <Skeleton width={80} height={14} />
            <Skeleton width={100} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function SearchResultsSkeleton() {
  return (
    <View style={styles.list}>
      {[1, 2, 3].map((i) => (
        <ArtisanCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  cardContent: { padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  ml8: { marginLeft: 8 },
  header: {
    backgroundColor: Colors.green,
    padding: 20,
    alignItems: 'center',
  },
  headerCircle: { marginBottom: 15 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: Colors.white,
  },
  section: {
    backgroundColor: Colors.white,
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
    padding: 15,
  },
  detailRow: {
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  list: { padding: 15 },
});

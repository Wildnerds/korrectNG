import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { TRADES, LOCATIONS } from '@korrectng/shared';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTrade) params.set('trade', selectedTrade);
    if (location) params.set('location', location);
    if (searchQuery) params.set('q', searchQuery);
    router.push(`/search-results?${params.toString()}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchSection}>
        <Text style={styles.label}>What are you looking for?</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by keyword..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.label}>Select Trade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, !selectedTrade && styles.chipActive]}
            onPress={() => setSelectedTrade('')}
          >
            <Text style={[styles.chipText, !selectedTrade && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {TRADES.map((trade) => (
            <TouchableOpacity
              key={trade.value}
              style={[styles.chip, selectedTrade === trade.value && styles.chipActive]}
              onPress={() => setSelectedTrade(trade.value)}
            >
              <Text style={[styles.chipText, selectedTrade === trade.value && styles.chipTextActive]}>
                {trade.icon} {trade.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter location (e.g., Lekki)"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.subLabel}>Popular locations:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {LOCATIONS.slice(0, 10).map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.chip, location === loc && styles.chipActive]}
              onPress={() => setLocation(loc)}
            >
              <Text style={[styles.chipText, location === loc && styles.chipTextActive]}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search Artisans</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  searchSection: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 15 },
  subLabel: { fontSize: 12, color: Colors.gray, marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  chipsRow: { flexDirection: 'row', marginBottom: 5 },
  chip: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.green },
  chipText: { fontSize: 14, color: Colors.black },
  chipTextActive: { color: Colors.white },
  searchButton: {
    backgroundColor: Colors.green,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  searchButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});

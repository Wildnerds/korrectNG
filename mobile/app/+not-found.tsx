import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.message}>
        Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/search')}>
        <Text style={styles.secondaryButtonText}>Find Artisans</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: { fontSize: 80, marginBottom: 20 },
  code: { fontSize: 48, fontWeight: 'bold', color: Colors.green, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '600', color: '#374151', marginBottom: 10 },
  message: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 300,
  },
  button: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  secondaryButton: {
    borderWidth: 2,
    borderColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: { color: Colors.green, fontWeight: 'bold', fontSize: 16 },
});

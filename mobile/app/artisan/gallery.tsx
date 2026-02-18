import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, getToken, API_URL } from '../../src/lib/api';
import type { ArtisanProfile, GalleryImage } from '@korrectng/shared';

export default function ArtisanGalleryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    fetchGallery();
  }, [user]);

  async function fetchGallery() {
    try {
      const artisansRes = await apiFetch<{ data: ArtisanProfile[] }>('/artisans?limit=100');
      const artisanProfile = artisansRes.data?.data?.find(
        (a: any) => (a.user as any)?._id === user?._id || a.user === user?._id
      );

      if (artisanProfile) {
        setImages(artisanProfile.galleryImages || []);
      }
    } catch {
      Alert.alert('Error', 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }

  const pickImage = async () => {
    if (images.length >= 20) {
      Alert.alert('Limit Reached', 'Maximum 20 images allowed');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20 - images.length,
    });

    if (!result.canceled && result.assets.length > 0) {
      uploadImages(result.assets);
    }
  };

  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);

    try {
      const token = await getToken();
      const uploadedImages: GalleryImage[] = [];

      for (const asset of assets) {
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'image.jpg',
        } as any);
        formData.append('folder', 'gallery');

        const response = await fetch(`${API_URL}/upload/single`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        uploadedImages.push({
          url: data.data.url,
          publicId: data.data.publicId,
        });
      }

      // Add images to gallery
      await apiFetch('/artisans/gallery', {
        method: 'POST',
        body: JSON.stringify({ images: uploadedImages }),
        token,
      });

      setImages([...images, ...uploadedImages]);
      Alert.alert('Success', `${uploadedImages.length} image(s) uploaded!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (publicId: string) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(publicId);
          try {
            const token = await getToken();
            await apiFetch(`/artisans/gallery/${encodeURIComponent(publicId)}`, {
              method: 'DELETE',
              token,
            });

            setImages(images.filter((img) => img.publicId !== publicId));
          } catch {
            Alert.alert('Error', 'Failed to delete image');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gallery Management</Text>
          <Text style={styles.subtitle}>{images.length} of 20 images</Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadButton, (uploading || images.length >= 20) && styles.buttonDisabled]}
          onPress={pickImage}
          disabled={uploading || images.length >= 20}
        >
          <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Add Photos'}</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color={Colors.white} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((image) => (
            <View key={image.publicId} style={styles.imageContainer}>
              <Image source={{ uri: image.url }} style={styles.image} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteImage(image.publicId)}
                disabled={deleting === image.publicId}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting === image.publicId ? '...' : '×'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No gallery images yet</Text>
          <Text style={styles.emptyText}>
            Upload photos of your work to attract more customers
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.white,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: Colors.gray, marginTop: 2 },
  uploadButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  uploadButtonText: { color: Colors.white, fontWeight: 'bold' },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
    padding: 10,
  },
  uploadingText: { color: Colors.white, marginLeft: 10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  imageContainer: {
    width: '48%',
    margin: '1%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: Colors.white,
    margin: 15,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.gray, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
});

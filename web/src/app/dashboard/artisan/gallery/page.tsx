'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import type { ArtisanProfile, GalleryImage, GalleryCategory } from '@korrectng/shared';
import { GALLERY_CATEGORIES } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function ArtisanGalleryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCategory, setEditCategory] = useState<GalleryCategory>('other');
  const [uploadCategory, setUploadCategory] = useState<GalleryCategory>('completed');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await apiFetch<ArtisanProfile>('/artisans/my-profile');

        if (res.data) {
          // Sort by order
          const sorted = [...(res.data.galleryImages || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setImages(sorted);
        }
      } catch {
        showToast('Failed to load gallery', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchGallery();
  }, [user, showToast]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > 20) {
      showToast('Maximum 20 images allowed', 'error');
      return;
    }

    setUploading(true);

    try {
      const uploadedImages: GalleryImage[] = [];

      // Get CSRF token for upload requests
      let csrfToken = Cookies.get('csrf_token');

      // Fetch CSRF token if not available
      if (!csrfToken) {
        try {
          const csrfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/csrf-token`, {
            credentials: 'include',
          });
          if (csrfRes.ok) {
            const csrfData = await csrfRes.json();
            csrfToken = csrfData.data?.csrfToken;
          }
        } catch {
          // Continue without CSRF token - will fail on protected endpoints
        }
      }

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'gallery');

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/single`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Upload failed');

        const uploadData = await uploadRes.json();
        uploadedImages.push({
          url: uploadData.data.url,
          publicId: uploadData.data.publicId,
          category: uploadCategory,
          order: images.length + uploadedImages.length,
        });
      }

      // Add images to gallery
      await apiFetch('/artisans/gallery', {
        method: 'POST',
        body: JSON.stringify({ images: uploadedImages }),
      });

      setImages([...images, ...uploadedImages]);
      showToast(`${uploadedImages.length} image(s) uploaded successfully!`, 'success');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload images', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (publicId: string) => {
    setDeleting(publicId);
    try {
      await apiFetch(`/artisans/gallery/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });

      setImages(images.filter((img) => img.publicId !== publicId));
      showToast('Image deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete image', 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleEditStart = (image: GalleryImage) => {
    setEditingImage(image.publicId);
    setEditCaption(image.caption || '');
    setEditCategory(image.category || 'other');
  };

  const handleEditSave = async () => {
    if (!editingImage) return;

    setSaving(true);
    try {
      await apiFetch(`/artisans/gallery/${encodeURIComponent(editingImage)}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption: editCaption, category: editCategory }),
      });

      setImages(images.map((img) =>
        img.publicId === editingImage
          ? { ...img, caption: editCaption, category: editCategory }
          : img
      ));
      showToast('Image updated', 'success');
      setEditingImage(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update image', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dragOverIndex, 0, draggedImage);

    // Update order values
    const reorderedImages = newImages.map((img, idx) => ({ ...img, order: idx }));
    setImages(reorderedImages);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save new order to backend
    try {
      await apiFetch('/artisans/gallery/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order: reorderedImages.map((img) => img.publicId) }),
      });
      showToast('Order saved', 'success');
    } catch {
      showToast('Failed to save order', 'error');
    }
  };

  const getCategoryIcon = (category?: GalleryCategory) => {
    const cat = GALLERY_CATEGORIES.find((c) => c.value === category);
    return cat?.icon || '📷';
  };

  const getCategoryLabel = (category?: GalleryCategory) => {
    const cat = GALLERY_CATEGORIES.find((c) => c.value === category);
    return cat?.label || 'Other';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="mb-6 text-brand-green hover:underline flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gallery Management</h1>
              <p className="text-sm sm:text-base text-brand-gray">{images.length} of 20 images - Drag to reorder</p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-brand-light-gray rounded-xl p-4 sm:p-6 mb-6">
            <h2 className="font-semibold mb-4">Upload New Images</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-brand-gray mb-2">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as GalleryCategory)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                >
                  {GALLERY_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <label
                className={`px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors font-semibold cursor-pointer flex items-center gap-2 ${
                  uploading || images.length >= 20 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Images
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={uploading || images.length >= 20}
                />
              </label>
            </div>
          </div>

          {/* Gallery Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((image, index) => (
                <div
                  key={image.publicId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group rounded-xl overflow-hidden bg-gray-100 cursor-move transition-all aspect-square ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${dragOverIndex === index ? 'ring-2 ring-brand-green ring-offset-2' : ''}`}
                >
                  <img
                    src={image.url}
                    alt={image.caption || 'Gallery'}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />

                  {/* Category badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                    {getCategoryIcon(image.category)} <span className="hidden sm:inline">{getCategoryLabel(image.category)}</span>
                  </div>

                  {/* Caption */}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-sm truncate">{image.caption}</p>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleEditStart(image)}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-green hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(image.publicId)}
                      className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Drag handle indicator */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded flex items-center justify-center text-gray-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-xl text-brand-gray mb-2">No gallery images yet</p>
              <p className="text-brand-gray">Upload photos of your work to attract more customers</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Image</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-gray mb-2">Caption</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray mb-2">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as GalleryCategory)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                >
                  {GALLERY_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingImage(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-xl font-bold mb-2">Delete Image?</h3>
            <p className="text-brand-gray mb-6">This action cannot be undone.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
              >
                {deleting === confirmDelete ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

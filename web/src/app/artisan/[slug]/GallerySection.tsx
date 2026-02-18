'use client';

import { useState, useMemo } from 'react';
import type { GalleryImage, GalleryCategory } from '@korrectng/shared';
import { GALLERY_CATEGORIES } from '@korrectng/shared';
import ImageLightbox from '@/components/ImageLightbox';

interface Props {
  images: GalleryImage[];
}

export default function GallerySection({ images }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory | 'all'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Sort images by order and filter by category
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [images]);

  const filteredImages = useMemo(() => {
    if (selectedCategory === 'all') return sortedImages;
    return sortedImages.filter((img) => img.category === selectedCategory);
  }, [sortedImages, selectedCategory]);

  // Get categories that have images
  const availableCategories = useMemo(() => {
    const categories = new Set(images.map((img) => img.category || 'other'));
    return GALLERY_CATEGORIES.filter((cat) => categories.has(cat.value));
  }, [images]);

  const getCategoryInfo = (category?: GalleryCategory) => {
    return GALLERY_CATEGORIES.find((c) => c.value === category) || GALLERY_CATEGORIES[4]; // 'other' as default
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">📸</span>
          Work Gallery
          <span className="text-brand-gray font-normal text-base">({images.length} photos)</span>
        </h2>

        {/* Category filter */}
        {availableCategories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.value
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredImages.map((img, index) => {
          const catInfo = getCategoryInfo(img.category);
          return (
            <div
              key={img.publicId}
              onClick={() => openLightbox(index)}
              className="relative group cursor-pointer rounded-xl overflow-hidden aspect-square bg-gray-100"
            >
              <img
                src={img.url}
                alt={img.caption || 'Work sample'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {img.caption && (
                    <p className="text-white font-medium mb-1">{img.caption}</p>
                  )}
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <span>{catInfo.icon}</span>
                    <span>{catInfo.label}</span>
                  </div>
                </div>

                {/* Zoom icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category badge (always visible) */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
                <span>{catInfo.icon}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for filtered results */}
      {filteredImages.length === 0 && (
        <div className="text-center py-10 text-brand-gray">
          No photos in this category
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={filteredImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import type { DisputeEvidence } from '@korrectng/shared';

interface EvidenceUploaderProps {
  disputeId: string;
  evidence: DisputeEvidence[];
  canUpload: boolean;
  onUpload?: () => void;
}

export default function EvidenceUploader({
  disputeId,
  evidence,
  canUpload,
  onUpload,
}: EvidenceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Supported: JPEG, PNG, WebP, MP4, PDF');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = Cookies.get('token');

      // First upload to Cloudinary via our upload endpoint
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await apiFetch<{ url: string; publicId: string }>('/upload', {
        method: 'POST',
        token,
        body: formData,
      });

      if (!uploadRes.data) {
        throw new Error('Failed to upload file');
      }

      // Then add evidence to dispute
      const type = file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('video/') ? 'video' : 'document';

      await apiFetch(`/disputes/${disputeId}/evidence`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          type,
          url: uploadRes.data.url,
          publicId: uploadRes.data.publicId,
          description,
        }),
      });

      setDescription('');
      if (onUpload) onUpload();
    } catch (err: any) {
      setError(err.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Evidence</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Existing Evidence */}
      {evidence.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {evidence.map((item, index) => (
            <div key={index} className="relative group">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.description || `Evidence ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-32 object-cover rounded-lg"
                  controls
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              {item.description && (
                <p className="text-xs text-brand-gray mt-1 truncate">{item.description}</p>
              )}
              <p className="text-xs text-brand-gray">
                {new Date(item.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-brand-gray text-sm mb-6">No evidence uploaded yet.</p>
      )}

      {/* Upload Form */}
      {canUpload && (
        <div className="border-t pt-4">
          <p className="text-sm text-brand-gray mb-4">
            Upload photos, videos, or documents to support your case.
          </p>

          <div className="mb-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="hidden"
            id="evidence-upload"
          />

          <label
            htmlFor="evidence-upload"
            className={`block w-full py-3 border-2 border-dashed border-gray-300 rounded-md text-center cursor-pointer hover:border-brand-green transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <span className="text-brand-gray">Uploading...</span>
            ) : (
              <span className="text-brand-gray">
                Click to upload evidence (max 10MB)
              </span>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

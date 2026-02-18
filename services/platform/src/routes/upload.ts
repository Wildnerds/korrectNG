import { Router, Request, Response } from 'express';
import { Logger } from '@korrect/logger';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

// Initialize Cloudinary (will be configured from app.locals)
const getCloudinary = (req: Request) => {
  const config = req.app.locals.cloudinaryConfig;
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });
  return cloudinary;
};

// POST /api/v1/upload/signature - Get upload signature for direct upload
router.post('/signature', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { folder, resourceType } = req.body;
    const config = req.app.locals.cloudinaryConfig;

    if (!config.apiKey || !config.apiSecret) {
      return res.status(500).json({ success: false, error: 'Upload service not configured' });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadFolder = folder || `korrect/${userId}`;

    const paramsToSign = {
      timestamp,
      folder: uploadFolder,
      upload_preset: 'korrect_uploads',
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.apiSecret
    );

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        folder: uploadFolder,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Upload signature error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/upload/image - Upload image (base64)
router.post('/image', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { image, folder, tags } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'Image data required' });
    }

    const config = req.app.locals.cloudinaryConfig;
    if (!config.apiKey) {
      // Mock response for development
      return res.json({
        success: true,
        data: {
          url: 'https://via.placeholder.com/400',
          publicId: 'mock_' + Date.now(),
          width: 400,
          height: 400,
        },
      });
    }

    const cloud = getCloudinary(req);
    const uploadFolder = folder || `korrect/${userId}`;

    const result = await cloud.uploader.upload(image, {
      folder: uploadFolder,
      tags: tags || ['user_upload'],
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    logger.info('Image uploaded', {
      userId,
      publicId: result.public_id,
      bytes: result.bytes,
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Image upload error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// POST /api/v1/upload/document - Upload document (PDF, etc.)
router.post('/document', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { document, folder, filename } = req.body;

    if (!document) {
      return res.status(400).json({ success: false, error: 'Document data required' });
    }

    const config = req.app.locals.cloudinaryConfig;
    if (!config.apiKey) {
      return res.json({
        success: true,
        data: {
          url: 'https://example.com/mock-document.pdf',
          publicId: 'mock_doc_' + Date.now(),
        },
      });
    }

    const cloud = getCloudinary(req);
    const uploadFolder = folder || `korrect/${userId}/documents`;

    const result = await cloud.uploader.upload(document, {
      folder: uploadFolder,
      resource_type: 'raw',
      public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
    });

    logger.info('Document uploaded', {
      userId,
      publicId: result.public_id,
      bytes: result.bytes,
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Document upload error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// DELETE /api/v1/upload/:publicId - Delete uploaded file
router.delete('/:publicId(*)', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { publicId } = req.params;
    const { resourceType } = req.query;

    // Verify ownership (publicId should contain userId)
    if (!publicId.includes(userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this file' });
    }

    const config = req.app.locals.cloudinaryConfig;
    if (!config.apiKey) {
      return res.json({ success: true, message: 'File deleted (mock)' });
    }

    const cloud = getCloudinary(req);
    await cloud.uploader.destroy(publicId, {
      resource_type: (resourceType as string) || 'image',
    });

    logger.info('File deleted', { userId, publicId });

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete file error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

// POST /api/v1/upload/gallery - Upload multiple images
router.post('/gallery', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { images, folder } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'Images array required' });
    }

    if (images.length > 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 images per upload' });
    }

    const config = req.app.locals.cloudinaryConfig;
    const uploadFolder = folder || `korrect/${userId}/gallery`;

    if (!config.apiKey) {
      // Mock response
      const mockResults = images.map((_, i) => ({
        url: `https://via.placeholder.com/400?text=Image${i + 1}`,
        publicId: `mock_${Date.now()}_${i}`,
        width: 400,
        height: 400,
      }));
      return res.json({ success: true, data: mockResults });
    }

    const cloud = getCloudinary(req);
    const results = [];

    for (const image of images) {
      try {
        const result = await cloud.uploader.upload(image, {
          folder: uploadFolder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        });
        results.push({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      } catch (uploadError) {
        logger.error('Gallery image upload failed', { error: uploadError });
      }
    }

    logger.info('Gallery uploaded', {
      userId,
      count: results.length,
    });

    res.json({ success: true, data: results });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Gallery upload error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

export default router;

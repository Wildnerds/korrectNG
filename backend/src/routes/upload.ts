import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400) as any);
    }
  },
});

// Configure Cloudinary lazily to ensure env vars are loaded
let cloudinaryConfigured = false;
function ensureCloudinaryConfig() {
  if (!cloudinaryConfigured) {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
      throw new AppError('Cloudinary configuration missing. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env', 500);
    }

    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });
    cloudinaryConfigured = true;
  }
}

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<any> {
  ensureCloudinaryConfig();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `korrectng/${folder}`,
          transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
}

// POST /api/v1/upload/single
router.post('/single', uploadLimiter, protect, upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/upload/multiple
router.post('/multiple', uploadLimiter, protect, upload.array('images', 10), async (req: AuthRequest, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new AppError('No files uploaded', 400);

    const folder = req.body.folder || 'general';
    const uploads = await Promise.all(files.map((file) => uploadToCloudinary(file.buffer, folder)));

    res.status(200).json({
      success: true,
      data: uploads.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

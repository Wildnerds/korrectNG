/**
 * Document Validation Service
 *
 * Performs validation checks on uploaded documents using:
 * 1. Basic image analysis (dimensions, size, aspect ratio)
 * 2. AI-powered document recognition using Groq
 *
 * Environment variables:
 * - GROQ_API_KEY: Your Groq API key for AI validation
 */

import sharp from 'sharp';
import Groq from 'groq-sdk';
import { log } from '../utils/logger';

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  checks: {
    fileSize: boolean;
    dimensions: boolean;
    aspectRatio: boolean;
    quality: boolean;
    aiValidation?: boolean;
  };
  aiAnalysis?: {
    isDocument: boolean;
    documentType?: string;
    description?: string;
    confidence: number;
  };
  warnings: string[];
  errors: string[];
}

// Typical ID document aspect ratios (width/height)
const ID_ASPECT_RATIOS = {
  min: 1.4,  // Portrait ID
  max: 1.8,  // Landscape ID (credit card style)
};

// Minimum dimensions for a readable ID
const MIN_DIMENSIONS = {
  width: 400,
  height: 250,
};

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Minimum file size (10KB - too small is suspicious)
const MIN_FILE_SIZE = 10 * 1024;

/**
 * Initialize Groq client
 */
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

/**
 * Use Groq AI to analyze a document image
 */
async function analyzeDocumentWithAI(
  base64Image: string,
  documentType: 'govtId' | 'tradeCredential' | 'workPhotos'
): Promise<{ isDocument: boolean; documentType?: string; description?: string; confidence: number } | null> {
  const groq = getGroqClient();
  if (!groq) return null;

  const prompts: Record<string, string> = {
    govtId: `Analyze this image and determine if it's a valid government-issued ID document (such as a National ID, NIN slip, Voter's Card, Driver's License, or Passport).

Respond in JSON format only:
{
  "isDocument": true/false,
  "documentType": "type of document if identifiable",
  "description": "brief description of what you see",
  "confidence": 0.0-1.0
}

If it's not an ID document (e.g., random photo, screenshot, meme), set isDocument to false.`,

    tradeCredential: `Analyze this image and determine if it's a valid trade credential, certificate, or professional qualification document (such as a training certificate, apprenticeship completion, trade license, or professional certification).

Respond in JSON format only:
{
  "isDocument": true/false,
  "documentType": "type of document if identifiable",
  "description": "brief description of what you see",
  "confidence": 0.0-1.0
}

If it's not a credential/certificate, set isDocument to false.`,

    workPhotos: `Analyze this image and determine if it shows work-related content (tools, equipment, completed projects, workspace, or professional activities).

Respond in JSON format only:
{
  "isDocument": true/false,
  "documentType": "work photo",
  "description": "brief description of what you see",
  "confidence": 0.0-1.0
}`,
  };

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompts[documentType],
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    log.error('Groq AI analysis error', { error: error instanceof Error ? error.message : error });
    return null;
  }
}

/**
 * Validate a document image buffer
 */
export async function validateDocument(
  buffer: Buffer,
  documentType: 'govtId' | 'tradeCredential' | 'workPhotos'
): Promise<DocumentValidationResult> {
  const result: DocumentValidationResult = {
    isValid: true,
    confidence: 'high',
    checks: {
      fileSize: true,
      dimensions: true,
      aspectRatio: true,
      quality: true,
    },
    warnings: [],
    errors: [],
  };

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    result.checks.fileSize = false;
    result.errors.push('File size exceeds 5MB limit');
    result.isValid = false;
  } else if (buffer.length < MIN_FILE_SIZE) {
    result.checks.fileSize = false;
    result.warnings.push('File size is unusually small - image may be low quality');
    result.confidence = 'low';
  }

  try {
    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      result.errors.push('Unable to read image dimensions');
      result.isValid = false;
      return result;
    }

    // Check minimum dimensions
    if (metadata.width < MIN_DIMENSIONS.width || metadata.height < MIN_DIMENSIONS.height) {
      result.checks.dimensions = false;
      result.warnings.push('Image resolution is low - document may not be readable');
      result.confidence = 'medium';
    }

    // Check aspect ratio for government IDs
    if (documentType === 'govtId') {
      const aspectRatio = metadata.width / metadata.height;
      const isLandscape = aspectRatio > 1;
      const normalizedRatio = isLandscape ? aspectRatio : 1 / aspectRatio;

      if (normalizedRatio < ID_ASPECT_RATIOS.min || normalizedRatio > ID_ASPECT_RATIOS.max) {
        result.checks.aspectRatio = false;
        result.warnings.push('Image aspect ratio does not match typical ID document dimensions');
        result.confidence = result.confidence === 'low' ? 'low' : 'medium';
      }
    }

    // Basic quality check - very small images are suspicious
    const pixelCount = metadata.width * metadata.height;
    if (pixelCount < 100000) { // Less than ~316x316
      result.checks.quality = false;
      result.warnings.push('Image quality appears to be very low');
      result.confidence = 'low';
    }

    // Check if image format is appropriate
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (metadata.format && !validFormats.includes(metadata.format)) {
      result.warnings.push(`Unusual image format: ${metadata.format}`);
    }

    // AI-powered document analysis using Groq
    if (process.env.GROQ_API_KEY) {
      try {
        // Convert buffer to base64 for AI analysis
        const base64Image = buffer.toString('base64');
        const aiResult = await analyzeDocumentWithAI(base64Image, documentType);

        if (aiResult) {
          result.aiAnalysis = aiResult;
          result.checks.aiValidation = aiResult.isDocument;

          if (!aiResult.isDocument) {
            result.warnings.push(
              `AI analysis: This doesn't appear to be a valid ${documentType === 'govtId' ? 'government ID' : documentType === 'tradeCredential' ? 'trade credential' : 'work photo'}`
            );
            result.confidence = 'low';
          } else if (aiResult.confidence < 0.7) {
            result.warnings.push('AI analysis: Document validity is uncertain');
            result.confidence = result.confidence === 'high' ? 'medium' : result.confidence;
          }

          if (aiResult.description) {
            result.aiAnalysis.description = aiResult.description;
          }
        }
      } catch (aiError) {
        log.error('AI validation error', { error: aiError instanceof Error ? aiError.message : aiError });
        // Continue without AI validation
      }
    }

  } catch (error) {
    result.errors.push('Failed to process image - file may be corrupted');
    result.isValid = false;
    result.confidence = 'low';
  }

  // Determine overall validity
  if (result.errors.length > 0) {
    result.isValid = false;
  }

  return result;
}

/**
 * Quick validation without detailed analysis
 */
export function quickValidate(buffer: Buffer): { valid: boolean; reason?: string } {
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, reason: 'File too large (max 5MB)' };
  }
  if (buffer.length < MIN_FILE_SIZE) {
    return { valid: false, reason: 'File too small' };
  }
  return { valid: true };
}

export default {
  validateDocument,
  quickValidate,
};

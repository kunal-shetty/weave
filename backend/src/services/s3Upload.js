import multer from 'multer';
import { uploadToS3 } from '../config/s3.js';
import { generateFieldId } from '../utils/fieldId.js';

// Use memory storage so we can pipe to S3
const memStorage = multer.memoryStorage();

export const wireframeUpload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WebP wireframe images are accepted'));
    }
  },
}).single('wireframe');

/**
 * Upload wireframe buffer to S3 and return the public URL + S3 key.
 */
export async function uploadWireframeToS3(file, sectionId) {
  const ext = file.mimetype.split('/')[1];
  const key = `wireframes/${sectionId || generateFieldId()}.${ext}`;
  const url = await uploadToS3(key, file.buffer, file.mimetype);
  return { key, url };
}

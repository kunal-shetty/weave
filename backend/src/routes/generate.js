import { Router } from 'express';
import { wireframeUpload } from '../services/s3Upload.js';
import { generate } from '../controllers/generateController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// POST /api/generate  (multipart/form-data)
router.post('/', (req, res, next) => {
  wireframeUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, asyncHandler(generate));

export default router;

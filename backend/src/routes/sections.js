import { Router } from 'express';
import { listSections, getSection, regenerateSection, updateSectionStatus } from '../controllers/sectionsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',                              asyncHandler(listSections));
router.get('/:sectionId',                   asyncHandler(getSection));
router.post('/:sectionId/regenerate',       asyncHandler(regenerateSection));
router.patch('/:sectionId/status',          asyncHandler(updateSectionStatus));

export default router;

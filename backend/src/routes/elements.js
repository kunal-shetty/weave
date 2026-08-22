import { Router } from 'express';
import { getElements, getElementById, patchElement } from '../controllers/elementsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',              asyncHandler(getElements));      // ?sectionId= or ?pageName=
router.get('/:fieldId',      asyncHandler(getElementById));
router.patch('/:fieldId',    asyncHandler(patchElement));

export default router;

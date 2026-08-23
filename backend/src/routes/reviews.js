import { Router } from 'express';
import ReviewItem from '../models/ReviewItem.js';
import { emitMemberChange } from '../config/socket.js';
import { nanoid } from 'nanoid';

const router = Router();

// GET /api/reviews/:sessionId — list all review items for a workspace
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, type } = req.query;
    const filter = { sessionId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const items = await ReviewItem.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:sessionId — create review items in bulk
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const docs = items.map((item) => ({
      reviewId: `rev_${nanoid(12)}`,
      sessionId,
      sectionId: item.sectionId || null,
      type: item.type,
      confidence: item.confidence ?? 50,
      status: 'pending',
      region: item.region || { x: 0, y: 0, width: 0, height: 0 },
      wireframeLabel: item.wireframeLabel || null,
      wireframeSuggestion: item.wireframeSuggestion || null,
      fieldId: item.fieldId || null,
      elementName: item.elementName || null,
      previousContent: item.previousContent || null,
      newContent: item.newContent || null,
      notes: item.notes || null,
      createdBy: item.createdBy || 'system',
    }));

    const created = await ReviewItem.insertMany(docs);

    // Broadcast to workspace so the queue updates live
    emitMemberChange(req.io, sessionId, { action: 'review_created', count: created.length });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reviews/:sessionId/:reviewId — update status / assign / approve / reject
router.patch('/:sessionId/:reviewId', async (req, res) => {
  try {
    const { sessionId, reviewId } = req.params;
    const { status, assignedTo, assignedName, notes } = req.body;

    const update = {};
    if (status) update.status = status;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (assignedName !== undefined) update.assignedName = assignedName;
    if (notes !== undefined) update.notes = notes;

    if (status === 'approved' || status === 'rejected' || status === 'needs_changes') {
      update.resolvedAt = new Date();
    }

    const item = await ReviewItem.findOneAndUpdate(
      { reviewId, sessionId },
      { $set: update },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Review item not found' });
    }

    // Broadcast status change
    emitMemberChange(req.io, sessionId, {
      action: 'review_updated',
      reviewId,
      status: item.status,
    });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:sessionId/:reviewId — dismiss a review item
router.delete('/:sessionId/:reviewId', async (req, res) => {
  try {
    const { sessionId, reviewId } = req.params;
    const item = await ReviewItem.findOneAndDelete({ reviewId, sessionId });
    if (!item) {
      return res.status(404).json({ error: 'Review item not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:sessionId/bulk — bulk approve/reject all pending
router.post('/:sessionId/bulk', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, filter } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const query = { sessionId, status: 'pending' };
    if (filter?.type) query.type = filter.type;

    const result = await ReviewItem.updateMany(query, {
      $set: { status, resolvedAt: new Date() },
    });

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

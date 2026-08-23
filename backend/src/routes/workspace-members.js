import { Router } from 'express';
import WorkspaceMember from '../models/WorkspaceMember.js';

const router = Router();

// GET /api/workspace-members/:sessionId — list members
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const members = await WorkspaceMember.find({ sessionId, status: { $ne: 'removed' } })
      .sort({ role: 1, createdAt: 1 })
      .lean();
    res.json(members);
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace-members/:sessionId — add a member
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, email, fullName, avatarUrl, role = 'viewer' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const member = await WorkspaceMember.findOneAndUpdate(
      { sessionId, email },
      {
        sessionId,
        userId: userId || email, // fallback to email as identifier
        email,
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
        role,
        status: 'active',
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(member);
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/workspace-members/:sessionId/:userId — update role
router.patch('/:sessionId/:userId', async (req, res) => {
  try {
    const { sessionId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await WorkspaceMember.findOneAndUpdate(
      { sessionId, userId },
      { role },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace-members/:sessionId/:userId — remove member
router.delete('/:sessionId/:userId', async (req, res) => {
  try {
    const { sessionId, userId } = req.params;

    const member = await WorkspaceMember.findOneAndUpdate(
      { sessionId, userId },
      { status: 'removed' },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ removed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

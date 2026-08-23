import { Router } from 'express';
import WorkspaceMember from '../models/WorkspaceMember.js';
import { emitMemberChange } from '../config/socket.js';

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
    const { userId, email, fullName, avatarUrl, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Enforce single-owner rule: if an owner already exists for this session,
    // any new invite is forced to 'member'. Only the first owner (creator) keeps owner.
    const existingOwner = await WorkspaceMember.findOne({ sessionId, role: 'owner', status: { $ne: 'removed' } });
    const finalRole = existingOwner ? 'member' : (role === 'owner' ? 'owner' : 'member');

    const member = await WorkspaceMember.findOneAndUpdate(
      { sessionId, email },
      {
        sessionId,
        userId: userId || email, // fallback to email as identifier
        email,
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
        role: finalRole,
        status: 'active',
      },
      { upsert: true, new: true, runValidators: true }
    );

    emitMemberChange(req.io, sessionId, { action: 'invited', member });

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

    if (!['owner', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent demoting the only owner: there must always be at least one.
    if (role !== 'owner') {
      const target = await WorkspaceMember.findOne({ sessionId, userId });
      if (target?.role === 'owner') {
        const otherOwners = await WorkspaceMember.countDocuments({ sessionId, role: 'owner', userId: { $ne: userId }, status: { $ne: 'removed' } });
        if (otherOwners === 0) {
          return res.status(400).json({ error: 'Cannot demote the only owner' });
        }
      }
    }

    // Prevent promoting a second owner.
    if (role === 'owner') {
      const existingOwner = await WorkspaceMember.findOne({ sessionId, role: 'owner', userId: { $ne: userId }, status: { $ne: 'removed' } });
      if (existingOwner) {
        return res.status(400).json({ error: 'A workspace can have only one owner' });
      }
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

    emitMemberChange(req.io, sessionId, { action: 'removed', member });

    res.json({ removed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

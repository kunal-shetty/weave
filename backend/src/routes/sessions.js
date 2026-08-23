import { Router } from 'express';
import GeneratedSession from '../models/GeneratedSession.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

const router = Router();

// GET /api/sessions/:sessionId — fetch a session's generated HTML
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GeneratedSession.findOne({ sessionId }).lean();
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Fetch session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:sessionId — save/update generated HTML
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, prompt, htmlContent, fileCount = 0 } = req.body;

    if (!userId || !htmlContent) {
      return res.status(400).json({ error: 'userId and htmlContent are required' });
    }

    const session = await GeneratedSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        userId,
        prompt,
        htmlContent,
        fileCount,
        status: 'generated',
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Auto-add the creator as owner if not already a member
    await WorkspaceMember.findOneAndUpdate(
      { sessionId, userId },
      {
        sessionId,
        userId,
        email: req.body.email || '',
        fullName: req.body.fullName || null,
        avatarUrl: req.body.avatarUrl || null,
        role: 'owner',
        status: 'active',
      },
      { upsert: true }
    );

    res.status(201).json(session);
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:sessionId/status — check if session exists (no body)
router.get('/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const exists = await GeneratedSession.exists({ sessionId });
    res.json({ exists: !!exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:sessionId — update session (e.g. from /edit)
router.patch('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { htmlContent, status } = req.body;

    const update = {};
    if (htmlContent) update.htmlContent = htmlContent;
    if (status) update.status = status;

    const session = await GeneratedSession.findOneAndUpdate(
      { sessionId },
      update,
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/user/:userId — list all sessions for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await GeneratedSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import GeneratedSession from '../models/GeneratedSession.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import { emitWorkspaceUpdate, emitChatMessage } from '../config/socket.js';

const router = Router();

// GET /api/sessions/:sessionId — fetch a session
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

// POST /api/sessions — create a new session (called by ChatArea before navigation)
router.post('/', async (req, res) => {
  try {
    const { sessionId, userId, email, fullName, avatarUrl, prompt, files = [], fileCount = 0 } = req.body;

    if (!sessionId || !userId || !prompt) {
      return res.status(400).json({ error: 'sessionId, userId, and prompt are required' });
    }

    // Upsert — create if new, update files/prompt if exists
    const session = await GeneratedSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          userId,
          prompt,
          files,
          fileCount: fileCount || files.length,
        },
        $setOnInsert: {
          sessionId,
          status: 'created',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Auto-add the creator as owner ONLY if no owner exists yet for this session.
    // Single-owner rule: every workspace has exactly one owner; everyone else is 'member'.
    const existingOwner = await WorkspaceMember.findOne({ sessionId, role: 'owner', status: { $ne: 'removed' } });
    const role = existingOwner ? 'member' : 'owner';

    await WorkspaceMember.findOneAndUpdate(
      { sessionId, userId },
      {
        sessionId,
        userId,
        email: email || '',
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
        role,
        status: 'active',
      },
      { upsert: true }
    );

    res.status(201).json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:sessionId — save/update generated HTML (called after generation)
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, email, fullName, avatarUrl, prompt, htmlContent, files, fileCount = 0, clientId } = req.body;

    if (!userId || !htmlContent) {
      return res.status(400).json({ error: 'userId and htmlContent are required' });
    }

    const update = {
      userId,
      prompt,
      htmlContent,
      fileCount,
      status: 'generated',
    };
    if (files) update.files = files;

    const session = await GeneratedSession.findOneAndUpdate(
      { sessionId },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );

    // Single-owner rule: only the creator becomes owner; subsequent visitors are members.
    const existingOwner = await WorkspaceMember.findOne({ sessionId, role: 'owner', status: { $ne: 'removed' } });
    const role = existingOwner ? 'member' : 'owner';

    await WorkspaceMember.findOneAndUpdate(
      { sessionId, userId },
      {
        sessionId,
        userId,
        email: email || '',
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
        role,
        status: 'active',
      },
      { upsert: true }
    );

    // Broadcast the new HTML to everyone else in the workspace room
    emitWorkspaceUpdate(req.io, sessionId, {
      htmlContent,
      status: 'generated',
      clientId,
      prompt,
      user: { id: userId, email, fullName, avatarUrl },
    });

    res.status(201).json(session);
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:sessionId — update session (e.g. from /edit)
router.patch('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { htmlContent, status, clientId, userId, email, fullName, avatarUrl } = req.body;

    const update = { updatedAt: new Date() };
    if (htmlContent) update.htmlContent = htmlContent;
    if (status) update.status = status;

    const session = await GeneratedSession.findOneAndUpdate(
      { sessionId },
      { $set: update },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Broadcast edit-time save to other collaborators
    if (htmlContent) {
      emitWorkspaceUpdate(req.io, sessionId, {
        htmlContent,
        status: status || 'edited',
        clientId,
        user: { id: userId, email, fullName, avatarUrl },
      });
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

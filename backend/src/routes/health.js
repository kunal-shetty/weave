import { Router } from 'express';
import mongoose from 'mongoose';
import { getSupabase } from '../config/supabase.js';

const router = Router();

router.get('/', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const supabaseOk = !!getSupabase();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoOk ? 'connected' : 'disconnected',
      supabase: supabaseOk ? 'initialized' : 'not configured',
      s3: !!process.env.AWS_ACCESS_KEY_ID ? 'configured' : 'not configured',
      llm: !!process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
    },
  });
});

export default router;

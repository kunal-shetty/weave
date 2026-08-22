import { Router } from 'express';
import { Webhook } from 'svix';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { getSupabase } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/webhooks/clerk/debug
 * Quick check: is Supabase reachable and does the users table exist?
 */
router.get(
  '/clerk/debug',
  asyncHandler(async (_req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ ok: false, reason: 'Supabase client not initialized' });
    }

    // Check if users table exists and is queryable
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        reason: 'users table query failed',
        error: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    res.json({
      ok: true,
      users_table_exists: true,
      row_count: count,
      clerk_webhook_secret_set: !!process.env.CLERK_WEBHOOK_SECRET,
      supabase_url_set: !!process.env.SUPABASE_URL,
      supabase_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  })
);

/**
 * POST /api/webhooks/clerk
 * Receives Clerk webhook events and syncs users to Supabase.
 *
 * The raw body parser is mounted in index.js (before express.json()) so
 * req.body arrives as a Buffer for svix signature verification.
 */
router.post(
  '/clerk',
  asyncHandler(async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    // ── 1. Read raw body ────────────────────────────────────────────
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    // ── 2. Verify svix signature ────────────────────────────────────
    if (WEBHOOK_SECRET) {
      const svix_id = req.headers['svix-id'];
      const svix_timestamp = req.headers['svix-timestamp'];
      const svix_signature = req.headers['svix-signature'];

      if (!svix_id || !svix_timestamp || !svix_signature) {
        console.error('❌ Missing svix headers');
        return res.status(400).json({ error: 'Missing svix headers' });
      }

      const wh = new Webhook(WEBHOOK_SECRET);
      try {
        wh.verify(rawBody.toString(), {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('⚠️  CLERK_WEBHOOK_SECRET not set — skipping signature verification');
    }

    // ── 3. Parse the event ──────────────────────────────────────────
    let event;
    try {
      event = JSON.parse(rawBody.toString());
    } catch (err) {
      console.error('❌ Failed to parse webhook body:', err.message);
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const eventType = event?.type;
    console.log(`📥 Clerk webhook received: ${eventType}`);

    // ── 4. Sync to Supabase ─────────────────────────────────────────
    const supabase = getSupabase();

    if (!supabase) {
      console.warn('⚠️  Supabase client not initialized — cannot sync user');
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (eventType === 'user.created') {
      const { id, email_addresses, image_url, created_at, updated_at } = event.data;
      const primaryEmail = email_addresses?.[0]?.email_address || '';
      const firstName = event.data.first_name || '';
      const lastName = event.data.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

      const { data, error } = await supabase
        .from('users')
        .upsert(
          {
            id,
            email: primaryEmail,
            full_name: fullName,
            avatar_url: image_url || null,
            clerk_created: created_at || new Date().toISOString(),
            clerk_updated: updated_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select();

      if (error) {
        console.error('❌ Failed to insert user into Supabase:', error.message, error.details, error.hint);
        return res.status(500).json({ error: 'DB insert failed', details: error.message });
      }
      console.log('✅ User created in Supabase:', data?.[0]?.id);
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, image_url, updated_at } = event.data;
      const primaryEmail = email_addresses?.[0]?.email_address || '';
      const firstName = event.data.first_name || '';
      const lastName = event.data.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

      const { data, error } = await supabase
        .from('users')
        .update({
          email: primaryEmail,
          full_name: fullName,
          avatar_url: image_url || null,
          clerk_updated: updated_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Failed to update user in Supabase:', error.message, error.details, error.hint);
        return res.status(500).json({ error: 'DB update failed', details: error.message });
      }
      console.log('✅ User updated in Supabase:', data?.[0]?.id);
    }

    if (eventType === 'user.deleted') {
      const { id } = event.data;

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete user from Supabase:', error.message, error.details, error.hint);
        return res.status(500).json({ error: 'DB delete failed', details: error.message });
      }
      console.log('✅ User deleted from Supabase:', id);
    }

    res.status(200).json({ ok: true });
  })
);

export default router;

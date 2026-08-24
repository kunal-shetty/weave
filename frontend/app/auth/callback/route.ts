import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// This route handles the OAuth code exchange and must run at request time.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert user into the Supabase users table
      const { user } = data;
      const meta = user.user_metadata || {};

      await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email || '',
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
          auth_provider: user.app_metadata?.provider || 'email',
          last_sign_in: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      // Redirect to the intended page (preserves /workspace/xyz or whatever was in ?next=)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback: go to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}

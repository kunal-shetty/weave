'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function AuthPageInner() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next);
      }
    });
  }, [router, supabase, next]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error('Auth error:', error.message);
      setLoading(false);
    }
  };

  return (
    <main className="h-screen flex relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="shader-orb shader-orb-1" />
        <div className="shader-orb shader-orb-2" />
        <div className="shader-orb shader-orb-3" />
      </div>
      <div className="absolute inset-0 opacity-[0.15] grid-background" />

      {/* Left — Brand */}
      <div className="hidden md:flex relative z-10 flex-1 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground font-[var(--font-heading)]">Promptify</span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-5xl font-bold text-foreground font-[var(--font-heading)] tracking-tight leading-tight mb-5">
            Turn ideas into UI — instantly.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            Paste a wireframe, drop some code, or just describe what you need.
            Promptify generates production-ready UI components in seconds.
          </p>

          <div className="flex flex-col gap-3">
            {["Wireframe to component", "Code refactor & polish", "Prompt to full UI"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-sm text-foreground/70">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Promptify. All rights reserved.
        </p>
      </div>

      {/* Right — Sign In */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 md:p-12 md:border-l md:border-border/20">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-6 md:hidden">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-[var(--font-heading)]">Promptify</h1>
          </div>

          <div className="mb-8 hidden md:block">
            <h2 className="text-2xl font-bold text-foreground font-[var(--font-heading)]">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to Promptify.</p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 border border-border/50 shadow-xl btn-3d text-base font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our{' '}
            <span className="underline underline-offset-4 hover:text-foreground cursor-pointer transition-colors">Terms</span>
            {' '}and{' '}
            <span className="underline underline-offset-4 hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}

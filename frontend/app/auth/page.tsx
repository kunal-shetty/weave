'use client';

import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function AuthPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/generate');
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) return null;

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
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground font-[var(--font-heading)]">CodeX</span>
        </div>

        {/* Hero copy */}
        <div className="max-w-sm">
          <h1 className="text-5xl font-bold text-foreground font-[var(--font-heading)] tracking-tight leading-tight mb-5">
            Turn ideas into UI — instantly.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            Paste a wireframe, drop some code, or just describe what you need.
            CodeX generates production-ready UI components in seconds.
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
          © {new Date().getFullYear()} CodeX. All rights reserved.
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
            <h1 className="text-2xl font-bold text-foreground font-[var(--font-heading)]">CodeX</h1>
          </div>

          <div className="mb-4 hidden md:block">
            <h2 className="text-2xl font-bold text-foreground font-[var(--font-heading)]">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to CodeX.</p>
          </div>

          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent shadow-none border-none w-full p-0',
                headerTitle: 'text-foreground font-[var(--font-heading)]',
                headerSubtitle: 'text-muted-foreground',
              },
            }}
          />

          <p className="text-center text-xs text-muted-foreground mt-4">
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

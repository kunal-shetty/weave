'use client';

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const appearance = {
    baseTheme: dark,
    variables: {
      colorPrimary: '#ffffff',
      colorBackground: '#0a0a0a',
      borderRadius: '0.75rem',
    },
    elements: {
      card: {
        background:
          'linear-gradient(135deg, rgba(15,15,15,0.9) 0%, rgba(10,10,10,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow:
          '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
      },
      formButtonPrimary: {
        background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
        color: '#000000',
        fontWeight: '600',
        '&:hover': {
          background: 'linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 100%)',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
        },
        transition: 'all 0.2s ease',
      },
      socialButtonsBlockButton: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fafafa',
        '&:hover': {
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
        },
      },
      dividerLine: {
        background: 'rgba(255,255,255,0.08)',
      },
      formFieldInput: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        '&:focus': {
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.05)',
        },
      },
      footerActionLink: {
        color: '#888888',
        '&:hover': {
          color: '#fafafa',
        },
      },
    },
  } as Record<string, unknown>;

  return (
    <BaseClerkProvider appearance={appearance as any}>
      {children}
    </BaseClerkProvider>
  );
}

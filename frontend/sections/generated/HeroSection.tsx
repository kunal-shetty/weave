'use client';

/**
 * HeroSection — Reference output from CodeX generator.
 *
 * This file demonstrates the exact contract every generated section must follow:
 * - All fieldIds are server-allocated 10-digit strings (never LLM-generated)
 * - All text uses dangerouslySetInnerHTML with fallback
 * - Images use the getImage() helper
 * - Cards use the loop[] array from Redux state
 * - Redux: fetches on mount, reads from allSections/allSectionsCss
 * - CSS overrides applied via useEffect on cssData change
 */

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchElementsByIds, CardItem } from '@/store/slices/cmsSlice';
import { getImage, applyCssOverrides } from '@/lib/helpers';

// ── Server-allocated IDs (never change after first generation) ──────────────
const ids = {
  heroImage:    '7001234001',
  brandBadge:   '7001234002',
  headlineMain: '7001234003',
  headlineSub:  '7001234004',
  description:  '7001234005',
  ctaButton:    '7001234006',
  cards:        '7001234007',
};

const ALL_FIELD_IDS = Object.values(ids);

// ── Default content (rendered before Redux hydration) ──────────────────────
const DEFAULTS = {
  [ids.heroImage]:    '/placeholder.jpg',
  [ids.brandBadge]:  'PULSE FIT',
  [ids.headlineMain]:'CHALLENGE YOUR LIMITS',
  [ids.headlineSub]: "Be a part of the tribe that's limitless.",
  [ids.description]: 'Join trainer-led workout sessions designed to kickstart your fitness journey.',
  [ids.ctaButton]:   'FIND A WORKOUT',
};

const DEFAULT_CARDS: CardItem[] = [
  { fieldId1: '7001234008', fieldId2: '7001234009', value1: '1000+', value2: 'Community Members' },
  { fieldId1: '7001234010', fieldId2: '7001234011', value1: '40+',   value2: 'Fitness Programmes' },
  { fieldId1: '7001234012', fieldId2: '7001234013', value1: '150+',  value2: 'Fitness Channels' },
];

// ── Component ──────────────────────────────────────────────────────────────
const PAGE_NAME = 'Home';
const ACCENT = '#ef4444';

export default function HeroSection() {
  const dispatch = useDispatch<AppDispatch>();
  const sectionData = useSelector((s: RootState) => s.cms.allSections[PAGE_NAME] || {});
  const cssData     = useSelector((s: RootState) => s.cms.allSectionsCss[PAGE_NAME] || {});

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchElementsByIds({ pageName: PAGE_NAME, fieldIds: ALL_FIELD_IDS }));
  }, [dispatch]);

  // Apply CSS overrides whenever cssData changes
  useEffect(() => {
    applyCssOverrides(cssData);
  }, [cssData]);

  // Helpers
  const txt = (id: string) => (sectionData[id] as string) ?? DEFAULTS[id] ?? '';
  const cards = (sectionData[ids.cards] as CardItem[]) ?? DEFAULT_CARDS;

  return (
    <section
      className="relative min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden"
      style={{ fontFamily: 'sans-serif' }}
    >
      {/* ── Left: Image ─────────────────────────────────────────────────── */}
      <div className="md:w-1/2 relative">
        <img
          id={ids.heroImage}
          src={getImage(txt(ids.heroImage))}
          alt="Hero"
          className="w-full h-64 md:h-screen object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/60" />
      </div>

      {/* ── Right: Content ───────────────────────────────────────────────── */}
      <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-8 md:py-12 space-y-4 md:space-y-6">

        {/* Brand badge */}
        <div
          id={ids.brandBadge}
          className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: ACCENT }}
          dangerouslySetInnerHTML={{ __html: txt(ids.brandBadge) }}
        />

        {/* Headline main */}
        <h1
          id={ids.headlineMain}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-none tracking-tight uppercase"
          dangerouslySetInnerHTML={{ __html: txt(ids.headlineMain) }}
        />

        {/* Headline sub */}
        <h2
          id={ids.headlineSub}
          className="text-base sm:text-lg font-medium text-gray-300"
          dangerouslySetInnerHTML={{ __html: txt(ids.headlineSub) }}
        />

        {/* Description */}
        <p
          id={ids.description}
          className="text-sm sm:text-base text-gray-400 max-w-md leading-relaxed"
          dangerouslySetInnerHTML={{ __html: txt(ids.description) }}
        />

        {/* CTA Button */}
        <button
          id={ids.ctaButton}
          className="self-start px-6 sm:px-8 py-3 sm:py-4 font-bold tracking-wider uppercase text-white text-sm sm:text-base transition-transform active:scale-95 hover:brightness-110"
          style={{ backgroundColor: ACCENT, borderRadius: '2px' }}
          dangerouslySetInnerHTML={{ __html: txt(ids.ctaButton) }}
        />

        {/* Stat cards */}
        <div
          id={ids.cards}
          className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3"
        >
          {cards.map((card, idx) => (
            <div
              key={card.fieldId1 || idx}
              className="rounded-xl p-3 sm:p-4 border"
              style={{ borderColor: `${ACCENT}30`, backgroundColor: `${ACCENT}08` }}
            >
              <div
                id={card.fieldId1}
                className="text-3xl font-black"
                style={{ color: ACCENT }}
                dangerouslySetInnerHTML={{ __html: card.value1 }}
              />
              <div
                id={card.fieldId2}
                className="text-xs text-gray-400 mt-1 uppercase tracking-wide"
                dangerouslySetInnerHTML={{ __html: card.value2 }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

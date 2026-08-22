-- ============================================================
-- CodeX Database Schema — Supabase / PostgreSQL
-- Smart India Hackathon 2026 | Team CodeX (T19) | PS7
-- ============================================================

-- Enable UUID extension (Supabase has it by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Sections Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    VARCHAR(10) NOT NULL UNIQUE,
  section_name  VARCHAR(255) NOT NULL,
  page_name     VARCHAR(255) NOT NULL DEFAULT 'Home',
  platform      VARCHAR(50)  NOT NULL DEFAULT 'Website',
  is_generated  BOOLEAN NOT NULL DEFAULT TRUE,
  section_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (section_status IN ('Pending', 'Approved', 'Rejected')),
  wireframes    TEXT,
  variations    INTEGER NOT NULL DEFAULT 1,
  card_grid_columns INTEGER NOT NULL DEFAULT 3,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on page_name for fast lookups
CREATE INDEX idx_sections_page_name ON sections (page_name);
CREATE INDEX idx_sections_status ON sections (section_status);

-- ─── Elements Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id      VARCHAR(10) NOT NULL UNIQUE,
  section_id    VARCHAR(10) NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
  element_name  VARCHAR(255) NOT NULL,
  content_type  VARCHAR(20) NOT NULL
    CHECK (content_type IN ('Image', 'Text', 'Textfield', 'Button', 'Cards')),
  content       TEXT NOT NULL DEFAULT '',
  loop          JSONB DEFAULT NULL,
  css           TEXT DEFAULT NULL,
  page_name     VARCHAR(255) NOT NULL DEFAULT 'Home',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for element lookups
CREATE INDEX idx_elements_section_id ON elements (section_id);
CREATE INDEX idx_elements_page_name ON elements (page_name);
CREATE INDEX idx_elements_field_id ON elements (field_id);

-- ─── Auto-update updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security (RLS) ────────────────────────────────
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (demo mode)
CREATE POLICY "Allow all for sections" ON sections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for elements" ON elements
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed Data: Pulse Fit Hero ───────────────────────────────
INSERT INTO sections (section_id, section_name, page_name, platform, is_generated, section_status, card_grid_columns)
VALUES ('7391028465', 'Hero', 'Home', 'Website', true, 'Approved', 3)
ON CONFLICT (section_id) DO NOTHING;

INSERT INTO elements (field_id, section_id, element_name, content_type, content, page_name) VALUES
  ('8472910365', '7391028465', 'brandBadge',    'Text',     'PULSE FIT', 'Home'),
  ('6204981735', '7391028465', 'headlineMain',  'Text',     'CHALLENGE YOUR LIMITS', 'Home'),
  ('9153720486', '7391028465', 'headlineSub',   'Text',     'Be a part of the tribe that''s limitless.', 'Home'),
  ('3847102956', '7391028465', 'description',   'Text',     'Join trainer-led workout sessions designed to kickstart your fitness journey.', 'Home'),
  ('2059384716', '7391028465', 'heroImage',     'Image',    '/placeholder.svg', 'Home'),
  ('4738291056', '7391028465', 'ctaButton',     'Button',   'FIND A WORKOUT', 'Home'),
  ('5920481736', '7391028465', 'statCards',     'Cards',    '', 'Home')
ON CONFLICT (field_id) DO NOTHING;

-- Stat cards nested elements
INSERT INTO elements (field_id, section_id, element_name, content_type, content, loop, page_name) VALUES
  ('1029384756', '7391028465', 'statCard1', 'Text', '1000+||Community Members', NULL, 'Home'),
  ('6382910475', '7391028465', 'statCard2', 'Text', '40+||Fitness Programmes', NULL, 'Home'),
  ('7591028364', '7391028465', 'statCard3', 'Text', '150+||Fitness Channels', NULL, 'Home')
ON CONFLICT (field_id) DO NOTHING;

-- Update the statCards element with loop data
UPDATE elements
SET loop = '[
  {"fieldId": "1029384756", "value": "1000+", "label": "Community Members"},
  {"fieldId": "6382910475", "value": "40+", "label": "Fitness Programmes"},
  {"fieldId": "7591028364", "value": "150+", "label": "Fitness Channels"}
]'::jsonb
WHERE field_id = '5920481736';

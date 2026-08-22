/**
 * Supabase KV Metadata Service
 *
 * Purpose: Store lightweight key-value metadata pairs that mirror MongoDB documents.
 * This allows fast lookups (e.g. fieldId→sectionId, pageName→sectionIds)
 * without full MongoDB queries.
 *
 * Supabase tables required:
 *
 *   section_meta (id uuid PK, section_id text UNIQUE, page_name text,
 *                 section_name text, status text, wireframe_url text,
 *                 s3_key text, created_at timestamptz, meta jsonb)
 *
 *   element_meta (id uuid PK, field_id text UNIQUE, section_id text,
 *                 page_name text, element_name text, content_type text,
 *                 created_at timestamptz)
 *
 *   field_kv     (id uuid PK, field_id text UNIQUE, section_id text,
 *                 page_name text, content text, css text, updated_at timestamptz)
 *
 * Run the SQL in README to create them.
 */

import { getSupabase } from '../config/supabase.js';

// ─── Section Meta ─────────────────────────────────────────────────────────────

export async function upsertSectionMeta(section) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('section_meta').upsert({
    section_id: section.sectionId,
    page_name: section.pageName,
    section_name: section.sectionName,
    status: section.sectionStatus,
    wireframe_url: section.wireframeUrl || null,
    s3_key: section.wireframeS3Key || null,
    meta: {
      accentColor: section.accentColor,
      variations: section.variations,
      inputModes: section.inputModes,
      cardGridColumns: section.cardGridColumns,
    },
    created_at: new Date().toISOString(),
  }, { onConflict: 'section_id' });
  if (error) console.warn('Supabase section_meta upsert error:', error.message);
}

export async function getSectionMeta(sectionId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('section_meta')
    .select('*')
    .eq('section_id', sectionId)
    .single();
  if (error) return null;
  return data;
}

export async function listSectionMetaByPage(pageName) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('section_meta')
    .select('*')
    .eq('page_name', pageName)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

// ─── Element Meta ─────────────────────────────────────────────────────────────

export async function upsertElementMeta(element) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('element_meta').upsert({
    field_id: element.fieldId,
    section_id: element.sectionId,
    page_name: element.pageName,
    element_name: element.elementName,
    content_type: element.contentType,
    created_at: new Date().toISOString(),
  }, { onConflict: 'field_id' });
  if (error) console.warn('Supabase element_meta upsert error:', error.message);
}

export async function bulkUpsertElementMeta(elements) {
  const sb = getSupabase();
  if (!sb || !elements.length) return;
  const rows = elements.map((el) => ({
    field_id: el.fieldId,
    section_id: el.sectionId,
    page_name: el.pageName,
    element_name: el.elementName,
    content_type: el.contentType,
    created_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('element_meta').upsert(rows, { onConflict: 'field_id' });
  if (error) console.warn('Supabase bulk element_meta error:', error.message);
}

// ─── Field KV (live content store) ───────────────────────────────────────────

export async function setFieldKV(fieldId, sectionId, pageName, content, css = null) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('field_kv').upsert({
    field_id: fieldId,
    section_id: sectionId,
    page_name: pageName,
    content,
    css,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'field_id' });
  if (error) console.warn('Supabase field_kv upsert error:', error.message);
}

export async function getFieldKVBySection(sectionId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('field_kv')
    .select('*')
    .eq('section_id', sectionId);
  if (error) return [];
  return data;
}

export async function getFieldKVByPage(pageName) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('field_kv')
    .select('*')
    .eq('page_name', pageName);
  if (error) return [];
  return data;
}

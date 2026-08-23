import { generateFieldId, generateFieldIds } from '../utils/fieldId.js';
import { generateJSX, validateJSX } from '../services/llmService.js';
import { buildElementSpecs, diffMerge } from '../services/diffMerge.js';
import { uploadWireframeToS3 } from '../services/s3Upload.js';
import { upsertSectionMeta, bulkUpsertElementMeta, setFieldKV } from '../services/supabaseMeta.js';
import { emitDiffUpdate } from '../config/socket.js';
import Section from '../models/Section.js';
import Element from '../models/Element.js';
import ReviewItem from '../models/ReviewItem.js';
import { nanoid } from 'nanoid';

/**
 * POST /api/generate
 * Body (multipart): wireframe (file?), code (text?), prompt (text?),
 *                   pageName, sectionName, accentColor, cardCount
 */
export async function generate(req, res) {
  const { prompt, code: existingCode, pageName = 'Home', sectionName = 'HeroSection', accentColor = '#ef4444', cardCount = 3 } = req.body;
  const wireframeFile = req.file || null;

  // Validate at least one input
  if (!prompt && !existingCode && !wireframeFile) {
    return res.status(400).json({ error: 'Provide at least one input: prompt, code, or wireframe image.' });
  }

  // Determine input modes
  const inputModes = [];
  if (wireframeFile) inputModes.push('wireframe');
  if (existingCode)  inputModes.push('code');
  if (prompt)        inputModes.push('prompt');

  // Allocate all IDs server-side
  const sectionId = generateFieldId();
  const fieldIds = generateFieldIds(6 + Number(cardCount) * 2 + 1); // main + cards + container
  const [heroImageId, brandBadgeId, headlineMainId, headlineSubId, descriptionId, ctaButtonId, cardsContainerId, ...cardFieldIds] = fieldIds;

  const cards = [];
  for (let i = 0; i < Number(cardCount); i++) {
    cards.push({ fieldId1: cardFieldIds[i * 2], fieldId2: cardFieldIds[i * 2 + 1] });
  }

  const ids = {
    heroImage: heroImageId,
    brandBadge: brandBadgeId,
    headlineMain: headlineMainId,
    headlineSub: headlineSubId,
    description: descriptionId,
    ctaButton: ctaButtonId,
    cardsContainer: cardsContainerId,
    cards,
  };

  // Upload wireframe to S3 if provided
  let wireframeS3Key = null;
  let wireframeUrl = null;
  let imageBase64 = null;
  let imageMime = null;

  if (wireframeFile) {
    try {
      const uploaded = await uploadWireframeToS3(wireframeFile, sectionId);
      wireframeS3Key = uploaded.key;
      wireframeUrl = uploaded.url;
      imageBase64 = wireframeFile.buffer.toString('base64');
      imageMime = wireframeFile.mimetype;
    } catch (err) {
      console.warn('S3 upload failed, continuing without wireframe URL:', err.message);
      // Still use the image in LLM if buffer exists
      imageBase64 = wireframeFile.buffer.toString('base64');
      imageMime = wireframeFile.mimetype;
    }
  }

  // Generate JSX via LLM
  let generatedJsx;
  try {
    generatedJsx = await generateJSX({
      prompt,
      existingCode,
      imageBase64,
      imageMime,
      pageName,
      sectionName,
      accentColor,
      cardCount: Number(cardCount),
      ids,
    });
  } catch (err) {
    return res.status(422).json({ error: `LLM generation failed: ${err.message}` });
  }

  const warnings = validateJSX(generatedJsx, ids);

  // Check for existing elements (diff-merge on re-generate scenario)
  const existingElements = await Element.find({ sectionId }).lean();
  const elementSpecs = buildElementSpecs(ids, pageName, sectionId, Number(cardCount));

  let finalSpecs = elementSpecs;
  let diffResult = null;

  if (existingElements.length > 0) {
    const { merged, diff } = diffMerge(existingElements, elementSpecs);
    finalSpecs = merged;
    diffResult = diff;
    emitDiffUpdate(req.io, sectionId, diff);

    // Auto-create review items from diff
    const reviewItems = [];
    for (const name of diff.added) {
      const spec = merged.find((s) => s.elementName === name);
      reviewItems.push({
        reviewId: `rev_${nanoid(12)}`, sessionId: null, sectionId,
        type: 'new_element', confidence: 70, status: 'pending',
        elementName: name, newContent: spec?.content || '', createdBy: 'system',
      });
    }
    for (const name of diff.removed) {
      const existing = existingElements.find((e) => e.elementName === name);
      reviewItems.push({
        reviewId: `rev_${nanoid(12)}`, sessionId: null, sectionId,
        type: 'removed_element', confidence: 90, status: 'pending',
        elementName: name, previousContent: existing?.content || '', createdBy: 'system',
      });
    }
    for (const name of diff.unchanged) {
      const existing = existingElements.find((e) => e.elementName === name);
      const spec = merged.find((s) => s.elementName === name);
      if (existing && spec && existing.content !== spec.content) {
        reviewItems.push({
          reviewId: `rev_${nanoid(12)}`, sessionId: null, sectionId,
          type: 'field_change', confidence: 60, status: 'pending',
          elementName: name, fieldId: existing.fieldId,
          previousContent: existing.content, newContent: spec.content, createdBy: 'system',
        });
      }
    }
    if (reviewItems.length > 0) {
      ReviewItem.insertMany(reviewItems).catch((err) =>
        console.warn('[Generate] Failed to create review items:', err.message)
      );
    }
  }

  // Persist section to MongoDB
  const section = await Section.create({
    sectionId,
    sectionName,
    pageName,
    isGenerated: true,
    sectionStatus: 'Pending',
    wireframeS3Key,
    wireframeUrl,
    variations: 1,
    cardGridColumns: Number(cardCount),
    accentColor,
    generatedJsx,
    inputModes,
  });

  // Persist elements to MongoDB
  await Element.insertMany(
    finalSpecs.map((spec) => ({
      fieldId: spec.fieldId,
      sectionId,
      pageName,
      elementName: spec.elementName,
      contentType: spec.contentType,
      content: spec.content || '',
      loop: spec.loop || [],
      css: spec.css || null,
    }))
  );

  // Mirror to Supabase (non-blocking)
  Promise.all([
    upsertSectionMeta({ ...section.toObject(), wireframeUrl, wireframeS3Key }),
    bulkUpsertElementMeta(finalSpecs.map((s) => ({
      fieldId: s.fieldId,
      sectionId,
      pageName,
      elementName: s.elementName,
      contentType: s.contentType,
    }))),
    ...finalSpecs.map((s) => setFieldKV(s.fieldId, sectionId, pageName, s.content || '')),
  ]).catch((err) => console.warn('Supabase mirror error:', err.message));

  res.status(201).json({
    sectionId,
    sectionName,
    pageName,
    generatedJsx,
    ids,
    warnings,
    diff: diffResult,
    wireframeUrl,
    elements: finalSpecs,
  });
}

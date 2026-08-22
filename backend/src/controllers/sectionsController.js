import Section from '../models/Section.js';
import Element from '../models/Element.js';
import { generateJSX, validateJSX } from '../services/llmService.js';
import { buildElementSpecs, diffMerge } from '../services/diffMerge.js';
import { generateFieldId, generateFieldIds } from '../utils/fieldId.js';
import { upsertSectionMeta, bulkUpsertElementMeta } from '../services/supabaseMeta.js';
import { emitDiffUpdate } from '../config/socket.js';

export async function listSections(req, res) {
  const sections = await Section.find().sort({ createdAt: -1 }).lean();
  res.json(sections);
}

export async function getSection(req, res) {
  const section = await Section.findOne({ sectionId: req.params.sectionId }).lean();
  if (!section) return res.status(404).json({ error: 'Section not found' });
  res.json(section);
}

export async function regenerateSection(req, res) {
  const { sectionId } = req.params;
  const section = await Section.findOne({ sectionId });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const { prompt, accentColor } = req.body;

  // Allocate new IDs for regeneration variation
  const fieldIds = generateFieldIds(6 + section.cardGridColumns * 2 + 1);
  const [heroImageId, brandBadgeId, headlineMainId, headlineSubId, descriptionId, ctaButtonId, cardsContainerId, ...cardFieldIds] = fieldIds;
  const cards = [];
  for (let i = 0; i < section.cardGridColumns; i++) {
    cards.push({ fieldId1: cardFieldIds[i * 2], fieldId2: cardFieldIds[i * 2 + 1] });
  }
  const ids = { heroImage: heroImageId, brandBadge: brandBadgeId, headlineMain: headlineMainId, headlineSub: headlineSubId, description: descriptionId, ctaButton: ctaButtonId, cardsContainer: cardsContainerId, cards };

  let generatedJsx;
  try {
    generatedJsx = await generateJSX({ prompt: prompt || `Regenerate ${section.sectionName}`, pageName: section.pageName, sectionName: section.sectionName, accentColor: accentColor || section.accentColor, cardCount: section.cardGridColumns, ids });
  } catch (err) {
    return res.status(422).json({ error: `LLM regeneration failed: ${err.message}` });
  }

  const warnings = validateJSX(generatedJsx, ids);
  const existingElements = await Element.find({ sectionId }).lean();
  const elementSpecs = buildElementSpecs(ids, section.pageName, sectionId, section.cardGridColumns);
  const { merged, diff } = diffMerge(existingElements, elementSpecs);

  emitDiffUpdate(req.io, sectionId, diff);

  // Update section
  section.generatedJsx = generatedJsx;
  section.variations += 1;
  if (accentColor) section.accentColor = accentColor;
  await section.save();

  // Replace elements in MongoDB
  await Element.deleteMany({ sectionId });
  await Element.insertMany(merged.map((spec) => ({
    fieldId: spec.fieldId, sectionId, pageName: section.pageName,
    elementName: spec.elementName, contentType: spec.contentType,
    content: spec.content || '', loop: spec.loop || [], css: spec.css || null,
  })));

  upsertSectionMeta(section.toObject()).catch(() => {});
  bulkUpsertElementMeta(merged).catch(() => {});

  res.json({ sectionId, generatedJsx, ids, diff, warnings, elements: merged });
}

export async function updateSectionStatus(req, res) {
  const { sectionId } = req.params;
  const { sectionStatus } = req.body;
  if (!['Pending', 'Approved', 'Rejected'].includes(sectionStatus)) {
    return res.status(400).json({ error: 'Invalid sectionStatus' });
  }
  const section = await Section.findOneAndUpdate({ sectionId }, { sectionStatus }, { new: true });
  if (!section) return res.status(404).json({ error: 'Section not found' });
  upsertSectionMeta(section.toObject()).catch(() => {});
  res.json(section);
}

import Element from '../models/Element.js';
import { setFieldKV } from '../services/supabaseMeta.js';
import { emitElementPatch } from '../config/socket.js';

export async function getElements(req, res) {
  const { sectionId, pageName } = req.query;
  const filter = {};
  if (sectionId) filter.sectionId = sectionId;
  if (pageName)  filter.pageName = pageName;
  const elements = await Element.find(filter).lean();
  res.json(elements);
}

export async function getElementById(req, res) {
  const el = await Element.findOne({ fieldId: req.params.fieldId }).lean();
  if (!el) return res.status(404).json({ error: 'Element not found' });
  res.json(el);
}

export async function patchElement(req, res) {
  const { fieldId } = req.params;
  const { content, css, loop } = req.body;

  const update = {};
  if (content !== undefined) update.content = content;
  if (css !== undefined)     update.css = css;
  if (loop !== undefined)    update.loop = loop;

  if (!Object.keys(update).length) {
    return res.status(400).json({ error: 'Provide content, css, or loop to update' });
  }

  const el = await Element.findOneAndUpdate({ fieldId }, update, { new: true });
  if (!el) return res.status(404).json({ error: 'Element not found' });

  // Mirror to Supabase KV
  setFieldKV(fieldId, el.sectionId, el.pageName, el.content, el.css).catch(() => {});

  // Broadcast live patch to collaborators
  emitElementPatch(req.io, el.sectionId, {
    fieldId,
    elementName: el.elementName,
    content: el.content,
    css: el.css,
    loop: el.loop,
  });

  res.json(el);
}

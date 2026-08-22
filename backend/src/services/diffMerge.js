/**
 * Diff-Aware Merge Engine
 *
 * Aligns new element specs against existing ones.
 * Unchanged elements keep their fieldIds + live content.
 * Only new/removed/reordered elements are flagged.
 */

const SEMANTIC_NAMES = [
  'heroImage', 'brandBadge', 'headlineMain', 'headlineSub',
  'description', 'ctaButton', 'cards',
];

/**
 * Merge new element specs against existing elements.
 * Returns { merged: Element[], diff: DiffResult }
 */
export function diffMerge(existingElements, newElementSpecs) {
  const existingMap = new Map(existingElements.map((el) => [el.elementName, el]));
  const newMap = new Map(newElementSpecs.map((el) => [el.elementName, el]));

  const diff = {
    unchanged: [],
    added: [],
    removed: [],
    reordered: false,
  };

  const merged = [];

  // Stable elements — keep existing fieldId + content
  for (const [name, newSpec] of newMap.entries()) {
    if (existingMap.has(name)) {
      const existing = existingMap.get(name);
      merged.push({ ...newSpec, fieldId: existing.fieldId, content: existing.content, css: existing.css });
      diff.unchanged.push(name);
    } else {
      merged.push(newSpec); // new element, new fieldId already assigned
      diff.added.push(name);
    }
  }

  // Detect removed
  for (const [name] of existingMap.entries()) {
    if (!newMap.has(name)) {
      diff.removed.push(name);
    }
  }

  return { merged, diff };
}

/**
 * Build initial element specs from IDs (pre-LLM, for validation).
 */
export function buildElementSpecs(ids, pageName, sectionId, cardCount = 3) {
  const specs = [
    { fieldId: ids.heroImage,     sectionId, pageName, elementName: 'heroImage',    contentType: 'Image',  content: '/placeholder.jpg' },
    { fieldId: ids.brandBadge,    sectionId, pageName, elementName: 'brandBadge',   contentType: 'Text',   content: 'PULSE FIT' },
    { fieldId: ids.headlineMain,  sectionId, pageName, elementName: 'headlineMain', contentType: 'Text',   content: 'CHALLENGE YOUR LIMITS' },
    { fieldId: ids.headlineSub,   sectionId, pageName, elementName: 'headlineSub',  contentType: 'Text',   content: 'Be a part of the tribe that\'s limitless.' },
    { fieldId: ids.description,   sectionId, pageName, elementName: 'description',  contentType: 'Textfield', content: 'Join trainer-led workout sessions designed to kickstart your fitness journey.' },
    { fieldId: ids.ctaButton,     sectionId, pageName, elementName: 'ctaButton',    contentType: 'Button', content: 'FIND A WORKOUT' },
  ];

  // Cards loop
  const defaultCards = [
    { value1: '1000+', value2: 'Community Members' },
    { value1: '40+',   value2: 'Fitness Programmes' },
    { value1: '150+',  value2: 'Fitness Channels' },
  ];

  const loopItems = (ids.cards || []).slice(0, cardCount).map((card, i) => ({
    fieldId1: card.fieldId1,
    fieldId2: card.fieldId2,
    value1: defaultCards[i]?.value1 || `${i + 1}+`,
    value2: defaultCards[i]?.value2 || `Item ${i + 1}`,
  }));

  specs.push({
    fieldId: ids.cardsContainer,
    sectionId,
    pageName,
    elementName: 'statBadges',
    contentType: 'Cards',
    content: '',
    loop: loopItems,
  });

  return specs;
}

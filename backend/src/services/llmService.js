import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Build the system prompt for the generation engine.
 */
function buildSystemPrompt(ids) {
  return `You are a React/JSX code generator for the CodeX CMS system.
You generate a SINGLE React functional component for a CMS-bound section.

RULES (mandatory):
1. Use the EXACT fieldIds provided — never invent new ones.
2. Every editable text node uses dangerouslySetInnerHTML with fallback.
3. Every image uses the getImage helper pattern.
4. Cards.loop items must use their nested fieldIds.
5. Apply allSectionsCss on cssData change.
6. Tailwind layout: 2-col desktop, stacked mobile.
7. Export default the component.
8. No real secrets, no real URLs, no placeholder imports.
9. Only return the JSX code block — no markdown, no explanation.

FIELD IDS to use:
${JSON.stringify(ids, null, 2)}`;
}

/**
 * Build the user prompt based on inputs.
 */
function buildUserPrompt({ prompt, existingCode, imageBase64, pageName, sectionName, accentColor, cardCount, ids }) {
  let parts = [];

  if (prompt) parts.push(`USER PROMPT: ${prompt}`);
  if (existingCode) parts.push(`EXISTING CODE PATTERNS:\n\`\`\`jsx\n${existingCode.slice(0, 3000)}\n\`\`\``);

  parts.push(`\nGenerate a React section component with:
- pageName prop defaulting to "${pageName || 'Home'}"
- sectionName: "${sectionName || 'HeroSection'}"
- accentColor: "${accentColor || '#ef4444'}"
- ${cardCount || 3} stat cards in the loop
- Import and use: useSelector, useDispatch from react-redux
- Fetch elements on mount via dispatch(fetchElementsByIds(allFieldIds))
- Read from state.cms.allSections[pageName] and state.cms.allSectionsCss[pageName]
- Apply css overrides via useEffect on cssData changes

Component structure:
const ids = { heroImage: "${ids.heroImage}", brandBadge: "${ids.brandBadge}", headlineMain: "${ids.headlineMain}", headlineSub: "${ids.headlineSub}", description: "${ids.description}", ctaButton: "${ids.ctaButton}" };

const DEFAULT_CARDS = ${JSON.stringify((ids.cards || []).map((c, i) => ({
  fieldId1: c.fieldId1,
  fieldId2: c.fieldId2,
  value1: ['1000+', '40+', '150+'][i] || '0+',
  value2: ['Community Members', 'Fitness Programmes', 'Fitness Channels'][i] || 'Items',
})))};`);

  return parts.join('\n\n');
}

/**
 * Generate JSX from Claude API.
 * Supports wireframe image (base64), existing code, and prompt.
 */
export async function generateJSX({ prompt, existingCode, imageBase64, imageMime, pageName, sectionName, accentColor, cardCount = 3, ids }) {
  const systemPrompt = buildSystemPrompt(ids);
  const userText = buildUserPrompt({ prompt, existingCode, pageName, sectionName, accentColor, cardCount, ids });

  const messages = [];

  // If wireframe image provided — send as vision input
  if (imageBase64 && imageMime) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMime,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `This is the wireframe image. Use it to determine spatial layout — columns, order, alignment.\n\n${userText}`,
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userText });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const raw = response.content[0]?.text || '';

  // Strip markdown code fences if present
  const jsx = raw
    .replace(/^```(?:jsx|tsx|javascript)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  return jsx;
}

/**
 * Validate that generated JSX contains required contract elements.
 */
export function validateJSX(jsx, ids) {
  const warnings = [];
  if (!jsx.includes('const ids')) warnings.push('Missing ids object declaration');
  if (!jsx.includes('dangerouslySetInnerHTML')) warnings.push('Missing dangerouslySetInnerHTML usage');
  if (!jsx.includes('fetchElementsByIds')) warnings.push('Missing fetchElementsByIds dispatch');
  if (!jsx.includes('export default')) warnings.push('Missing export default');
  if (!jsx.includes(ids.headlineMain)) warnings.push('headlineMain fieldId not referenced');
  if (!jsx.includes(ids.ctaButton)) warnings.push('ctaButton fieldId not referenced');
  return warnings;
}

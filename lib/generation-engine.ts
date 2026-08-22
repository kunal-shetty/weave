import OpenAI from "openai"
import { generateFieldId, generateFieldIds } from "./id-generator"

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.V0_API_KEY || "sk-placeholder",
      baseURL:
        process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    })
  }
  return _openai
}

// ─── Types ──────────────────────────────────────────────────────────
export type ContentType = "Image" | "Text" | "Textfield" | "Button" | "Cards"

export interface GeneratedElement {
  fieldId: string
  elementName: string
  contentType: ContentType
  content: string
  loop?: { fieldId: string; value: string; label: string }[]
}

export interface GeneratedSection {
  sectionName: string
  pageName: string
  jsx: string
  elements: GeneratedElement[]
  cardGridColumns: number
}

export interface GenerateInput {
  prompt?: string
  code?: string
  wireframeDescription?: string
  pageName?: string
  sectionName?: string
}

// ─── System Prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are CodeX, an AI UI generation engine for Smart India Hackathon 2026.
You generate CMS-bound React section components from descriptions.

RULES:
1. You MUST return valid JSON with this exact structure:
{
  "sectionName": "string",
  "pageName": "string",
  "elements": [
    {
      "elementName": "semantic name like heroImage, headlineMain, brandBadge, description, ctaButton, statCards",
      "contentType": "Image|Text|Textfield|Button|Cards",
      "content": "default text or image path",
      "loop": [{"value": "stat value", "label": "stat label"}] // only for Cards type
    }
  ],
  "jsx": "the complete React component as a string"
}

2. Every generated section MUST follow the split-hero pattern:
   - Image left, content right (2-column desktop, stacked mobile)
   - brandBadge, headlineMain, headlineSub, description
   - statCards with loop array (default 3 cards)
   - ctaButton

3. The JSX MUST:
   - Declare a const ids object mapping semantic names to fieldId strings (use placeholder 10-digit IDs like "0000000001")
   - Accept pageName as a prop (default "Home")
   - Use state.cms.allSections[pageName] for live content
   - Have id={ids.something} on every editable node
   - Use dangerouslySetInnerHTML with fallback: data?.[id] || "DEFAULT"
   - Use getImage helper for images with onError placeholder
   - Export default the section component
   - Use Tailwind CSS for layout

4. Use these Tailwind classes: grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-7xl mx-auto px-4

5. Return ONLY the JSON object, no markdown fences or extra text.`

// ─── Engine Functions ───────────────────────────────────────────────

/**
 * Generate a section from user input using AI.
 */
export async function generateSection(input: GenerateInput): Promise<GeneratedSection> {
  const userMessage = buildUserPrompt(input)

  const response = await getOpenAI().chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error("AI returned empty response")

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("AI returned invalid JSON — retry once")
  }

  // Validate structure
  if (!parsed.elements || !Array.isArray(parsed.elements)) {
    throw new Error("AI response missing 'elements' array")
  }

  // Assign real 10-digit fieldIds (never from LLM)
  const elementCount = (parsed.elements as unknown[]).length
  const cardCount = (parsed.cardGridColumns as number) || 3
  const allIds = generateFieldIds(elementCount + cardCount)

  let idIndex = 0
  const elements: GeneratedElement[] = (parsed.elements as Record<string, string>[]).map(
    (el) => {
      const fieldId = allIds[idIndex++] || generateFieldId()
      const result: GeneratedElement = {
        fieldId,
        elementName: el.elementName || "unknown",
        contentType: (el.contentType as ContentType) || "Text",
        content: el.content || "",
      }

      // Assign nested card IDs
      if (el.contentType === "Cards" && el.loop && Array.isArray(el.loop)) {
        result.loop = el.loop.map((item: Record<string, string>) => ({
          fieldId: allIds[idIndex++] || generateFieldId(),
          value: item.value || "",
          label: item.label || "",
        }))
      }

      return result
    }
  )

  // Replace placeholder IDs in JSX with real ones
  let jsx = (parsed.jsx as string) || ""
  const placeholderIds = [
    "0000000001",
    "0000000002",
    "0000000003",
    "0000000004",
    "0000000005",
    "0000000006",
    "0000000007",
  ]
  elements.forEach((el, i) => {
    if (placeholderIds[i]) {
      jsx = jsx.replace(new RegExp(placeholderIds[i], "g"), el.fieldId)
    }
    if (el.loop) {
      el.loop.forEach((card, ci) => {
        const cardPlaceholder = `CARD${ci + 1}ID`
        jsx = jsx.replace(new RegExp(cardPlaceholder, "g"), card.fieldId)
      })
    }
  })

  return {
    sectionName: (parsed.sectionName as string) || "Generated Section",
    pageName: (parsed.pageName as string) || "Home",
    jsx,
    elements,
    cardGridColumns: (parsed.cardGridColumns as number) || 3,
  }
}

/**
 * Build the user prompt from combined inputs.
 */
function buildUserPrompt(input: GenerateInput): string {
  const parts: string[] = []

  if (input.prompt) {
    parts.push(`PROMPT (wins copy, colour, CTA, card count):\n${input.prompt}`)
  }
  if (input.wireframeDescription) {
    parts.push(
      `WIREFRAME DESCRIPTION (wins layout — columns, order, alignment):\n${input.wireframeDescription}`
    )
  }
  if (input.code) {
    parts.push(
      `EXISTING CODE (wins patterns — Redux selectors, class conventions):\n${input.code}`
    )
  }

  if (input.sectionName) {
    parts.push(`Section name: ${input.sectionName}`)
  }
  if (input.pageName) {
    parts.push(`Page name: ${input.pageName}`)
  }

  if (parts.length === 0) {
    parts.push(
      "Generate a split-hero section with image left, headline, subheading, description, 3 stat cards, and a CTA button."
    )
  }

  return parts.join("\n\n")
}

/**
 * Diff-merge: preserve existing IDs for unchanged elements.
 * Returns merged element list.
 */
export function diffMergeElements(
  existing: GeneratedElement[],
  generated: GeneratedElement[]
): GeneratedElement[] {
  const existingByName = new Map(existing.map((e) => [e.elementName, e]))

  return generated.map((gen) => {
    const prev = existingByName.get(gen.elementName)
    if (prev) {
      // Keep existing fieldId — never regenerate
      return {
        ...gen,
        fieldId: prev.fieldId,
        loop: gen.loop
          ? gen.loop.map((card, i) => ({
              ...card,
              fieldId: prev.loop?.[i]?.fieldId || card.fieldId,
            }))
          : gen.loop,
      }
    }
    // New element — already has fresh fieldId
    return gen
  })
}

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"

// ─── Types ──────────────────────────────────────────────────────────
export type ContentType = "Image" | "Text" | "Textfield" | "Button" | "Cards"

export interface CardItem {
  fieldId: string
  value: string
  label: string
}

export interface CmsElement {
  fieldId: string
  sectionId: string
  elementName: string
  contentType: ContentType
  content: string
  loop: CardItem[] | null
  css: string | null
  pageName: string
}

export interface CmsSection {
  sectionId: string
  sectionName: string
  pageName: string
  platform: string
  isGenerated: boolean
  sectionStatus: string
  wireframes: string | null
  variations: number
  cardGridColumns: number
}

export interface CmsState {
  // state.cms.allSections[pageName][fieldId] = content string or loop array
  allSections: Record<string, Record<string, string | CardItem[]>>
  // state.cms.allSectionsCss[pageName][fieldId] = cssText string
  allSectionsCss: Record<string, Record<string, string>>
  // state.cms.sectionNames = { [sectionId]: sectionName }
  sectionNames: Record<string, string>
  // Loading states
  loading: boolean
  error: string | null
  // Generation state
  generating: boolean
  generationResult: {
    sectionId: string | null
    jsx: string | null
    previewUrl: string | null
  } | null
}

const initialState: CmsState = {
  allSections: {},
  allSectionsCss: {},
  sectionNames: {},
  loading: false,
  error: null,
  generating: false,
  generationResult: null,
}

// ─── Async Thunks ───────────────────────────────────────────────────

/**
 * Fetch all elements for a pageName and hydrate Redux.
 */
export const fetchElementsByIds = createAsyncThunk(
  "cms/fetchElementsByIds",
  async (
    { pageName }: { pageName: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch(`/api/elements?pageName=${encodeURIComponent(pageName)}`)
      const data = await res.json()

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to fetch elements")
      }

      return { pageName, elements: data.elements as CmsElement[] }
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : "Network error")
    }
  }
)

/**
 * PATCH a single element's content or css.
 */
export const patchElement = createAsyncThunk(
  "cms/patchElement",
  async (
    {
      fieldId,
      content,
      css,
      pageName,
    }: {
      fieldId: string
      content?: string
      css?: string
      pageName: string
    },
    { rejectWithValue }
  ) => {
    try {
      const body: Record<string, unknown> = {}
      if (content !== undefined) body.content = content
      if (css !== undefined) body.css = css

      const res = await fetch(`/api/elements/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to update element")
      }

      return { pageName, element: data.element as CmsElement }
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : "Network error")
    }
  }
)

/**
 * Generate a new section via POST /api/generate.
 */
export const generateNewSection = createAsyncThunk(
  "cms/generateNewSection",
  async (
    {
      prompt,
      code,
      wireframeFile,
      pageName,
      sectionName,
    }: {
      prompt?: string
      code?: string
      wireframeFile?: File
      pageName?: string
      sectionName?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData()
      if (prompt) formData.append("prompt", prompt)
      if (code) formData.append("code", code)
      if (wireframeFile) formData.append("wireframe", wireframeFile)
      if (pageName) formData.append("pageName", pageName)
      if (sectionName) formData.append("sectionName", sectionName)

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        return rejectWithValue(data.error || "Generation failed")
      }

      return data
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : "Network error")
    }
  }
)

// ─── Slice ──────────────────────────────────────────────────────────

const cmsSlice = createSlice({
  name: "cms",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
    clearGenerationResult(state) {
      state.generationResult = null
    },
    // Optimistic local update (before PATCH confirms)
    updateElementLocal(
      state,
      action: PayloadAction<{
        pageName: string
        fieldId: string
        content?: string
        css?: string
      }>
    ) {
      const { pageName, fieldId, content, css } = action.payload
      if (state.allSections[pageName]) {
        if (content !== undefined) {
          state.allSections[pageName][fieldId] = content
        }
      }
      if (state.allSectionsCss[pageName]) {
        if (css !== undefined) {
          state.allSectionsCss[pageName][fieldId] = css
        }
      }
    },
  },
  extraReducers: (builder) => {
    // ── fetchElementsByIds ──
    builder
      .addCase(fetchElementsByIds.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchElementsByIds.fulfilled, (state, action) => {
        state.loading = false
        const { pageName, elements } = action.payload

        if (!state.allSections[pageName]) {
          state.allSections[pageName] = {}
        }
        if (!state.allSectionsCss[pageName]) {
          state.allSectionsCss[pageName] = {}
        }

        for (const el of elements) {
          if (el.contentType === "Cards" && el.loop) {
            state.allSections[pageName][el.fieldId] = el.loop
            // Also store individual card content
            for (const card of el.loop) {
              state.allSections[pageName][card.fieldId] = card.value
              if (!el.loop) continue
            }
          } else {
            state.allSections[pageName][el.fieldId] = el.content
          }
          if (el.css) {
            state.allSectionsCss[pageName][el.fieldId] = el.css
          }
          // Map sectionId → sectionName
          state.sectionNames[el.sectionId] = el.elementName
        }
      })
      .addCase(fetchElementsByIds.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || "Failed to fetch elements"
      })

    // ── patchElement ──
    builder
      .addCase(patchElement.fulfilled, (state, action) => {
        const { pageName, element } = action.payload
        if (!state.allSections[pageName]) {
          state.allSections[pageName] = {}
        }
        if (!state.allSectionsCss[pageName]) {
          state.allSectionsCss[pageName] = {}
        }
        state.allSections[pageName][element.fieldId] = element.content
        if (element.css) {
          state.allSectionsCss[pageName][element.fieldId] = element.css
        }
      })
      .addCase(patchElement.rejected, (state, action) => {
        state.error = (action.payload as string) || "Failed to update element"
      })

    // ── generateNewSection ──
    builder
      .addCase(generateNewSection.pending, (state) => {
        state.generating = true
        state.error = null
        state.generationResult = null
      })
      .addCase(generateNewSection.fulfilled, (state, action) => {
        state.generating = false
        state.generationResult = {
          sectionId: action.payload.sectionId,
          jsx: action.payload.jsx,
          previewUrl: action.payload.previewUrl,
        }
      })
      .addCase(generateNewSection.rejected, (state, action) => {
        state.generating = false
        state.error = (action.payload as string) || "Generation failed"
      })
  },
})

export const { clearError, clearGenerationResult, updateElementLocal } =
  cmsSlice.actions
export default cmsSlice.reducer

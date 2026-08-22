import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CardItem {
  fieldId1: string;
  fieldId2: string;
  value1: string;
  value2: string;
}

export interface CMSElement {
  fieldId: string;
  sectionId: string;
  pageName: string;
  elementName: string;
  contentType: 'Image' | 'Text' | 'Textfield' | 'Button' | 'Cards';
  content: string;
  loop?: CardItem[];
  css?: string | null;
}

interface CMSState {
  // allSections[pageName][fieldId] = content string or loop array
  allSections: Record<string, Record<string, string | CardItem[]>>;
  // allSectionsCss[pageName][fieldId] = cssText
  allSectionsCss: Record<string, Record<string, string>>;
  // sectionNames[sectionId] = sectionName
  sectionNames: Record<string, string>;
  loading: boolean;
  error: string | null;
}

const initialState: CMSState = {
  allSections: {},
  allSectionsCss: {},
  sectionNames: {},
  loading: false,
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchElementsByIds = createAsyncThunk(
  'cms/fetchElementsByIds',
  async ({ pageName, fieldIds }: { pageName: string; fieldIds: string[] }) => {
    const res = await fetch(`${API}/api/elements?pageName=${pageName}`);
    if (!res.ok) throw new Error('Failed to fetch elements');
    const elements: CMSElement[] = await res.json();
    // Filter to requested IDs
    const filtered = elements.filter((el) => fieldIds.includes(el.fieldId));
    return { pageName, elements: filtered };
  }
);

export const fetchElementsByPage = createAsyncThunk(
  'cms/fetchElementsByPage',
  async (pageName: string) => {
    const res = await fetch(`${API}/api/elements?pageName=${pageName}`);
    if (!res.ok) throw new Error('Failed to fetch elements');
    const elements: CMSElement[] = await res.json();
    return { pageName, elements };
  }
);

export const patchElement = createAsyncThunk(
  'cms/patchElement',
  async ({ fieldId, content, css, loop }: { fieldId: string; content?: string; css?: string; loop?: CardItem[] }) => {
    const res = await fetch(`${API}/api/elements/${fieldId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, css, loop }),
    });
    if (!res.ok) throw new Error('Failed to patch element');
    const el: CMSElement = await res.json();
    return el;
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    setSectionName(state, action: PayloadAction<{ sectionId: string; sectionName: string }>) {
      state.sectionNames[action.payload.sectionId] = action.payload.sectionName;
    },
    // Apply a live socket patch without API round-trip
    applyLivePatch(state, action: PayloadAction<CMSElement>) {
      const { fieldId, pageName, content, css, loop } = action.payload;
      if (!state.allSections[pageName]) state.allSections[pageName] = {};
      if (!state.allSectionsCss[pageName]) state.allSectionsCss[pageName] = {};
      if (loop && loop.length > 0) {
        state.allSections[pageName][fieldId] = loop;
      } else {
        state.allSections[pageName][fieldId] = content;
      }
      if (css) state.allSectionsCss[pageName][fieldId] = css;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchElementsByIds.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchElementsByIds.fulfilled, (state, action) => {
        state.loading = false;
        const { pageName, elements } = action.payload;
        if (!state.allSections[pageName]) state.allSections[pageName] = {};
        if (!state.allSectionsCss[pageName]) state.allSectionsCss[pageName] = {};
        elements.forEach((el) => {
          if (el.contentType === 'Cards' && el.loop) {
            state.allSections[pageName][el.fieldId] = el.loop;
          } else {
            state.allSections[pageName][el.fieldId] = el.content;
          }
          if (el.css) state.allSectionsCss[pageName][el.fieldId] = el.css;
        });
      })
      .addCase(fetchElementsByIds.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Error'; })
      .addCase(fetchElementsByPage.fulfilled, (state, action) => {
        const { pageName, elements } = action.payload;
        if (!state.allSections[pageName]) state.allSections[pageName] = {};
        if (!state.allSectionsCss[pageName]) state.allSectionsCss[pageName] = {};
        elements.forEach((el) => {
          if (el.contentType === 'Cards' && el.loop) {
            state.allSections[pageName][el.fieldId] = el.loop;
          } else {
            state.allSections[pageName][el.fieldId] = el.content;
          }
          if (el.css) state.allSectionsCss[pageName][el.fieldId] = el.css;
        });
      })
      .addCase(patchElement.fulfilled, (state, action) => {
        const el = action.payload;
        if (!state.allSections[el.pageName]) state.allSections[el.pageName] = {};
        if (!state.allSectionsCss[el.pageName]) state.allSectionsCss[el.pageName] = {};
        if (el.contentType === 'Cards' && el.loop) {
          state.allSections[el.pageName][el.fieldId] = el.loop;
        } else {
          state.allSections[el.pageName][el.fieldId] = el.content;
        }
        if (el.css) state.allSectionsCss[el.pageName][el.fieldId] = el.css;
      });
  },
});

export const { setSectionName, applyLivePatch } = cmsSlice.actions;
export default cmsSlice.reducer;

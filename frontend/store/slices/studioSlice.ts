import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface GenerationJob {
  id: string;
  sectionId: string;
  sectionName: string;
  pageName: string;
  generatedJsx: string;
  ids: Record<string, unknown>;
  warnings: string[];
  timestamp: number;
}

interface StudioState {
  generating: boolean;
  error: string | null;
  progress: string | null;
  lastJob: GenerationJob | null;
  jobHistory: GenerationJob[];
}

const initialState: StudioState = {
  generating: false,
  error: null,
  progress: null,
  lastJob: null,
  jobHistory: [],
};

export const runGenerate = createAsyncThunk(
  'studio/generate',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Generation failed');
      }
      return res.json();
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Network error');
    }
  }
);

const studioSlice = createSlice({
  name: 'studio',
  initialState,
  reducers: {
    setProgress(state, action: PayloadAction<string>) {
      state.progress = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runGenerate.pending, (state) => {
        state.generating = true;
        state.error = null;
        state.progress = 'Sending to generation engine…';
      })
      .addCase(runGenerate.fulfilled, (state, action) => {
        state.generating = false;
        state.progress = null;
        const job: GenerationJob = {
          id: `job_${Date.now()}`,
          sectionId: action.payload.sectionId,
          sectionName: action.payload.sectionName,
          pageName: action.payload.pageName,
          generatedJsx: action.payload.generatedJsx,
          ids: action.payload.ids,
          warnings: action.payload.warnings || [],
          timestamp: Date.now(),
        };
        state.lastJob = job;
        // Keep last 5 jobs
        state.jobHistory = [job, ...state.jobHistory].slice(0, 5);
      })
      .addCase(runGenerate.rejected, (state, action) => {
        state.generating = false;
        state.progress = null;
        state.error = (action.payload as string) || 'Unknown error';
      });
  },
});

export const { setProgress, clearError } = studioSlice.actions;
export default studioSlice.reducer;

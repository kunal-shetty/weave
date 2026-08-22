import { configureStore } from '@reduxjs/toolkit';
import cmsReducer from './slices/cmsSlice';
import studioReducer from './slices/studioSlice';

export const store = configureStore({
  reducer: {
    cms: cmsReducer,
    studio: studioReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

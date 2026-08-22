import { configureStore } from "@reduxjs/toolkit"
import cmsReducer from "./cmsSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      cms: cmsReducer,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]

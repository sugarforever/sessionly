import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import sessionsReducer from './slices/sessionsSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    sessions: sessionsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

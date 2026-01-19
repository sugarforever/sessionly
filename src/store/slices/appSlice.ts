import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  version: string
  theme: 'light' | 'dark'
}

const initialState: AppState = {
  version: '',
  theme: 'light',
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setVersion: (state, action: PayloadAction<string>) => {
      state.version = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
    },
  },
})

export const { setVersion, setTheme, toggleTheme } = appSlice.actions
export default appSlice.reducer

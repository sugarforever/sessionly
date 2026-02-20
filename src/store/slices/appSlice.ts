import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  version: string
}

const initialState: AppState = {
  version: '',
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setVersion: (state, action: PayloadAction<string>) => {
      state.version = action.payload
    },
  },
})

export const { setVersion } = appSlice.actions
export default appSlice.reducer

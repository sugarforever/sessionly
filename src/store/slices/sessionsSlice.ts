import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Session, ProjectGroup } from '@/../electron/shared/types'

interface SessionsState {
  projectGroups: ProjectGroup[]
  currentSession: Session | null
  selectedSessionId: string | null
  selectedProjectEncoded: string | null
  isLoading: boolean
  isLoadingSession: boolean
  error: string | null
}

const initialState: SessionsState = {
  projectGroups: [],
  currentSession: null,
  selectedSessionId: null,
  selectedProjectEncoded: null,
  isLoading: false,
  isLoadingSession: false,
  error: null,
}

// Async thunk to fetch all sessions
export const fetchSessions = createAsyncThunk(
  'sessions/fetchAll',
  async (_, { rejectWithValue }) => {
    const response = await window.electron.sessionsGetAll()
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch sessions')
    }
    return response.data
  }
)

// Async thunk to fetch a single session
export const fetchSession = createAsyncThunk(
  'sessions/fetchOne',
  async (
    { sessionId, projectEncoded }: { sessionId: string; projectEncoded: string },
    { rejectWithValue }
  ) => {
    const response = await window.electron.sessionsGet(sessionId, projectEncoded)
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch session')
    }
    return response.data
  }
)

// Async thunk to refresh sessions
export const refreshSessions = createAsyncThunk(
  'sessions/refresh',
  async (_, { dispatch, rejectWithValue }) => {
    const response = await window.electron.sessionsRefresh()
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to refresh sessions')
    }
    // After refresh, fetch updated sessions
    dispatch(fetchSessions())
  }
)

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    selectSession: (
      state,
      action: PayloadAction<{ sessionId: string; projectEncoded: string } | null>
    ) => {
      if (action.payload) {
        state.selectedSessionId = action.payload.sessionId
        state.selectedProjectEncoded = action.payload.projectEncoded
      } else {
        state.selectedSessionId = null
        state.selectedProjectEncoded = null
        state.currentSession = null
      }
    },
    clearCurrentSession: (state) => {
      state.currentSession = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSessions
      .addCase(fetchSessions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.isLoading = false
        state.projectGroups = action.payload || []
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // fetchSession
      .addCase(fetchSession.pending, (state) => {
        state.isLoadingSession = true
        state.error = null
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.isLoadingSession = false
        state.currentSession = action.payload || null
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.isLoadingSession = false
        state.error = action.payload as string
      })
      // refreshSessions
      .addCase(refreshSessions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(refreshSessions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { selectSession, clearCurrentSession, clearError } = sessionsSlice.actions
export default sessionsSlice.reducer

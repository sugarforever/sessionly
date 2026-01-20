import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import type { Session, ProjectGroup } from '@/../electron/shared/types'
import type { RootState } from '@/store'

interface SessionsState {
  projectGroups: ProjectGroup[]
  currentSession: Session | null
  selectedSessionId: string | null
  selectedProjectEncoded: string | null
  isLoading: boolean
  isLoadingSession: boolean
  error: string | null
  // Hidden state
  hiddenProjects: string[]
  hiddenSessions: string[]
  showHidden: boolean
}

// Load hidden state from localStorage
const loadHiddenState = (): {
  hiddenProjects: string[]
  hiddenSessions: string[]
  showHidden: boolean
} => {
  try {
    return {
      hiddenProjects: JSON.parse(localStorage.getItem('hiddenProjects') || '[]'),
      hiddenSessions: JSON.parse(localStorage.getItem('hiddenSessions') || '[]'),
      showHidden: localStorage.getItem('showHidden') === 'true',
    }
  } catch {
    return { hiddenProjects: [], hiddenSessions: [], showHidden: false }
  }
}

const hiddenState = loadHiddenState()

const initialState: SessionsState = {
  projectGroups: [],
  currentSession: null,
  selectedSessionId: null,
  selectedProjectEncoded: null,
  isLoading: false,
  isLoadingSession: false,
  error: null,
  hiddenProjects: hiddenState.hiddenProjects,
  hiddenSessions: hiddenState.hiddenSessions,
  showHidden: hiddenState.showHidden,
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
    // Hidden state actions
    hideProject: (state, action: PayloadAction<string>) => {
      if (!state.hiddenProjects.includes(action.payload)) {
        state.hiddenProjects.push(action.payload)
        localStorage.setItem('hiddenProjects', JSON.stringify(state.hiddenProjects))
      }
    },
    unhideProject: (state, action: PayloadAction<string>) => {
      state.hiddenProjects = state.hiddenProjects.filter((id) => id !== action.payload)
      localStorage.setItem('hiddenProjects', JSON.stringify(state.hiddenProjects))
    },
    hideSession: (state, action: PayloadAction<string>) => {
      if (!state.hiddenSessions.includes(action.payload)) {
        state.hiddenSessions.push(action.payload)
        localStorage.setItem('hiddenSessions', JSON.stringify(state.hiddenSessions))
      }
    },
    unhideSession: (state, action: PayloadAction<string>) => {
      state.hiddenSessions = state.hiddenSessions.filter((id) => id !== action.payload)
      localStorage.setItem('hiddenSessions', JSON.stringify(state.hiddenSessions))
    },
    toggleShowHidden: (state) => {
      state.showHidden = !state.showHidden
      localStorage.setItem('showHidden', String(state.showHidden))
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

export const {
  selectSession,
  clearCurrentSession,
  clearError,
  hideProject,
  unhideProject,
  hideSession,
  unhideSession,
  toggleShowHidden,
} = sessionsSlice.actions
export default sessionsSlice.reducer

// Selectors - memoized with createSelector
const selectProjectGroups = (state: RootState) => state.sessions.projectGroups
const selectHiddenProjects = (state: RootState) => state.sessions.hiddenProjects
const selectHiddenSessions = (state: RootState) => state.sessions.hiddenSessions
const selectShowHidden = (state: RootState) => state.sessions.showHidden

export const selectVisibleProjectGroups = createSelector(
  [selectProjectGroups, selectHiddenProjects, selectHiddenSessions, selectShowHidden],
  (projectGroups, hiddenProjects, hiddenSessions, showHidden): ProjectGroup[] => {
    if (showHidden) return projectGroups

    return projectGroups
      .filter((group) => !hiddenProjects.includes(group.projectEncoded))
      .map((group) => ({
        ...group,
        sessions: group.sessions.filter((s) => !hiddenSessions.includes(s.id)),
      }))
      .filter((group) => group.sessions.length > 0)
  }
)

export const selectHiddenCount = createSelector(
  [selectHiddenProjects, selectHiddenSessions],
  (hiddenProjects, hiddenSessions): { projects: number; sessions: number } => ({
    projects: hiddenProjects.length,
    sessions: hiddenSessions.length,
  })
)

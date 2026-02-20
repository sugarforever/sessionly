import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import type { Session, ProjectGroup } from '@/types/session-types'
import type { RootState } from '@/store'
import { api } from '@/types/api'

const pendingPersists: Map<string, { value: string; timeout: ReturnType<typeof setTimeout> }> =
  new Map()
const PERSIST_DEBOUNCE_MS = 300

function debouncedPersist(key: string, value: unknown) {
  const serialized = JSON.stringify(value)
  const pending = pendingPersists.get(key)
  if (pending) {
    clearTimeout(pending.timeout)
  }
  const timeout = setTimeout(() => {
    try {
      localStorage.setItem(key, serialized)
    } catch (e) {
      console.warn(`Failed to persist ${key} to localStorage:`, e)
    }
    pendingPersists.delete(key)
  }, PERSIST_DEBOUNCE_MS)
  pendingPersists.set(key, { value: serialized, timeout })
}

interface SessionsState {
  projectGroups: ProjectGroup[]
  currentSession: Session | null
  selectedSessionId: string | null
  selectedProjectEncoded: string | null
  isLoading: boolean
  isLoadingSession: boolean
  error: string | null
  hiddenProjects: string[]
  hiddenSessions: string[]
  showHidden: boolean
}

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

export const fetchSessions = createAsyncThunk(
  'sessions/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await api.sessionsGetAll()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch sessions')
    }
  }
)

export const fetchSession = createAsyncThunk(
  'sessions/fetchOne',
  async (
    { sessionId, projectEncoded }: { sessionId: string; projectEncoded: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.sessionsGet(sessionId, projectEncoded)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch session')
    }
  }
)

export const refreshSessions = createAsyncThunk(
  'sessions/refresh',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await api.sessionsRefresh()
      dispatch(fetchSessions())
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh sessions')
    }
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
    hideProject: (state, action: PayloadAction<string>) => {
      if (!state.hiddenProjects.includes(action.payload)) {
        state.hiddenProjects.push(action.payload)
        debouncedPersist('hiddenProjects', state.hiddenProjects)
      }
    },
    unhideProject: (state, action: PayloadAction<string>) => {
      state.hiddenProjects = state.hiddenProjects.filter((id) => id !== action.payload)
      debouncedPersist('hiddenProjects', state.hiddenProjects)
    },
    hideSession: (state, action: PayloadAction<string>) => {
      if (!state.hiddenSessions.includes(action.payload)) {
        state.hiddenSessions.push(action.payload)
        debouncedPersist('hiddenSessions', state.hiddenSessions)
      }
    },
    unhideSession: (state, action: PayloadAction<string>) => {
      state.hiddenSessions = state.hiddenSessions.filter((id) => id !== action.payload)
      debouncedPersist('hiddenSessions', state.hiddenSessions)
    },
    toggleShowHidden: (state) => {
      state.showHidden = !state.showHidden
      debouncedPersist('showHidden', state.showHidden)
    },
  },
  extraReducers: (builder) => {
    builder
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

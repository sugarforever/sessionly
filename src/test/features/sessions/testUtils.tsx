import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import sessionsReducer from '@/store/slices/sessionsSlice'
import appReducer from '@/store/slices/appSlice'
import type { ProjectGroup, Session, SessionSummary } from '@/../electron/shared/types'
import type {
  ProcessedMessage,
  ThinkingBlock,
  ToolUseBlock,
} from '@/../electron/shared/session-types'

// Counter for generating unique IDs
let mockSessionCounter = 0

// Mock session summary factory
export function createMockSessionSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  const uniqueId = `session-${++mockSessionCounter}-${Math.random().toString(36).substring(7)}`
  return {
    id: overrides.id ?? uniqueId,
    project: '/Users/test/project1',
    projectEncoded: '-Users-test-project1',
    firstMessage: 'Help me with this code',
    messageCount: 10,
    startTime: Date.now() - 3600000, // 1 hour ago
    endTime: Date.now(),
    gitBranch: 'main',
    model: 'claude-3-opus',
    filePath: overrides.filePath ?? `/path/to/${uniqueId}.jsonl`,
    ...overrides,
  }
}

// Mock project group factory
export function createMockProjectGroup(overrides: Partial<ProjectGroup> = {}): ProjectGroup {
  return {
    project: '/Users/test/project1',
    projectEncoded: '-Users-test-project1',
    sessions: [createMockSessionSummary()],
    ...overrides,
  }
}

// Mock processed message factory
export function createMockMessage(overrides: Partial<ProcessedMessage> = {}): ProcessedMessage {
  return {
    uuid: `msg-${Math.random().toString(36).substring(7)}`,
    parentUuid: null,
    timestamp: new Date().toISOString(),
    role: 'user',
    textContent: 'Hello, this is a test message',
    thinkingBlocks: [],
    toolUseBlocks: [],
    toolResults: {},
    ...overrides,
  }
}

// Mock session factory
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    project: '/Users/test/project1',
    projectEncoded: '-Users-test-project1',
    gitBranch: 'main',
    cwd: '/Users/test/project1',
    version: '1.0.0',
    startTime: Date.now() - 3600000,
    endTime: Date.now(),
    messages: [
      createMockMessage({ role: 'user', textContent: 'Hello' }),
      createMockMessage({ role: 'assistant', textContent: 'Hi there!', parentUuid: 'msg-1' }),
    ],
    filePath: '/path/to/session-1.jsonl',
    subagents: {},
    ...overrides,
  }
}

// Mock thinking block factory
export function createMockThinkingBlock(overrides: Partial<ThinkingBlock> = {}): ThinkingBlock {
  return {
    type: 'thinking',
    thinking: 'Let me analyze this problem step by step...',
    ...overrides,
  }
}

// Mock tool use block factory
export function createMockToolUseBlock(overrides: Partial<ToolUseBlock> = {}): ToolUseBlock {
  return {
    type: 'tool_use',
    id: `tool-${Math.random().toString(36).substring(7)}`,
    name: 'Read',
    input: { file_path: '/test/file.ts' },
    ...overrides,
  }
}

// Create a test store
export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      app: appReducer,
      sessions: sessionsReducer,
    },
    preloadedState,
  })
}

// Custom render function with Redux provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Record<string, unknown>
  store?: ReturnType<typeof createTestStore>
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything from testing library
export * from '@testing-library/react'

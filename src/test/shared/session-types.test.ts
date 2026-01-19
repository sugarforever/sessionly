import { describe, it, expect } from 'vitest'
import {
  isFileHistorySnapshot,
  isUserMessage,
  isAssistantMessage,
  isTextBlock,
  isThinkingBlock,
  isToolUseBlock,
  isToolResultBlock,
  type ContentBlock,
  type FileHistorySnapshot,
  type RawUserMessage,
  type RawAssistantMessage,
} from '@/../electron/shared/session-types'

describe('session-types', () => {
  describe('isFileHistorySnapshot', () => {
    it('should return true for file history snapshot entries', () => {
      const entry: FileHistorySnapshot = {
        type: 'file-history-snapshot',
        messageId: 'test-id',
        snapshot: {
          messageId: 'test-id',
          trackedFileBackups: {},
          timestamp: '2024-01-01T00:00:00Z',
        },
        isSnapshotUpdate: false,
      }
      expect(isFileHistorySnapshot(entry)).toBe(true)
    })

    it('should return false for user messages', () => {
      const entry: RawUserMessage = {
        type: 'user',
        uuid: 'test-uuid',
        parentUuid: null,
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'user', content: 'Hello' },
      }
      expect(isFileHistorySnapshot(entry)).toBe(false)
    })

    it('should return false for assistant messages', () => {
      const entry: RawAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid',
        parentUuid: 'parent-uuid',
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'assistant', content: 'Hi there' },
      }
      expect(isFileHistorySnapshot(entry)).toBe(false)
    })
  })

  describe('isUserMessage', () => {
    it('should return true for user messages', () => {
      const entry: RawUserMessage = {
        type: 'user',
        uuid: 'test-uuid',
        parentUuid: null,
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'user', content: 'Hello' },
      }
      expect(isUserMessage(entry)).toBe(true)
    })

    it('should return false for assistant messages', () => {
      const entry: RawAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid',
        parentUuid: 'parent-uuid',
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'assistant', content: 'Hi' },
      }
      expect(isUserMessage(entry)).toBe(false)
    })

    it('should return false for file history snapshots', () => {
      const entry: FileHistorySnapshot = {
        type: 'file-history-snapshot',
        messageId: 'test-id',
        snapshot: {
          messageId: 'test-id',
          trackedFileBackups: {},
          timestamp: '2024-01-01T00:00:00Z',
        },
        isSnapshotUpdate: false,
      }
      expect(isUserMessage(entry)).toBe(false)
    })
  })

  describe('isAssistantMessage', () => {
    it('should return true for assistant messages', () => {
      const entry: RawAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid',
        parentUuid: 'parent-uuid',
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'assistant', content: 'Hello' },
      }
      expect(isAssistantMessage(entry)).toBe(true)
    })

    it('should return false for user messages', () => {
      const entry: RawUserMessage = {
        type: 'user',
        uuid: 'test-uuid',
        parentUuid: null,
        timestamp: '2024-01-01T00:00:00Z',
        sessionId: 'session-1',
        cwd: '/test',
        version: '1.0.0',
        isSidechain: false,
        userType: 'external',
        message: { role: 'user', content: 'Hello' },
      }
      expect(isAssistantMessage(entry)).toBe(false)
    })
  })

  describe('isTextBlock', () => {
    it('should return true for text blocks', () => {
      const block: ContentBlock = { type: 'text', text: 'Hello world' }
      expect(isTextBlock(block)).toBe(true)
    })

    it('should return false for thinking blocks', () => {
      const block: ContentBlock = { type: 'thinking', thinking: 'Let me think...' }
      expect(isTextBlock(block)).toBe(false)
    })

    it('should return false for tool use blocks', () => {
      const block: ContentBlock = {
        type: 'tool_use',
        id: 'tool-1',
        name: 'Read',
        input: { file_path: '/test.txt' },
      }
      expect(isTextBlock(block)).toBe(false)
    })
  })

  describe('isThinkingBlock', () => {
    it('should return true for thinking blocks', () => {
      const block: ContentBlock = { type: 'thinking', thinking: 'Let me analyze this...' }
      expect(isThinkingBlock(block)).toBe(true)
    })

    it('should return false for text blocks', () => {
      const block: ContentBlock = { type: 'text', text: 'Hello' }
      expect(isThinkingBlock(block)).toBe(false)
    })

    it('should return false for tool result blocks', () => {
      const block: ContentBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'File contents',
      }
      expect(isThinkingBlock(block)).toBe(false)
    })
  })

  describe('isToolUseBlock', () => {
    it('should return true for tool use blocks', () => {
      const block: ContentBlock = {
        type: 'tool_use',
        id: 'tool-1',
        name: 'Bash',
        input: { command: 'ls -la' },
      }
      expect(isToolUseBlock(block)).toBe(true)
    })

    it('should return false for text blocks', () => {
      const block: ContentBlock = { type: 'text', text: 'Hello' }
      expect(isToolUseBlock(block)).toBe(false)
    })

    it('should return false for tool result blocks', () => {
      const block: ContentBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'Output',
      }
      expect(isToolUseBlock(block)).toBe(false)
    })
  })

  describe('isToolResultBlock', () => {
    it('should return true for tool result blocks with string content', () => {
      const block: ContentBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'File contents here',
      }
      expect(isToolResultBlock(block)).toBe(true)
    })

    it('should return true for tool result blocks with array content', () => {
      const block: ContentBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: [{ type: 'text', text: 'Result text' }],
      }
      expect(isToolResultBlock(block)).toBe(true)
    })

    it('should return true for error tool results', () => {
      const block: ContentBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'Error message',
        is_error: true,
      }
      expect(isToolResultBlock(block)).toBe(true)
    })

    it('should return false for tool use blocks', () => {
      const block: ContentBlock = {
        type: 'tool_use',
        id: 'tool-1',
        name: 'Read',
        input: {},
      }
      expect(isToolResultBlock(block)).toBe(false)
    })

    it('should return false for text blocks', () => {
      const block: ContentBlock = { type: 'text', text: 'Hello' }
      expect(isToolResultBlock(block)).toBe(false)
    })
  })
})

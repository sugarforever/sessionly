/**
 * Session Store Service
 *
 * Handles reading and parsing Claude Code session files from ~/.claude/projects/
 * Uses streaming readline for memory-efficient parsing of large JSONL files.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as readline from 'node:readline'
import type {
  RawJSONLEntry,
  RawUserMessage,
  RawAssistantMessage,
  Session,
  SessionSummary,
  ProcessedMessage,
  ProjectGroup,
  ContentBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
  SubagentSession,
} from '../../shared/session-types'

import {
  isFileHistorySnapshot,
  isProgressMessage,
  isUserMessage,
  isAssistantMessage,
  isTextBlock,
  isThinkingBlock,
  isToolUseBlock,
  isToolResultBlock,
} from '../../shared/session-types'

/**
 * Get the Claude directory path
 */
export function getClaudeDir(): string {
  return path.join(os.homedir(), '.claude')
}

/**
 * Get the projects directory path
 */
export function getProjectsDir(): string {
  return path.join(getClaudeDir(), 'projects')
}

/**
 * Decode an encoded project path
 * e.g., "-Users-name-project" -> "/Users/name/project"
 *
 * Claude Code's encoding simply replaces "/" with "-", which is lossy.
 * We need to find the actual path by checking which interpretation exists.
 */
export function decodeProjectPath(encoded: string): string {
  if (!encoded.startsWith('-')) {
    return encoded
  }

  // Simple decode: replace all dashes with slashes
  const simpleDecode = encoded.replace(/-/g, '/')

  // Check if the simple decode path exists
  if (fs.existsSync(simpleDecode)) {
    return simpleDecode
  }

  // Try to find the actual path by testing different hyphen positions
  // Start from the end and work backwards, trying to join segments with hyphens
  const segments = encoded.slice(1).split('-') // Remove leading dash, split by dash

  return findValidPath('/', segments) || simpleDecode
}

/**
 * Recursively find a valid path by trying different combinations
 * of joining segments with "/" or "-"
 */
function findValidPath(basePath: string, remainingSegments: string[]): string | null {
  if (remainingSegments.length === 0) {
    return fs.existsSync(basePath) ? basePath : null
  }

  // Try adding next segment as a new directory
  const withSlash = path.join(basePath, remainingSegments[0])
  if (fs.existsSync(withSlash)) {
    const result = findValidPath(withSlash, remainingSegments.slice(1))
    if (result) return result
  }

  // Try joining with hyphen (combine with previous segment)
  if (remainingSegments.length >= 2) {
    const combined = remainingSegments[0] + '-' + remainingSegments[1]
    const newSegments = [combined, ...remainingSegments.slice(2)]
    const result = findValidPath(basePath, newSegments)
    if (result) return result
  }

  // If this is the last segment, check if joining with hyphen makes a valid path
  if (remainingSegments.length === 1) {
    const withSlashFinal = path.join(basePath, remainingSegments[0])
    if (fs.existsSync(withSlashFinal)) {
      return withSlashFinal
    }
  }

  return null
}

/**
 * Extract text content from message content blocks
 */
function extractTextContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content
  }

  return content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join('\n')
}

/**
 * Extract thinking blocks from content
 */
function extractThinkingBlocks(content: string | ContentBlock[]): ThinkingBlock[] {
  if (typeof content === 'string') {
    return []
  }
  return content.filter(isThinkingBlock) as ThinkingBlock[]
}

/**
 * Extract tool use blocks from content
 */
function extractToolUseBlocks(content: string | ContentBlock[]): ToolUseBlock[] {
  if (typeof content === 'string') {
    return []
  }
  return content.filter(isToolUseBlock) as ToolUseBlock[]
}

/**
 * Extract tool result from content (for user messages that contain tool results)
 */
function extractToolResults(content: string | ContentBlock[]): Record<string, ToolResultBlock> {
  const results: Record<string, ToolResultBlock> = {}
  if (typeof content === 'string') {
    return results
  }
  for (const block of content) {
    if (isToolResultBlock(block)) {
      results[block.tool_use_id] = block
    }
  }
  return results
}

/**
 * Process a raw message into a UI-friendly format
 */
function processMessage(entry: RawUserMessage | RawAssistantMessage): ProcessedMessage {
  const content = entry.message.content
  return {
    uuid: entry.uuid,
    parentUuid: entry.parentUuid,
    timestamp: entry.timestamp,
    role: entry.message.role,
    textContent: extractTextContent(content),
    thinkingBlocks: extractThinkingBlocks(content),
    toolUseBlocks: extractToolUseBlocks(content),
    toolResults: extractToolResults(content),
    model: entry.message.model,
  }
}

/**
 * Parse a session JSONL file and extract agent links (agentId -> parentToolUseId)
 */
async function parseSessionFileWithAgentLinks(
  filePath: string
): Promise<{ session: Omit<Session, 'subagents'> | null; agentLinks: Record<string, string> }> {
  if (!fs.existsSync(filePath)) {
    return { session: null, agentLinks: {} }
  }

  const messages: ProcessedMessage[] = []
  const agentLinks: Record<string, string> = {}
  const sessionId = path.basename(filePath, '.jsonl')
  let project = ''
  let projectEncoded = ''
  let gitBranch: string | null = null
  let cwd = ''
  let version = ''
  let startTime: number | null = null
  let endTime: number | null = null
  let metadataExtracted = false

  // Extract project from file path
  const pathParts = filePath.split(path.sep)
  const projectsIdx = pathParts.indexOf('projects')
  if (projectsIdx !== -1 && projectsIdx + 1 < pathParts.length) {
    projectEncoded = pathParts[projectsIdx + 1]
    project = decodeProjectPath(projectEncoded)
  }

  // Track tool results separately to merge with tool uses
  const pendingToolResults: Record<string, ToolResultBlock> = {}

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as RawJSONLEntry

      if (isFileHistorySnapshot(entry)) {
        continue
      }

      // Extract agent links from progress messages
      if (isProgressMessage(entry)) {
        if (entry.data?.agentId && entry.parentToolUseID) {
          agentLinks[entry.data.agentId] = entry.parentToolUseID
        }
        continue
      }

      if (isUserMessage(entry) || isAssistantMessage(entry)) {
        // Extract session metadata from first message
        if (!metadataExtracted) {
          metadataExtracted = true
          cwd = entry.cwd
          version = entry.version
          gitBranch = entry.gitBranch || null
        }

        const timestamp = new Date(entry.timestamp).getTime()
        if (startTime === null || timestamp < startTime) {
          startTime = timestamp
        }
        if (endTime === null || timestamp > endTime) {
          endTime = timestamp
        }

        const processed = processMessage(entry)

        // If this is a user message with tool results, store them for later merging
        if (isUserMessage(entry)) {
          for (const [toolId, result] of Object.entries(processed.toolResults)) {
            pendingToolResults[toolId] = result
          }
        }

        // Only add non-empty messages or messages with tool uses
        if (
          processed.textContent.trim() ||
          processed.toolUseBlocks.length > 0 ||
          processed.thinkingBlocks.length > 0
        ) {
          messages.push(processed)
        }
      }
    } catch (e) {
      // Skip malformed JSON lines
      console.warn(`Failed to parse line in ${filePath}:`, e)
    }
  }

  // Merge tool results into corresponding tool use messages
  for (const msg of messages) {
    for (const toolUse of msg.toolUseBlocks) {
      const result = pendingToolResults[toolUse.id]
      if (result) {
        msg.toolResults[toolUse.id] = result
      }
    }
  }

  // Return null if no messages were found
  if (messages.length === 0) {
    return { session: null, agentLinks }
  }

  return {
    session: {
      id: sessionId,
      project,
      projectEncoded,
      gitBranch,
      cwd,
      version,
      startTime,
      endTime,
      messages,
      filePath,
    },
    agentLinks,
  }
}

/**
 * Parse a session JSONL file using streaming for memory efficiency
 */
export async function parseSessionFile(filePath: string): Promise<Session | null> {
  const { session } = await parseSessionFileWithAgentLinks(filePath)
  if (!session) {
    return null
  }
  return { ...session, subagents: {} }
}

/**
 * Get session summary by parsing only the header of the file
 * This is faster than parsing the entire file
 */
export async function getSessionSummary(filePath: string): Promise<SessionSummary | null> {
  if (!fs.existsSync(filePath)) {
    return null
  }

  // Use filename as session ID (guaranteed unique per file)
  const sessionId = path.basename(filePath, '.jsonl')
  let project = ''
  let projectEncoded = ''
  let firstMessage = ''
  let messageCount = 0
  let startTime: number | null = null
  let endTime: number | null = null
  let gitBranch: string | null = null
  let model: string | null = null
  let metadataExtracted = false

  // Extract project from file path
  const pathParts = filePath.split(path.sep)
  const projectsIdx = pathParts.indexOf('projects')
  if (projectsIdx !== -1 && projectsIdx + 1 < pathParts.length) {
    projectEncoded = pathParts[projectsIdx + 1]
    project = decodeProjectPath(projectEncoded)
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as RawJSONLEntry

      if (isFileHistorySnapshot(entry)) {
        continue
      }

      if (isUserMessage(entry) || isAssistantMessage(entry)) {
        messageCount++

        if (!metadataExtracted) {
          metadataExtracted = true
          gitBranch = entry.gitBranch || null
        }

        // Capture first user message as summary
        if (!firstMessage && isUserMessage(entry)) {
          const content = entry.message.content
          firstMessage =
            typeof content === 'string'
              ? content.slice(0, 200)
              : extractTextContent(content).slice(0, 200)
        }

        // Track model from assistant messages
        if (!model && isAssistantMessage(entry) && entry.message.model) {
          model = entry.message.model
        }

        const timestamp = new Date(entry.timestamp).getTime()
        if (startTime === null || timestamp < startTime) {
          startTime = timestamp
        }
        if (endTime === null || timestamp > endTime) {
          endTime = timestamp
        }
      }
    } catch (e) {
      console.warn(`Failed to parse line in ${filePath}:`, e)
    }
  }

  // Return null if no messages were found
  if (messageCount === 0) {
    return null
  }

  return {
    id: sessionId,
    project,
    projectEncoded,
    firstMessage,
    messageCount,
    startTime,
    endTime,
    gitBranch,
    model,
    filePath,
  }
}

/**
 * List all projects in the Claude projects directory
 */
export function listProjects(): string[] {
  const projectsDir = getProjectsDir()
  if (!fs.existsSync(projectsDir)) {
    return []
  }

  try {
    return fs.readdirSync(projectsDir).filter((name) => {
      const fullPath = path.join(projectsDir, name)
      return fs.statSync(fullPath).isDirectory()
    })
  } catch (e) {
    console.error('Failed to list projects:', e)
    return []
  }
}

/**
 * List all session files for a project
 * Excludes agent files (warmup/subagent sessions)
 */
export function listSessionFiles(projectEncoded: string): string[] {
  const projectDir = path.join(getProjectsDir(), projectEncoded)
  if (!fs.existsSync(projectDir)) {
    return []
  }

  try {
    return fs
      .readdirSync(projectDir)
      .filter((name) => name.endsWith('.jsonl') && !name.startsWith('agent-'))
      .map((name) => path.join(projectDir, name))
  } catch (e) {
    console.error('Failed to list sessions:', e)
    return []
  }
}

/**
 * Get all sessions grouped by project
 */
export async function getAllSessions(): Promise<ProjectGroup[]> {
  const projects = listProjects()
  const groups: ProjectGroup[] = []

  for (const projectEncoded of projects) {
    const sessionFiles = listSessionFiles(projectEncoded)
    const sessions: SessionSummary[] = []

    for (const filePath of sessionFiles) {
      const summary = await getSessionSummary(filePath)
      if (summary) {
        sessions.push(summary)
      }
    }

    // Sort sessions by start time (newest first)
    sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))

    if (sessions.length > 0) {
      groups.push({
        project: decodeProjectPath(projectEncoded),
        projectEncoded,
        sessions,
      })
    }
  }

  // Sort groups by most recent session
  groups.sort((a, b) => {
    const aTime = a.sessions[0]?.startTime || 0
    const bTime = b.sessions[0]?.startTime || 0
    return bTime - aTime
  })

  return groups
}

/**
 * Find subagent files for a session
 * Checks both old location ({project}/agent-*.jsonl) and new location ({project}/{sessionId}/subagents/)
 */
function findSubagentFiles(projectDir: string, sessionId: string): string[] {
  const files: string[] = []

  // Check new location: {project}/{sessionId}/subagents/
  const subagentsDir = path.join(projectDir, sessionId, 'subagents')
  if (fs.existsSync(subagentsDir)) {
    try {
      const subFiles = fs
        .readdirSync(subagentsDir)
        .filter((name) => name.startsWith('agent-') && name.endsWith('.jsonl'))
        .map((name) => path.join(subagentsDir, name))
      files.push(...subFiles)
    } catch (e) {
      console.warn('Failed to read subagents directory:', e)
    }
  }

  // Also check old location: {project}/agent-*.jsonl
  // These files have the same sessionId in their content
  try {
    const projectFiles = fs
      .readdirSync(projectDir)
      .filter((name) => name.startsWith('agent-') && name.endsWith('.jsonl'))
      .map((name) => path.join(projectDir, name))
    files.push(...projectFiles)
  } catch (e) {
    console.warn('Failed to read project directory for agent files:', e)
  }

  return files
}

/**
 * Parse a subagent JSONL file, returning just the processed messages
 */
async function parseSubagentFile(filePath: string): Promise<ProcessedMessage[]> {
  if (!fs.existsSync(filePath)) {
    return []
  }

  const messages: ProcessedMessage[] = []
  const pendingToolResults: Record<string, ToolResultBlock> = {}

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as RawJSONLEntry

      if (isFileHistorySnapshot(entry) || isProgressMessage(entry)) {
        continue
      }

      if (isUserMessage(entry) || isAssistantMessage(entry)) {
        const processed = processMessage(entry)

        // If this is a user message with tool results, store them for later merging
        if (isUserMessage(entry)) {
          for (const [toolId, result] of Object.entries(processed.toolResults)) {
            pendingToolResults[toolId] = result
          }
        }

        // Only add non-empty messages or messages with tool uses
        if (
          processed.textContent.trim() ||
          processed.toolUseBlocks.length > 0 ||
          processed.thinkingBlocks.length > 0
        ) {
          messages.push(processed)
        }
      }
    } catch (e) {
      // Skip malformed JSON lines
    }
  }

  // Merge tool results into corresponding tool use messages
  for (const msg of messages) {
    for (const toolUse of msg.toolUseBlocks) {
      const result = pendingToolResults[toolUse.id]
      if (result) {
        msg.toolResults[toolUse.id] = result
      }
    }
  }

  return messages
}

/**
 * Get a single session by ID and project
 */
export async function getSession(
  sessionId: string,
  projectEncoded: string
): Promise<Session | null> {
  const projectDir = path.join(getProjectsDir(), projectEncoded)
  const filePath = path.join(projectDir, `${sessionId}.jsonl`)

  // Parse the main session file, also extracting agent links
  const { session, agentLinks } = await parseSessionFileWithAgentLinks(filePath)
  if (!session) {
    return null
  }

  // Find and load subagent files
  const subagentFiles = findSubagentFiles(projectDir, sessionId)
  const subagents: Record<string, SubagentSession> = {}

  for (const subPath of subagentFiles) {
    const agentId = path.basename(subPath, '.jsonl').replace('agent-', '')
    const parentToolUseId = agentLinks[agentId]

    if (parentToolUseId) {
      const messages = await parseSubagentFile(subPath)
      if (messages.length > 0) {
        subagents[agentId] = {
          agentId,
          parentToolUseId,
          messages,
          messageCount: messages.length,
        }
      }
    }
  }

  // Annotate Task tool uses with agentId
  for (const msg of session.messages) {
    for (const toolUse of msg.toolUseBlocks) {
      if (toolUse.name === 'Task') {
        const match = Object.entries(subagents).find(([, s]) => s.parentToolUseId === toolUse.id)
        if (match) {
          toolUse.agentId = match[0]
        }
      }
    }
  }

  return { ...session, subagents }
}

/**
 * Get all session summaries as a flat list
 */
export async function getAllSessionSummaries(): Promise<SessionSummary[]> {
  const groups = await getAllSessions()
  return groups.flatMap((g) => g.sessions)
}

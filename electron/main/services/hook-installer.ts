/**
 * Hook Installer - Manages Claude Code hook configuration
 *
 * Reads/writes ~/.claude/settings.json to install/uninstall Sessionly hooks.
 * Merges alongside existing user hooks (never overwrites).
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { HOOK_IDENTIFIER, HOOK_SERVER_PORT, HOOK_SERVER_PATH } from '../../shared/pet-types'
import type { HookEventName } from '../../shared/pet-types'
import { petLogger } from './pet-logger'

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')

const HOOK_COMMAND = `curl -s -X POST http://localhost:${HOOK_SERVER_PORT}${HOOK_SERVER_PATH} -d @- || true`

const HOOK_EVENTS: HookEventName[] = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'Notification',
]

interface HookHandler {
  type: 'command'
  command: string
  async?: boolean
  timeout?: number
}

interface MatcherGroup {
  matcher?: string
  hooks: HookHandler[]
}

interface ClaudeSettings {
  hooks?: Record<string, MatcherGroup[]>
  [key: string]: unknown
}

/**
 * Read the current Claude settings file.
 */
function readSettings(): ClaudeSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return {}
    }
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(content) as ClaudeSettings
  } catch (error) {
    petLogger.warn(`Failed to read Claude settings: ${error}`)
    return {}
  }
}

/**
 * Write the Claude settings file.
 */
function writeSettings(settings: ClaudeSettings): void {
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

/**
 * Check if a matcher group contains a Sessionly hook.
 */
function isSessionlyMatcherGroup(group: MatcherGroup): boolean {
  return group.hooks.some((h) => h.command.includes(HOOK_IDENTIFIER))
}

/**
 * Events that don't support matchers (always fire on every occurrence).
 */
const NO_MATCHER_EVENTS: HookEventName[] = ['Stop']

/**
 * Create a Sessionly matcher group entry.
 */
function createMatcherGroup(event: HookEventName): MatcherGroup {
  const group: MatcherGroup = {
    hooks: [
      {
        type: 'command',
        command: HOOK_COMMAND,
        async: true,
        timeout: 5,
      },
    ],
  }
  if (!NO_MATCHER_EVENTS.includes(event)) {
    group.matcher = '*'
  }
  return group
}

/**
 * Check if Sessionly hooks are installed in Claude settings.
 */
export function isHooksInstalled(): boolean {
  const settings = readSettings()
  if (!settings.hooks) return false

  // Check if at least one hook event has our hook installed
  return HOOK_EVENTS.some((event) => {
    const groups = settings.hooks?.[event]
    if (!Array.isArray(groups)) return false
    return groups.some(isSessionlyMatcherGroup)
  })
}

/**
 * Install Sessionly hooks into Claude settings.
 * Merges alongside existing user hooks.
 */
export function installHooks(): void {
  const settings = readSettings()

  if (!settings.hooks) {
    settings.hooks = {}
  }

  let installed = 0

  for (const event of HOOK_EVENTS) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = []
    }

    const groups = settings.hooks[event]!

    // Check if already installed
    if (groups.some(isSessionlyMatcherGroup)) {
      continue
    }

    // Append our matcher group
    groups.push(createMatcherGroup(event))
    installed++
  }

  if (installed > 0) {
    writeSettings(settings)
    petLogger.info(`Installed Sessionly hooks for ${installed} event(s)`)
  } else {
    petLogger.debug('Sessionly hooks already installed')
  }
}

/**
 * Uninstall Sessionly hooks from Claude settings.
 * Only removes our matcher groups, preserves all other user hooks.
 */
export function uninstallHooks(): void {
  const settings = readSettings()

  if (!settings.hooks) return

  let removed = 0

  for (const event of HOOK_EVENTS) {
    const groups = settings.hooks[event]
    if (!Array.isArray(groups)) continue

    const filtered = groups.filter((g) => !isSessionlyMatcherGroup(g))
    if (filtered.length !== groups.length) {
      removed += groups.length - filtered.length
      if (filtered.length === 0) {
        delete settings.hooks[event]
      } else {
        settings.hooks[event] = filtered
      }
    }
  }

  // Clean up empty hooks object
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks
  }

  if (removed > 0) {
    writeSettings(settings)
    petLogger.info(`Uninstalled ${removed} Sessionly hook(s)`)
  } else {
    petLogger.debug('No Sessionly hooks to uninstall')
  }
}

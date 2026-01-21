import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { ToolCallBlock } from '@/features/sessions/components/Message/ToolCallBlock'
import { renderWithProviders, createMockToolUseBlock } from '../../testUtils'
import type { ToolResultBlock } from '@/../electron/shared/session-types'

describe('ToolCallBlock', () => {
  describe('tool name display', () => {
    it('should display human-readable name for Read tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Read' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Read File')).toBeInTheDocument()
    })

    it('should display human-readable name for Write tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Write' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Write File')).toBeInTheDocument()
    })

    it('should display human-readable name for Edit tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Edit' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Edit File')).toBeInTheDocument()
    })

    it('should display human-readable name for Bash tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Bash' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Run Command')).toBeInTheDocument()
    })

    it('should display human-readable name for Glob tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Glob' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Search Files')).toBeInTheDocument()
    })

    it('should display human-readable name for Grep tool', () => {
      const toolUse = createMockToolUseBlock({ name: 'Grep' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('Search Content')).toBeInTheDocument()
    })

    it('should display original name for unknown tools', () => {
      const toolUse = createMockToolUseBlock({ name: 'CustomTool' })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('CustomTool')).toBeInTheDocument()
    })
  })

  describe('preview display', () => {
    it('should show file_path in preview', () => {
      const toolUse = createMockToolUseBlock({
        name: 'Read',
        input: { file_path: '/src/components/App.tsx' },
      })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('/src/components/App.tsx')).toBeInTheDocument()
    })

    it('should show truncated command in preview', () => {
      const toolUse = createMockToolUseBlock({
        name: 'Bash',
        input: { command: 'npm run build && npm run test' },
      })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText(/npm run build/)).toBeInTheDocument()
    })

    it('should show pattern in preview', () => {
      const toolUse = createMockToolUseBlock({
        name: 'Glob',
        input: { pattern: '**/*.tsx' },
      })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('**/*.tsx')).toBeInTheDocument()
    })

    it('should show url in preview', () => {
      const toolUse = createMockToolUseBlock({
        name: 'WebFetch',
        input: { url: 'https://api.example.com' },
      })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('https://api.example.com')).toBeInTheDocument()
    })

    it('should show query in preview', () => {
      const toolUse = createMockToolUseBlock({
        name: 'WebSearch',
        input: { query: 'react hooks tutorial' },
      })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.getByText('react hooks tutorial')).toBeInTheDocument()
    })

    it('should not show preview when expanded', () => {
      const toolUse = createMockToolUseBlock({
        name: 'Read',
        input: { file_path: '/test.txt' },
      })
      const { container } = renderWithProviders(
        <ToolCallBlock toolUse={toolUse} defaultExpanded={true} />
      )

      // Preview should not be visible in the header button when expanded
      // The header button is the first one
      const headerButton = container.querySelector('button')
      // When expanded, preview text should not be shown in the header
      expect(headerButton?.querySelector('.truncate')).not.toBeInTheDocument()
    })
  })

  describe('collapsed state', () => {
    it('should be collapsed by default', () => {
      const toolUse = createMockToolUseBlock({ input: { test: 'value' } })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      // Input section should not be visible
      expect(screen.queryByText('Input')).not.toBeInTheDocument()
    })

    it('should show chevron-right when collapsed', () => {
      const toolUse = createMockToolUseBlock()
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      const chevronRight = document.querySelector('svg.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })

    it('should show wrench icon', () => {
      const toolUse = createMockToolUseBlock()
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      const wrenchIcon = document.querySelector('svg.lucide-wrench')
      expect(wrenchIcon).toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('should show input section when expanded', () => {
      const toolUse = createMockToolUseBlock({ input: { file_path: '/test.txt' } })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} defaultExpanded={true} />)

      expect(screen.getByText('Input')).toBeInTheDocument()
    })

    it('should show JSON-formatted input', () => {
      const toolUse = createMockToolUseBlock({ input: { file_path: '/test.txt' } })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} defaultExpanded={true} />)

      // JSON should be pretty-printed
      expect(screen.getByText(/"file_path"/)).toBeInTheDocument()
    })

    it('should show chevron-down when expanded', () => {
      const toolUse = createMockToolUseBlock()
      renderWithProviders(<ToolCallBlock toolUse={toolUse} defaultExpanded={true} />)

      const chevronDown = document.querySelector('svg.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })
  })

  describe('toggle behavior', () => {
    it('should expand when clicking collapsed block', () => {
      const toolUse = createMockToolUseBlock({ input: { key: 'value' } })
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      expect(screen.queryByText('Input')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Input')).toBeInTheDocument()
    })

    it('should collapse when clicking expanded block', () => {
      const toolUse = createMockToolUseBlock()
      const { container } = renderWithProviders(
        <ToolCallBlock toolUse={toolUse} defaultExpanded={true} />
      )

      expect(screen.getByText('Input')).toBeInTheDocument()

      // Click the header button (first button) to collapse
      const headerButton = container.querySelector('button')
      fireEvent.click(headerButton!)

      expect(screen.queryByText('Input')).not.toBeInTheDocument()
    })
  })

  describe('tool result display', () => {
    it('should show output section when tool result is provided', () => {
      const toolUse = createMockToolUseBlock({ id: 'tool-1' })
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'Command output here',
      }

      renderWithProviders(
        <ToolCallBlock toolUse={toolUse} toolResult={toolResult} defaultExpanded={true} />
      )

      expect(screen.getByText('Output')).toBeInTheDocument()
      expect(screen.getByText(/Command output here/)).toBeInTheDocument()
    })

    it('should show error styling for error results', () => {
      const toolUse = createMockToolUseBlock({ id: 'tool-1' })
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'File not found',
        is_error: true,
      }

      const { container } = renderWithProviders(
        <ToolCallBlock toolUse={toolUse} toolResult={toolResult} defaultExpanded={true} />
      )

      // Should show error styling (red background)
      const errorSection = container.querySelector('[class*="bg-red"]')
      expect(errorSection).toBeInTheDocument()
    })

    it('should show error indicator when collapsed with error result', () => {
      const toolUse = createMockToolUseBlock({ id: 'tool-1' })
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'Some error message',
        is_error: true,
      }

      const { container } = renderWithProviders(
        <ToolCallBlock toolUse={toolUse} toolResult={toolResult} />
      )

      // Should show error text styling (red text)
      const errorText = container.querySelector('[class*="text-red"]')
      expect(errorText).toBeInTheDocument()
    })

    it('should truncate long output', () => {
      const toolUse = createMockToolUseBlock({ id: 'tool-1' })
      const longOutput = 'x'.repeat(3000)
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: longOutput,
      }

      renderWithProviders(
        <ToolCallBlock toolUse={toolUse} toolResult={toolResult} defaultExpanded={true} />
      )

      // Should show truncated indicator
      expect(screen.getByText(/truncated/)).toBeInTheDocument()
    })

    it('should handle array content in tool result', () => {
      const toolUse = createMockToolUseBlock({ id: 'tool-1' })
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: [{ type: 'text', text: 'Array text content' }],
      }

      renderWithProviders(
        <ToolCallBlock toolUse={toolUse} toolResult={toolResult} defaultExpanded={true} />
      )

      expect(screen.getByText('Array text content')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have appropriate wrapper styling', () => {
      const toolUse = createMockToolUseBlock()
      const { container } = renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('rounded-md')
      expect(wrapper).toHaveClass('border')
    })

    it('should have blue wrench icon', () => {
      const toolUse = createMockToolUseBlock()
      renderWithProviders(<ToolCallBlock toolUse={toolUse} />)

      const wrenchIcon = document.querySelector('svg.lucide-wrench')
      // SVG className is an SVGAnimatedString, use getAttribute for class string
      expect(wrenchIcon?.getAttribute('class')).toContain('sky')
    })
  })
})

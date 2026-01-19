import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { ThinkingBlock } from '@/features/sessions/components/Message/ThinkingBlock'
import { renderWithProviders, createMockThinkingBlock } from '../../testUtils'

describe('ThinkingBlock', () => {
  describe('rendering', () => {
    it('should render thinking label', () => {
      const block = createMockThinkingBlock({ thinking: 'Some thinking content' })
      renderWithProviders(<ThinkingBlock block={block} />)

      expect(screen.getByText('Thinking')).toBeInTheDocument()
    })

    it('should show brain icon', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} />)

      const brainIcon = document.querySelector('svg.lucide-brain')
      expect(brainIcon).toBeInTheDocument()
    })

    it('should show chevron icon', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} />)

      const chevron = document.querySelector('svg.lucide-chevron-right, svg.lucide-chevron-down')
      expect(chevron).toBeInTheDocument()
    })
  })

  describe('collapsed state', () => {
    it('should be collapsed by default', () => {
      const block = createMockThinkingBlock({ thinking: 'Full thinking content here' })
      renderWithProviders(<ThinkingBlock block={block} />)

      // Full content should not be visible when collapsed
      expect(screen.queryByText('Full thinking content here')).not.toBeInTheDocument()
    })

    it('should show preview text when collapsed', () => {
      // Text needs to be over 100 characters for preview to show
      const longText = 'This is a longer thinking block that should show a preview. It needs to be over 100 characters to show the truncated preview text.'
      const block = createMockThinkingBlock({
        thinking: longText,
      })
      renderWithProviders(<ThinkingBlock block={block} />)

      // Should show truncated preview (first 100 chars + ...)
      expect(screen.getByText(/This is a longer thinking block/)).toBeInTheDocument()
    })

    it('should show chevron-right when collapsed', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} />)

      const chevronRight = document.querySelector('svg.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })

    it('should truncate preview at 100 characters', () => {
      const longThinking = 'A'.repeat(150)
      const block = createMockThinkingBlock({ thinking: longThinking })
      renderWithProviders(<ThinkingBlock block={block} />)

      const preview = screen.getByText(/\.\.\./)
      expect(preview.textContent!.length).toBeLessThan(110) // Some buffer for "..."
    })

    it('should not show ellipsis for short content', () => {
      const block = createMockThinkingBlock({ thinking: 'Short' })
      renderWithProviders(<ThinkingBlock block={block} />)

      // Short content shouldn't have "..." in preview
      expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('should expand when defaultExpanded is true', () => {
      const block = createMockThinkingBlock({ thinking: 'Expanded content visible' })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      expect(screen.getByText('Expanded content visible')).toBeInTheDocument()
    })

    it('should show full content when expanded', () => {
      const fullContent = 'This is the full thinking content that should be visible when expanded'
      const block = createMockThinkingBlock({ thinking: fullContent })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      expect(screen.getByText(fullContent)).toBeInTheDocument()
    })

    it('should show chevron-down when expanded', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      const chevronDown = document.querySelector('svg.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should preserve whitespace in expanded content', () => {
      const block = createMockThinkingBlock({ thinking: 'Line1\nLine2\nLine3' })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      const content = screen.getByText(/Line1/)
      expect(content).toHaveClass('whitespace-pre-wrap')
    })
  })

  describe('toggle behavior', () => {
    it('should expand when clicking collapsed block', () => {
      const block = createMockThinkingBlock({ thinking: 'Content to reveal' })
      renderWithProviders(<ThinkingBlock block={block} />)

      // Initially collapsed - full content not visible
      expect(screen.queryByText('Content to reveal')).not.toBeInTheDocument()

      // Click to expand
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Now content should be visible
      expect(screen.getByText('Content to reveal')).toBeInTheDocument()
    })

    it('should collapse when clicking expanded block', () => {
      const block = createMockThinkingBlock({ thinking: 'Content to hide' })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      // Initially expanded
      expect(screen.getByText('Content to hide')).toBeInTheDocument()

      // Click to collapse
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Content should be hidden
      expect(screen.queryByText('Content to hide')).not.toBeInTheDocument()
    })

    it('should toggle chevron icon on click', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} />)

      // Initially chevron-right
      expect(document.querySelector('svg.lucide-chevron-right')).toBeInTheDocument()

      // Click to expand
      fireEvent.click(screen.getByRole('button'))

      // Now chevron-down
      expect(document.querySelector('svg.lucide-chevron-down')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have appropriate border styling', () => {
      const block = createMockThinkingBlock()
      const { container } = renderWithProviders(<ThinkingBlock block={block} />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('border')
    })

    it('should have background styling', () => {
      const block = createMockThinkingBlock()
      const { container } = renderWithProviders(<ThinkingBlock block={block} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-')
    })

    it('should have rounded corners', () => {
      const block = createMockThinkingBlock()
      const { container } = renderWithProviders(<ThinkingBlock block={block} />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('rounded-md')
    })

    it('should have purple brain icon', () => {
      const block = createMockThinkingBlock()
      renderWithProviders(<ThinkingBlock block={block} />)

      const brainIcon = document.querySelector('svg.lucide-brain')
      // SVG className is an SVGAnimatedString, use getAttribute for class string
      expect(brainIcon?.getAttribute('class')).toContain('violet')
    })
  })

  describe('content formatting', () => {
    it('should use monospace font for content', () => {
      const block = createMockThinkingBlock({ thinking: 'Code-like content' })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      const content = screen.getByText('Code-like content')
      expect(content).toHaveClass('font-mono')
    })

    it('should use small text size', () => {
      const block = createMockThinkingBlock({ thinking: 'Small text' })
      renderWithProviders(<ThinkingBlock block={block} defaultExpanded={true} />)

      const content = screen.getByText('Small text')
      expect(content.className).toContain('text-')
    })
  })
})

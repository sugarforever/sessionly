import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { CodeBlock } from '@/features/sessions/components/Message/CodeBlock'
import { renderWithProviders } from '../../testUtils'

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockResolvedValue(undefined)
  })

  describe('basic rendering', () => {
    it('should render code content', () => {
      const { container } = renderWithProviders(<CodeBlock code="const x = 1" />)

      // Code is inside a code element and may be syntax highlighted
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain('const x = 1')
    })

    it('should render multi-line code', () => {
      const code = `function hello() {
  console.log('Hello')
}`
      const { container } = renderWithProviders(<CodeBlock code={code} />)

      const codeElement = container.querySelector('code')
      expect(codeElement?.textContent).toContain('function hello')
      expect(codeElement?.textContent).toContain('console.log')
    })

    it('should have dark background', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-')
    })

    it('should have rounded corners', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('rounded-md')
    })

    it('should have border', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('border')
    })
  })

  describe('filename display', () => {
    it('should show filename when provided', () => {
      renderWithProviders(<CodeBlock code="code" filename="app.tsx" />)

      expect(screen.getByText('app.tsx')).toBeInTheDocument()
    })

    it('should show filename in header bar', () => {
      const { container } = renderWithProviders(<CodeBlock code="code" filename="test.js" />)

      const header = container.querySelector('.border-b')
      expect(header).toBeInTheDocument()
    })

    it('should not show header when no filename', () => {
      const { container } = renderWithProviders(<CodeBlock code="code" />)

      const header = container.querySelector('.bg-zinc-900')
      expect(header).not.toBeInTheDocument()
    })
  })

  describe('language detection', () => {
    it('should apply language class when provided', () => {
      const { container } = renderWithProviders(
        <CodeBlock code="const x = 1" language="typescript" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-typescript')
    })

    it('should detect language from .ts filename', () => {
      const { container } = renderWithProviders(<CodeBlock code="const x = 1" filename="app.ts" />)

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-typescript')
    })

    it('should detect language from .tsx filename', () => {
      const { container } = renderWithProviders(
        <CodeBlock code="<div>JSX</div>" filename="App.tsx" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-typescript')
    })

    it('should detect language from .js filename', () => {
      const { container } = renderWithProviders(<CodeBlock code="var x = 1" filename="script.js" />)

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-javascript')
    })

    it('should detect language from .py filename', () => {
      const { container } = renderWithProviders(
        <CodeBlock code="print('hello')" filename="main.py" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-python')
    })

    it('should detect language from .json filename', () => {
      const { container } = renderWithProviders(
        <CodeBlock code='{"key": "value"}' filename="data.json" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-json')
    })

    it('should detect language from .css filename', () => {
      const { container } = renderWithProviders(
        <CodeBlock code=".class { color: red; }" filename="styles.css" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-css')
    })

    it('should detect language from .sh filename', () => {
      const { container } = renderWithProviders(
        <CodeBlock code="echo hello" filename="script.sh" />
      )

      const codeElement = container.querySelector('code')
      expect(codeElement).toHaveClass('language-bash')
    })

    it('should render code without explicit language', () => {
      const { container } = renderWithProviders(<CodeBlock code="plain text" />)

      const codeElement = container.querySelector('code')
      // Code should still render even without explicit language
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain('plain text')
    })
  })

  describe('copy functionality', () => {
    it('should show copy button on hover when no filename', () => {
      const { container } = renderWithProviders(<CodeBlock code="copy me" />)

      const copyButton = container.querySelector('button')
      expect(copyButton).toBeInTheDocument()
      expect(copyButton).toHaveClass('opacity-0')
      expect(copyButton).toHaveClass('group-hover:opacity-100')
    })

    it('should show copy button in header when filename provided', () => {
      renderWithProviders(<CodeBlock code="copy me" filename="file.txt" />)

      // Copy button should be in header
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(1)
    })

    it('should copy code to clipboard when clicked', async () => {
      const code = 'const copyThis = true'
      renderWithProviders(<CodeBlock code={code} filename="test.ts" />)

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      expect(mockWriteText).toHaveBeenCalledWith(code)
    })

    it('should show check icon after copying', async () => {
      renderWithProviders(<CodeBlock code="test" filename="test.ts" />)

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      await waitFor(() => {
        const checkIcon = document.querySelector('svg.lucide-check')
        expect(checkIcon).toBeInTheDocument()
      })
    })

    it('should have copy button that works', () => {
      renderWithProviders(<CodeBlock code="test code" filename="test.ts" />)

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      // Verify clipboard write was called
      expect(mockWriteText).toHaveBeenCalledWith('test code')
    })
  })

  describe('overflow handling', () => {
    it('should have horizontal scroll for long lines', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const scrollContainer = container.querySelector('.overflow-x-auto')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  describe('text styling', () => {
    it('should use monospace font', () => {
      renderWithProviders(<CodeBlock code="test" filename="test.ts" />)

      const filenameElement = screen.getByText('test.ts')
      expect(filenameElement).toHaveClass('font-mono')
    })

    it('should have appropriate text size', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const preElement = container.querySelector('pre')
      expect(preElement?.className).toContain('text-')
    })

    it('should have padding', () => {
      const { container } = renderWithProviders(<CodeBlock code="test" />)

      const preElement = container.querySelector('pre')
      expect(preElement?.className).toContain('p-')
    })
  })

  describe('syntax highlighting', () => {
    it('should apply language class for highlighting', () => {
      const { container } = renderWithProviders(
        <CodeBlock code="const x = 1" language="javascript" />
      )

      const codeElement = container.querySelector('code')
      // The component adds a language-* class for hljs to use
      expect(codeElement).toHaveClass('language-javascript')
    })
  })

  describe('multiple languages', () => {
    const testCases = [
      { ext: 'go', expected: 'go' },
      { ext: 'rs', expected: 'rust' },
      { ext: 'rb', expected: 'ruby' },
      { ext: 'java', expected: 'java' },
      { ext: 'kt', expected: 'kotlin' },
      { ext: 'swift', expected: 'swift' },
      { ext: 'c', expected: 'c' },
      { ext: 'cpp', expected: 'cpp' },
      { ext: 'cs', expected: 'csharp' },
      { ext: 'php', expected: 'php' },
      { ext: 'sql', expected: 'sql' },
      { ext: 'yaml', expected: 'yaml' },
      { ext: 'yml', expected: 'yaml' },
      { ext: 'xml', expected: 'xml' },
      { ext: 'html', expected: 'html' },
      { ext: 'scss', expected: 'scss' },
      { ext: 'md', expected: 'markdown' },
      { ext: 'toml', expected: 'toml' },
    ]

    testCases.forEach(({ ext, expected }) => {
      it(`should detect ${expected} language from .${ext} filename`, () => {
        const { container } = renderWithProviders(
          <CodeBlock code="code" filename={`file.${ext}`} />
        )

        const codeElement = container.querySelector('code')
        expect(codeElement).toHaveClass(`language-${expected}`)
      })
    })
  })
})

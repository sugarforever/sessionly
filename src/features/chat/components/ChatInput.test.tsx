import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('renders input field and send button', () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />)

    expect(screen.getByPlaceholderText('Type your message...')).toBeDefined()
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('calls onSend when send button is clicked with valid input', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('Type your message...')
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Hello!' } })
    fireEvent.click(button)

    expect(onSend).toHaveBeenCalledWith('Hello!')
  })

  it('clears input after sending message', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(button)

    expect(input.value).toBe('')
  })

  it('does not send empty or whitespace-only messages', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('Type your message...')
    const button = screen.getByRole('button')

    // Try empty
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(button)
    expect(onSend).not.toHaveBeenCalled()

    // Try whitespace only
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(button)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends message when Enter is pressed', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(input, { target: { value: 'Hello via Enter' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    expect(onSend).toHaveBeenCalledWith('Hello via Enter')
  })

  it('does not send when Shift+Enter is pressed (allows new line)', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(input, { target: { value: 'Line 1' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />)

    const input = screen.getByPlaceholderText('Type your message...')
    const button = screen.getByRole('button')

    expect(input).toHaveProperty('disabled', true)
    expect(button).toHaveProperty('disabled', true)
  })

  it('disables send button when input is empty', () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />)

    const button = screen.getByRole('button')

    expect(button).toHaveProperty('disabled', true)
  })
})

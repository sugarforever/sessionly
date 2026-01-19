/**
 * AI Chat Page
 *
 * A sleek chat interface powered by OpenAI and Vercel AI SDK
 */

import { useEffect, useRef } from 'react'
import { MessageSquare, Settings as SettingsIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { ChatHeader } from './components/ChatHeader'
import { useChatStream } from './hooks/useChatStream'
import { useNavigation } from '@/contexts/NavigationContext'
import { chatConfig } from './config'

export function ChatPage() {
  const { messages, isLoading, error, sendMessage, clearMessages, hasApiKey } = useChatStream()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { navigateTo } = useNavigation()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show API key configuration prompt if not configured
  if (!hasApiKey) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">API Key Required</h2>
            <p className="text-sm text-muted-foreground">
              {chatConfig.ui.apiKeyMissingMessage}
            </p>
          </div>
          <Button onClick={() => navigateTo('settings')} className="w-full">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Configure API Key
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader onClear={clearMessages} messageCount={messages.length} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3 px-4">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">{chatConfig.ui.emptyStateTitle}</h3>
                <p className="text-xs text-muted-foreground">
                  {chatConfig.ui.emptyStateDescription}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="border-t border-border bg-destructive/10 px-4 py-2">
          <p className="text-xs text-destructive">
            <span className="font-medium">{chatConfig.ui.errorTitle}:</span> {error}
          </p>
        </div>
      )}

      {/* Input area - pinned to bottom */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}

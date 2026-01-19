# Chat Feature

This folder contains a self-contained AI chat feature powered by Vercel AI SDK and OpenAI.

## Architecture

The chat feature is designed to be completely isolated and easy to remove if not needed:

```
src/features/chat/
├── README.md                 # This file
├── config.ts                 # Chat configuration
├── types.ts                  # TypeScript types
├── ChatPage.tsx              # Main chat page component
├── components/
│   ├── ChatMessage.tsx       # Individual message component
│   ├── ChatInput.tsx         # Message input component
│   └── ChatHeader.tsx        # Chat header component
└── hooks/
    └── useChatStream.ts      # Custom hook for AI chat streaming
```

## How It Works

1. **API Key Storage**: OpenAI API key is stored securely in the main process using `electron-store`
2. **IPC Communication**: Chat messages are sent via IPC to the main process
3. **Streaming**: The main process calls OpenAI API and streams responses back to the renderer
4. **UI Components**: React components handle the chat interface using Vercel AI SDK UI hooks

## Dependencies

- `ai` - Vercel AI SDK core
- `@ai-sdk/openai` - OpenAI provider for AI SDK
- `@ai-sdk/react` - React hooks for AI SDK
- `zod` - Schema validation

## Removing This Feature

If you don't need the chat feature, follow these steps to remove it completely:

### 1. Uninstall Dependencies

```bash
npm uninstall ai @ai-sdk/openai @ai-sdk/react
```

(Keep `zod` if you use it elsewhere)

### 2. Delete Feature Folder

```bash
rm -rf src/features/chat
```

### 3. Remove from Navigation

In `src/config/navigation.tsx`:
- Remove the chat navigation item (look for `id: 'chat'`)

In `src/components/PageRouter.tsx`:
- Remove the ChatPage import and route

### 4. Remove IPC Handlers

In `electron/main/ipc-handlers.ts`:
- Remove all handlers with `chat:` prefix
- Remove OpenAI import and related code

In `electron/shared/types.ts`:
- Remove `ChatMessage`, `ChatRequest`, and related types

### 5. Remove from Settings

In `src/pages/SettingsPage.tsx`:
- Remove the "OpenAI API Key" section

## Configuration

Edit `src/features/chat/config.ts` to:
- Change the default OpenAI model
- Adjust system prompt
- Modify streaming settings
- Update UI text/labels

## Security Notes

- API key is stored in the main process only (never exposed to renderer)
- API calls are made from the main process (not the renderer)
- API key is stored in electron-store (encrypted at rest on macOS/Windows)

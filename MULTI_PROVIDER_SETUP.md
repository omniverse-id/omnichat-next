# Multi-Provider AI Support for Omnichat-Next

This guide explains how omnichat-next now supports multiple AI providers including local servers like Ollama, llama.cpp, and cloud services like OpenAI, Anthropic, and more.

## Overview

The application has been enhanced to route requests to different AI providers using a unified OpenAI-compatible API format. This allows you to use:

### Local Providers (No API Key Required)
- **Ollama** (default: `http://localhost:11434`)
- **Llama.cpp** (default: `http://localhost:8080`)
- **LM Studio** (default: `http://localhost:1234`)
- **vLLM** (default: `http://localhost:8000`)

### Cloud Providers (API Key Required)
- **OpenAI** - GPT-4, GPT-4 Turbo, etc.
- **Anthropic** - Claude models
- **Mistral** - Mistral AI models
- **Google Gemini** - Full feature support with thinking, tools, grounding
- **Groq** - Fast inference
- **DeepSeek** - DeepSeek models
- **Qwen** - Alibaba Qwen models
- **OpenRouter** - Multi-model gateway
- **Hugging Face** - HF models
- **Cohere** - Cohere models
- **Perplexity** - Perplexity AI
- **Together AI** - Together models
- **Azure OpenAI** - Azure-hosted models
- **AWS Bedrock** - AWS-hosted models
- **Nvidia NIM** - Nvidia cloud services

## Architecture

### Core Components

#### 1. **Provider Router** (`lib/providers/router.ts`)
Routes requests to the appropriate provider handler based on the selected provider and model.

#### 2. **Gemini Handler** (`lib/providers/gemini-handler.ts`)
Specialized handler for Google Gemini models with full support for:
- Advanced thinking (on supported models)
- Tool use (Google Search, Code Execution, URL Context, Function Calling)
- Image generation
- Deep research (preview feature)
- Grounding metadata

#### 3. **OpenAI-Compatible Handler** (`lib/providers/openai-handler.ts`)
Handles all OpenAI-compatible API endpoints, which includes most modern AI providers. Features:
- Streaming support
- Custom base URLs for self-hosted servers
- Proper message formatting for each provider

#### 4. **Chat API Route** (`app/api/chat/route.ts`)
Main entry point that:
- Validates provider configuration
- Routes to appropriate provider handler
- Handles special cases (image generation, deep research)
- Supports all generation settings

### Settings Integration

Settings are stored in localStorage and include:

```typescript
{
  provider: "ollama",           // Selected provider ID
  model: "llama2",              // Model name
  apiKeys: {                    // API keys for each provider
    "openai": "sk-...",
    "anthropic": "sk-ant-...",
    // ... other providers
  },
  baseUrls: {                   // Custom base URLs for local providers
    "ollama": "http://localhost:11434",
    "llama-cpp": "http://192.168.1.100:8080",
    // ... defaults for cloud providers
  },
  temperature: 1,
  advanced: {
    maxOutputTokens: 2048,
    topP: 0.95,
    topK: 0,
    stopSequences: []
  },
  // ... other settings
}
```

## Using Different Providers

### Setting Up a Local Provider (Ollama)

1. **Install and Start Ollama**
   ```bash
   # macOS/Windows/Linux
   # Download from https://ollama.ai
   ollama pull llama2      # or any other model
   ollama serve            # Starts on http://localhost:11434
   ```

2. **Configure in Settings**
   - Open Settings → General
   - Select "Ollama" from Provider dropdown
   - Base URL should auto-fill: `http://localhost:11434`
   - Model: `llama2` (or your chosen model)
   - No API key needed
   - Click Save

3. **Start Chatting**
   - Return to chat
   - Select your model
   - Start messaging (requests will go to your local Ollama server)

### Setting Up a Cloud Provider (OpenAI)

1. **Get API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy it

2. **Configure in Settings**
   - Open Settings → General
   - Select "OpenAI" from Provider dropdown
   - API Key: Paste your key
   - Model: `gpt-4o` (or `gpt-4o-mini`, etc.)
   - Click Save

3. **Start Chatting**
   - Your requests will use OpenAI's API

### Using a Custom OpenAI-Compatible Server

Any OpenAI-compatible API can be used:

1. **Configure in Settings**
   - Select provider (or create custom endpoint)
   - Enter Base URL: e.g., `http://192.168.1.100:8000`
   - Add API key if required
   - Model: specify model name as expected by your server
   - Click Save

## Request Flow

### For Google Gemini
```
User Message → Chat API → Gemini Handler → Google API
                         ↓
                  Stream Response ← Google API
                         ↓
                   Convert to OpenAI format
                         ↓
                    Frontend receives
```

### For Other Providers
```
User Message → Chat API → Provider Router → OpenAI Handler
                         ↓                      ↓
                  Validate Config        Connect to Base URL
                         ↓                      ↓
                    Stream Response ← Provider API
                         ↓
                   Frontend receives
```

## Settings Management

All provider configurations are stored per-user in localStorage as `omnichat_settings_${userId}`.

### Syncing Settings
Settings are automatically synced to localStorage whenever you:
- Change the provider
- Change the model
- Update API keys
- Modify base URLs
- Click Save in the Settings dialog

### Persisting Custom Base URLs
Custom base URLs are preserved even when switching between providers, allowing quick switching between:
- Local Ollama instance on your machine
- Remote Ollama instance on your network
- Various cloud API endpoints

## Supported Models by Provider

### Ollama
- llama2, llama2-uncensored
- mistral, neural-chat
- dolphin-mixtral
- Any other Ollama-compatible model

### OpenAI
- gpt-4o, gpt-4o-mini
- gpt-4-turbo
- gpt-3.5-turbo

### Google Gemini
- gemini-3-pro-preview (thinking support)
- gemini-3-flash-preview
- gemini-2.5-pro
- gemini-2.5-flash (recommended)
- gemini-2.0-flash

### Anthropic Claude
- claude-opus
- claude-sonnet
- claude-haiku

See provider documentation for complete model lists.

## Advanced Configuration

### API Key Management
- Never share API keys
- Store sensitive keys in environment variables for production
- Use `.env.local` for development
- Each provider key is stored separately

### Performance Tips
- **Local providers** are faster but require more compute power
- **Cloud providers** have instant startup but cost per token
- **Smaller models** (like llama2, gpt-3.5-turbo) are faster and cheaper
- **Larger models** (like gpt-4o, claude-opus) are more capable

### Troubleshooting

**"Connection refused" for local provider**
- Ensure your local server (Ollama/llama.cpp) is running
- Check the base URL is correct
- Verify firewall isn't blocking connections

**"Invalid API key"**
- Verify your API key is correct
- Check it matches the selected provider
- Ensure it hasn't expired or been revoked

**Slow responses**
- Local servers may be slower on first request (model loading)
- Cloud APIs have rate limits - check provider dashboard
- Large models are slower - try smaller models for testing

**Provider not responding**
- Check network connectivity
- Verify base URL format (with protocol: `http://` or `https://`)
- For cloud providers, check API status page

## Migration from Gemini-Only

The system seamlessly supports Google Gemini as before:
- All Gemini-specific features work (thinking, tools, etc.)
- Existing settings are preserved
- UI unchanged
- Simply switch provider in settings to use other services

## Development Notes

### Adding a New Provider

If you need to add support for a new provider:

1. **Add to config** (`config/inference-providers.json`)
2. **Create handler** if needed (most can use OpenAI handler)
3. **Update router** (`lib/providers/router.ts`) to route requests
4. **Test** with the Settings panel

### Provider Handler Template

```typescript
export async function handleNewProviderHandler(
  config: { baseUrl: string; apiKey?: string; model: string },
  messages: any[],
  temperature: number,
  advanced: any,
  systemInstruction: string
): Promise<Response> {
  // Implement provider-specific logic
  // Return Response with streaming SSE format
}
```

## API Response Format

All providers return responses in the standard format:

```json
{
  "choices": [{
    "delta": {
      "content": "text chunk",
      "reasoning_content": "optional thinking",
      "function_calls": []
    },
    "index": 0,
    "finish_reason": null
  }]
}
```

This unified format ensures the frontend works seamlessly with all providers.

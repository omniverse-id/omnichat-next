## Fetch Models Feature Guide

This guide explains how the "Fetch Models" feature works and how to use it.

### Overview

The "Fetch Models" button allows users to dynamically fetch available models from their selected AI provider without manually entering model names. When models are fetched, they automatically populate the model selector dropdown in both the settings page and the chat header.

### How It Works

#### 1. Backend API (`/api/models/fetch`)

The API endpoint supports fetching models from the following providers:

**Local Providers (No API Key Required):**
- **Ollama** - Fetches from `/api/tags` endpoint
- **llama.cpp** - Fetches from `/api/tag` endpoint  
- **LM Studio** - Fetches from `/v1/models` endpoint
- **vLLM** - Fetches from `/v1/models` endpoint

**Cloud Providers (API Key Required):**
- **OpenAI** - Fetches from `/v1/models` with Bearer token
- **Anthropic** - Fetches from `/v1/models` with API key
- **Mistral** - Fetches from `/v1/models` with Bearer token
- **Groq** - Fetches from `/v1/models` with Bearer token

#### 2. Frontend Flow

1. User selects a provider in Settings → General
2. User optionally customizes Base URL (for local providers) or enters API Key (for cloud providers)
3. User clicks "Fetch Models" button
4. Component sends POST request to `/api/models/fetch` with:
   - Provider name
   - Base URL (if applicable)
   - API Key (if required)
5. API fetches available models and returns up to 50 results
6. Frontend updates:
   - Model dropdown with fetched models
   - Settings storage (localStorage) with cached models
   - Auto-selects first model if none selected
7. Models persist across sessions and appear in chat header dropdown

#### 3. State Management

Fetched models are stored in multiple places:

**Settings Object:**
```typescript
interface Settings {
  fetchedModels?: Record<string, string[]>;
  // ... other fields
}
```

**Example:**
```json
{
  "fetchedModels": {
    "ollama": ["llama2", "mistral", "neural-chat"],
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    "anthropic": ["claude-3-opus", "claude-3-sonnet"]
  }
}
```

### Usage Instructions

#### For Local Providers (Ollama, llama.cpp, LM Studio, vLLM)

1. **Open Settings** → General tab
2. **Select Provider** from dropdown (e.g., "Ollama")
3. **Verify/Customize Base URL** (defaults to provider's standard):
   - Ollama: `http://localhost:11434`
   - llama.cpp: `http://localhost:8000`
   - LM Studio: `http://localhost:1234`
   - vLLM: `http://localhost:8000`
4. **Click "Fetch Models"** button
5. **Wait** for models to load (shows "Fetching..." while loading)
6. **Model dropdown** updates with available models
7. **Select a model** from the populated dropdown
8. **Save** settings

#### For Cloud Providers (OpenAI, Anthropic, Mistral, Groq)

1. **Open Settings** → General tab
2. **Select Provider** from dropdown (e.g., "OpenAI")
3. **Enter API Key** in the API Key field
4. **Click "Fetch Models"** button
5. **Wait** for models to load
6. **Model dropdown** updates with available models
7. **Select a model** from the populated dropdown
8. **Save** settings

### Error Handling

The feature handles various error scenarios:

- **Connection Failed**: "Failed to fetch models. Please check your configuration and try again."
  - Verify the provider is running/accessible
  - Check Base URL or API Key is correct

- **No Models Found**: "No models found. Please check your configuration."
  - Provider may not have models deployed yet
  - Check provider's web UI to verify models are loaded

- **API Error**: Displays specific error message from API response
  - Check API key validity
  - Ensure account has access to the requested models

- **Network Timeout**: Errors are caught and reported to user
  - Retry after checking network connectivity

### Model Persistence

Once fetched models are saved:

1. **In Settings**: Models are stored in localStorage under `omnichat_settings_${userId}`
2. **In Chat Header**: Models appear in the model selector dropdown when not using Gemini
3. **Across Sessions**: Reloading the page preserves fetched models
4. **Provider Switching**: Each provider maintains its own cached model list

### Examples

#### Example 1: Using Ollama

```
Settings → General
Provider: Ollama
Base URL: http://localhost:11434 (default)
Click: Fetch Models
Result: llama2, mistral, neural-chat appear in dropdown
Select: mistral
Save: Model set to "mistral" for Ollama provider
```

#### Example 2: Using OpenAI

```
Settings → General
Provider: OpenAI
API Key: sk-xxxxx
Click: Fetch Models
Result: gpt-4o, gpt-4o-mini, gpt-4-turbo appear in dropdown
Select: gpt-4o
Save: Model set to "gpt-4o" for OpenAI provider
```

#### Example 3: Using Remote Ollama

```
Settings → General
Provider: Ollama
Base URL: http://192.168.1.100:11434 (custom server)
Click: Fetch Models
Result: Models from remote server appear in dropdown
Select: desired model
Save: Models cached locally for future use
```

### Troubleshooting

**Issue**: Fetch Models button doesn't respond

**Solution**: 
- Check browser console for errors
- Verify API key/Base URL is correct
- Try again (may be a temporary network issue)

---

**Issue**: Models appear in settings but not in chat header

**Solution**:
- Save settings properly
- Close and reopen chat
- Check that same provider is selected in chat

---

**Issue**: Connection refused / Network error

**Solution**:
- For local providers: Ensure server is running and accessible
- Check firewall isn't blocking the port
- Try pinging the Base URL to verify connectivity
- For cloud providers: Verify API key is valid and has necessary permissions

### API Response Format

The API returns models in this format:

```json
{
  "models": [
    "model-name-1",
    "model-name-2",
    "model-name-3"
  ]
}
```

Maximum 50 models are returned to keep dropdown performant.

### Implementation Details

**Files Modified:**
- `app/api/models/fetch/route.ts` - Backend API endpoint
- `components/settings/general-panel.tsx` - Frontend fetch logic and button
- `components/chat-header.tsx` - Display fetched models in chat header
- `app/(main)/settings/page.tsx` - State management for fetched models
- `types/settings.ts` - Added fetchedModels to Settings interface
- `hooks/use-settings.tsx` - Persist fetchedModels in localStorage

**Key Features:**
- Supports 8+ providers out of the box
- Handles both local and cloud-hosted models
- Graceful error handling with user-friendly messages
- Models persist across sessions
- Animated loading state (spinning icon)
- Auto-selects first model if none selected
- Limits results to 50 models for performance


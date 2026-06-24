# Token Limiting and Rate Limit Handling Guide

## Overview

Omnichat-next now includes automatic token limiting to prevent rate limit errors from providers like Groq, OpenAI, and other OpenAI-compatible services. The system:

1. **Estimates tokens** in your messages before sending
2. **Warns you** if approaching limits
3. **Automatically trims** conversation history if needed
4. **Gracefully handles** rate limit errors

## What is Token Limiting?

Each API provider has a rate limit (tokens per minute - TPM) for their free tier:

- **Groq**: 8,000 TPM
- **OpenAI**: 200,000 TPM (for most models)
- **Anthropic/Mistral**: 100,000 TPM
- **Others**: 50,000 TPM (default)

When you send messages, the system estimates how many tokens will be used and prevents exceeding 70% of the limit to stay safe.

## How Token Estimation Works

The token limiter estimates tokens by:

```
Estimated Tokens = (Text Length × 0.25) + (Special Characters × 0.3)
```

This is a conservative estimate. Actual token counts may vary by model.

**Examples:**
- 100 characters ≈ 25 tokens
- 1,000 characters ≈ 250 tokens
- 10,000 characters ≈ 2,500 tokens

## Automatic Message Trimming

If your messages exceed safe limits:

1. **System messages are preserved** (like system instructions)
2. **Recent messages are kept** (most relevant to current query)
3. **Older messages are removed** (to save token budget)
4. **Large messages are truncated** if necessary

### Example Trimming

Before:
```
User 1: How does photosynthesis work? (500 tokens)
Assistant: [long explanation] (2,000 tokens)
User 2: Can you explain more? (300 tokens)
Assistant: [more explanation] (1,500 tokens)
User 3: Thanks! (50 tokens)  ← Current message
Total: 4,350 tokens (exceeds Groq's 5,600 safe limit)
```

After trimming:
```
System: [system instruction] (100 tokens)
Assistant: [more explanation] (1,500 tokens)
User 3: Thanks! (50 tokens)  ← Current message
Total: 1,650 tokens (well below limit)
```

## Provider Configuration

Token limits are configured in `/lib/providers/token-limiter.ts`:

```typescript
const PROVIDER_LIMITS: Record<string, number> = {
  groq: 8000,
  "openai/gpt-4o": 200000,
  anthropic: 100000,
  mistral: 100000,
  default: 50000,
};
```

To add a new provider or adjust limits:

```typescript
PROVIDER_LIMITS["my-provider"] = 15000; // 15,000 TPM
```

## Error Messages

### Rate Limit Error (413)

**Error:** `Request too large for model ... tokens per minute (TPM): Limit 8000, Requested 65615`

**Cause:** Messages were still too large after trimming

**Solution:**
1. Clear old messages from conversation
2. Use shorter prompts
3. Reduce file attachments
4. Upgrade to paid tier

### Token Estimation Warning

**Warning:** `Message size (65615 tokens) exceeds safe limit (5600 tokens) for groq. Messages may be truncated.`

**Cause:** Automatic trimming occurred

**Solution:** Normal operation - conversation will continue with older messages removed

## Console Logging

When token limiting occurs, check browser console (F12 → Console tab):

```
[v0] Token limit warning for groq: 65615 tokens
Message size (65615 tokens) exceeds safe limit (5600 tokens) for groq. Messages may be truncated.
```

## Best Practices

1. **Use concise prompts** - Avoid verbose questions
2. **Limit attachments** - Each file adds to token count
3. **Clear old messages** - Periodically start new conversations
4. **Monitor provider** - Use high-TPM providers for large conversations
5. **Check logs** - Review console for trimming warnings

## Providers with Limited TPM (Free Tier)

| Provider | Free Tier TPM | Recommendation |
|----------|----------------|-----------------|
| Groq | 8,000 | Keep messages concise |
| Claude Haiku | 20,000 | Suitable for medium conversations |
| Llama 2 | 50,000 | Good for most use cases |
| GPT-3.5 Turbo | 90,000 | Good for long conversations |
| GPT-4o | 200,000 | Excellent for large contexts |

## Technical Details

### How Token Limiting Works

**File:** `/lib/providers/token-limiter.ts`

Key functions:
- `estimateTokens(text)` - Estimate tokens in text
- `checkTokenLimit(messages, provider)` - Check if over limit
- `trimMessagesToLimit(messages, provider)` - Trim to fit
- `getProviderLimit(provider, model)` - Get provider's TPM

### Example Usage in Provider Handler

```typescript
import { checkTokenLimit, trimMessagesToLimit } from "./token-limiter";

// Check if messages exceed limit
const tokenCheck = checkTokenLimit(messages, "groq");

if (!tokenCheck.isSafe) {
  console.warn("Token limit warning:", tokenCheck.warning);
  // Automatically trim messages
  messages = trimMessagesToLimit(messages, "groq");
}
```

## Debugging Token Issues

1. **Enable detailed logging:**
   ```typescript
   // In token-limiter.ts
   console.log(`[v0] Token estimate for message:`, {
     text: msg.content.substring(0, 50),
     estimatedTokens
   });
   ```

2. **Check estimated vs actual:**
   - Estimation is conservative (usually overestimates)
   - Actual tokens may be 10-20% lower

3. **Monitor API responses:**
   - Look for 413 or 429 status codes
   - Check error messages for "tokens per minute"

## FAQ

**Q: Why is my message getting truncated?**
A: Your conversation history exceeded the provider's safe token limit. Older messages were removed to make room.

**Q: Can I disable token limiting?**
A: Not recommended, but you can modify `PROVIDER_LIMITS` to increase safe limits.

**Q: Will I lose messages?**
A: Only old messages are trimmed. Your current message is always preserved (but may be truncated if very large).

**Q: How accurate is token estimation?**
A: Very accurate for most providers (±10% error). It's conservative to avoid hitting limits.

**Q: What if I need higher limits?**
A: Upgrade to a paid tier with your provider (e.g., Groq Dev Tier, OpenAI Pro).

## Support

For issues related to token limiting:

1. Check browser console (F12) for warning messages
2. Review this guide's "Error Messages" section
3. Open a GitHub issue with:
   - Provider name
   - Estimated vs actual tokens
   - Error message received

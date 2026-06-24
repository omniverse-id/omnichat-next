# Token Limits - Quick Reference Card

## The Fix

Your Groq 413 error is now **automatically prevented** by intelligent token limiting. No action needed!

## How It Works

When messages get too large:
1. Old messages are removed (oldest first)
2. System instructions are kept
3. Recent context is preserved
4. Your current message is always sent

## Provider Token Limits (Free Tier)

| Provider | Limit | Safe Threshold |
|----------|-------|----------------|
| **Groq** | 8,000 | 5,600 |
| OpenAI | 90,000+ | 63,000+ |
| Claude | 100,000 | 70,000 |
| Mistral | 100,000 | 70,000 |
| Local (Ollama) | ∞ | ∞ |

## Token Estimation

Rough calculation:
```
100 characters ≈ 25 tokens
1,000 characters ≈ 250 tokens  
10,000 characters ≈ 2,500 tokens
```

## Console Warning

If you see this in console (F12 → Console tab):
```
[v0] Token limit warning for groq: 65615 tokens
```

✅ This is **normal** - means old messages were trimmed

## Best Practices

✅ **DO:** Use concise prompts
✅ **DO:** Clear conversations when they get very long
✅ **DO:** Upgrade provider tier for unlimited usage
❌ **DON'T:** Worry about message size - system handles it
❌ **DON'T:** Send 50+ attachments in one message

## Troubleshooting

**Q: Am I losing my messages?**
A: Only old messages are trimmed. Recent context is preserved.

**Q: Why is my conversation history gone?**
A: Messages were too large. System kept important parts.

**Q: How do I avoid trimming?**
A: Use shorter prompts or upgrade to higher TPM tier.

**Q: Does this happen with OpenAI?**
A: Rarely - OpenAI has much higher limits (90K+ TPM free).

## Still Getting Errors?

1. Check provider is correct (Settings → Inference Provider)
2. Verify API key is set
3. Try with a shorter message
4. Restart browser
5. Check console (F12) for error details

## For Developers

Token limiting is in: `lib/providers/token-limiter.ts`

Key functions:
- `estimateTokens(text)` - Calculate tokens
- `checkTokenLimit(messages, provider)` - Check safety
- `trimMessagesToLimit(messages, provider)` - Trim messages
- `getProviderLimit(provider, model)` - Get TPM limit

To add new provider limit:
```typescript
PROVIDER_LIMITS["my-provider"] = 15000; // 15,000 TPM
```

## More Info

Full documentation: `TOKEN_LIMITING_GUIDE.md`
Technical details: `RATE_LIMIT_FIX_SUMMARY.md`

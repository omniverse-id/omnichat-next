/**
 * Token Limiter Utility
 * Estimates and manages token usage for rate-limited API providers
 */

// Approximate token to character ratio (varies by model, this is conservative)
const TOKENS_PER_CHAR_RATIO = 0.25;

// Provider-specific token limits (TPM - tokens per minute)
const PROVIDER_LIMITS: Record<string, number> = {
  groq: 8000,
  "openai/gpt-4o": 200000,
  "openai/gpt-4o-mini": 200000,
  "openai/gpt-4-turbo": 150000,
  "openai/gpt-3.5-turbo": 90000,
  anthropic: 100000,
  mistral: 100000,
  cohere: 100000,
  default: 50000, // Conservative default
};

interface TokenEstimate {
  estimatedTokens: number;
  isSafe: boolean;
  warning?: string;
}

/**
 * Estimate tokens for a message string
 */
export function estimateTokens(text: string): number {
  // More accurate: count words and add overhead for special characters
  const words = text.split(/\s+/).length;
  const specialChars = (text.match(/[^\w\s]/g) || []).length;
  
  // Rough estimation: ~4 characters per token
  // Words are roughly 4-5 chars, special chars add ~0.5 tokens each
  return Math.ceil((text.length * TOKENS_PER_CHAR_RATIO) + (specialChars * 0.3));
}

/**
 * Get the token limit for a provider
 */
export function getProviderLimit(provider: string, model?: string): number {
  if (model) {
    const modelKey = `${provider}/${model}`.toLowerCase();
    if (modelKey in PROVIDER_LIMITS) {
      return PROVIDER_LIMITS[modelKey];
    }
  }

  const providerKey = provider.toLowerCase();
  return PROVIDER_LIMITS[providerKey] || PROVIDER_LIMITS.default;
}

/**
 * Check if messages would exceed token limit
 */
export function checkTokenLimit(
  messages: any[],
  provider: string,
  model?: string
): TokenEstimate {
  const limit = getProviderLimit(provider, model);
  const safeLimit = Math.floor(limit * 0.7); // Use 70% to be safe
  
  let totalTokens = 0;
  for (const msg of messages) {
    const content = msg.content || "";
    totalTokens += estimateTokens(content);
    
    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (att.content) {
          totalTokens += estimateTokens(att.content);
        }
      }
    }
  }

  return {
    estimatedTokens: totalTokens,
    isSafe: totalTokens <= safeLimit,
    warning: totalTokens > safeLimit 
      ? `Message size (${totalTokens} tokens) exceeds safe limit (${safeLimit} tokens) for ${provider}. Messages may be truncated.`
      : undefined
  };
}

/**
 * Trim messages to fit within token limit
 * Keeps the most recent messages and system prompt
 */
export function trimMessagesToLimit(
  messages: any[],
  provider: string,
  model?: string,
  preserveSystem = true
): any[] {
  const limit = getProviderLimit(provider, model);
  const safeLimit = Math.floor(limit * 0.7);

  // Find system message if preserving
  let systemMessage: any = null;
  let otherMessages = messages;

  if (preserveSystem && messages.length > 0 && messages[0].role === "system") {
    systemMessage = messages[0];
    otherMessages = messages.slice(1);
  }

  let totalTokens = systemMessage ? estimateTokens(systemMessage.content || "") : 0;
  const trimmedMessages: any[] = systemMessage ? [systemMessage] : [];

  // Add messages in reverse order (most recent first), stopping when we hit limit
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msg = otherMessages[i];
    const msgTokens = estimateTokens(msg.content || "");

    if (totalTokens + msgTokens > safeLimit) {
      // If this is the first message we're trying to add and it's too large,
      // still include it (truncate its content)
      if (trimmedMessages.length === (systemMessage ? 1 : 0)) {
        const truncated = truncateMessage(msg, safeLimit - totalTokens);
        trimmedMessages.unshift(truncated);
      }
      break;
    }

    totalTokens += msgTokens;
    trimmedMessages.unshift(msg);
  }

  return trimmedMessages;
}

/**
 * Truncate a single message to fit within token budget
 */
export function truncateMessage(message: any, maxTokens: number): any {
  const charLimit = Math.floor(maxTokens / TOKENS_PER_CHAR_RATIO);
  
  return {
    ...message,
    content: message.content 
      ? (message.content.substring(0, charLimit) + "...")
      : ""
  };
}

/**
 * Format warning message for display
 */
export function formatTokenWarning(estimate: TokenEstimate, provider: string): string {
  if (estimate.warning) {
    return `⚠️ ${estimate.warning}`;
  }
  return "";
}

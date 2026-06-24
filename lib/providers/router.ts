import { handleOpenAIProvider } from "./openai-handler";
import providersConfig from "@/config/inference-providers.json";

interface ProviderConfig {
  provider: string;
  model: string;
  messages: any[];
  temperature: number;
  advanced: any;
  systemInstruction: string;
  apiKeys: Record<string, string>;
  baseUrls?: Record<string, string>;
  tools?: any;
}

export async function routeToProvider(config: ProviderConfig): Promise<Response> {
  const {
    provider,
    model,
    messages,
    temperature,
    advanced,
    systemInstruction,
    apiKeys,
    baseUrls,
  } = config;

  console.log("[v0] Routing to provider:", provider, "model:", model);

  // Get provider configuration
  const providerConfig = (providersConfig as Record<string, any>)[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Determine base URL (prioritize custom baseUrl over config default)
  let baseUrl = providerConfig.baseUrl;
  if (baseUrls && baseUrls[provider]) {
    baseUrl = baseUrls[provider];
  }

  // Get API key if required
  const apiKey = apiKeys?.[provider];
  if (providerConfig.isKeyRequired && !apiKey) {
    throw new Error(
      `${providerConfig.name} API Key is required. Please update your Settings.`
    );
  }

  // Route to appropriate handler
  if (provider === "google") {
    // Special handling for Google Gemini - kept as is
    const { handleGeminiProvider } = await import("./gemini-handler");
    return await handleGeminiProvider(
      { apiKey: apiKey!, model },
      messages,
      temperature,
      advanced,
      systemInstruction,
      config.tools
    );
  } else {
    // All other providers use OpenAI-compatible API
    return await handleOpenAIProvider(
      { baseUrl, apiKey, model },
      messages,
      temperature,
      advanced,
      systemInstruction
    );
  }
}

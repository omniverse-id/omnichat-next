import { NextResponse } from 'next/server';

interface FetchModelsRequest {
  provider: string;
  baseUrl?: string;
  apiKey?: string;
}

async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.models || []).map((m: any) => m.name);
  } catch (error) {
    console.error('[v0] Ollama fetch error:', error);
    return [];
  }
}

async function fetchLlamaModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tag`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.name);
  } catch (error) {
    console.error('[v0] llama.cpp fetch error:', error);
    return [];
  }
}

async function fetchLMStudioModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] LM Studio fetch error:', error);
    return [];
  }
}

async function fetchVLLMModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] vLLM fetch error:', error);
    return [];
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || [])
      .filter((m: any) => !m.id.includes('dall-e') && !m.id.includes('tts') && !m.id.includes('whisper') && !m.id.includes('embedding') && !m.id.includes('moderation'))
      .map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] OpenAI fetch error:', error);
    return [];
  }
}

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] Anthropic fetch error:', error);
    return [];
  }
}

async function fetchMistralModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] Mistral fetch error:', error);
    return [];
  }
}

async function fetchGroqModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m: any) => m.id);
  } catch (error) {
    console.error('[v0] Groq fetch error:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { provider, baseUrl, apiKey } = (await req.json()) as FetchModelsRequest;

    let models: string[] = [];

    switch (provider) {
      case 'ollama':
        if (!baseUrl) return NextResponse.json({ error: 'Base URL required for Ollama' }, { status: 400 });
        models = await fetchOllamaModels(baseUrl);
        break;
      case 'llamacpp':
        if (!baseUrl) return NextResponse.json({ error: 'Base URL required for llama.cpp' }, { status: 400 });
        models = await fetchLlamaModels(baseUrl);
        break;
      case 'lmstudio':
        if (!baseUrl) return NextResponse.json({ error: 'Base URL required for LM Studio' }, { status: 400 });
        models = await fetchLMStudioModels(baseUrl);
        break;
      case 'vllm':
        if (!baseUrl) return NextResponse.json({ error: 'Base URL required for vLLM' }, { status: 400 });
        models = await fetchVLLMModels(baseUrl);
        break;
      case 'openai':
        if (!apiKey) return NextResponse.json({ error: 'API Key required for OpenAI' }, { status: 400 });
        models = await fetchOpenAIModels(apiKey);
        break;
      case 'anthropic':
        if (!apiKey) return NextResponse.json({ error: 'API Key required for Anthropic' }, { status: 400 });
        models = await fetchAnthropicModels(apiKey);
        break;
      case 'mistral':
        if (!apiKey) return NextResponse.json({ error: 'API Key required for Mistral' }, { status: 400 });
        models = await fetchMistralModels(apiKey);
        break;
      case 'groq':
        if (!apiKey) return NextResponse.json({ error: 'API Key required for Groq' }, { status: 400 });
        models = await fetchGroqModels(apiKey);
        break;
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ models: models.slice(0, 50) }); // Limit to 50 models
  } catch (error: any) {
    console.error('[v0] Models fetch error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch models'
    }, { status: 500 });
  }
}

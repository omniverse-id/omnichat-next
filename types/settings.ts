
export interface Settings {
  model: string;
  provider: string;
  systemInstruction: string;
  temperature: number;
  mediaResolution: 'default' | 'low' | 'high';
  syntaxTheme?: string;
  thinking: boolean;
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  thinkingBudget: number;
  tools: {
    structuredOutput: boolean;

    functionCalling: boolean;
    googleSearch: boolean;
    urlContext: boolean;

    // UI Tools
    canvas: boolean;
    deepResearch: boolean;
    images: boolean;
    videos: boolean;
  };
  functionDeclarations: string;
  expandThinking: boolean;
  excludeThinkingOnSubmit: boolean;
  enablePythonInterpreter: boolean;
  displayUserMessagesRaw: boolean;
  displayModelMessagesRaw: boolean;
  apiKeys: Record<string, string>;
  baseUrls: Record<string, string>;
  advanced: {
    stopSequences: string[];
    maxOutputTokens: number;
    topP: number;
    topK: number;
  };
}

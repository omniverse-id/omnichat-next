import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiHandlerConfig {
  apiKey: string;
  model: string;
}

export async function handleGeminiProvider(
  config: GeminiHandlerConfig,
  messages: any[],
  temperature: number,
  advanced: any,
  systemInstruction: string,
  tools?: any
): Promise<Response> {
  const { apiKey, model } = config;

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(apiKey);

  // Tools configuration
  const toolsList: any[] = [];

  // Determine if Google Search Grounding should be enabled
  const enableGoogleSearch = tools?.googleSearch || tools?.urlContext;

  if (enableGoogleSearch) {
    if (model.includes("1.5")) {
      toolsList.push({ googleSearchRetrieval: {} });
    } else {
      toolsList.push({ googleSearch: {} });
    }
  }

  if (tools?.codeExecution) {
    toolsList.push({ codeExecution: {} });
  }

  if (tools?.functionCalling && tools?.functionDeclarations) {
    try {
      const funcs = JSON.parse(tools.functionDeclarations);
      if (Array.isArray(funcs) && funcs.length > 0) {
        toolsList.push({ functionDeclarations: funcs });
      }
    } catch (e) {
      console.warn("Failed to parse function declarations:", e);
    }
  }

  if (tools?.urlContext) {
    // @ts-ignore
    toolsList.push({ url_context: {} });
  }

  // Thinking configuration
  let thinkingConfig: any = undefined;
  if (tools?.thinking && !model.includes("2.0-flash")) {
    if (model.includes("gemini-3")) {
      thinkingConfig = {
        includeThoughts: true,
        thinkingLevel: tools?.thinkingLevel || "medium",
      };
    } else {
      thinkingConfig = {
        includeThoughts: true,
        thinkingBudget: tools?.thinkingBudget || 8000,
      };
    }
  }

  // Configuration model
  const modelInstance = genAI.getGenerativeModel({
    model: model,
    systemInstruction: systemInstruction || undefined,
    tools: toolsList.length > 0 ? toolsList : undefined,
  });

  const generationConfig = {
    temperature: temperature,
    topP: advanced.topP,
    topK: advanced.topK,
    maxOutputTokens: advanced.maxOutputTokens,
    stopSequences:
      advanced.stopSequences?.length > 0 ? advanced.stopSequences : undefined,
    // @ts-ignore
    thinkingConfig: thinkingConfig,
  };

  // Format messages untuk Gemini SDK (alternating user/model)
  const history = messages.slice(0, -1).map((m: any) => {
    if (m.role === "function") {
      let responseContent = {};
      try {
        responseContent = JSON.parse(m.content);
      } catch (e) {
        responseContent = { result: m.content };
      }
      return {
        role: "function",
        parts: [
          {
            functionResponse: {
              name: m.name,
              response: responseContent,
            },
          },
        ],
      };
    }

    const parts: any[] = [];

    const isAssistant = m.role === "assistant";
    const includeReasoning =
      !tools?.excludeThinkingOnSubmit && isAssistant && m.reasoning_content;

    let textContent = m.content || "";
    if (includeReasoning) {
      textContent = `<thought>\n${m.reasoning_content}\n</thought>\n\n${textContent}`;
    }

    if (textContent) {
      parts.push({ text: textContent });
    }

    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach((att: any) => {
        if (att.content) {
          parts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
        } else if (att.data && att.data.includes("base64,")) {
          const base64Data = att.data.split(",")[1];
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: base64Data,
            },
          });
        }
      });
    }

    // Include function calls in history
    if (isAssistant && m.functionCalls && m.functionCalls.length > 0) {
      m.functionCalls.forEach((call: any) => {
        parts.push({
          functionCall: {
            name: call.name,
            args: call.args,
          },
        });
      });
    }

    // Gemini doesn't like completely empty parts
    if (parts.length === 0) {
      parts.push({ text: " " });
    }

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: parts,
    };
  });

  const lastMsgObj = messages[messages.length - 1];
  const lastMessageContent = lastMsgObj.content;
  const lastMessageParts: any[] = [];

  if (lastMessageContent) {
    lastMessageParts.push({ text: lastMessageContent });
  }

  if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
    lastMsgObj.attachments.forEach((att: any) => {
      if (att.content) {
        lastMessageParts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
      } else if (att.data && att.data.includes("base64,")) {
        const base64Data = att.data.split(",")[1];
        lastMessageParts.push({
          inlineData: {
            mimeType: att.type,
            data: base64Data,
          },
        });
      }
    });
  }

  const chatSession = modelInstance.startChat({
    generationConfig,
    history,
  });

  // Start streaming
  const result = await chatSession.sendMessageStream(lastMessageParts);

  // Transform stream Gemini ke format OpenAI-compatible
  const encoder = new TextEncoder();
  const customStream = new ReadableStream({
    async start(controller) {
      try {
        let groundingMetadata: any = null;

        for await (const chunk of result.stream) {
          const candidate = (chunk as any).candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Capture grounding metadata if present
          if (candidate?.groundingMetadata) {
            groundingMetadata = candidate.groundingMetadata;
          }

          let chunkText = "";
          let reasoningText = "";
          const functionCalls: any[] = [];

          for (const part of parts) {
            if ("thought" in part && (part as any).thought === true) {
              reasoningText += (part as any).text || "";
            } else if ("text" in part) {
              chunkText += (part as any).text;
            } else if ("functionCall" in part) {
              functionCalls.push((part as any).functionCall);
            }
          }

          if (chunkText || reasoningText || functionCalls.length > 0) {
            const data = JSON.stringify({
              choices: [
                {
                  delta: {
                    content: chunkText,
                    reasoning_content: reasoningText || undefined,
                    function_calls:
                      functionCalls.length > 0 ? functionCalls : undefined,
                  },
                  index: 0,
                  finish_reason: null,
                },
              ],
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Send grounding metadata as a separate event if captured
        if (groundingMetadata) {
          const metaData = JSON.stringify({
            groundingMetadata: groundingMetadata,
          });
          controller.enqueue(encoder.encode(`data: ${metaData}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(customStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

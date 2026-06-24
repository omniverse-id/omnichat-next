import { ReadableStream } from "stream/web";

interface OpenAIHandlerConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function handleOpenAIProvider(
  config: OpenAIHandlerConfig,
  messages: any[],
  temperature: number,
  advanced: any,
  systemInstruction: string
): Promise<Response> {
  const { baseUrl, apiKey, model } = config;

  const formattedMessages: OpenAIMessage[] = [];

  // Add system instruction if provided
  if (systemInstruction) {
    formattedMessages.push({
      role: "system",
      content: systemInstruction,
    });
  }

  // Format messages for OpenAI-compatible API
  for (const msg of messages) {
    if (msg.role === "function") {
      // Handle function responses
      formattedMessages.push({
        role: "user",
        content: `[Function Response: ${msg.name}]\n${msg.content}`,
      });
    } else {
      let content = msg.content || "";

      // Include reasoning if available
      if (msg.reasoning_content) {
        content = `[Thinking]\n${msg.reasoning_content}\n\n${content}`;
      }

      // Handle attachments
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.content) {
            content += `\n[File: ${att.name}]\n${att.content}`;
          }
        }
      }

      formattedMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: content.trim(),
      });
    }
  }

  const requestBody = {
    model,
    messages: formattedMessages,
    temperature,
    top_p: advanced.topP,
    max_tokens: advanced.maxOutputTokens,
    stream: true,
  };

  // Add optional fields
  if (advanced.topK && advanced.topK > 0) {
    (requestBody as any).top_k = advanced.topK;
  }
  if (advanced.stopSequences && advanced.stopSequences.length > 0) {
    (requestBody as any).stop = advanced.stopSequences;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add authorization header if API key is provided
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API Error: ${response.status} ${errorText}`
      );
    }

    // Transform OpenAI stream to our format
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const chunk = parsed.choices?.[0]?.delta?.content || "";

                  // Format as our standard stream format
                  const output = JSON.stringify({
                    choices: [
                      {
                        delta: {
                          content: chunk,
                        },
                        index: 0,
                        finish_reason: parsed.choices?.[0]?.finish_reason || null,
                      },
                    ],
                  });
                  controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                } catch (e) {
                  // Ignore parsing errors for non-JSON lines
                }
              }
            }
          }

          // Handle any remaining data
          if (buffer.trim()) {
            if (buffer.trim().startsWith("data: ")) {
              const data = buffer.trim().slice(6);
              if (data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  const chunk = parsed.choices?.[0]?.delta?.content || "";
                  const output = JSON.stringify({
                    choices: [
                      {
                        delta: {
                          content: chunk,
                        },
                        index: 0,
                        finish_reason: parsed.choices?.[0]?.finish_reason || null,
                      },
                    ],
                  });
                  controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
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
  } catch (error: any) {
    throw new Error(`Failed to connect to OpenAI-compatible API: ${error.message}`);
  }
}

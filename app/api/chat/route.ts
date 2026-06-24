import { NextResponse } from 'next/server';
import { routeToProvider } from '@/lib/providers/router';
import { handleImageGeneration } from './image-gen-helper';

async function handleDeepResearch(messages: any[], apiKey: string) {
    const lastMessage = messages[messages.length - 1];
    const input = lastMessage.content; // Note: Attachments handling omitted for preview simplification

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                input: input,
                agent: "deep-research-pro-preview-12-2025",
                background: true,
                stream: true,
                agent_config: {
                    type: "deep-research",
                    thinking_summaries: "auto"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deep Research API Error: ${response.status} ${errorText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    let buffer = "";
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ""; // Keep incomplete line

                        let currentEvent = null;

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                currentEvent = line.slice(7).trim();
                            } else if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6).trim();
                                if (!dataStr) continue;

                                try {
                                    const data = JSON.parse(dataStr);

                                    let chunkText = "";
                                    let reasoningText = "";

                                    // Map Interactions API events to frontend format
                                    if (currentEvent === 'content.delta') {
                                        if (data.delta?.type === 'text') {
                                            chunkText = data.delta.text;
                                        } else if (data.delta?.type === 'thought_summary') {
                                            // Format thoughts nicely: "Thought: ..."
                                            // Or send as reasoning_content if you want it in the thinking block
                                            reasoningText = `\nThought: ${data.delta.content.text}\n`;
                                        }
                                    }

                                    if (chunkText || reasoningText) {
                                        const output = JSON.stringify({
                                            choices: [{
                                                delta: {
                                                    content: chunkText,
                                                    reasoning_content: reasoningText || undefined
                                                },
                                                index: 0,
                                                finish_reason: null,
                                            }],
                                        });
                                        controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                                    }
                                } catch (e) {
                                    // Ignore parsing errors for non-JSON data lines
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
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Deep Research Error:', error);
        return NextResponse.json({
            error: error.message || 'Deep Research Failed'
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messages, settings } = await req.json();
        const { model, provider, temperature, advanced, systemInstruction, apiKeys, baseUrls, tools } = settings;

        // Branching for Deep Research (Gemini only)
        if (provider === 'google' && tools?.deepResearch) {
            const apiKey = apiKeys?.[provider];
            if (!apiKey) {
                return NextResponse.json({
                    error: `${provider} API Key is required. Please update your Settings.`
                }, { status: 400 });
            }
            return await handleDeepResearch(messages, apiKey);
        }

        // Branching for Image Generation (Gemini only)
        const isImageModel = model.includes("image");
        if (provider === 'google' && isImageModel) {
            const apiKey = apiKeys?.[provider];
            if (!apiKey) {
                return NextResponse.json({
                    error: `${provider} API Key is required. Please update your Settings.`
                }, { status: 400 });
            }
            return await handleImageGeneration(messages, model, apiKey);
        }

        // Route to appropriate provider
        try {
            const response = await routeToProvider({
                provider,
                model,
                messages,
                temperature,
                advanced,
                systemInstruction,
                apiKeys: apiKeys || {},
                baseUrls: baseUrls || {},
                tools: {
                    ...tools,
                    thinking: settings.thinking,
                    thinkingLevel: settings.thinkingLevel,
                    thinkingBudget: settings.thinkingBudget,
                    excludeThinkingOnSubmit: settings.excludeThinkingOnSubmit,
                    functionDeclarations: settings.functionDeclarations,
                }
            });
            return response;
        } catch (providerError: any) {
            console.error('Provider routing error:', providerError);
            return NextResponse.json({
                error: providerError.message || `Error with ${provider} provider`
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({
            error: error.message || 'An error occurred processing your request'
        }, { status: 500 });
    }
}

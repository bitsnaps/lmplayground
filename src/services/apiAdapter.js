import { useProvidersStore } from "../store/providers";

export const apiAdapter = {
  async generateStream({
    modelId,
    messages,
    systemPrompt,
    params,
    onChunk,
    onDone,
    onError,
  }) {
    const store = useProvidersStore();
    const model = store.models.find((m) => m.id === modelId);
    const provider = store.providers.find((p) => p.id === model.provider_id);
    const apiKey = store.apiKeys[provider.id] || "";

    if (!model || !provider) {
      onError("Model or Provider not found.");
      return;
    }

    // 1. Prepare the payload based on Provider Type
    let payload = {};
    const isAnthropic = provider.base_url.includes("anthropic");

    if (isAnthropic) {
      // Anthropic format
      payload = {
        model: model.api_model_id,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature,
        stream: true,
      };
    } else {
      // OpenAI-compatible format (OpenAI, Ollama, Groq, OpenRouter, etc.)
      const formattedMessages = [];
      if (systemPrompt) {
        formattedMessages.push({ role: "system", content: systemPrompt });
      }
      payload = {
        model: model.api_model_id,
        messages: [
          ...formattedMessages,
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature,
        stream: true,
      };
    }

    // 2. Call our Serverless Proxy
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerUrl: provider.base_url,
          providerId: provider.id,
          headers: {
            "Content-Type": "application/json",
            Authorization: provider.auth_header || "",
            "x-api-key": provider.auth_header || "", // For Anthropic/Others
            "anthropic-version": isAnthropic ? "2023-06-01" : undefined,
          },
          payload: payload,
          clientApiKey: apiKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy Error: ${response.status} - ${errText}`);
      }

      // 3. Parse Server-Sent Events (SSE) Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              let textChunk = "";

              // Handle different delta formats
              if (isAnthropic && data.type === "content_block_delta") {
                textChunk = data.delta.text || "";
              } else if (data.choices && data.choices[0].delta) {
                textChunk = data.choices[0].delta.content || "";
              }

              if (textChunk) onChunk(textChunk);
            } catch (e) {
              // Ignore incomplete JSON chunks silently
            }
          }
        }
      }
      onDone();
    } catch (error) {
      onError(error.message);
    }
  },
};

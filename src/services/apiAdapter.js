// src/services/apiAdapter.js
import { useProvidersStore } from "../store/providers";

const API_BASE = "/api";

export const apiAdapter = {
  // ─── Text/Chat Streaming ───────────────────────────────────

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
    const provider = store.providers.find(
      (p) => p.id === model.provider_id,
    );
    const apiKey = store.apiKeys[provider.id] || "";

    if (!model || !provider) {
      onError("Model or Provider not found.");
      return;
    }

    const isAnthropic = provider.base_url.includes("anthropic");
    let payload = {};

    if (isAnthropic) {
      payload = {
        model: model.api_model_id,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature,
        stream: true,
      };
    } else {
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

    // Build auth headers — send raw API key, let proxy construct Authorization
    const requestHeaders = { "Content-Type": "application/json" };
    if (provider.auth_header) {
      requestHeaders["x-auth-format"] = provider.auth_header;
    }
    if (isAnthropic) {
      requestHeaders["anthropic-version"] = "2023-06-01";
    }

    try {
      const response = await fetch(`${API_BASE}/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerUrl: provider.base_url,
          providerId: provider.id,
          headers: requestHeaders,
          payload: payload,
          clientApiKey: apiKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy Error: ${response.status} - ${errText}`);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              let textChunk = "";

              if (isAnthropic && data.type === "content_block_delta") {
                textChunk = data.delta?.text || "";
              } else if (data.choices && data.choices[0]?.delta) {
                textChunk = data.choices[0].delta.content || "";
              }

              if (textChunk) onChunk(textChunk);
            } catch (e) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }
      onDone();
    } catch (error) {
      onError(error.message);
    }
  },

  // ─── Image Generation ──────────────────────────────────────

  async generateImage({ modelId, prompt, params = {} }) {
    const store = useProvidersStore();
    const model = store.models.find((m) => m.id === modelId);
    const provider = store.providers.find(
      (p) => p.id === model.provider_id,
    );
    const apiKey = store.apiKeys[provider.id] || "";

    if (!model || !provider) {
      throw new Error("Model or Provider not found.");
    }

    const requestHeaders = { "Content-Type": "application/json" };
    if (provider.auth_header) {
      requestHeaders["x-auth-format"] = provider.auth_header;
    }

    const payload = {
      model: model.api_model_id,
      prompt: prompt,
      n: params.n || 1,
      size: params.size || "1024x1024",
      response_format: params.response_format || "url",
    };

    const response = await fetch(`${API_BASE}/image-gen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerUrl: provider.base_url,
        providerId: provider.id,
        headers: requestHeaders,
        payload: payload,
        clientApiKey: apiKey,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || "Image generation failed.");
    }
    return json.data;
  },

  // ─── Embeddings ────────────────────────────────────────────

  async generateEmbeddings({ modelId, inputs, compare = false }) {
    const store = useProvidersStore();
    const model = store.models.find((m) => m.id === modelId);
    const provider = store.providers.find(
      (p) => p.id === model.provider_id,
    );
    const apiKey = store.apiKeys[provider.id] || "";

    if (!model || !provider) {
      throw new Error("Model or Provider not found.");
    }

    const requestHeaders = { "Content-Type": "application/json" };
    if (provider.auth_header) {
      requestHeaders["x-auth-format"] = provider.auth_header;
    }

    const payload = {
      model: model.api_model_id,
      input: Array.isArray(inputs) ? inputs : [inputs],
    };

    const response = await fetch(`${API_BASE}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerUrl: provider.base_url,
        providerId: provider.id,
        headers: requestHeaders,
        payload: payload,
        clientApiKey: apiKey,
        compareEmbeddings:
          compare && Array.isArray(inputs) && inputs.length === 2,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || "Embeddings generation failed.");
    }
    return json.data;
  },

  // ─── Vision (Image + Text) ─────────────────────────────────

  async generateVisionStream({
    modelId,
    textContent,
    imageBase64,
    imageMimeType,
    systemPrompt,
    params,
    onChunk,
    onDone,
    onError,
  }) {
    const store = useProvidersStore();
    const model = store.models.find((m) => m.id === modelId);
    const provider = store.providers.find(
      (p) => p.id === model.provider_id,
    );
    const apiKey = store.apiKeys[provider.id] || "";

    if (!model || !provider) {
      onError("Model or Provider not found.");
      return;
    }

    const isAnthropic = provider.base_url.includes("anthropic");
    let payload = {};

    if (isAnthropic) {
      payload = {
        model: model.api_model_id,
        system: systemPrompt,
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature,
        stream: true,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: imageMimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: textContent },
            ],
          },
        ],
      };
    } else {
      // OpenAI vision format
      payload = {
        model: model.api_model_id,
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature,
        stream: true,
        messages: [
          ...(systemPrompt
            ? [{ role: "system", content: systemPrompt }]
            : []),
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                },
              },
              { type: "text", text: textContent },
            ],
          },
        ],
      };
    }

    const requestHeaders = { "Content-Type": "application/json" };
    if (provider.auth_header) {
      requestHeaders["x-auth-format"] = provider.auth_header;
    }
    if (isAnthropic) {
      requestHeaders["anthropic-version"] = "2023-06-01";
    }

    // Reuse the streaming proxy — same SSE parsing
    try {
      const response = await fetch(`${API_BASE}/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerUrl: provider.base_url,
          providerId: provider.id,
          headers: requestHeaders,
          payload: payload,
          clientApiKey: apiKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy Error: ${response.status} - ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              let textChunk = "";

              if (isAnthropic && data.type === "content_block_delta") {
                textChunk = data.delta?.text || "";
              } else if (data.choices && data.choices[0]?.delta) {
                textChunk = data.choices[0].delta.content || "";
              }

              if (textChunk) onChunk(textChunk);
            } catch (e) {
              // Ignore incomplete JSON
            }
          }
        }
      }
      onDone();
    } catch (error) {
      onError(error.message);
    }
  },

  /**
   * Fetch available models from a provider's /v1/models endpoint.
   * Returns array of model id strings, or empty array on failure.
   */
  async fetchModels(provider) {
    try {
      const apiKey = storageService.getApiKey(provider.id) || "";
      const requestHeaders = { "Content-Type": "application/json" };
      if (provider.auth_header) {
        requestHeaders["x-auth-format"] = provider.auth_header;
      }
      const response = await fetch(`${API_BASE}/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerUrl: provider.base_url,
          providerId: provider.id,
          headers: requestHeaders,
          action: "listModels",
          clientApiKey: apiKey,
        }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (Array.isArray(data.data)) {
        return data.data.map((m) => m.id).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  },
};

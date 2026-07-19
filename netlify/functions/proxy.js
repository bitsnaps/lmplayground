// netlify/functions/proxy.js
import { HEADERS } from "./_shared/cors.js";
import { createClient } from "./_shared/db.js";

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Validate that a URL is safe to fetch (SSRF protection).
 * Only allows https, blocks private/internal IPs and metadata endpoints.
 */
function validateProviderUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  const hostname = parsed.hostname;

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return { ok: false, error: "Loopback addresses are not allowed." };
  }

  // Block metadata endpoints
  if (hostname === "169.254.169.254") {
    return { ok: false, error: "Cloud metadata endpoints are not allowed." };
  }

  // Block private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return { ok: false, error: "Private network addresses are not allowed." };
    }
  }

  return { ok: true };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "OK" };
  }

  try {
    const bodyLength = event.body ? Buffer.byteLength(event.body, "utf8") : 0;
    if (bodyLength > MAX_BODY_SIZE) {
      return {
        statusCode: 413,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Request body too large (max 10MB)." }),
      };
    }

    const parsed = JSON.parse(event.body || "{}");
    const {
      providerUrl,
      payload,
      headers: customHeaders,
      providerId,
      clientApiKey,
    } = parsed;

    if (!providerUrl || !payload) {
      return {
        statusCode: 400,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing providerUrl or payload." }),
      };
    }

    const urlCheck = validateProviderUrl(providerUrl);
    if (!urlCheck.ok) {
      return {
        statusCode: 400,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: urlCheck.error }),
      };
    }

    let apiKey = clientApiKey || "";

    if (!apiKey && process.env.DATABASE_URL && providerId) {
      const db = await createClient();
      try {
        const res = await db.query(
          "SELECT api_key FROM providers WHERE id = $1",
          [providerId],
        );
        if (res.rows.length > 0 && res.rows[0].api_key) {
          apiKey = res.rows[0].api_key;
        }
      } finally {
        await db.end();
      }
    }

    const finalHeaders = {};
    for (const [key, value] of Object.entries(customHeaders || {})) {
      if (key === "x-auth-format" && value) {
        const authValue = String(value).replace("{{API_KEY}}", apiKey);
        if (authValue.startsWith("Bearer ")) {
          finalHeaders["Authorization"] = authValue;
        } else {
          finalHeaders["x-api-key"] = authValue;
        }
      } else if (value !== undefined && value !== null) {
        finalHeaders[key] = String(value);
      }
    }

    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    // Auto-append /chat/completions if URL looks like a base API URL
    let resolvedUrl = providerUrl;
    const hasEndpoint = /\/(chat\/completions|messages|generate|embeddings|images\/generations)(\?|$)/.test(resolvedUrl);
    if (!hasEndpoint) {
      resolvedUrl = resolvedUrl.replace(/\/+$/, "") + "/chat/completions";
    }

    const response = await fetch(resolvedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Provider API Error (${response.status}): ${errorText}`,
        }),
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const isStream =
      contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson");

    if (isStream) {
      const responseBody = await response.text();
      return {
        statusCode: 200,
        headers: {
          ...HEADERS,
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        body: responseBody,
      };
    }

    const jsonBody = await response.text();
    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        "Content-Type": contentType || "application/json",
      },
      body: jsonBody,
    };
  } catch (err) {
    console.error("Proxy Error:", err);
    return {
      statusCode: 500,
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

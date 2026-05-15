// netlify/functions/proxy.js
const { HEADERS } = require("./_shared/cors");

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "OK" };
  }

  try {
    // Size check
    const bodyLength = event.body ? event.body.length : 0;
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

    let apiKey = clientApiKey || "";

    // Fetch API key from PostgreSQL if not provided by client
    if (!apiKey && process.env.DATABASE_URL && providerId) {
      const { Client } = require("pg");
      const db = new Client({ connectionString: process.env.DATABASE_URL });
      try {
        await db.connect();
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

    // Replace {{API_KEY}} placeholder in each header value
    const finalHeaders = {};
    for (const [key, value] of Object.entries(customHeaders || {})) {
      if (value !== undefined && value !== null) {
        finalHeaders[key] = String(value).replace("{{API_KEY}}", apiKey);
      }
    }

    // Always ensure Content-Type for the upstream request
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    // Make the upstream API call
    const response = await fetch(providerUrl, {
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

    // Check if the response is a stream (SSE)
    const contentType = response.headers.get("content-type") || "";
    const isStream =
      contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson");

    if (isStream) {
      // For streaming responses, relay the raw stream
      const responseBody = await response.text();
      return {
        statusCode: 200,
        headers: {
          ...HEADERS,
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: responseBody,
      };
    }

    // For non-streaming JSON responses, pass through directly
    const jsonBody = await response.text();
    return {
      statusCode: 200,
      headers: { ...HEADERS, "Content-Type": contentType || "application/json" },
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

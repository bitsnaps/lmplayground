// netlify/functions/proxy.js
const { stream } = require("@netlify/functions");
const { Client } = require("pg");
const { HEADERS } = require("./_shared/cors");

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit

exports.handler = stream(async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "OK" };
  }

  try {
    // Size check
    if (event.body && event.body.length > MAX_BODY_SIZE) {
      return {
        statusCode: 413,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Request body too large (max 10MB)." }),
      };
    }

    const {
      providerUrl,
      payload,
      headers: customHeaders,
      providerId,
      clientApiKey,
    } = JSON.parse(event.body);

    if (!providerUrl || !payload) {
      return {
        statusCode: 400,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing providerUrl or payload." }),
      };
    }

    let apiKey = clientApiKey || "";

    // STORAGE ADAPTER: Fetch API key from PostgreSQL if not provided by client
    if (!apiKey && process.env.DATABASE_URL && providerId) {
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

    // Stream the response back
    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        "Content-Type":
          response.headers.get("content-type") || "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body: response.body,
    };
  } catch (err) {
    console.error("Proxy Error:", err);
    return {
      statusCode: 500,
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
});

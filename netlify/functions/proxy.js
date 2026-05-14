const { stream } = require("@netlify/functions");
const { Client } = require("pg");

// CORS Headers to allow requests from our Vue app
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = stream(async (event, context) => {
  // Handle Preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  try {
    // The frontend passes everything dynamically to avoid hardcoding providers
    const {
      providerUrl,
      payload,
      headers: customHeaders,
      providerId,
      clientApiKey,
    } = JSON.parse(event.body);

    let apiKey = clientApiKey;

    // STORAGE ADAPTER LOGIC:
    // If we have a DB configured, and the frontend didn't pass a key from LocalStorage,
    // we securely fetch the API key from PostgreSQL using the providerId.
    if (!apiKey && process.env.DATABASE_URL && providerId) {
      const db = new Client({ connectionString: process.env.DATABASE_URL });
      await db.connect();
      const res = await db.query(
        "SELECT api_key FROM providers WHERE id = $1",
        [providerId],
      );
      if (res.rows.length > 0) {
        apiKey = res.rows[0].api_key;
      }
      await db.end();
    }

    // Replace a placeholder in the auth header with the actual key
    // Frontend passes something like: { "Authorization": "Bearer {{API_KEY}}" }
    const finalHeaders = {};
    for (const [key, value] of Object.entries(customHeaders)) {
      finalHeaders[key] = value.replace("{{API_KEY}}", apiKey || "");
    }

    // Make the actual call to OpenAI/Anthropic/Ollama etc.
    const response = await fetch(providerUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider API Error (${response.status}): ${errorText}`);
    }

    // Stream the response back to the frontend
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      // Netlify stream() expects a ReadableStream. The fetch response body is exactly that.
      body: response.body,
    };
  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
});

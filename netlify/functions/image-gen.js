// netlify/functions/image-gen.js
const { Client } = require("pg");
const { success, error, optionsResponse } = require("./_shared/response");

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();

  if (event.httpMethod !== "POST") {
    return error(405, "Only POST is supported.");
  }

  try {
    if (event.body && event.body.length > MAX_BODY_SIZE) {
      return error(413, "Request body too large (max 5MB).");
    }

    const {
      providerUrl,
      payload,
      headers: customHeaders,
      providerId,
      clientApiKey,
    } = JSON.parse(event.body);

    if (!providerUrl || !payload) {
      return error(400, "Missing providerUrl or payload.");
    }

    let apiKey = clientApiKey || "";

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

    const finalHeaders = {};
    for (const [key, value] of Object.entries(customHeaders || {})) {
      if (value !== undefined && value !== null) {
        finalHeaders[key] = String(value).replace("{{API_KEY}}", apiKey);
      }
    }
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      return error(
        response.status,
        responseBody.error?.message || JSON.stringify(responseBody),
      );
    }

    return success(responseBody);
  } catch (err) {
    console.error("Image Gen Error:", err);
    return error(500, err.message);
  }
};

// netlify/functions/embeddings.js
import { createClient } from "./_shared/db.js";
import { success, error, optionsResponse } from "./_shared/response.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();

  if (event.httpMethod !== "POST") {
    return error(405, "Only POST is supported.");
  }

  try {
    const {
      providerUrl,
      payload,
      headers: customHeaders,
      providerId,
      clientApiKey,
      compareEmbeddings,
    } = JSON.parse(event.body);

    if (!providerUrl || !payload) {
      return error(400, "Missing providerUrl or payload.");
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

    if (
      compareEmbeddings &&
      responseBody.data &&
      responseBody.data.length === 2
    ) {
      const vecA = responseBody.data[0].embedding;
      const vecB = responseBody.data[1].embedding;
      const cosineSimilarity = computeCosineSimilarity(vecA, vecB);
      responseBody.cosine_similarity = cosineSimilarity;
    }

    return success(responseBody);
  } catch (err) {
    console.error("Embeddings Error:", err);
    return error(500, err.message);
  }
};

function computeCosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

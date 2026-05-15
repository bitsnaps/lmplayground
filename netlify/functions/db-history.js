// netlify/functions/db-history.js
import { createClient, checkDbUrl } from "./_shared/db.js";
import { success, error, optionsResponse } from "./_shared/response.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();

  const noDb = checkDbUrl();
  if (noDb) return noDb;

  const db = await createClient();

  try {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : null;

    let result;

    switch (method) {
      case "GET": {
        const { session_id } = params;
        if (session_id) {
          result = await db.query(
            "SELECT * FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC",
            [session_id],
          );
        } else {
          result = await db.query(
            `SELECT session_id,
              MAX(created_at) AS last_active,
              (SELECT content FROM chat_history c2
               WHERE c2.session_id = c1.session_id
               ORDER BY created_at DESC LIMIT 1) AS last_message
             FROM chat_history c1
             GROUP BY session_id
             ORDER BY last_active DESC`,
          );
        }
        break;
      }

      case "POST": {
        if (!body) throw new Error("Request body required.");
        const { session_id, model_id, role, content, metrics } = body;
        if (!session_id || !model_id || !role || !content) {
          throw new Error(
            "Missing required fields: session_id, model_id, role, content",
          );
        }
        result = await db.query(
          `INSERT INTO chat_history (session_id, model_id, role, content, metrics)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [session_id, model_id, role, content, metrics || {}],
        );
        break;
      }

      case "DELETE": {
        const { session_id, id } = params;
        if (session_id) {
          result = await db.query(
            "DELETE FROM chat_history WHERE session_id = $1 RETURNING *",
            [session_id],
          );
        } else if (id) {
          result = await db.query(
            "DELETE FROM chat_history WHERE id = $1 RETURNING *",
            [id],
          );
        } else {
          throw new Error("session_id or id required for DELETE.");
        }
        break;
      }

      default:
        return error(405, `Method ${method} not allowed.`);
    }

    return success(result.rows);
  } catch (err) {
    console.error("Chat History Error:", err);
    return error(500, err.message);
  } finally {
    await db.end();
  }
};

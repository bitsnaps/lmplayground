// netlify/functions/db-history.js
const { Client } = require("pg");
const { success, error, optionsResponse } = require("./_shared/response");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();

  if (!process.env.DATABASE_URL) {
    return error(501, "No DATABASE_URL configured. Use LocalStorage mode.");
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await db.connect();

    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : null;

    let result;

    switch (method) {
      case "GET": {
        // Get messages for a session, or list all sessions
        const { session_id } = params;
        if (session_id) {
          result = await db.query(
            "SELECT * FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC",
            [session_id],
          );
        } else {
          // Return list of distinct sessions with last message preview
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

// netlify/functions/database.js
const { Client } = require("pg");
const { success, error, optionsResponse } = require("./_shared/response");

const ALLOWED_TABLES = ["providers", "models", "chat_history"];

// Whitelist of allowed columns per table to prevent injection
const TABLE_COLUMNS = {
  providers: ["id", "name", "base_url", "auth_header", "api_key"],
  models: [
    "id",
    "provider_id",
    "name",
    "api_model_id",
    "type",
    "supports_vision",
    "context_window",
  ],
  chat_history: ["session_id", "model_id", "role", "content", "metrics"],
};

function validateTable(table) {
  if (!table) throw new Error("Missing 'table' query parameter.");
  if (!ALLOWED_TABLES.includes(table))
    throw new Error(`Invalid table: ${table}`);
}

function filterColumns(table, data) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) throw new Error(`No column definitions for table: ${table}`);
  const filtered = {};
  for (const key of Object.keys(data)) {
    if (allowed.includes(key)) {
      filtered[key] = data[key];
    }
  }
  return filtered;
}

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
    const { table, id } = params;
    const body = event.body ? JSON.parse(event.body) : null;

    validateTable(table);

    let result;

    switch (method) {
      case "GET": {
        if (id) {
          result = await db.query(
            `SELECT * FROM ${table} WHERE id = $1`,
            [id],
          );
        } else {
          result = await db.query(
            `SELECT * FROM ${table} ORDER BY created_at DESC`,
          );
        }
        break;
      }

      case "POST": {
        if (!body) throw new Error("Request body required for POST.");
        const filtered = filterColumns(table, body);
        const keys = Object.keys(filtered);
        const values = Object.values(filtered);
        if (keys.length === 0) throw new Error("No valid columns provided.");
        const placeholders = keys
          .map((_, i) => `$${i + 1}`)
          .join(", ");
        result = await db.query(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
          values,
        );
        break;
      }

      case "PUT": {
        if (!id) throw new Error("ID required for PUT.");
        if (!body) throw new Error("Request body required for PUT.");
        const filtered = filterColumns(table, body);
        const keys = Object.keys(filtered);
        const values = Object.values(filtered);
        if (keys.length === 0) throw new Error("No valid columns provided.");
        const setClauses = keys
          .map((k, i) => `${k} = $${i + 1}`)
          .join(", ");
        values.push(id);
        result = await db.query(
          `UPDATE ${table} SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
          values,
        );
        break;
      }

      case "DELETE": {
        if (!id) throw new Error("ID required for DELETE.");
        result = await db.query(
          `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
          [id],
        );
        break;
      }

      default:
        return error(405, `Method ${method} not allowed.`);
    }

    return success(result.rows);
  } catch (err) {
    console.error("Database Error:", err);
    const status = err.message.startsWith("Invalid table") ? 403 : 500;
    return error(status, err.message);
  } finally {
    await db.end();
  }
};

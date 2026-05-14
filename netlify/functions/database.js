const { Client } = require("pg");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // If no DB is configured, tell the frontend to use LocalStorage fallback
  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 501, // Not Implemented
      headers,
      body: JSON.stringify({
        error: "No DATABASE_URL configured. Use LocalStorage mode.",
      }),
    };
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await db.connect();

    // Determine the action based on HTTP Method and query parameters
    const method = event.httpMethod;
    const { table, id } = event.queryStringParameters;
    const body = event.body ? JSON.parse(event.body) : null;

    // Security: Only allow specific tables to be queried
    const allowedTables = ["providers", "models", "chat_history"];
    if (!allowedTables.includes(table)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Invalid table" }),
      };
    }

    let result;

    switch (method) {
      case "GET":
        if (id) {
          result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
        } else {
          result = await db.query(`SELECT * FROM ${table}`);
        }
        break;

      case "POST":
        // Dynamically build INSERT query based on JSON keys (Flexible schema)
        const keys = Object.keys(body);
        const values = Object.values(body);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

        result = await db.query(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
          values,
        );
        break;

      case "DELETE":
        if (!id) throw new Error("ID required for DELETE");
        result = await db.query(
          `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
          [id],
        );
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows }),
    };
  } catch (error) {
    console.error("Database Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    await db.end();
  }
};

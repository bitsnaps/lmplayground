// netlify/functions/init-db.js
import { createClient, checkDbUrl } from "./_shared/db.js";
import { success, error, optionsResponse } from "./_shared/response.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  auth_header TEXT DEFAULT '',
  api_key TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id VARCHAR(64) PRIMARY KEY,
  provider_id VARCHAR(64) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  api_model_id VARCHAR(255) NOT NULL,
  type VARCHAR(32) DEFAULT 'text',
  supports_vision BOOLEAN DEFAULT FALSE,
  context_window INTEGER DEFAULT 8192,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  model_id VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
`;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse();

  const noDb = checkDbUrl();
  if (noDb) return noDb;

  const db = await createClient();

  try {
    await db.query(SCHEMA_SQL);
    return success({ message: "Database schema initialized successfully." });
  } catch (err) {
    console.error("DB Init Error:", err);
    return error(500, `Schema initialization failed: ${err.message}`);
  } finally {
    await db.end();
  }
};

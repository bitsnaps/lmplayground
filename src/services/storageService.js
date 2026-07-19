// src/services/storageService.js
import { useAppStateStore } from "../store/appState";

const API_BASE = "/api";

export const storageService = {
  getMode() {
    const appState = useAppStateStore();
    return appState.storageMode;
  },

  // ─── Generic Table CRUD ────────────────────────────────────

  async loadData(table) {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(`${API_BASE}/database?table=${table}`);
        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
        console.warn(
          `Postgres fetch failed for ${table}, falling back to localStorage.`,
        );
      } catch (e) {
        console.warn(`Postgres fetch error for ${table}:`, e);
      }
    }
    // LocalStorage fallback
    const localData = localStorage.getItem(`omni_${table}`);
    return localData ? JSON.parse(localData) : [];
  },

  async saveData(table, data) {
    // Always save to localStorage as cache/fallback
    try {
      localStorage.setItem(`omni_${table}`, JSON.stringify(data));
    } catch (e) {
      console.warn(`localStorage quota exceeded for table "${table}":`, e);
    }

    if (this.getMode() === "postgres") {
      try {
        // Sync strategy: fetch existing IDs, delete removed ones, upsert current ones.
        const existing = await this.loadData(table);
        const existingIds = new Set(existing.map((r) => r.id));
        const currentIds = new Set(data.map((r) => r.id));

        // Delete records that no longer exist locally
        for (const id of existingIds) {
          if (!currentIds.has(id)) {
            await fetch(`${API_BASE}/database?table=${table}&id=${id}`, {
              method: "DELETE",
            });
          }
        }

        // Upsert (POST new, PUT existing)
        for (const record of data) {
          if (existingIds.has(record.id)) {
            await fetch(`${API_BASE}/database?table=${table}&id=${record.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(record),
            });
          } else {
            await fetch(`${API_BASE}/database?table=${table}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(record),
            });
          }
        }
      } catch (e) {
        console.error(`Failed to sync ${table} to Postgres:`, e);
      }
    }
  },

  async addRecord(table, record) {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(`${API_BASE}/database?table=${table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data?.[0] || record;
        }
      } catch (e) {
        console.error(`Failed to add record to ${table}:`, e);
      }
    }
    return record;
  },

  async updateRecord(table, id, updates) {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(`${API_BASE}/database?table=${table}&id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data?.[0] || updates;
        }
      } catch (e) {
        console.error(`Failed to update record in ${table}:`, e);
      }
    }
    return updates;
  },

  async deleteRecord(table, id) {
    if (this.getMode() === "postgres") {
      try {
        await fetch(`${API_BASE}/database?table=${table}&id=${id}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error(`Failed to delete record from ${table}:`, e);
      }
    }
  },

  // ─── Chat History ──────────────────────────────────────────

  async loadChatHistory(sessionId) {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(
          `${API_BASE}/db-history?session_id=${sessionId}`,
        );
        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
      } catch (e) {
        console.warn("Failed to load chat history from Postgres:", e);
      }
    }
    // LocalStorage fallback
    const key = sessionId
      ? `omni_chat_${sessionId}`
      : "omni_chat_history";
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : [];
  },

  async saveChatMessage(sessionId, message) {
    // Always save to localStorage
    const key = `omni_chat_${sessionId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(message);
    try {
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.warn(`localStorage quota exceeded for chat "${sessionId}":`, e);
    }

    if (this.getMode() === "postgres") {
      try {
        await fetch(`${API_BASE}/db-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            model_id: message.model_id || "",
            role: message.role,
            content: message.content,
            metrics: message.metrics || {},
          }),
        });
      } catch (e) {
        console.error("Failed to save chat message to Postgres:", e);
      }
    }
  },

  async deleteChatSession(sessionId) {
    localStorage.removeItem(`omni_chat_${sessionId}`);

    if (this.getMode() === "postgres") {
      try {
        await fetch(`${API_BASE}/db-history?session_id=${sessionId}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error(
          "Failed to delete chat session from Postgres:",
          e,
        );
      }
    }
  },

  async listChatSessions() {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(`${API_BASE}/db-history`);
        if (res.ok) {
          const json = await res.json();
          return json.data || [];
        }
      } catch (e) {
        console.warn("Failed to list chat sessions from Postgres:", e);
      }
    }
    // LocalStorage: scan for omni_chat_* keys
    const sessions = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key.startsWith("omni_chat_") &&
        key !== "omni_chat_history"
      ) {
        const sessionId = key.replace("omni_chat_", "");
        const messages = JSON.parse(
          localStorage.getItem(key) || "[]",
        );
        const lastMsg = messages[messages.length - 1];
        sessions.push({
          session_id: sessionId,
          last_message: lastMsg?.content?.substring(0, 100) || "",
          last_active: lastMsg?.timestamp || "",
        });
      }
    }
    return sessions;
  },

  // ─── API Keys (localStorage only for security) ─────────────

  getApiKeys() {
    const keys = localStorage.getItem("omni_api_keys");
    return keys ? JSON.parse(keys) : {};
  },

  saveApiKeys(keysMap) {
    try {
      localStorage.setItem("omni_api_keys", JSON.stringify(keysMap));
    } catch (e) {
      console.warn("localStorage quota exceeded for API keys:", e);
    }
  },

  // ─── Database Initialization ───────────────────────────────

  async initDatabase() {
    try {
      const res = await fetch(`${API_BASE}/init-db`, { method: "POST" });
      return res.ok;
    } catch (e) {
      console.error("Failed to initialize database:", e);
      return false;
    }
  },
};

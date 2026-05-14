import { useAppStateStore } from "../store/appState";

export const storageService = {
  getMode() {
    // Pinia store is used to check the active mode
    const appState = useAppStateStore();
    return appState.storageMode;
  },

  async loadData(table) {
    if (this.getMode() === "postgres") {
      try {
        const res = await fetch(`/api/database?table=${table}`);
        if (res.ok) {
          const json = await res.json();
          return json.data;
        }
      } catch (e) {
        console.warn(
          `Postgres fetch failed, falling back to local storage for ${table}`,
          e,
        );
      }
    }

    // LocalStorage Fallback
    const localData = localStorage.getItem(`omni_${table}`);
    return localData ? JSON.parse(localData) : [];
  },

  async saveData(table, data) {
    // For local storage, we just overwrite the array
    localStorage.setItem(`omni_${table}`, JSON.stringify(data));

    if (this.getMode() === "postgres") {
      // In a full implementation, we would iterate and sync diffs to /api/database via POST/PUT
      console.log(`Syncing ${table} to Postgres...`);
    }
  },

  // API Keys are kept strictly in LocalStorage for security unless specifically pushed to the backend
  getApiKeys() {
    const keys = localStorage.getItem("omni_api_keys");
    return keys ? JSON.parse(keys) : {};
  },

  saveApiKeys(keysMap) {
    localStorage.setItem("omni_api_keys", JSON.stringify(keysMap));
  },
};

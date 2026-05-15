// src/store/chat.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { storageService } from "../services/storageService";

export const useChatStore = defineStore("chat", () => {
  const activeSessionId = ref(null);
  const messages = ref([]);
  const sessions = ref([]);

  // Generate a unique session ID
  const createSessionId = () =>
    `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Start a new chat session
  const startSession = (sessionId = null) => {
    activeSessionId.value = sessionId || createSessionId();
    messages.value = [];
    return activeSessionId.value;
  };

  // Load messages for a session
  const loadSession = async (sessionId) => {
    activeSessionId.value = sessionId;
    messages.value = await storageService.loadChatHistory(sessionId);
  };

  // Add a message to the active session
  const addMessage = async (message) => {
    if (!activeSessionId.value) {
      startSession();
    }

    const enrichedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      session_id: activeSessionId.value,
    };

    messages.value.push(enrichedMessage);
    await storageService.saveChatMessage(
      activeSessionId.value,
      enrichedMessage,
    );
  };

  // Clear the active session's messages (UI only, keeps in history)
  const clearActiveSession = () => {
    messages.value = [];
  };

  // Delete a session entirely
  const deleteSession = async (sessionId) => {
    await storageService.deleteChatSession(sessionId);
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null;
      messages.value = [];
    }
    await loadSessions();
  };

  // Load all sessions for the sidebar
  const loadSessions = async () => {
    sessions.value = await storageService.listChatSessions();
  };

  // Computed: sorted sessions by last active
  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => {
      if (a.last_active > b.last_active) return -1;
      if (a.last_active < b.last_active) return 1;
      return 0;
    });
  });

  return {
    activeSessionId,
    messages,
    sessions,
    sortedSessions,
    startSession,
    loadSession,
    addMessage,
    clearActiveSession,
    deleteSession,
    loadSessions,
  };
});

import { defineStore } from "pinia";
import { ref, onMounted } from "vue";

export const useAppStateStore = defineStore("appState", () => {
  const theme = ref("dark");
  const storageMode = ref("local"); // 'local' or 'postgres'

  const toggleTheme = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", theme.value);
    localStorage.setItem("omni_theme", theme.value);
  };

  const checkStorageMode = () => {
    // In a real scenario, we might hit a backend ping endpoint here to see if DB is active.
    // For now, we default to local, but allow manual toggle for UI demonstration.
    const savedMode = localStorage.getItem("omni_storage_mode");
    if (savedMode) storageMode.value = savedMode;
  };

  const setStorageMode = (mode) => {
    storageMode.value = mode;
    localStorage.setItem("omni_storage_mode", mode);
  };

  onMounted(() => {
    const savedTheme = localStorage.getItem("omni_theme");
    if (savedTheme) {
      theme.value = savedTheme;
      document.documentElement.setAttribute("data-bs-theme", theme.value);
    }
    checkStorageMode();
  });

  return { theme, storageMode, toggleTheme, setStorageMode };
});

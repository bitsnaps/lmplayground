import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStateStore = defineStore("appState", () => {
  const theme = ref("dark");
  const storageMode = ref("local"); // 'local' or 'postgres'
  const sidebarCollapsed = ref(false);
  const rightSidebarCollapsed = ref(false);
  const showRightSidebar = ref(false);

  const toggleTheme = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", theme.value);
    localStorage.setItem("omni_theme", theme.value);
  };

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    localStorage.setItem("omni_sidebar_collapsed", sidebarCollapsed.value);
  };

  const toggleRightSidebar = () => {
    rightSidebarCollapsed.value = !rightSidebarCollapsed.value;
    localStorage.setItem("omni_right_sidebar_collapsed", rightSidebarCollapsed.value);
  };

  const setStorageMode = (mode) => {
    storageMode.value = mode;
    localStorage.setItem("omni_storage_mode", mode);
  };

  function init() {
    const savedTheme = localStorage.getItem("omni_theme");
    if (savedTheme) {
      theme.value = savedTheme;
      document.documentElement.setAttribute("data-bs-theme", theme.value);
    }
    const savedCollapse = localStorage.getItem("omni_sidebar_collapsed");
    if (savedCollapse === "true") sidebarCollapsed.value = true;
    const savedRightCollapse = localStorage.getItem("omni_right_sidebar_collapsed");
    if (savedRightCollapse === "true") {
      rightSidebarCollapsed.value = true;
    }
    // Auto-collapse right sidebar on mobile screens
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      rightSidebarCollapsed.value = true;
    }
    const savedMode = localStorage.getItem("omni_storage_mode");
    if (savedMode) storageMode.value = savedMode;
  }

  return {
    theme,
    storageMode,
    sidebarCollapsed,
    rightSidebarCollapsed,
    showRightSidebar,
    toggleTheme,
    toggleSidebar,
    toggleRightSidebar,
    setStorageMode,
    init,
  };
});

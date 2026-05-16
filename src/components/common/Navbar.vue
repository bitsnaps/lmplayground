<template>
  <nav class="navbar navbar-expand bg-body-tertiary border-bottom px-3">
    <!-- Sidebar toggle -->
    <button
      class="btn btn-sm btn-outline-secondary me-3"
      @click="appState.toggleSidebar"
      :title="appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <i class="bi bi-list fs-5"></i>
    </button>

    <!-- Brand / breadcrumb area -->
    <span class="navbar-brand mb-0 h1 text-body-secondary fs-6">
      LMPlayground
    </span>

    <!-- Right side: right sidebar toggle (only on Playground) + theme toggle -->
    <div class="ms-auto d-flex align-items-center gap-2">
      <button
        v-if="appState.showRightSidebar"
        class="btn btn-sm btn-outline-secondary"
        @click="appState.toggleRightSidebar"
        :title="appState.rightSidebarCollapsed ? 'Show config panel' : 'Hide config panel'"
      >
        <i class="bi" :class="appState.rightSidebarCollapsed ? 'bi-sliders' : 'bi-chevron-right'"></i>
      </button>
 <button
 class="btn btn-sm btn-outline-secondary"
 @click="appState.toggleTheme"
 :title="appState.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
 >
 <i
 class="bi"
 :class="appState.theme === 'dark' ? 'bi-sun' : 'bi-moon'"
 ></i>
 </button>
 </div>
  </nav>
</template>

<script setup>
import { useAppStateStore } from "../../store/appState";

const appState = useAppStateStore();
</script>

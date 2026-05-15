<template>
  <aside
    class="sidebar bg-body-secondary d-flex flex-column border-end"
    :class="{ 'sidebar-collapsed': appState.sidebarCollapsed }"
  >
    <!-- Logo / Brand -->
    <a
      href="/"
      class="sidebar-brand d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none text-body"
    >
      <i class="bi bi-cpu fs-3 text-primary"></i>
      <span class="sidebar-label fs-5 fw-bold ms-2">LMPlayground</span>
    </a>
    <hr />

    <!-- Nav Links -->
    <ul class="nav nav-pills flex-column mb-auto gap-1">
      <li class="nav-item">
        <router-link
          to="/"
          class="nav-link text-body d-flex align-items-center"
          active-class="active"
          :title="appState.sidebarCollapsed ? 'Playground' : ''"
        >
          <i class="bi bi-chat-square-dots sidebar-icon"></i>
          <span class="sidebar-label ms-3">Playground</span>
        </router-link>
      </li>
      <li>
        <router-link
          to="/arena"
          class="nav-link text-body d-flex align-items-center"
          active-class="active"
          :title="appState.sidebarCollapsed ? 'The Arena' : ''"
        >
          <i class="bi bi-layout-split sidebar-icon"></i>
          <span class="sidebar-label ms-3">The Arena</span>
        </router-link>
      </li>
      <li>
        <router-link
          to="/catalog"
          class="nav-link text-body d-flex align-items-center"
          active-class="active"
          :title="appState.sidebarCollapsed ? 'Model Catalog' : ''"
        >
          <i class="bi bi-grid sidebar-icon"></i>
          <span class="sidebar-label ms-3">Model Catalog</span>
        </router-link>
      </li>
      <li>
        <router-link
          to="/settings"
          class="nav-link text-body d-flex align-items-center"
          active-class="active"
          :title="appState.sidebarCollapsed ? 'Settings & Keys' : ''"
        >
          <i class="bi bi-gear sidebar-icon"></i>
          <span class="sidebar-label ms-3">Settings & Keys</span>
        </router-link>
      </li>
    </ul>

    <hr />
    <div class="sidebar-label small text-muted text-center">v1.0.0 Serverless</div>

    <!-- Collapse toggle at bottom -->
    <button
      class="btn btn-sm btn-outline-secondary mt-2 sidebar-toggle-btn"
      @click="appState.toggleSidebar"
      :title="appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <i
        class="bi"
        :class="appState.sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'"
      ></i>
    </button>
  </aside>
</template>

<script setup>
import { useAppStateStore } from "../../store/appState";

const appState = useAppStateStore();
</script>

<style scoped>
.sidebar {
  width: 260px;
  padding: 1rem;
  transition: width 0.3s ease, padding 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-collapsed {
  width: 64px;
  padding: 1rem 0.5rem;
}

.sidebar-collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.2s ease, width 0.2s ease;
}

.sidebar .sidebar-label {
  opacity: 1;
  transition: opacity 0.2s ease 0.1s, width 0.2s ease;
}

.sidebar-collapsed .nav-link {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar-collapsed .sidebar-icon {
  font-size: 1.2rem;
}

.sidebar-collapsed .sidebar-brand {
  justify-content: center;
  margin-left: 0;
}

.sidebar-toggle-btn {
  width: 100%;
}
</style>

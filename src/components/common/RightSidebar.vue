<template>
  <!-- Mobile backdrop (only when sidebar is open on mobile) -->
  <div
    v-if="!appState.rightSidebarCollapsed && isMobile"
    class="right-sidebar-backdrop"
    @click="appState.toggleRightSidebar"
  ></div>
  <aside
    class="right-sidebar bg-body-tertiary border-start p-3 overflow-auto h-100"
    :class="{
      'right-sidebar-collapsed': appState.rightSidebarCollapsed,
      'right-sidebar-mobile': isMobile,
      'right-sidebar-mobile-open': isMobile && !appState.rightSidebarCollapsed
    }"
  >
    <!-- Content is teleported here from views via #right-sidebar-target -->
    <div id="right-sidebar-target"></div>
    <slot></slot>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAppStateStore } from "../../store/appState";

const appState = useAppStateStore();

// Reactive mobile detection
const MOBILE_BREAKPOINT = 768;
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < MOBILE_BREAKPOINT);

const onResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.right-sidebar {
  width: 280px;
  min-width: 280px;
  flex-shrink: 0;
  transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
}

.right-sidebar-collapsed {
  width: 0;
  min-width: 0;
  padding: 0;
  opacity: 0;
  border: none;
  overflow: hidden;
}

.right-sidebar-collapsed > * {
  visibility: hidden;
}

/* Mobile: sidebar becomes a fixed overlay panel */
.right-sidebar-mobile {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 85%;
  min-width: 0;
  max-width: 320px;
  z-index: 1050;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

.right-sidebar-mobile-open {
  transform: translateX(0);
}

/* Backdrop behind mobile sidebar */
.right-sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}
</style>

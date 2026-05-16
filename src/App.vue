<template>
  <div class="d-flex h-100 bg-body-tertiary">
    <!-- Left Sidebar -->
    <Sidebar />

    <!-- Main Content Area -->
    <div class="d-flex flex-column flex-grow-1 overflow-hidden">
      <!-- Top Navbar -->
      <Navbar />

      <!-- Content row: router-view + right sidebar -->
      <div class="d-flex flex-grow-1 overflow-hidden">
        <!-- Dynamic Page Content -->
        <main class="flex-grow-1 overflow-auto p-4 bg-body">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>

        <!-- Right Sidebar — content teleported here from views -->
        <RightSidebar v-show="appState.showRightSidebar" />
      </div>
    </div>
  </div>
</template>

<script setup>
import Sidebar from "./components/common/Sidebar.vue";
import Navbar from "./components/common/Navbar.vue";
import RightSidebar from "./components/common/RightSidebar.vue";
import { useAppStateStore } from "./store/appState";

const appState = useAppStateStore();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

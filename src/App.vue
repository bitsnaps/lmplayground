<template>
    <div class="d-flex h-100 bg-body-tertiary">
        <!-- Sidebar -->
        <Sidebar />

        <!-- Main Content Area -->
        <div class="d-flex flex-column flex-grow-1 overflow-hidden">
            <!-- Top Navbar -->
            <Navbar />

            <!-- Dynamic Page Content -->
            <main class="flex-grow-1 overflow-auto p-4 bg-body">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </main>
        </div>
    </div>
</template>

<script setup>
import Sidebar from "./components/common/Sidebar.vue";
import Navbar from "./components/common/Navbar.vue";
import { useAppStateStore } from "./store/appState";

// Initialize app state
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

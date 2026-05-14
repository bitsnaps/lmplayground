import { createRouter, createWebHistory } from "vue-router";

// Lazy loaded views for better performance
const PlaygroundView = () => import("../views/PlaygroundView.vue");
const ArenaView = () => import("../views/ArenaView.vue");
const CatalogView = () => import("../views/CatalogView.vue");
const SettingsView = () => import("../views/SettingsView.vue");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "playground", component: PlaygroundView },
    { path: "/arena", name: "arena", component: ArenaView },
    { path: "/catalog", name: "catalog", component: CatalogView },
    { path: "/settings", name: "settings", component: SettingsView },
  ],
});

export default router;

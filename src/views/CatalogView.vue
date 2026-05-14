<template>
    <div class="container-fluid h-100 d-flex flex-column px-0">
        <!-- HEADER & FILTERS -->
        <div class="bg-body-secondary border-bottom p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="m-0">
                    <i class="bi bi-grid me-2"></i>Model Catalog
                </h5>
                <span class="badge bg-primary rounded-pill"
                    >{{ filteredModels.length }} Models Available</span
                >
            </div>

            <!-- Filter Controls -->
            <div class="row g-2">
                <!-- Search -->
                <div class="col-md-4">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text"
                            ><i class="bi bi-search"></i
                        ></span>
                        <input
                            type="text"
                            v-model="filters.search"
                            class="form-control"
                            placeholder="Search models by name or ID..."
                        />
                    </div>
                </div>

                <!-- Provider Filter -->
                <div class="col-md-3">
                    <select
                        v-model="filters.provider"
                        class="form-select form-select-sm"
                    >
                        <option value="">All Providers</option>
                        <option
                            v-for="prov in store.providers"
                            :key="prov.id"
                            :value="prov.id"
                        >
                            {{ prov.name }}
                        </option>
                    </select>
                </div>

                <!-- Capability Type Filter -->
                <div class="col-md-3">
                    <select
                        v-model="filters.type"
                        class="form-select form-select-sm"
                    >
                        <option value="">All Capabilities</option>
                        <option value="text">Text Generation</option>
                        <option value="image">Image Generation</option>
                        <option value="embedding">Embeddings</option>
                    </select>
                </div>

                <!-- Vision Toggle -->
                <div class="col-md-2 d-flex align-items-center">
                    <div class="form-check form-switch m-0">
                        <input
                            class="form-check-input"
                            type="checkbox"
                            id="visionFilter"
                            v-model="filters.visionOnly"
                        />
                        <label class="form-check-label small" for="visionFilter"
                            >Vision Only</label
                        >
                    </div>
                </div>
            </div>
        </div>

        <!-- MAIN GRID -->
        <div class="flex-grow-1 overflow-auto p-4 bg-body">
            <!-- Empty State -->
            <div
                v-if="filteredModels.length === 0"
                class="text-center text-muted mt-5"
            >
                <i class="bi bi-search fs-1 mb-3 d-block"></i>
                <h5>No models found</h5>
                <p>Try adjusting your search or filter criteria.</p>
                <button
                    class="btn btn-outline-secondary btn-sm mt-2"
                    @click="resetFilters"
                >
                    Reset Filters
                </button>
            </div>

            <!-- Grid -->
            <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                <div class="col" v-for="mod in filteredModels" :key="mod.id">
                    <div
                        class="card h-100 shadow-sm border-0 bg-body-tertiary transition-hover"
                    >
                        <div class="card-body">
                            <div
                                class="d-flex justify-content-between align-items-start mb-2"
                            >
                                <h5 class="card-title fw-bold mb-0">
                                    {{ mod.name }}
                                </h5>
                                <span :class="getTypeBadgeClass(mod.type)">
                                    <i :class="getTypeIcon(mod.type)"></i>
                                    {{ capitalize(mod.type) }}
                                </span>
                            </div>

                            <p
                                class="text-muted small font-monospace mb-3"
                                style="font-size: 0.8rem"
                            >
                                {{ mod.api_model_id }}
                            </p>

                            <div class="mb-3">
                                <div
                                    class="d-flex justify-content-between border-bottom pb-1 mb-1 small"
                                >
                                    <span class="text-muted">Provider:</span>
                                    <span class="fw-medium">{{
                                        getProviderName(mod.provider_id)
                                    }}</span>
                                </div>
                                <div
                                    class="d-flex justify-content-between border-bottom pb-1 mb-1 small"
                                >
                                    <span class="text-muted"
                                        >Context Window:</span
                                    >
                                    <span class="fw-medium"
                                        >{{
                                            formatNumber(mod.context_window)
                                        }}
                                        tokens</span
                                    >
                                </div>
                                <div
                                    class="d-flex justify-content-between pb-1 small"
                                >
                                    <span class="text-muted"
                                        >Vision Support:</span
                                    >
                                    <span
                                        v-if="mod.supports_vision"
                                        class="text-success fw-medium"
                                        ><i
                                            class="bi bi-check-circle-fill me-1"
                                        ></i>
                                        Yes</span
                                    >
                                    <span v-else class="text-secondary"
                                        ><i class="bi bi-x-circle me-1"></i>
                                        No</span
                                    >
                                </div>
                            </div>
                        </div>

                        <div
                            class="card-footer bg-transparent border-top-0 pt-0 d-flex gap-2"
                        >
                            <router-link
                                to="/"
                                class="btn btn-primary btn-sm flex-grow-1"
                            >
                                <i class="bi bi-play-fill"></i> Playground
                            </router-link>
                            <router-link
                                v-if="mod.type === 'text'"
                                to="/arena"
                                class="btn btn-outline-secondary btn-sm flex-grow-1"
                            >
                                <i class="bi bi-layout-split"></i> Arena
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useProvidersStore } from "../store/providers";

const store = useProvidersStore();

// Filter State
const filters = ref({
    search: "",
    provider: "",
    type: "",
    visionOnly: false,
});

// Initialize Data
onMounted(async () => {
    if (!store.isLoaded) {
        await store.initializeData();
    }
});

// Computed Filtered List
const filteredModels = computed(() => {
    return store.models.filter((mod) => {
        // 1. Search (matches Name or API Model ID)
        const matchesSearch =
            filters.value.search === "" ||
            mod.name
                .toLowerCase()
                .includes(filters.value.search.toLowerCase()) ||
            mod.api_model_id
                .toLowerCase()
                .includes(filters.value.search.toLowerCase());

        // 2. Provider Filter
        const matchesProvider =
            filters.value.provider === "" ||
            mod.provider_id === filters.value.provider;

        // 3. Type Filter
        const matchesType =
            filters.value.type === "" || mod.type === filters.value.type;

        // 4. Vision Filter
        const matchesVision =
            !filters.value.visionOnly || mod.supports_vision === true;

        return matchesSearch && matchesProvider && matchesType && matchesVision;
    });
});

// Helpers
const resetFilters = () => {
    filters.value = { search: "", provider: "", type: "", visionOnly: false };
};

const getProviderName = (id) => {
    const provider = store.providers.find((p) => p.id === id);
    return provider ? provider.name : "Unknown";
};

const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatNumber = (num) => {
    if (!num) return "N/A";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return num / 1000 + "k";
    return num;
};

// Styling Helpers
const getTypeBadgeClass = (type) => {
    switch (type) {
        case "text":
            return "badge bg-primary-subtle text-primary border border-primary-subtle";
        case "image":
            return "badge bg-success-subtle text-success border border-success-subtle";
        case "embedding":
            return "badge bg-warning-subtle text-warning border border-warning-subtle";
        default:
            return "badge bg-secondary";
    }
};

const getTypeIcon = (type) => {
    switch (type) {
        case "text":
            return "bi-chat-text";
        case "image":
            return "bi-image";
        case "embedding":
            return "bi-bar-chart-steps";
        default:
            return "bi-cpu";
    }
};
</script>

<style scoped>
/* Slight scale effect on hover for cards */
.transition-hover {
    transition:
        transform 0.2s ease-in-out,
        box-shadow 0.2s ease-in-out;
}
.transition-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}
</style>

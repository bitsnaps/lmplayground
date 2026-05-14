<template>
    <div class="container-fluid h-100 d-flex flex-column px-0">
        <!-- HEADER & SETTINGS -->
        <div class="bg-body-secondary border-bottom p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="m-0">
                    <i class="bi bi-layout-split me-2"></i>The Arena
                </h5>
                <div>
                    <button
                        class="btn btn-outline-danger btn-sm"
                        @click="clearArena"
                        :disabled="isAnyGenerating"
                    >
                        <i class="bi bi-trash3"></i> Clear Arena
                    </button>
                </div>
            </div>

            <!-- Model Selection (Max 4) -->
            <div class="mt-3">
                <label class="form-label small fw-bold mb-2"
                    >Select Competitors (Max 4)</label
                >
                <div class="d-flex flex-wrap gap-2">
                    <div
                        v-for="mod in availableTextModels"
                        :key="mod.id"
                        class="form-check form-check-inline m-0"
                    >
                        <input
                            class="btn-check"
                            type="checkbox"
                            :id="'arena_' + mod.id"
                            :value="mod.id"
                            v-model="selectedModels"
                            :disabled="
                                selectedModels.length >= 4 &&
                                !selectedModels.includes(mod.id)
                            "
                        />
                        <label
                            class="btn btn-outline-primary btn-sm"
                            :for="'arena_' + mod.id"
                        >
                            {{ mod.name }}
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- THE ARENA (Columns) -->
        <div class="flex-grow-1 overflow-auto p-3 bg-body">
            <div
                v-if="selectedModels.length === 0"
                class="h-100 d-flex flex-column align-items-center justify-content-center text-muted"
            >
                <i class="bi bi-swords fs-1 mb-3"></i>
                <h4>Welcome to the Arena</h4>
                <p>
                    Select between 1 and 4 models above, type a prompt, and
                    watch them race.
                </p>
            </div>

            <div v-else class="row h-100">
                <!-- Dynamic Columns based on selection count -->
                <div
                    v-for="modelId in selectedModels"
                    :key="modelId"
                    :class="columnClass"
                    class="d-flex flex-column h-100 mb-3"
                >
                    <div class="card h-100 border shadow-sm d-flex flex-column">
                        <!-- Card Header: Model Info -->
                        <div
                            class="card-header bg-body-tertiary d-flex justify-content-between align-items-center py-2"
                        >
                            <span
                                class="fw-bold small text-truncate"
                                :title="getModelName(modelId)"
                            >
                                <i class="bi bi-cpu me-1"></i>
                                {{ getModelName(modelId) }}
                            </span>
                            <span
                                v-if="results[modelId]?.isGenerating"
                                class="spinner-border spinner-border-sm text-primary"
                                role="status"
                            ></span>
                        </div>

                        <!-- Card Body: Output Stream -->
                        <div class="card-body overflow-auto flex-grow-1">
                            <div
                                v-if="!results[modelId]?.hasStarted"
                                class="text-muted fst-italic"
                            >
                                Waiting for prompt...
                            </div>
                            <div
                                v-else-if="results[modelId]?.error"
                                class="text-danger"
                            >
                                {{ results[modelId].error }}
                            </div>
                            <!-- Render Markdown -->
                            <div
                                v-else
                                class="markdown-body"
                                v-html="renderMarkdown(results[modelId]?.text)"
                            ></div>
                        </div>

                        <!-- Card Footer: Metrics -->
                        <div class="card-footer bg-body-tertiary p-2">
                            <div
                                class="d-flex justify-content-between flex-wrap gap-1"
                                style="font-size: 0.75rem"
                            >
                                <span
                                    class="badge bg-secondary-subtle text-secondary border"
                                >
                                    TTFB:
                                    {{ formatTime(results[modelId]?.ttfb) }}
                                </span>
                                <span
                                    class="badge bg-secondary-subtle text-secondary border"
                                >
                                    Latency:
                                    {{
                                        formatTime(
                                            results[modelId]?.totalLatency,
                                        )
                                    }}
                                </span>
                                <span
                                    class="badge bg-secondary-subtle text-secondary border"
                                    title="Estimated"
                                >
                                    Speed:
                                    {{ results[modelId]?.tokensPerSec || 0 }}
                                    t/s
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- UNIVERSAL INPUT -->
        <div class="p-3 bg-body border-top">
            <div class="input-group">
                <textarea
                    v-model="universalPrompt"
                    class="form-control"
                    style="resize: none"
                    rows="2"
                    placeholder="Enter a unified prompt to broadcast to all selected models... (Shift+Enter to send)"
                    @keydown.shift.enter.prevent="runArena"
                    :disabled="isAnyGenerating || selectedModels.length === 0"
                >
                </textarea>
                <button
                    class="btn btn-primary px-4"
                    type="button"
                    @click="runArena"
                    :disabled="
                        isAnyGenerating ||
                        !universalPrompt.trim() ||
                        selectedModels.length === 0
                    "
                >
                    <i class="bi bi-play-fill fs-5"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { renderMarkdown } from "../utils/markdown";
import { ref, computed, onMounted } from "vue";
import { useProvidersStore } from "../store/providers";
import { apiAdapter } from "../services/apiAdapter";

const providersStore = useProvidersStore();

// State
const selectedModels = ref([]);
const universalPrompt = ref("");
const results = ref({}); // Stores text and metrics mapped by modelId

// Computed properties
const availableTextModels = computed(() => {
    return providersStore.models.filter((m) => m.type === "text");
});

const columnClass = computed(() => {
    const count = selectedModels.value.length;
    if (count === 1) return "col-12";
    if (count === 2) return "col-md-6";
    if (count === 3) return "col-md-4";
    if (count === 4) return "col-md-3";
    return "col-12";
});

const isAnyGenerating = computed(() => {
    return Object.values(results.value).some((r) => r.isGenerating);
});

// Initialization
onMounted(async () => {
    if (!providersStore.isLoaded) {
        await providersStore.initializeData();
    }
});

// Helpers
const getModelName = (modelId) => {
    const model = providersStore.models.find((m) => m.id === modelId);
    return model ? model.name : "Unknown Model";
};

const formatTime = (ms) => {
    if (!ms) return "--";
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const clearArena = () => {
    results.value = {};
    universalPrompt.value = "";
};

// Logic: Run Arena
const runArena = async () => {
    if (
        !universalPrompt.value.trim() ||
        selectedModels.value.length === 0 ||
        isAnyGenerating.value
    )
        return;

    const promptText = universalPrompt.value.trim();

    // Initialize result state for all selected models
    selectedModels.value.forEach((modelId) => {
        results.value[modelId] = {
            hasStarted: true,
            isGenerating: true,
            text: "",
            error: null,
            startTime: performance.now(),
            ttfb: null,
            totalLatency: null,
            estimatedTokens: 0,
            tokensPerSec: 0,
        };
    });

    // Standard params for fair comparison
    const commonParams = {
        systemPrompt: "You are a helpful assistant.",
        temperature: 0.7,
        maxTokens: 2048,
    };

    // Create an array of Promises so they execute concurrently
    const promises = selectedModels.value.map((modelId) => {
        return new Promise((resolve) => {
            apiAdapter.generateStream({
                modelId: modelId,
                messages: [{ role: "user", content: promptText }],
                systemPrompt: commonParams.systemPrompt,
                params: commonParams,
                onChunk: (text) => {
                    const res = results.value[modelId];
                    res.text += text;

                    // TTFB (Time to First Byte) tracking
                    if (res.ttfb === null) {
                        res.ttfb = performance.now() - res.startTime;
                    }

                    // Rough token estimation (1 token ≈ 4 characters in English)
                    res.estimatedTokens = Math.ceil(res.text.length / 4);
                },
                onDone: () => {
                    const res = results.value[modelId];
                    res.isGenerating = false;
                    res.totalLatency = performance.now() - res.startTime;

                    // Calculate Tokens per Second
                    const timeInSeconds = res.totalLatency / 1000;
                    if (timeInSeconds > 0) {
                        res.tokensPerSec = Math.round(
                            res.estimatedTokens / timeInSeconds,
                        );
                    }
                    resolve();
                },
                onError: (errMessage) => {
                    const res = results.value[modelId];
                    res.isGenerating = false;
                    res.error = `Error: ${errMessage}`;
                    resolve();
                },
            });
        });
    });

    // Wait for all streams to finish (optional, state handles UI updates automatically)
    await Promise.all(promises);
};
</script>

<style scoped>
/* Smooth scrollbar for the arena cards */
.card-body::-webkit-scrollbar {
    width: 6px;
}
.card-body::-webkit-scrollbar-track {
    background: transparent;
}
.card-body::-webkit-scrollbar-thumb {
    background: var(--bs-border-color);
    border-radius: 3px;
}
</style>

<template>
    <div class="container-fluid max-w-custom">
        <h2 class="mb-4">Data Management & Settings</h2>

        <!-- Bootstrap Tabs Navigation -->
        <ul class="nav nav-tabs mb-4" id="settingsTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link active"
                    data-bs-toggle="tab"
                    data-bs-target="#keys-tab"
                >
                    🔑 API Keys
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    data-bs-toggle="tab"
                    data-bs-target="#providers-tab"
                >
                    🌐 Providers
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link"
                    data-bs-toggle="tab"
                    data-bs-target="#models-tab"
                >
                    🧠 Models
                </button>
            </li>
        </ul>

        <div class="tab-content" id="settingsTabsContent">
            <!-- API KEYS TAB -->
            <div
                class="tab-pane fade show active"
                id="keys-tab"
                role="tabpanel"
            >
                <div class="card shadow-sm border-0">
                    <div class="card-body">
                        <h5 class="card-title mb-3">API Key Configuration</h5>
                        <p class="text-muted small">
                            Keys are stored securely in your browser's
                            LocalStorage and are only sent to the proxy server
                            when making a request.
                        </p>

                        <div
                            v-for="prov in store.providers"
                            :key="prov.id"
                            class="mb-3 row align-items-center"
                        >
                            <label class="col-sm-3 col-form-label fw-bold">{{
                                prov.name
                            }}</label>
                            <div class="col-sm-9">
                                <div class="input-group">
                                    <span class="input-group-text"
                                        ><i class="bi bi-key"></i
                                    ></span>
                                    <input
                                        type="password"
                                        class="form-control"
                                        :value="store.apiKeys[prov.id] || ''"
                                        @input="
                                            updateApiKey(
                                                prov.id,
                                                $event.target.value,
                                            )
                                        "
                                        placeholder="Enter API Key (Leave blank if local/unauthenticated)"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PROVIDERS TAB -->
            <div class="tab-pane fade" id="providers-tab" role="tabpanel">
                <div class="row">
                    <div class="col-md-7">
                        <div class="list-group shadow-sm mb-4">
                            <div
                                v-for="prov in store.providers"
                                :key="prov.id"
                                class="list-group-item p-3"
                            >
                                <!-- View Mode -->
                                <div v-if="editingProviderId !== prov.id" class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">{{ prov.name }}</h6>
                                        <small class="text-muted text-break">{{ prov.base_url }}</small>
                                    </div>
                                    <div class="d-flex gap-1">
                                        <button @click="startEditProvider(prov)" class="btn btn-outline-secondary btn-sm" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button @click="store.deleteProvider(prov.id)" class="btn btn-outline-danger btn-sm" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <!-- Edit Mode -->
                                <div v-else>
                                    <form @submit.prevent="saveProvider(prov.id)">
                                        <div class="mb-2">
                                            <label class="form-label small">Provider Name</label>
                                            <input type="text" v-model="editProvider.name" class="form-control form-control-sm" required />
                                        </div>
                                        <div class="mb-2">
                                            <label class="form-label small">Base URL</label>
                                            <input type="url" v-model="editProvider.base_url" class="form-control form-control-sm" required />
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label small">Auth Header Format</label>
                                            <input type="text" v-model="editProvider.auth_header" class="form-control form-control-sm" placeholder="e.g. Bearer {{API_KEY}}" />
                                        </div>
                                        <div class="d-flex gap-2">
                                            <button type="submit" class="btn btn-primary btn-sm">Save</button>
                                            <button type="button" @click="cancelEditProvider" class="btn btn-secondary btn-sm">Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <div class="card shadow-sm border-0 bg-body-tertiary">
                            <div class="card-body">
                                <h5 class="card-title">Add New Provider</h5>
                                <form @submit.prevent="submitProvider">
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >Provider Name</label
                                        >
                                        <input
                                            type="text"
                                            v-model="newProvider.name"
                                            class="form-control form-control-sm"
                                            required
                                        />
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >Base URL</label
                                        >
                                        <input
                                            type="url"
                                            v-model="newProvider.base_url"
                                            class="form-control form-control-sm"
                                            required
                                        />
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label small"
                                            >Auth Header Format</label
                                        >
                                        <input
                                            type="text"
                                            v-model="newProvider.auth_header"
                                            class="form-control form-control-sm"
                                            placeholder="e.g. Bearer {{API_KEY}}"
                                        />
                                        <div
                                            class="form-text"
                                            style="font-size: 0.75rem"
                                        >
                                            Use <code>{{ API_KEY }}</code> as a
                                            placeholder.
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        class="btn btn-primary btn-sm w-100"
                                    >
                                        Add Provider
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODELS TAB -->
            <div class="tab-pane fade" id="models-tab" role="tabpanel">
                <div class="row">
                    <div class="col-md-7">
                        <div class="list-group shadow-sm mb-4">
                            <div
                                v-for="mod in store.models"
                                :key="mod.id"
                                class="list-group-item p-3"
                            >
                                <!-- View Mode -->
                                <div v-if="editingModelId !== mod.id" class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1">
                                            {{ mod.name }}
                                            <span class="badge bg-secondary ms-2">{{ mod.type }}</span>
                                            <i v-if="mod.supports_vision" class="bi bi-eye ms-2 text-info" title="Supports Vision"></i>
                                        </h6>
                                        <small class="text-muted font-monospace">{{ mod.api_model_id }}</small>
                                    </div>
                                    <div class="d-flex gap-1">
                                        <button @click="startEditModel(mod)" class="btn btn-outline-secondary btn-sm" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button @click="store.deleteModel(mod.id)" class="btn btn-outline-danger btn-sm" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <!-- Edit Mode -->
                                <div v-else>
                                    <form @submit.prevent="saveModel(mod.id)">
                                        <div class="mb-2">
                                            <label class="form-label small">Display Name</label>
                                            <input type="text" v-model="editModel.name" class="form-control form-control-sm" placeholder="e.g. GPT-4 Turbo" />
                                        </div>
                                        <div class="mb-2">
                                            <label class="form-label small">API Model ID</label>
                                            <AutocompleteInput
                                                v-model="editModel.api_model_id"
                                                :options="modelSuggestions"
                                                placeholder="e.g. gpt-4-turbo"
                                                input-class="form-control-sm"
                                                @select="onEditModelSelect"
                                                @blur="onEditModelBlur"
                                            />
                                        </div>
                                        <div class="mb-2">
                                            <label class="form-label small">Capability Type</label>
                                            <select v-model="editModel.type" class="form-select form-select-sm">
                                                <option value="text">Text Generation</option>
                                                <option value="image">Image Generation</option>
                                                <option value="embedding">Embeddings</option>
                                            </select>
                                        </div>
                                        <div class="mb-2 form-check">
                                            <input type="checkbox" v-model="editModel.supports_vision" class="form-check-input" :id="'edit-vision-' + mod.id" />
                                            <label class="form-check-label small" :for="'edit-vision-' + mod.id">Supports Vision (Images)</label>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label small">Context Window</label>
                                            <input type="number" v-model="editModel.context_window" class="form-control form-control-sm" />
                                        </div>
                                        <div class="d-flex gap-2">
                                            <button type="submit" class="btn btn-primary btn-sm">Save</button>
                                            <button type="button" @click="cancelEditModel" class="btn btn-secondary btn-sm">Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <div class="card shadow-sm border-0 bg-body-tertiary">
                            <div class="card-body">
                                <h5 class="card-title">Add New Model</h5>
                                <form @submit.prevent="submitModel">
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >Provider</label
                                        >
                                        <select
                                            v-model="newModel.provider_id"
                                            class="form-select form-select-sm"
                                            required
                                            @change="fetchProviderModels($event.target.value)"
                                        >
                                            <option
                                                v-for="prov in store.providers"
                                                :key="prov.id"
                                                :value="prov.id"
                                            >
                                                {{ prov.name }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >Display Name</label
                                        >
                                        <input
                                            type="text"
                                            v-model="newModel.name"
                                            class="form-control form-control-sm"
                                            placeholder="e.g. GPT-4 Turbo"
                                        />
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >API Model ID</label
                                        >
                                        <AutocompleteInput
                                            v-model="newModel.api_model_id"
                                            :options="modelSuggestions"
                                            placeholder="e.g. gpt-4-turbo"
                                            input-class="form-control-sm"
                                            @select="onNewModelSelect"
                                            @blur="onNewModelBlur"
                                        />
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label small"
                                            >Capability Type</label
                                        >
                                        <select
                                            v-model="newModel.type"
                                            class="form-select form-select-sm"
                                        >
                                            <option value="text">
                                                Text Generation
                                            </option>
                                            <option value="image">
                                                Image Generation
                                            </option>
                                            <option value="embedding">
                                                Embeddings
                                            </option>
                                        </select>
                                    </div>
                                    <div class="mb-2 form-check">
                                        <input
                                            type="checkbox"
                                            v-model="newModel.supports_vision"
                                            class="form-check-input"
                                            id="visionCheck"
                                        />
                                        <label
                                            class="form-check-label small"
                                            for="visionCheck"
                                            >Supports Vision (Images)</label
                                        >
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label small"
                                            >Context Window</label
                                        >
                                        <input
                                            type="number"
                                            v-model="newModel.context_window"
                                            class="form-control form-control-sm"
                                            placeholder="e.g. 128000"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        class="btn btn-success btn-sm w-100"
                                    >
                                        Add Model
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useProvidersStore } from "../store/providers";
import { knownModelNames } from "../utils/knownModels.js";
import AutocompleteInput from "../components/common/AutocompleteInput.vue";
import { apiAdapter } from "../services/apiAdapter.js";

const store = useProvidersStore();

// Fetch models from provider API
const fetchedModels = ref([]);
const isLoadingModels = ref(false);

const fetchProviderModels = async (providerId) => {
    const provider = store.providers.find((p) => p.id === providerId);
    if (!provider) return;
    fetchedModels.value = [];
    isLoadingModels.value = true;
    try {
        console.log("[fetchProviderModels] Fetching models for:", provider.name, provider.base_url);
        fetchedModels.value = await apiAdapter.fetchModels(provider);
        console.log("[fetchProviderModels] Got models:", fetchedModels.value.length);
    } catch (e) {
        console.error("[fetchProviderModels] Error:", e);
        fetchedModels.value = [];
    } finally {
        isLoadingModels.value = false;
    }
};

// Merge known + fetched models for autocomplete
const modelSuggestions = ref(knownModelNames);
watch(fetchedModels, (list) => {
    const merged = new Set([...knownModelNames, ...list]);
    modelSuggestions.value = [...merged].sort();
});

// Auto-fetch when provider changes — moved after newModel/editModel declarations below

// Initialize Data if not loaded
onMounted(() => {
    if (!store.isLoaded) {
        store.initializeData();
    }
});

// Update API Key with debouncing (simple timeout)
let timeout = null;
const updateApiKey = (providerId, value) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        store.setApiKey(providerId, value);
    }, 500);
};

onUnmounted(() => {
    clearTimeout(timeout);
});

// Local form state for Providers
const newProvider = ref({
    name: "",
    base_url: "",
    auth_header: "Bearer {{API_KEY}}",
});

const submitProvider = () => {
    store.addProvider({ ...newProvider.value });
    newProvider.value = {
        name: "",
        base_url: "",
        auth_header: "Bearer {{API_KEY}}",
    };
};

// Provider edit state
const editingProviderId = ref(null);
const editProvider = ref({ name: "", base_url: "", auth_header: "" });

const startEditProvider = (prov) => {
    editingProviderId.value = prov.id;
    editProvider.value = { name: prov.name, base_url: prov.base_url, auth_header: prov.auth_header };
};

const cancelEditProvider = () => {
    editingProviderId.value = null;
    editProvider.value = { name: "", base_url: "", auth_header: "" };
};

const saveProvider = async (id) => {
    await store.updateProvider(id, { ...editProvider.value });
    cancelEditProvider();
};

// Local form state for Models
const newModel = ref({
    provider_id: "",
    name: "",
    api_model_id: "",
    type: "text",
    supports_vision: false,
    context_window: 8192,
});

const submitModel = () => {
    store.addModel({ ...newModel.value });
    newModel.value = {
        provider_id: "",
        name: "",
        api_model_id: "",
        type: "text",
        supports_vision: false,
        context_window: 8192,
    };
};

// Auto-fill Display Name from API Model ID (only on selection or blur)
const autoFillDisplayName = (target, val) => {
    if (!target.name && val) {
        target.name = val.toUpperCase().replace(/-/g, " ");
    }
};

const onNewModelSelect = (val) => autoFillDisplayName(newModel.value, val);
const onNewModelBlur = () => autoFillDisplayName(newModel.value, newModel.value.api_model_id);
const onEditModelSelect = (val) => autoFillDisplayName(editModel.value, val);
const onEditModelBlur = () => autoFillDisplayName(editModel.value, editModel.value.api_model_id);

// Model edit state
const editingModelId = ref(null);
const editModel = ref({ name: "", api_model_id: "", type: "text", supports_vision: false, context_window: 8192 });

const startEditModel = (mod) => {
    editingModelId.value = mod.id;
    editModel.value = { name: mod.name, api_model_id: mod.api_model_id, type: mod.type, supports_vision: mod.supports_vision, context_window: mod.context_window, provider_id: mod.provider_id };
    if (mod.provider_id) fetchProviderModels(mod.provider_id);
};

const cancelEditModel = () => {
    editingModelId.value = null;
    editModel.value = { name: "", api_model_id: "", type: "text", supports_vision: false, context_window: 8192 };
};

const saveModel = async (id) => {
    await store.updateModel(id, { ...editModel.value });
    cancelEditModel();
};

// (Models fetched via @change on provider select — see template)
</script>

<style scoped>
.max-w-custom {
    max-width: 900px;
    margin: 0 auto;
}
/* Ensure tab content has a bit of padding */
.tab-content {
    padding-top: 1rem;
}
</style>

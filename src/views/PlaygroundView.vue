<template>
    <div class="container-fluid h-100 d-flex flex-column px-0">
        <div class="row flex-grow-1 overflow-hidden m-0">
 <!-- MAIN CHAT AREA -->
 <div
 class="d-flex flex-column h-100 p-0 position-relative"
 :class="appState.rightSidebarCollapsed ? 'flex-grow-1' : 'col-md-9'"
 >
                <!-- Header -->
                <div
                    class="bg-body-secondary border-bottom p-3 d-flex justify-content-between align-items-center"
                >
                    <h5 class="m-0">
                        <i class="bi bi-chat-square-dots me-2"></i>Playground
                    </h5>
 <div class="d-flex align-items-center gap-2">
 <button
 class="btn btn-outline-secondary btn-sm"
 @click="appState.toggleRightSidebar"
 :title="appState.rightSidebarCollapsed ? 'Show configuration panel' : 'Hide configuration panel'"
 >
 <i class="bi" :class="appState.rightSidebarCollapsed ? 'bi-sliders' : 'bi-chevron-right'"></i>
 </button>
 <span
 v-if="isGenerating"
 class="spinner-grow spinner-grow-sm text-primary"
 role="status"
 ></span>
 <button
 class="btn btn-outline-danger btn-sm"
 @click="clearChat"
 :disabled="isGenerating"
 >
 <i class="bi bi-trash3"></i> Clear
 </button>
 </div>
                </div>

                <!-- Chat History -->
                <div class="flex-grow-1 overflow-auto p-4" ref="chatContainer">
                    <div
                        v-if="messages.length === 0"
                        class="h-100 d-flex flex-column align-items-center justify-content-center text-muted"
                    >
                        <i class="bi bi-robot fs-1 mb-3"></i>
                        <h4>Start a Conversation</h4>
                        <p>
                            Select a model from the right panel and send a
                            message.
                        </p>
                    </div>

                    <div
                        v-for="(msg, index) in messages"
                        :key="index"
                        class="mb-4 d-flex"
                        :class="
                            msg.role === 'user'
                                ? 'justify-content-end'
                                : 'justify-content-start'
                        "
                    >
                        <div
                            class="card border-0 shadow-sm"
                            :class="
                                msg.role === 'user'
                                    ? 'bg-primary text-white w-75'
                                    : 'bg-body-tertiary w-100'
                            "
                        >
                            <div class="card-body">
                                <div
                                    class="fw-bold mb-1 small d-flex align-items-center"
                                    :class="
                                        msg.role === 'user'
                                            ? 'text-white-50'
                                            : 'text-muted'
                                    "
                                >
                                    <i
                                        :class="
                                            msg.role === 'user'
                                                ? 'bi bi-person-fill me-1'
                                                : 'bi bi-cpu-fill me-1'
                                        "
                                    ></i>
                                    {{
                                        msg.role === "user"
                                            ? "You"
                                            : getModelName()
                                    }}
                                </div>
                                <!-- Render text with basic whitespace preservation -->
                                <!-- Render Markdown -->
                                <div
                                    class="markdown-body"
                                    v-html="
                                        msg.role === 'user'
                                            ? msg.content
                                            : renderMarkdown(msg.content)
                                    "
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="p-3 bg-body border-top">
                    <div class="input-group">
                        <button
                            class="btn btn-outline-secondary"
                            type="button"
                            title="Attach Image/File (Vision Models)"
                            @click="triggerFileInput"
                        >
                            <i class="bi bi-paperclip"></i>
                        </button>
                        <textarea
                            v-model="currentInput"
                            class="form-control resize-none"
                            rows="2"
                            placeholder="Type your prompt here... (Shift+Enter to send)"
                            @keydown.shift.enter.prevent="sendMessage"
                            :disabled="isGenerating || !selectedModelId"
                        >
                        </textarea>
                        <button
                            class="btn btn-primary"
                            type="button"
                            @click="sendMessage"
                            :disabled="
                                isGenerating ||
                                !currentInput.trim() ||
                                !selectedModelId
                            "
                        >
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </div>
                    <small
                        v-if="!selectedModelId"
                        class="text-danger mt-1 d-block"
                        >Please select a model from the right panel
                        first.</small
                    >
                    <!-- Hidden file input for future vision/document parsing feature -->
                    <input
                        type="file"
                        ref="fileInput"
                        class="d-none"
                        @change="handleFileUpload"
                    />
                </div>
            </div>

 <!-- RIGHT SIDEBAR (Parameters) -->
 <div
 class="right-sidebar bg-body-tertiary border-start p-3 overflow-auto h-100"
 :class="{ 'right-sidebar-collapsed': appState.rightSidebarCollapsed }"
 >
                <h6 class="mb-3 text-uppercase text-muted small fw-bold">
                    Configuration
                </h6>

                <!-- Model Selection -->
                <div class="mb-4">
                    <label class="form-label small fw-bold">Select Model</label>
                    <select
                        v-model="selectedModelId"
                        class="form-select form-select-sm"
                    >
                        <option disabled value="">Choose a model...</option>
                        <optgroup
                            v-for="prov in providersStore.providers"
                            :key="prov.id"
                            :label="prov.name"
                        >
                            <option
                                v-for="mod in getModelsForProvider(prov.id)"
                                :key="mod.id"
                                :value="mod.id"
                            >
                                {{ mod.name }}
                            </option>
                        </optgroup>
                    </select>
                </div>

                <!-- System Prompt -->
                <div class="mb-4">
                    <label class="form-label small fw-bold"
                        >System Prompt</label
                    >
                    <textarea
                        v-model="params.systemPrompt"
                        class="form-control form-control-sm"
                        rows="4"
                        placeholder="You are a helpful assistant..."
                    ></textarea>
                </div>

                <!-- Parameters -->
                <div class="mb-3">
                    <label
                        class="form-label small fw-bold d-flex justify-content-between"
                    >
                        Temperature <span>{{ params.temperature }}</span>
                    </label>
                    <input
                        type="range"
                        class="form-range"
                        min="0"
                        max="2"
                        step="0.1"
                        v-model.number="params.temperature"
                    />
                    <div
                        class="d-flex justify-content-between text-muted"
                        style="font-size: 0.7rem"
                    >
                        <span>Precise</span>
                        <span>Creative</span>
                    </div>
                </div>

                <div class="mb-3">
                    <label
                        class="form-label small fw-bold d-flex justify-content-between"
                    >
                        Max Tokens <span>{{ params.maxTokens }}</span>
                    </label>
                    <input
                        type="range"
                        class="form-range"
                        min="256"
                        max="8192"
                        step="256"
                        v-model.number="params.maxTokens"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { renderMarkdown } from "../utils/markdown";
import { ref, onMounted, nextTick } from "vue";
import { useProvidersStore } from "../store/providers";
import { useAppStateStore } from "../store/appState";
import { apiAdapter } from "../services/apiAdapter";

const providersStore = useProvidersStore();
const appState = useAppStateStore();

// State
const selectedModelId = ref("");
const currentInput = ref("");
const messages = ref([]);
const isGenerating = ref(false);
const chatContainer = ref(null);
const fileInput = ref(null);

const params = ref({
    systemPrompt: "You are a helpful, smart, and concise AI assistant.",
    temperature: 0.7,
    maxTokens: 2048,
});

// Initialization
onMounted(async () => {
    if (!providersStore.isLoaded) {
        await providersStore.initializeData();
    }
    // Auto-select first available text model if none selected
    const textModels = providersStore.models.filter((m) => m.type === "text");
    if (textModels.length > 0) {
        selectedModelId.value = textModels[0].id;
    }
});

// Helpers
const getModelsForProvider = (providerId) => {
    return providersStore.models.filter(
        (m) => m.provider_id === providerId && m.type === "text",
    );
};

const getModelName = () => {
    const model = providersStore.models.find(
        (m) => m.id === selectedModelId.value,
    );
    return model ? model.name : "AI";
};

const scrollToBottom = async () => {
    await nextTick();
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
};

const clearChat = () => {
    messages.value = [];
};

// Logic: Send & Stream
const sendMessage = async () => {
    if (
        !currentInput.value.trim() ||
        !selectedModelId.value ||
        isGenerating.value
    )
        return;

    // 1. Add User Message
    messages.value.push({ role: "user", content: currentInput.value.trim() });
    currentInput.value = "";
    scrollToBottom();

    // 2. Prep Assistant Message Shell
    isGenerating.value = true;
    const assistantMsgIndex = messages.value.length;
    messages.value.push({ role: "assistant", content: "" });

    // 3. Call API Adapter with Streaming Callbacks
    await apiAdapter.generateStream({
        modelId: selectedModelId.value,
        messages: messages.value.slice(0, -1), // Send all but the empty assistant shell
        systemPrompt: params.value.systemPrompt,
        params: params.value,
        onChunk: (text) => {
            messages.value[assistantMsgIndex].content += text;
            scrollToBottom();
        },
        onDone: () => {
            isGenerating.value = false;
        },
        onError: (errMessage) => {
            messages.value[assistantMsgIndex].content +=
                `\n\n[Error: ${errMessage}]`;
            isGenerating.value = false;
            scrollToBottom();
        },
    });
};

// File Upload Placeholder (For vision models/document text extraction)
const triggerFileInput = () => {
    fileInput.value.click();
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Future implementation: Read file as base64 for images or text extraction
    alert(
        `File ${file.name} attached! (Vision/File parsing implementation pending)`,
    );
    event.target.value = ""; // Reset
};
</script>

<style scoped>
.resize-none {
 resize: none;
}

.right-sidebar {
 width: 25%;
 min-width: 260px;
 max-width: 360px;
 flex-shrink: 0;
 transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
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

@media (max-width: 767.98px) {
 .right-sidebar {
  min-width: 100%;
  max-width: 100%;
 }
}
</style>

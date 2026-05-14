# LM Playground

## 1. Project Overview
LMPlayground Playground is a flexible, highly customizable, serverless web application designed for prompt engineers, developers, and AI enthusiasts. It allows users to test, compare, and manage multiple Large Language Models (LLMs) and generative AI APIs from various providers (OpenAI, Anthropic, Google, local models like Ollama, etc.) in a single unified interface.

### Tech Stack
*   **Frontend Framework:** Vue 3 (Composition API)
*   **Build Tool:** Vite
*   **Styling:** Bootstrap 5 (via CDN or npm), plain vanilla CSS (no SCSS/SASS)
*   **Language:** JavaScript (ES6+), strict avoidance of TypeScript.
*   **State Management:** Pinia (Standard for Vue 3)
*   **Routing:** Vue Router
*   **Backend/API:** Netlify Serverless Functions (Node.js)
*   **Database/Storage:** Dual-mode (LocalStorage by default OR PostgreSQL via environment variables)

---

## 2. Core Features

### A. The Unified Playground
*   **Text Generation (Chat):** Standard chat interface supporting system prompts, temperature tuning, max tokens, and custom stop sequences.
*   **Image Generation:** UI for prompt-to-image models (e.g., DALL-E, Midjourney/API, Stable Diffusion). Displays image grid with download options.
*   **Vision & File Parsing:** Drag-and-drop zone for files/images. Parses documents into text or sends images directly to vision-capable models (e.g., GPT-4o, Claude 3.5 Sonnet).
*   **Embeddings Viewer:** A tool to input text, generate vector embeddings, and visualize the array data, calculating cosine similarity between two inputs.

### B. The Arena (Latency & Output Comparison)
*   **Side-by-Side Testing:** Select up to 4 models simultaneously.
*   **Universal Prompting:** Send a single prompt/file to all selected models at once.
*   **Metrics Dashboard:** Real-time display of:
    *   **TTFB (Time to First Byte):** Crucial for streaming text.
    *   **Total Latency:** Time taken to complete the generation.
    *   **Token Speed:** Tokens per second.
    *   **Cost Estimate:** Calculated based on input/output tokens (if pricing is provided).

### C. Model & Provider Catalog
*   **Dynamic Grid:** A searchable, filterable grid of all configured models (Filter by: Text, Vision, Image, Embedding, Provider).
*   **Details Panel:** Clicking a model shows its context window, capabilities, API endpoint, and latency history.

### D. Configuration & Flexibility Hub
*   **Zero Hardcoding:** Providers and models are treated as JSON objects.
*   **Add Custom Providers:** UI form to define a new provider (Name, Base URL, Auth Header Format).
*   **Add Custom Models:** UI form to link a model ID to a provider, define its capabilities, and set its parameter limits.
*   **API Key Management:** A secure modal to input API keys per provider.

---

## 3. Data Architecture & Storage Strategy

The app will use a "Storage Adapter" pattern. On initialization, the app checks the `.env` file. If a PostgreSQL connection string exists, it routes CRUD operations to Netlify Functions -> PostgreSQL. Otherwise, it uses the browser's `localStorage`.

### Data Entities (JSON Structures)
1.  **Providers:** `id`, `name`, `base_url`, `auth_type` (e.g., Bearer, x-api-key), `api_key` (encrypted or stored safely).
2.  **Models:** `id`, `provider_id`, `model_name` (e.g., `gpt-4o`), `type` (text, image, embedding), `supports_vision` (boolean), `context_window`.
3.  **Chat/History:** `id`, `session_id`, `model_id`, `role` (user/assistant), `content`, `timestamp`, `metrics` (latency, tokens).

---

## 4. UI/UX Layout (Bootstrap 5)

*   **Global Sidebar (Collapsible):**
    *   Playground (Chat / Image / Embeddings)
    *   The Arena (Comparison)
    *   Model Catalog
    *   Settings & API Keys
*   **Top Navbar:**
    *   Current Storage Mode Indicator (🟢 LocalStorage | 🔵 PostgreSQL)
    *   Theme Toggle (Dark/Light mode using Bootstrap 5 native data-bs-theme).
*   **Main Content Area:**
    *   Uses Bootstrap's Grid system (`container-fluid`, `row`, `col`) for responsive pane layouts.
    *   Uses Bootstrap Cards for model displays and chat bubbles.
    *   Offcanvas components for tweaking advanced model parameters (Temperature, Top-P) without cluttering the screen.

---

## 5. Project Directory Structure

```text
omni-model-playground/
│
├── netlify/
│   └── functions/              # Netlify Serverless API endpoints
│       ├── proxy.js            # Universal API proxy to bypass CORS
│       ├── db-provider.js      # Postgres CRUD for Providers
│       └── db-history.js       # Postgres CRUD for Chat History
│
├── public/
│   ├── favicon.ico
│   └── default-catalog.json    # Initial fallback data for providers/models
│
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   └── main.css        # Plain CSS for overrides (scrollbars, animations)
│   │   └── images/
│   │
│   ├── components/             # Reusable Vue components
│   │   ├── chat/
│   │   │   ├── ChatBubble.vue
│   │   │   └── FileUpload.vue
│   │   ├── arena/
│   │   │   └── ComparisonColumn.vue
│   │   ├── catalog/
│   │   │   └── ModelCard.vue
│   │   ├── settings/
│   │   │   └── ProviderForm.vue
│   │   └── common/
│   │       ├── Sidebar.vue
│   │       ├── Navbar.vue
│   │       └── Loader.vue
│   │
│   ├── router/
│   │   └── index.js            # Vue Router configuration
│   │
│   ├── store/
│   │   ├── appState.js         # Pinia: Theme, Storage Mode
│   │   ├── providers.js        # Pinia: Provider & Model data
│   │   └── chat.js             # Pinia: Active chat sessions
│   │
│   ├── services/               # Logic decoupled from UI
│   │   ├── storageService.js   # Logic to route to LocalStorage OR Postgres
│   │   ├── apiAdapter.js       # Normalizes requests for OpenAI, Claude, etc.
│   │   └── metrics.js          # Calculates latency and TTFB
│   │
│   ├── views/                  # Page-level components
│   │   ├── PlaygroundView.vue
│   │   ├── ArenaView.vue
│   │   ├── CatalogView.vue
│   │   └── SettingsView.vue
│   │
│   ├── App.vue                 # Root component
│   └── main.js                 # App mounting, Bootstrap JS import
│
├── .env                        # Vite ENV vars (DB connection, Netlify URLs)
├── index.html                  # Entry HTML (Bootstrap CSS CDN inclusion here)
├── package.json
├── netlify.toml                # Netlify deployment rules & redirects
└── vite.config.js
```

---

## 6. API Proxy & Security Strategy (Netlify Functions)

Directly calling AI APIs from the browser often results in CORS (Cross-Origin Resource Sharing) errors, and exposes API keys in browser network tabs. 

**The Solution:**
The Vue app will send a generalized payload to a Netlify function (e.g., `/api/proxy`). 
The Netlify function will:
1. Receive the payload (Model ID, Provider details, Prompt).
2. Fetch the corresponding API Key (from the DB or passed securely via the request header if stored locally).
3. Transform the payload into the specific format required by the provider (e.g., Anthropic's `messages` vs OpenAI's `messages`).
4. Make the server-to-server HTTP request.
5. Stream the response back to the Vue frontend, measuring TTFB along the way.

---

## 7. Execution & Phased Development Plan (For our next steps)

When we are ready to code, we will follow this phased approach:

*   **Phase 1: Foundation & State**
    *   Scaffold Vite + Vue + Bootstrap + Vue Router.
    *   Build the `storageService.js` to handle the dual database/localstorage logic.
    *   Setup Pinia stores and load the `default-catalog.json`.
*   **Phase 2: Configuration & Settings UI**
    *   Build the Settings view.
    *   Create forms to dynamically add/edit Providers, Models, and save API keys.
*   **Phase 3: The Netlify Proxy & Adapters**
    *   Write the Node.js serverless functions.
    *   Implement Server-Sent Events (SSE) for text streaming.
*   **Phase 4: The Playground**
    *   Build the Chat UI and File Upload handling.
    *   Integrate Image generation and Embedding UI.
*   **Phase 5: The Arena (Comparison)**
    *   Build the split-screen UI.
    *   Implement the `metrics.js` service to capture latency, TTFB, and token speed.

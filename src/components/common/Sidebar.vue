<template>
    <aside
        class="bg-body-secondary d-flex flex-column p-3 border-end"
        style="width: 260px; transition: all 0.3s"
    >
        <a
            href="/"
            class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none text-body"
        >
            <i class="bi bi-cpu fs-3 me-2 text-primary"></i>
            <span class="fs-5 fw-bold">LMPlayground</span>
        </a>
        <hr />

        <ul class="nav nav-pills flex-column mb-auto gap-1">
            <li class="nav-item">
                <router-link
                    to="/"
                    class="nav-link text-body d-flex align-items-center"
                    active-class="active"
                >
                    <i class="bi bi-chat-square-dots me-3"></i>
                    Playground
                </router-link>
            </li>
            <li>
                <router-link
                    to="/arena"
                    class="nav-link text-body d-flex align-items-center"
                    active-class="active"
                >
                    <i class="bi bi-layout-split me-3"></i>
                    The Arena
                </router-link>
            </li>
            <li>
                <router-link
                    to="/catalog"
                    class="nav-link text-body d-flex align-items-center"
                    active-class="active"
                >
                    <i class="bi bi-grid me-3"></i>
                    Model Catalog
                </router-link>
            </li>
            <li>
                <router-link
                    to="/settings"
                    class="nav-link text-body d-flex align-items-center"
                    active-class="active"
                >
                    <i class="bi bi-gear me-3"></i>
                    Settings & Keys
                </router-link>
            </li>
        </ul>

        <hr />
        <div class="small text-muted text-center">v1.0.0 Serverless</div>
    </aside>
</template>

<script setup>
// Sidebar logic here (e.g. collapse state for mobile later)
</script>

<template>
    <div class="autocomplete-wrapper position-relative">
        <input
            type="text"
            :value="modelValue"
            @input="onInput"
            @focus="showDropdown = true"
            @blur="onBlur"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.enter.prevent="selectCurrent"
            @keydown.esc="showDropdown = false"
            :placeholder="placeholder"
            :class="['form-control', inputClass]"
            ref="inputEl"
        />
        <ul
            v-if="showDropdown && filteredOptions.length > 0"
            class="autocomplete-dropdown list-group position-absolute w-100"
        >
            <li
                v-for="(option, index) in filteredOptions"
                :key="option"
                class="list-group-item list-group-item-action py-2 px-3"
                :class="{ 'active': index === selectedIndex }"
                @mousedown.prevent="selectOption(option)"
                @mouseenter="selectedIndex = index"
            >
                <small>{{ option }}</small>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";

const props = defineProps({
    modelValue: { type: String, default: "" },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
    inputClass: { type: String, default: "" },
    minChars: { type: Number, default: 1 },
});

const emit = defineEmits(["update:modelValue", "select", "blur"]);

const showDropdown = ref(false);
const selectedIndex = ref(-1);
const inputEl = ref(null);

const filteredOptions = computed(() => {
    const val = props.modelValue.toLowerCase();
    if (!val || val.length < props.minChars) return [];
    return props.options.filter((opt) =>
        opt.toLowerCase().includes(val)
    ).slice(0, 10);
});

watch(() => props.modelValue, () => {
    selectedIndex.value = -1;
});

const onInput = (e) => {
    emit("update:modelValue", e.target.value);
    showDropdown.value = true;
};

const onBlur = () => {
    setTimeout(() => {
        showDropdown.value = false;
    }, 150);
    emit("blur");
};

const moveSelection = (dir) => {
    const len = filteredOptions.value.length;
    if (len === 0) return;
    selectedIndex.value = (selectedIndex.value + dir + len) % len;
};

const selectCurrent = () => {
    if (selectedIndex.value >= 0 && selectedIndex.value < filteredOptions.value.length) {
        selectOption(filteredOptions.value[selectedIndex.value]);
    }
};

const selectOption = (option) => {
    emit("update:modelValue", option);
    emit("select", option);
    showDropdown.value = false;
    selectedIndex.value = -1;
};
</script>

<style scoped>
.autocomplete-dropdown {
    z-index: 1050;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--bs-border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.autocomplete-dropdown .list-group-item.active {
    background-color: var(--bs-primary);
    border-color: var(--bs-primary);
    color: #fff;
}
</style>

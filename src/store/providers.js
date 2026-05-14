import { defineStore } from "pinia";
import { ref } from "vue";
import { storageService } from "../services/storageService";

export const useProvidersStore = defineStore("providers", () => {
  const providers = ref([]);
  const models = ref([]);
  const apiKeys = ref({});
  const isLoaded = ref(false);

  const initializeData = async () => {
    let provData = await storageService.loadData("providers");
    let modData = await storageService.loadData("models");

    // If absolutely empty, load defaults
    if (provData.length === 0) {
      try {
        const res = await fetch("/default-catalog.json");
        const defaults = await res.json();
        provData = defaults.providers;
        modData = defaults.models;
        await storageService.saveData("providers", provData);
        await storageService.saveData("models", modData);
      } catch (e) {
        console.error("Failed to load defaults", e);
      }
    }

    providers.value = provData;
    models.value = modData;
    apiKeys.value = storageService.getApiKeys();
    isLoaded.value = true;
  };

  const addProvider = async (provider) => {
    provider.id = `prov_${Date.now()}`;
    providers.value.push(provider);
    await storageService.saveData("providers", providers.value);
  };

  const deleteProvider = async (id) => {
    providers.value = providers.value.filter((p) => p.id !== id);
    // Cascade delete models tied to this provider
    models.value = models.value.filter((m) => m.provider_id !== id);
    await storageService.saveData("providers", providers.value);
    await storageService.saveData("models", models.value);
  };

  const addModel = async (model) => {
    model.id = `mod_${Date.now()}`;
    models.value.push(model);
    await storageService.saveData("models", models.value);
  };

  const deleteModel = async (id) => {
    models.value = models.value.filter((m) => m.id !== id);
    await storageService.saveData("models", models.value);
  };

  const setApiKey = (providerId, key) => {
    apiKeys.value[providerId] = key;
    storageService.saveApiKeys(apiKeys.value);
  };

  return {
    providers,
    models,
    apiKeys,
    isLoaded,
    initializeData,
    addProvider,
    deleteProvider,
    addModel,
    deleteModel,
    setApiKey,
  };
});

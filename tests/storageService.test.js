// tests/storageService.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock appState store before importing storageService
vi.mock("../src/store/appState.js", () => ({
  useAppStateStore: () => ({
    storageMode: "local",
  }),
}));

import { storageService } from "../src/services/storageService.js";

describe("storageService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save and load data from localStorage", async () => {
    const data = [{ id: "1", name: "test" }];
    await storageService.saveData("providers", data);
    const loaded = await storageService.loadData("providers");
    expect(loaded).toEqual(data);
  });

  it("should return empty array for missing table", async () => {
    const loaded = await storageService.loadData("nonexistent");
    expect(loaded).toEqual([]);
  });

  it("should handle localStorage quota exceeded gracefully", async () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };

    // Should not throw
    await expect(
      storageService.saveData("providers", [{ id: "1" }])
    ).resolves.toBeUndefined();

    localStorageMock.setItem = originalSetItem;
  });

  it("should handle quota exceeded in saveChatMessage", async () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };

    await expect(
      storageService.saveChatMessage("sess_1", { role: "user", content: "hi" })
    ).resolves.toBeUndefined();

    localStorageMock.setItem = originalSetItem;
  });

  it("should handle quota exceeded in saveApiKeys", () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    };

    expect(() => storageService.saveApiKeys({ openai: "key" })).not.toThrow();

    localStorageMock.setItem = originalSetItem;
  });

  it("should save and load API keys", () => {
    storageService.saveApiKeys({ openai: "test-key", anthropic: "test-key2" });
    const keys = storageService.getApiKeys();
    expect(keys).toEqual({ openai: "test-key", anthropic: "test-key2" });
  });

  it("should return empty object for missing API keys", () => {
    const keys = storageService.getApiKeys();
    expect(keys).toEqual({});
  });
});

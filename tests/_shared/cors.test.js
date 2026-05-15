// tests/_shared/cors.test.js
import { describe, it, expect } from "vitest";

// Dynamic import for CJS module
const { HEADERS } = await import("../../netlify/functions/_shared/cors.js");

describe("_shared/cors", () => {
  it("should export HEADERS object", () => {
    expect(HEADERS).toBeDefined();
    expect(typeof HEADERS).toBe("object");
  });

  it("should include Access-Control-Allow-Origin", () => {
    expect(HEADERS["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("should include Access-Control-Allow-Methods", () => {
    expect(HEADERS["Access-Control-Allow-Methods"]).toBeDefined();
  });

  it("should include Access-Control-Allow-Headers", () => {
    expect(HEADERS["Access-Control-Allow-Headers"]).toBeDefined();
  });
});

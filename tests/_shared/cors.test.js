// tests/_shared/cors.test.js
import { describe, it, expect } from "vitest";

// Dynamic import for CJS module
const { HEADERS } = await import("../netlify/functions/_shared/cors.js");

describe("_shared/cors", () => {
  it("should export HEADERS with required CORS fields", () => {
    expect(HEADERS).toBeDefined();
    expect(HEADERS["Access-Control-Allow-Origin"]).toBe("*");
    expect(HEADERS["Access-Control-Allow-Headers"]).toContain("Content-Type");
    expect(HEADERS["Access-Control-Allow-Headers"]).toContain("Authorization");
    expect(HEADERS["Access-Control-Allow-Headers"]).toContain("x-api-key");
    expect(HEADERS["Access-Control-Allow-Methods"]).toContain("GET");
    expect(HEADERS["Access-Control-Allow-Methods"]).toContain("POST");
    expect(HEADERS["Access-Control-Allow-Methods"]).toContain("PUT");
    expect(HEADERS["Access-Control-Allow-Methods"]).toContain("DELETE");
    expect(HEADERS["Access-Control-Allow-Methods"]).toContain("OPTIONS");
  });
});

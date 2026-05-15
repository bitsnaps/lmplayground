// tests/proxy.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockQuery = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => ({
  Client: vi.fn(() => ({
    connect: mockConnect,
    query: mockQuery,
    end: mockEnd,
  })),
}));

const { handler } = await import("../netlify/functions/proxy.js");

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("proxy function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("OK");
  });

  it("should reject requests with body exceeding 10MB", async () => {
    const hugeBody = "x".repeat(10 * 1024 * 1024 + 1);
    const res = await handler({ httpMethod: "POST", body: hugeBody });
    expect(res.statusCode).toBe(413);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("too large");
  });

  it("should reject requests missing providerUrl", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ payload: { model: "gpt-4" } }),
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Missing providerUrl");
  });

  it("should reject requests missing payload", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ providerUrl: "https://api.openai.com" }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should forward request to provider and return response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue("application/json") },
      text: vi.fn().mockResolvedValue('{"id":"test"}'),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4", messages: [] },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        clientApiKey: "sk-test123",
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test123",
        }),
      }),
    );
  });

  it("should replace {{API_KEY}} placeholder in headers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue("application/json") },
      text: vi.fn().mockResolvedValue('{"id":"test"}'),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4" },
        headers: {
          Authorization: "Bearer {{API_KEY}}",
          "x-api-key": "{{API_KEY}}",
        },
        clientApiKey: "sk-abc",
      }),
    });

    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer sk-abc");
    expect(callArgs.headers["x-api-key"]).toBe("sk-abc");
  });

  it("should fetch API key from database when clientApiKey is empty", async () => {
    mockQuery.mockResolvedValue({ rows: [{ api_key: "sk-from-db" }] });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue("application/json") },
      text: vi.fn().mockResolvedValue('{"id":"test"}'),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4" },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        providerId: "prov_openai",
        clientApiKey: "",
      }),
    });

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT api_key"),
      ["prov_openai"],
    );

    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer sk-from-db");
  });

  it("should return provider error when upstream fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("Rate limited"),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4" },
        headers: {},
        clientApiKey: "sk-test",
      }),
    });

    expect(res.statusCode).toBe(429);
  });

  it("should handle JSON parse errors gracefully", async () => {
    const res = await handler({ httpMethod: "POST", body: "not valid json{{{ " });
    expect(res.statusCode).toBe(500);
  });

  it("should set Content-Type header when not provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue("application/json") },
      text: vi.fn().mockResolvedValue('{"id":"test"}'),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4" },
        headers: {},
        clientApiKey: "sk-test",
      }),
    });

    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers["Content-Type"]).toBe("application/json");
  });
});

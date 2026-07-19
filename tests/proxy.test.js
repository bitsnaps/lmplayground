// tests/proxy.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

vi.mock("../netlify/functions/_shared/db.js", () => ({
  createClient: () => Promise.resolve(mockClient),
  checkDbUrl: () => null,
}));

const { handler } = await import("../netlify/functions/proxy.js");

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  process.env.DATABASE_URL = "postgres://test";
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  delete process.env.DATABASE_URL;
  vi.restoreAllMocks();
});

describe("proxy function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should reject requests with body exceeding 10MB", async () => {
    const bigBody = "x".repeat(10 * 1024 * 1024 + 1);
    const res = await handler({ httpMethod: "POST", body: bigBody });
    expect(res.statusCode).toBe(413);
  });

  it("should reject requests missing providerUrl", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ payload: { prompt: "hi" } }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject requests missing payload", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should forward request to provider and return response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([["content-type", ["application/json"]]]),
      text: () => Promise.resolve(JSON.stringify({ choices: [] })),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/chat/completions",
        payload: { model: "gpt-4", messages: [] },
        headers: { "x-auth-format": "Bearer {{API_KEY}}" },
        clientApiKey: "sk-test-key",
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should replace {{API_KEY}} placeholder in headers", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([["content-type", ["application/json"]]]),
      text: () => Promise.resolve(JSON.stringify({ data: "ok" })),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1",
        payload: {},
        headers: { "x-auth-format": "Bearer {{API_KEY}}" },
        clientApiKey: "sk-my-key",
      }),
    });

    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer sk-my-key");
  });

  it("should fetch API key from database when clientApiKey is empty", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ api_key: "sk-db-key" }] });

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([["content-type", ["application/json"]]]),
      text: () => Promise.resolve(JSON.stringify({ data: "ok" })),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1",
        payload: {},
        headers: { "x-auth-format": "Bearer {{API_KEY}}" },
        clientApiKey: "",
        providerId: "prov_1",
      }),
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT api_key"),
      ["prov_1"],
    );
    expect(mockEnd).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer sk-db-key");
  });

  it("should return provider error when upstream fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1",
        payload: {},
        headers: {},
        clientApiKey: "sk-key",
      }),
    });

    expect(res.statusCode).toBe(429);
  });

  it("should handle JSON parse errors gracefully", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: "not valid json{{{ ",
    });
    expect(res.statusCode).toBe(500);
  });

  it("should reject localhost URLs (SSRF protection)", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "http://localhost:8080/api",
        payload: {},
      }),
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/not allowed/i);
  });

  it("should reject private IPv4 addresses (SSRF protection)", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "http://192.168.1.1/api",
        payload: {},
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject cloud metadata endpoint (SSRF protection)", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "http://169.254.169.254/latest/meta-data",
        payload: {},
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject non-http protocols (SSRF protection)", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "file:///etc/passwd",
        payload: {},
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject 127.x addresses (SSRF protection)", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "http://127.0.0.1:3000/api",
        payload: {},
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should set Content-Type header when not provided", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([["content-type", ["application/json"]]]),
      text: () => Promise.resolve(JSON.stringify({ data: "ok" })),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1",
        payload: {},
        headers: {},
        clientApiKey: "sk-key",
      }),
    });

    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers["Content-Type"]).toBe("application/json");
  });
});

// tests/image-gen.test.js
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

const { handler } = await import("../netlify/functions/image-gen.js");

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("image-gen function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should reject non-POST methods", async () => {
    const res = await handler({ httpMethod: "GET" });
    expect(res.statusCode).toBe(405);
  });

  it("should reject requests missing providerUrl", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ payload: { prompt: "cat" } }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject body exceeding 5MB", async () => {
    const hugeBody = "x".repeat(5 * 1024 * 1024 + 1);
    const res = await handler({ httpMethod: "POST", body: hugeBody });
    expect(res.statusCode).toBe(413);
  });

  it("should proxy image generation request and return result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: [{ url: "https://cdn.openai.com/image.png" }],
      }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/images/generations",
        payload: { prompt: "a cat", size: "1024x1024" },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        clientApiKey: "sk-test",
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.data[0].url).toBe("https://cdn.openai.com/image.png");
  });

  it("should return provider error on upstream failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: { message: "Invalid API key" } }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/images/generations",
        payload: { prompt: "a cat" },
        headers: {},
        clientApiKey: "bad-key",
      }),
    });

    expect(res.statusCode).toBe(401);
  });

  it("should handle JSON parse errors", async () => {
    const res = await handler({ httpMethod: "POST", body: "not json" });
    expect(res.statusCode).toBe(500);
  });

  it("should fetch API key from database if clientApiKey is empty", async () => {
    mockQuery.mockResolvedValue({ rows: [{ api_key: "sk-db-key" }] });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [{ url: "img.png" }] }),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/images/generations",
        payload: { prompt: "a cat" },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        providerId: "prov_openai",
        clientApiKey: "",
      }),
    });

    expect(mockConnect).toHaveBeenCalled();
    const callArgs = globalThis.fetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer sk-db-key");
  });
});

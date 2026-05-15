// tests/embeddings.test.js
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

const { handler } = await import("../netlify/functions/embeddings.js");

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("embeddings function", () => {
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
      body: JSON.stringify({ payload: { input: "hello" } }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("should proxy embeddings request and return result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2, 0.3], index: 0 },
          { embedding: [0.4, 0.5, 0.6], index: 1 },
        ],
      }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { model: "text-embedding-3-small", input: ["hello", "world"] },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        clientApiKey: "sk-test",
        compareEmbeddings: true,
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.data.length).toBe(2);
  });

  it("should compute cosine similarity when compareEmbeddings=true with 2 vectors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: [
          { embedding: [1, 0, 0], index: 0 },
          { embedding: [1, 0, 0], index: 1 },
        ],
      }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { model: "text-embedding-3-small", input: ["a", "b"] },
        headers: {},
        clientApiKey: "sk-test",
        compareEmbeddings: true,
      }),
    });

    const body = JSON.parse(res.body);
    expect(body.data.cosine_similarity).toBeCloseTo(1.0);
  });

  it("should compute cosine similarity for orthogonal vectors as 0", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: [
          { embedding: [1, 0, 0], index: 0 },
          { embedding: [0, 1, 0], index: 1 },
        ],
      }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { model: "text-embedding-3-small", input: ["a", "b"] },
        headers: {},
        clientApiKey: "sk-test",
        compareEmbeddings: true,
      }),
    });

    const body = JSON.parse(res.body);
    expect(body.data.cosine_similarity).toBeCloseTo(0.0);
  });

  it("should not compute cosine similarity when compareEmbeddings is false", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2], index: 0 },
          { embedding: [0.3, 0.4], index: 1 },
        ],
      }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { model: "text-embedding-3-small", input: ["a", "b"] },
        headers: {},
        clientApiKey: "sk-test",
        compareEmbeddings: false,
      }),
    });

    const body = JSON.parse(res.body);
    expect(body.data.cosine_similarity).toBeUndefined();
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
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { model: "text-embedding-3-small", input: "hello" },
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
});

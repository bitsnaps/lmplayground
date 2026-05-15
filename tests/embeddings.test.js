// tests/embeddings.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

vi.mock("../netlify/functions/_shared/db.js", () => ({
  createClient: () => Promise.resolve(mockClient),
  checkDbUrl: () => null,
}));

const { handler } = await import("../netlify/functions/embeddings.js");

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
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.openai.com/v1/embeddings",
        payload: { input: "hello", model: "text-embedding-3-small" },
        headers: { Authorization: "Bearer {{API_KEY}}" },
        clientApiKey: "sk-test",
      }),
    });

    expect(res.statusCode).toBe(200);
  });

  it("should compute cosine similarity when compareEmbeddings is true", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [{ embedding: [1, 0, 0] }, { embedding: [0, 1, 0] }],
        }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1/embeddings",
        payload: {},
        headers: {},
        clientApiKey: "sk-test",
        compareEmbeddings: true,
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.cosine_similarity).toBe(0);
  });

  it("should return provider error on upstream failure", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: { message: "Invalid key" } }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1/embeddings",
        payload: {},
        headers: {},
        clientApiKey: "bad-key",
      }),
    });

    expect(res.statusCode).toBe(401);
  });

  it("should fetch API key from database if clientApiKey is empty", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ api_key: "sk-db-key" }] });

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ embedding: [0.1] }] }),
    });

    await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1/embeddings",
        payload: { input: "test" },
        headers: { Authorization: "Bearer {{API_KEY}}" },
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

  it("should handle JSON parse errors", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: "not json",
    });
    expect(res.statusCode).toBe(500);
  });

  it("should return null cosine similarity for mismatched vector lengths", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [{ embedding: [1, 0] }, { embedding: [0, 1, 0] }],
        }),
    });

    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        providerUrl: "https://api.test.com/v1/embeddings",
        payload: {},
        headers: {},
        clientApiKey: "sk-test",
        compareEmbeddings: true,
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.cosine_similarity).toBeNull();
  });
});

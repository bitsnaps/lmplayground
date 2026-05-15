// tests/db-history.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { handler } = await import("../netlify/functions/db-history.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});

describe("db-history function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should return 501 when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(501);
  });

  it("should GET messages for a specific session", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { session_id: "sess_1", role: "user", content: "Hello" },
        { session_id: "sess_1", role: "assistant", content: "Hi there" },
      ],
    });
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: { session_id: "sess_1" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(2);
  });

  it("should GET all sessions when no session_id provided", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ session_id: "sess_1", last_active: "2025-01-01" }],
    });
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("GROUP BY session_id"),
    );
  });

  it("should POST a new chat message", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { id: 1, session_id: "sess_1", model_id: "gpt-4", role: "user", content: "Hello", metrics: {} },
      ],
    });
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        session_id: "sess_1",
        model_id: "gpt-4",
        role: "user",
        content: "Hello",
        metrics: {},
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data[0].content).toBe("Hello");
  });

  it("should reject POST with missing required fields", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ session_id: "sess_1" }),
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Missing required fields");
  });

  it("should DELETE all messages for a session", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
    const res = await handler({
      httpMethod: "DELETE",
      queryStringParameters: { session_id: "sess_1" },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM chat_history WHERE session_id"),
      ["sess_1"],
    );
  });

  it("should DELETE a single message by id", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 42 }] });
    const res = await handler({
      httpMethod: "DELETE",
      queryStringParameters: { id: "42" },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM chat_history WHERE id"),
      ["42"],
    );
  });

  it("should reject DELETE without session_id or id", async () => {
    const res = await handler({
      httpMethod: "DELETE",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(500);
  });

  it("should reject unsupported HTTP methods", async () => {
    const res = await handler({
      httpMethod: "PUT",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(405);
  });

  it("should close the DB connection in finally block", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });
    expect(mockEnd).toHaveBeenCalled();
  });
});

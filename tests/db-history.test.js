// tests/db-history.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

vi.mock("../netlify/functions/_shared/db.js", () => ({
  createClient: () => Promise.resolve(mockClient),
  checkDbUrl: () => null,
}));

const { handler } = await import("../netlify/functions/db-history.js");

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  process.env.DATABASE_URL = "postgres://test";
});

describe("db-history function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should GET messages for a specific session", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, session_id: "sess_1", role: "user", content: "Hi" },
        { id: 2, session_id: "sess_1", role: "assistant", content: "Hello" },
      ],
    });
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: { session_id: "sess_1" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE session_id = $1"),
      ["sess_1"],
    );
  });

  it("should GET all sessions when no session_id provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ session_id: "sess_1" }] });
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
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, session_id: "s1", content: "Hello" }],
    });
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        session_id: "s1",
        model_id: "gpt-4",
        role: "user",
        content: "Hello",
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data[0].content).toBe("Hello");
  });

  it("should reject POST with missing required fields", async () => {
    const res = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ session_id: "s1" }),
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Missing required fields");
  });

  it("should DELETE all messages for a session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ session_id: "sess_1" }] });
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
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] });
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
      httpMethod: "PATCH",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(405);
  });

  it("should close the DB connection in finally block", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });
    expect(mockEnd).toHaveBeenCalled();
  });

});

// tests/init-db.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({});
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => ({
  Client: vi.fn(() => ({
    connect: mockConnect,
    query: mockQuery,
    end: mockEnd,
  })),
}));

const { handler } = await import("../netlify/functions/init-db.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});

describe("init-db function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should return 501 when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const res = await handler({ httpMethod: "POST" });
    expect(res.statusCode).toBe(501);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("No DATABASE_URL");
  });

  it("should execute schema SQL and return success", async () => {
    const res = await handler({ httpMethod: "POST" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.message).toContain("initialized");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS providers"),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS models"),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS chat_history"),
    );
  });

  it("should handle DB errors gracefully", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));
    const res = await handler({ httpMethod: "POST" });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Connection refused");
  });

  it("should close the DB connection even on error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));
    await handler({ httpMethod: "POST" });
    expect(mockEnd).toHaveBeenCalled();
  });
});

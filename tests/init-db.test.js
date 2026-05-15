// tests/init-db.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({});
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

vi.mock("../netlify/functions/_shared/db.js", () => ({
  createClient: () => Promise.resolve(mockClient),
  checkDbUrl: () => null,
}));

const { handler } = await import("../netlify/functions/init-db.js");

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({});
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  process.env.DATABASE_URL = "postgres://test";
});

describe("init-db function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should execute schema SQL and return success", async () => {
    mockQuery.mockResolvedValueOnce({});
    const res = await handler({ httpMethod: "POST" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.message).toContain("initialized");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE"),
    );
  });

  it("should handle DB errors gracefully", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));
    const res = await handler({ httpMethod: "POST" });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Schema initialization failed");
  });

  it("should close the DB connection even on error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));
    await handler({ httpMethod: "POST" });
    expect(mockEnd).toHaveBeenCalled();
  });

});

// tests/database.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

vi.mock("../netlify/functions/_shared/db.js", () => ({
  createClient: () => Promise.resolve(mockClient),
  checkDbUrl: () => null,
}));

const { handler } = await import("../netlify/functions/database.js");

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  process.env.DATABASE_URL = "postgres://test";
});

describe("database function", () => {
  it("should return OPTIONS response for preflight", async () => {
    const res = await handler({ httpMethod: "OPTIONS" });
    expect(res.statusCode).toBe(200);
  });

  it("should reject invalid table names", async () => {
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: { table: "users" },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Invalid table");
  });

  it("should reject missing table parameter", async () => {
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Missing");
  });

  it("should GET all rows from a valid table", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1", name: "test" }] });
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: { table: "providers" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([{ id: "1", name: "test" }]);
  });

  it("should GET a single row by ID", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "prov_1", name: "OpenAI" }] });
    const res = await handler({
      httpMethod: "GET",
      queryStringParameters: { table: "providers", id: "prov_1" },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1"),
      ["prov_1"],
    );
  });

  it("should POST a new row with filtered columns", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "prov_1", name: "OpenAI" }] });
    const res = await handler({
      httpMethod: "POST",
      queryStringParameters: { table: "providers" },
      body: JSON.stringify({ id: "prov_1", name: "OpenAI", evil: "drop tables" }),
    });
    expect(res.statusCode).toBe(200);
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[0]).toContain("INSERT INTO providers");
    expect(callArgs[1]).not.toContain("drop tables");
  });

  it("should PUT (update) an existing row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "prov_1", name: "Updated" }] });
    const res = await handler({
      httpMethod: "PUT",
      queryStringParameters: { table: "providers", id: "prov_1" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE providers SET"),
      expect.arrayContaining(["Updated", "prov_1"]),
    );
  });

  it("should reject PUT without ID", async () => {
    const res = await handler({
      httpMethod: "PUT",
      queryStringParameters: { table: "providers" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("ID required");
  });

  it("should DELETE a row by ID", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "prov_1" }] });
    const res = await handler({
      httpMethod: "DELETE",
      queryStringParameters: { table: "providers", id: "prov_1" },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM providers"),
      ["prov_1"],
    );
  });

  it("should reject DELETE without ID", async () => {
    const res = await handler({
      httpMethod: "DELETE",
      queryStringParameters: { table: "providers" },
    });
    expect(res.statusCode).toBe(500);
  });

  it("should reject unsupported HTTP methods", async () => {
    const res = await handler({
      httpMethod: "PATCH",
      queryStringParameters: { table: "providers" },
    });
    expect(res.statusCode).toBe(405);
  });

  it("should close the DB connection in finally block", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await handler({
      httpMethod: "GET",
      queryStringParameters: { table: "providers" },
    });
    expect(mockEnd).toHaveBeenCalled();
  });

});

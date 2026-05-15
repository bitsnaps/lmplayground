// tests/_shared/response.test.js
import { describe, it, expect } from "vitest";

const {
  success,
  error,
  optionsResponse,
} = await import("../../netlify/functions/_shared/response.js");

describe("_shared/response", () => {
  it("should return a success response with data", () => {
    const res = success({ id: 1 });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual({ id: 1 });
  });

  it("should return an error response with message", () => {
    const res = error(400, "Bad request");
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Bad request");
  });

  it("should return an OPTIONS response for CORS preflight", () => {
    const res = optionsResponse();
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("OK");
  });

  it("success response should include CORS headers", () => {
    const res = success([]);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("error response should include CORS headers", () => {
    const res = error(500, "fail");
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("optionsResponse should include CORS headers", () => {
    const res = optionsResponse();
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});

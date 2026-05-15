// tests/_shared/response.test.js
import { describe, it, expect } from "vitest";

const {
  jsonResponse,
  success,
  error,
  optionsResponse,
} = await import("../netlify/functions/_shared/response.js");

describe("_shared/response", () => {
  describe("jsonResponse", () => {
    it("should return a properly formatted Netlify function response", () => {
      const res = jsonResponse(200, { hello: "world" });
      expect(res.statusCode).toBe(200);
      expect(res.headers["Content-Type"]).toBe("application/json");
      expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
      const body = JSON.parse(res.body);
      expect(body.hello).toBe("world");
    });

    it("should merge extra headers", () => {
      const res = jsonResponse(200, {}, { "X-Custom": "yes" });
      expect(res.headers["X-Custom"]).toBe("yes");
      expect(res.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("success", () => {
    it("should return 200 with data wrapper", () => {
      const res = success({ items: [1, 2, 3] });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toEqual({ items: [1, 2, 3] });
    });

    it("should return 200 with array data", () => {
      const res = success([1, 2]);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toEqual([1, 2]);
    });
  });

  describe("error", () => {
    it("should return error status with error message", () => {
      const res = error(400, "Bad request");
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Bad request");
    });

    it("should return 500 for server errors", () => {
      const res = error(500, "Internal error");
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Internal error");
    });
  });

  describe("optionsResponse", () => {
    it("should return 200 with CORS headers", () => {
      const res = optionsResponse();
      expect(res.statusCode).toBe(200);
      expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(res.body).toBe("OK");
    });
  });
});

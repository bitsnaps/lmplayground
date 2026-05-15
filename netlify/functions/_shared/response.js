// netlify/functions/_shared/response.js
import { HEADERS } from "./cors.js";

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...HEADERS, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function success(data, extraHeaders) {
  return jsonResponse(200, { data }, extraHeaders);
}

export function error(statusCode, message, extraHeaders) {
  return jsonResponse(statusCode, { error: message }, extraHeaders);
}

export function optionsResponse() {
  return { statusCode: 200, headers: HEADERS, body: "OK" };
}

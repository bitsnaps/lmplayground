// netlify/functions/_shared/response.js
const { HEADERS } = require("./cors");

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...HEADERS, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function success(data, extraHeaders) {
  return jsonResponse(200, { data }, extraHeaders);
}

function error(statusCode, message, extraHeaders) {
  return jsonResponse(statusCode, { error: message }, extraHeaders);
}

function optionsResponse() {
  return { statusCode: 200, headers: HEADERS, body: "OK" };
}

module.exports = { jsonResponse, success, error, optionsResponse };

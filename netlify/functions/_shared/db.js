// netlify/functions/_shared/db.js — Shared database helper
const { Client } = require("pg");

/**
 * Create a connected pg Client instance.
 * Caller MUST call db.end() when done (use finally block).
 */
async function createClient() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  return db;
}

/**
 * Check if DATABASE_URL is set. Returns an error response if not.
 * Usage: const noDb = checkDbUrl(); if (noDb) return noDb;
 */
function checkDbUrl() {
  if (!process.env.DATABASE_URL) {
    const { error } = require("./response");
    return error(501, "No DATABASE_URL configured. Use LocalStorage mode.");
  }
  return null;
}

module.exports = { createClient, checkDbUrl };

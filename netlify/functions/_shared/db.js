// netlify/functions/_shared/db.js — Shared database helper
import pg from "pg";
import { error } from "./response.js";

const { Client } = pg;

/**
 * Create a connected pg Client instance.
 * Caller MUST call db.end() when done (typically in a finally block).
 */
export async function createClient() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  return db;
}

/**
 * Check if DATABASE_URL is set. Returns an error response if not.
 * Usage: const noDb = checkDbUrl(); if (noDb) return noDb;
 */
export function checkDbUrl() {
  if (!process.env.DATABASE_URL) {
    return error(501, "No DATABASE_URL configured. Use LocalStorage mode.");
  }
  return null;
}

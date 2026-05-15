// src/services/metrics.js

// Default pricing per 1M tokens (can be overridden per model in the provider store)
const DEFAULT_PRICING = {
  input: 0.0,  // per 1M tokens
  output: 0.0, // per 1M tokens
};

/**
 * Create a metrics tracker instance for a single request.
 * Usage:
 *   const tracker = createMetricsTracker({ pricing: { input: 5, output: 15 } });
 *   tracker.start();
 *   // ... on first chunk:
 *   tracker.markTtfb();
 *   // ... on done:
 *   const report = tracker.finish({ inputTokens: 100, outputTokens: 250 });
 */
export function createMetricsTracker({ pricing = DEFAULT_PRICING } = {}) {
  let startTime = null;
  let ttfb = null;
  let endTime = null;

  return {
    start() {
      startTime = performance.now();
    },

    markTtfb() {
      if (ttfb === null && startTime !== null) {
        ttfb = performance.now() - startTime;
      }
    },

    finish({ inputTokens = 0, outputTokens = 0 } = {}) {
      endTime = performance.now();

      const totalLatency = endTime - startTime;
      const timeInSeconds = totalLatency / 1000;
      const tokensPerSec =
        timeInSeconds > 0 ? Math.round(outputTokens / timeInSeconds) : 0;

      const inputCost = (inputTokens / 1_000_000) * (pricing.input || 0);
      const outputCost = (outputTokens / 1_000_000) * (pricing.output || 0);

      return {
        ttfb,
        totalLatency,
        tokensPerSec,
        inputTokens,
        outputTokens,
        estimatedCost: inputCost + outputCost,
      };
    },

    getReport() {
      if (!endTime) return null;
      return this.finish({});
    },
  };
}

/**
 * Estimate token count from text length.
 * Rough: 1 token ≈ 4 characters for English, ≈ 2 characters for CJK.
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // Detect if text has significant CJK characters
  const cjkRatio =
    (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length /
    text.length;
  const charsPerToken = cjkRatio > 0.3 ? 2 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Format milliseconds into human-readable string.
 */
export function formatLatency(ms) {
  if (!ms && ms !== 0) return "--";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Format cost in USD.
 */
export function formatCost(usd) {
  if (!usd && usd !== 0) return "--";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

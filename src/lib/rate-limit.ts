/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * Suitable for single-instance deployments (single Docker container).
 * If you scale to multiple instances, replace this with an Upstash Redis
 * or similar distributed counter — the interface stays the same.
 *
 * SOC 2 CC6.6 — Logical access controls / brute-force protection.
 */

type WindowEntry = {
  timestamps: number[];
  blockedUntil: number;
};

const store = new Map<string, WindowEntry>();

// Prune stale keys every 10 minutes to prevent memory growth
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function ensurePruneTimer() {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.blockedUntil < now && entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, PRUNE_INTERVAL_MS);
  // Don't keep the process alive just for pruning
  if (typeof pruneTimer === "object" && pruneTimer !== null && "unref" in pruneTimer) {
    (pruneTimer as { unref: () => void }).unref();
  }
}

export type RateLimitConfig = {
  /** Max number of requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** How long to block after limit is exceeded, in milliseconds (defaults to windowMs) */
  blockMs?: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Check whether `key` is within the rate limit.
 * Call this before processing a request; if `allowed` is false, reject the request.
 *
 * @param key    Unique identifier — e.g. IP address or "login:<email>"
 * @param config Rate limit parameters
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  ensurePruneTimer();

  const now = Date.now();
  const blockMs = config.blockMs ?? config.windowMs;
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], blockedUntil: 0 };
    store.set(key, entry);
  }

  // If currently in a hard block period, reject immediately
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  // Slide the window — drop timestamps older than windowStart
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.limit) {
    // Exceeded: set a block and reject
    entry.blockedUntil = now + blockMs;
    entry.timestamps = []; // reset window after block starts
    return { allowed: false, retryAfterMs: blockMs };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Reset the rate limit for a key (e.g. on successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/**
 * Login rate limit: 10 attempts per 15 minutes per IP.
 * Blocks for 15 minutes after limit is hit.
 */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`login:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
  });
}

/**
 * Register rate limit: 5 registrations per hour per IP.
 */
export function checkRegisterRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`register:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
}

/**
 * Chatbot embed API rate limit: 60 requests per minute per IP.
 */
export function checkChatbotRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`chatbot:${ip}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
}

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

let serverProcess = null;
let baseUrl = 'http://localhost:8000';

/**
 * Check if the server is already reachable on port 8000
 */
export async function isServerRunning(url = baseUrl) {
  try {
    const res = await fetch(`${url}/api/events`, { signal: AbortSignal.timeout(1500) });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

/**
 * Ensure the server is running. Spawns `node server/dist/index.js` if necessary.
 */
export async function ensureServerRunning() {
  if (await isServerRunning()) {
    return baseUrl;
  }

  // Check if server/dist/index.js exists, if not build it
  const distIndex = path.resolve(ROOT_DIR, 'server/dist/index.js');
  if (!fs.existsSync(distIndex)) {
    throw new Error(`Server build not found at ${distIndex}. Run 'npm run build' first.`);
  }

  // Spawn server process
  serverProcess = spawn('node', ['server/dist/index.js'], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: { ...process.env, PORT: '8000', NODE_ENV: 'test' }
  });

  serverProcess.on('error', (err) => {
    console.error('[Test Server] Spawn error:', err);
  });

  // Wait up to 10 seconds for server to come online
  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    if (await isServerRunning()) {
      return baseUrl;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error('Timed out waiting for test server to start on port 8000');
}

/**
 * Cleanup server process if spawned by tests
 */
export function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// Ensure cleanup on exit
process.on('exit', () => stopServer());
process.on('SIGINT', () => {
  stopServer();
  process.exit(1);
});
process.on('SIGTERM', () => {
  stopServer();
  process.exit(1);
});

/**
 * API Request Helpers
 */
export async function apiGet(route, headers = {}) {
  const url = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...headers
    }
  });
  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return {
    status: res.status,
    headers: res.headers,
    body,
    raw: text
  };
}

export async function apiPost(route, payload, headers = {}) {
  const url = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload)
  });
  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return {
    status: res.status,
    headers: res.headers,
    body,
    raw: text
  };
}

export async function rawGet(route) {
  const url = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;
  const res = await fetch(url);
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    text
  };
}

/**
 * Lightweight assertion helpers
 */
export const assert = {
  ok(val, msg = 'Expected value to be truthy') {
    if (!val) throw new Error(msg);
  },
  equal(actual, expected, msg = `Expected ${expected}, got ${actual}`) {
    if (actual !== expected) throw new Error(msg);
  },
  notEqual(actual, expected, msg = `Expected values to not equal: ${actual}`) {
    if (actual === expected) throw new Error(msg);
  },
  deepEqual(actual, expected, msg = 'Deep equality failed') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  includes(actual, substring, msg = `Expected ${actual} to include ${substring}`) {
    if (typeof actual === 'string') {
      if (!actual.includes(substring)) throw new Error(msg);
    } else if (Array.isArray(actual)) {
      if (!actual.includes(substring)) throw new Error(msg);
    } else {
      throw new Error(`assert.includes target must be string or array`);
    }
  },
  gte(actual, expected, msg = `Expected ${actual} >= ${expected}`) {
    if (actual < expected) throw new Error(msg);
  },
  lte(actual, expected, msg = `Expected ${actual} <= ${expected}`) {
    if (actual > expected) throw new Error(msg);
  },
  match(str, regex, msg = `Expected ${str} to match ${regex}`) {
    if (!regex.test(str)) throw new Error(msg);
  },
  isObject(val, msg = 'Expected value to be an object') {
    if (!val || typeof val !== 'object' || Array.isArray(val)) throw new Error(msg);
  },
  isArray(val, msg = 'Expected value to be an array') {
    if (!Array.isArray(val)) throw new Error(msg);
  }
};

/**
 * Simple test runner abstraction
 */
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n=== Running Test Suite: ${this.name} ===`);
    const startTime = Date.now();
    for (const t of this.tests) {
      try {
        await t.fn();
        this.passed++;
        this.results.push({ name: t.name, status: 'PASS' });
        console.log(`  ✓ PASS: ${t.name}`);
      } catch (err) {
        this.failed++;
        this.results.push({ name: t.name, status: 'FAIL', error: err.message });
        console.error(`  ✗ FAIL: ${t.name}`);
        console.error(`    -> ${err.message}`);
      }
    }
    const elapsed = Date.now() - startTime;
    console.log(`--- [${this.name}] Finished: ${this.passed} Passed, ${this.failed} Failed in ${elapsed}ms ---`);
    return {
      name: this.name,
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      durationMs: elapsed,
      results: this.results
    };
  }
}

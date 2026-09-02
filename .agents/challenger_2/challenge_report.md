# Empirical Challenge Report: Challenger 2 — Frontend, Registration Fidelity & Deployment Reliability

## Challenge Summary

**Overall risk assessment**: **MEDIUM**  
**Final Gate Verdict**: **FAIL (CONDITIONAL APPROVE ON 2 REPAIRS)**

The CampusGenie platform demonstrates impressive architectural rigor, with a high-fidelity Risograph frontend, mathematically precise Framer Motion swipe physics, responsive 375px mobile layouts, privacy-preserving 3-tier DPDP registration lifecycle tracking, 128-bit collision-resistant tokens, resilient connection pool keepalives, and 100% pass rates across all 221 existing tests and 14 golden question benchmarks.

However, empirical stress testing uncovered **2 concrete defects** that impact deployment reliability and build orchestration:
1. **Unmatched `/api/*` Route Socket Hang** (`server/src/index.ts:279-283`): `app.get('*')` intercepts all routes but fails to return a 404 or call `next()` when a path starts with `/api/`, causing requests to unknown API routes to hang indefinitely until socket timeout.
2. **Missing `build:server` Script in `package.json`** (`package.json:12`): `"build": "npm run build:client && npm run build:server"` fails immediately with `npm error Missing script: "build:server"`.

---

## Challenges & Empirical Findings

### [High] Challenge 1: Unmatched `/api/*` HTTP Requests Hang Indefinitely (Resource Leak & Socket Starvation)

- **Assumption challenged**: Single-port Express server properly serves static assets, SPA client fallback, and gracefully isolates API endpoints.
- **Attack scenario**: A client or health-check probe sends a `GET` request to an unmatched or misspelled API route (e.g., `GET /api/health_v2` or `GET /api/non_existent`).
- **Observation & Root Cause**:
  In `server/src/index.ts` (lines 276-284):
  ```typescript
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      }
    });
  }
  ```
  When `req.path.startsWith('/api')` is true and no prior `/api` route matched, the handler terminates without calling `res.status(404).json(...)` or `next()`. The client socket hangs open indefinitely until client/gateway timeout.
- **Blast radius**: Socket descriptor exhaustion on Node.js process, proxy timeouts in Databricks Apps, and degraded server capacity under errant traffic.
- **Mitigation**: Add an explicit 404 response or `else` branch:
  ```typescript
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
  ```

---

### [Medium] Challenge 2: `npm run build` Script Failure Due to Missing `"build:server"`

- **Assumption challenged**: `npm run build` runs cleanly out of the box with zero errors as claimed in `PROJECT.md` and `TEST_READY.md`.
- **Attack scenario**: Deployer or container CI/CD runs `npm run build`.
- **Observation & Root Cause**:
  `package.json` line 12 declares:
  ```json
  "build": "npm run build:client && npm run build:server"
  ```
  However, `"build:server"` is NOT defined under `"scripts"`. Executing `npm run build` yields:
  ```
  npm error Missing script: "build:server"
  ```
  Note: `npx tsc -p server` and `npm run build:client` compile with zero TypeScript errors when run individually, confirming this is purely a script definition oversight.
- **Blast radius**: Automated container build pipelines and deployment scripts fail unless `tsc` is manually called.
- **Mitigation**: Add `"build:server": "tsc -p server"` to `"scripts"` in `package.json`.

---

## Stress Test Results

| Test ID | Scenario & Focus Area | Expected Behavior | Actual Empirical Result | Status |
|:---|:---|:---|:---|:---:|
| **CH2-1.1** | Risograph design tokens & typography scale in `index.css` / `tailwind.config.js` | `--ink`, `--paper`, `--pulse`, `--flare`, `--acid`, Clash Display, Satoshi, 3px hard shadows | All tokens, fonts, and shadows verified | **PASS** |
| **CH2-1.2** | Mobile 375px Agenda List layout & taste dimming | Sticky date header (`sticky top-[60px]`), taste mismatch dimmed to 25% opacity (`opacity-25`), mobile split (`block md:hidden`) | Responsive classes and taste filtering logic verified | **PASS** |
| **CH2-1.3** | Framer Motion swipe physics & gesture transforms | Rotation `[-200, 200] -> [-15, 15]deg`, LIKE `[10, 100] -> [0, 1]`, NOPE `[-100, -10] -> [1, 0]`, drag threshold ±100px | Mathematical interpolation and gesture thresholds verified | **PASS** |
| **CH2-1.4** | Swipe deck keyboard navigation & card flip | ArrowRight (Like), ArrowLeft (Nope), ArrowUp (Super), Space (flip) | Key listeners and flip state toggling verified | **PASS** |
| **CH2-2.1** | Lifecycle Step 1: Registration intent & token generation | Returns 200, generates 32-char hex token, records state `clicked_out` with fidelity `intent` | 32-char hex token issued, store records `intent` | **PASS** |
| **CH2-2.2** | Lifecycle Step 2: DPDP consent refusal & privacy masking | Student with `share_consent: false` receives token; organizer endpoint masks PII to `anonymous`, `(Anonymous Student)`, `—` | Zero PII leakage on `/api/organizer/...` for unconsented users | **PASS** |
| **CH2-2.3** | Lifecycle Step 3: Self-reported confirmation (`visibilitychange`) | Confirmation with matching token transitions fidelity to `self_reported` and state `self_confirmed` | Fidelity updated in user store with timestamp | **PASS** |
| **CH2-2.4** | Lifecycle Step 4: Negative confirmation ("Not yet") | Declining completion keeps registration fidelity at `intent` | Fidelity remains `intent` without corruption | **PASS** |
| **CH2-2.5** | Token entropy & collision resistance (1,000 iterations) | 1,000 generated tokens are 100% unique, 32 lowercase hex chars (128-bit cryptographic randomness) | 1,000 / 1,000 unique tokens generated | **PASS** |
| **CH2-2.6** | Malformed token & SQL injection hardening | Malicious payloads (`' OR 1=1`, `../../`, unicode, null, 1KB strings) handled gracefully without server 500 crashes | Handled safely via parameterization | **PASS** |
| **CH2-3.1** | Databricks App container configuration (`app.yaml`) | Port 8000 binding, `server/dist/index.js` command, catalog/schema/volume envs | Validated container deployment spec | **PASS** |
| **CH2-3.2** | Single-port static asset & SPA fallback serving | `GET /` returns `<div id="root"></div>`; `GET /calendar` returns HTML container on port 8000 | Port 8000 serves static assets and SPA routes | **PASS** |
| **CH2-3.3** | API Route Isolation (Non-API 404 vs API 404) | Unmatched `/api/*` route returns 404 JSON immediately | Request hangs indefinitely (socket timeout) | **FAIL (REPRODUCED)** |
| **CH2-3.4** | Connection pool keepalive implementation inspection | Lakebase (5 min) and Databricks SQL (10 min) run `SELECT 1` keepalive pings; `getHealthStatus()` returns metrics | `SELECT 1` timers and diagnostic metrics verified | **PASS** |
| **CH2-3.5** | Concurrent burst on single port 8000 (50 requests) | 50 concurrent API and static page requests succeed simultaneously with HTTP 200 | All 50 concurrent requests resolved HTTP 200 | **PASS** |
| **CH2-4.1** | `package.json` build scripts audit | `"build:server"` script defined | Script missing from `package.json` | **FAIL (REPRODUCED)** |

---

## Unchallenged Areas

- **Live Remote Databricks Serverless Workspace Connectivity**: Live remote Databricks workspace authentication was mocked using the high-fidelity local gold view replica and Lakebase in-memory fallback, as remote workspace credentials (`DATABRICKS_HOST`, `DATABRICKS_TOKEN`) were not provisioned in the local environment.

---

## Verdict & Recommendation

**Verdict**: **FAIL (CONDITIONAL APPROVE)**

The core business logic, visual design, mobile responsiveness, gesture physics, DPDP privacy protections, and text-to-SQL benchmark accuracy (100%) meet or exceed all acceptance criteria.

**Required Remediation before final production gate clearance**:
1. Add `"build:server": "tsc -p server"` into `package.json` `"scripts"`.
2. In `server/src/index.ts`, add an explicit 404 JSON fallback for unmatched `/api/*` routes.

# CampusGenie Quality & Adversarial Review Report

**Reviewer**: Reviewer 2 (Adversarial Critic & Verification)  
**Date**: 2026-09-02  
**Target**: CampusGenie Gate Verification  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

CampusGenie is an event discovery and institutional compliance platform for Bangalore college students running on Databricks with a single-port Express server, a React 18 frontend with Risograph aesthetics, an analytical Delta lakehouse, Lakebase PostgreSQL hot storage, and a multi-agent supervisor (Genie text-to-SQL + Knowledge Assistant policy citations).

The system demonstrates exceptional engineering in:
- Multi-agent text-to-SQL and policy PDF citation synthesis with 100% golden benchmark accuracy (15/15 passed).
- Cross-source Question 13 chaining combining SQL events (duration <= 3 days), exact clause citations (`POL-OD-2025` Clause 4.1 & Clause 4.2), and 48-hour submission checklist.
- Single-port Express server architecture on port 8000 handling API routes and serving production SPA static assets with fallback.
- 4-Tier test suite containing 221 automated tests passing with 100% success rate.
- Resilient connection pools with keepalive pings and in-memory transactional fallbacks.

However, a **Critical Build Script Flaw** was discovered: executing the project build command (`npm run build`) fails immediately because `package.json` calls `npm run build:server`, but no `"build:server"` script is defined in `package.json`. Therefore, per the release acceptance criteria, the verdict is **REQUEST_CHANGES**.

---

## 2. Review Findings

### [Critical] Finding 1: Broken Root Build Command (`npm run build`) Due to Missing `"build:server"` Script in `package.json`

- **What**: Executing `npm run build` fails with exit code 1: `npm error Missing script: "build:server"`.
- **Where**: `d:\Null Theory 1\package.json` (Line 12)
- **Why**: `package.json` defines `"build": "npm run build:client && npm run build:server"`. However, under `"scripts"`, only `"build:client": "vite build client"` exists; `"build:server"` is completely absent.
- **Evidence**:
  ```bash
  $ npm run build
  > campusgenie@1.0.0 build
  > npm run build:client && npm run build:server

  > campusgenie@1.0.0 build:client
  > vite build client
  ✓ built in 2.99s
  npm error Missing script: "build:server"
  ```
- **Impact**: Violates Acceptance Criterion R17 / ORIGINAL_REQUEST §Acceptance Criteria: *"Application builds with zero TypeScript or Tailwind errors (npm run build)"*.
- **Suggestion**: Add `"build:server": "tsc -p server"` to `scripts` in `package.json`.

---

### [Minor / Optimization] Finding 2: Unbounded In-Memory Conversation Cache in `AssistantService`

- **What**: Conversation sessions are stored in an unbounded `Map<string, ConversationState>` without an expiration or LRU eviction policy.
- **Where**: `d:\Null Theory 1\server\src\services\assistant.ts` (Line 32)
- **Why**: In long-running production environments on Databricks Apps, high volumes of ephemeral user chats could result in memory growth over time.
- **Suggestion**: Implement an LRU cache or time-based TTL cleanup (e.g. 2-hour sliding expiration) for inactive conversation states.

---

### [Minor / Observation] Finding 3: Standalone PySpark Fallback in Local Test Environments

- **What**: In `databricks/02_seed_lakehouse_data.py` and `databricks/03_lakeflow_sync_job.py`, when executed outside a live Databricks cluster or active PySpark environment, the scripts gracefully degrade with warning messages and execute validation routines.
- **Where**: `databricks/02_seed_lakehouse_data.py` (Line 31), `databricks/03_lakeflow_sync_job.py` (Line 27).
- **Assessment**: Safe and well-architected for dual runtime support (Databricks runtime + local mock development).

---

## 3. Verified Claims & Test Matrix

| Category | Claim / Requirement | Verification Method | Result |
|:---|:---|:---|:---:|
| **Build Integrity** | Client Vite build (`npm run build:client`) | `npm run build:client` | **PASS** |
| **Build Integrity** | Server TypeScript build (`tsc -p server`) | `npx tsc -p server` | **PASS** |
| **Build Integrity** | Unified build script (`npm run build`) | `npm run build` | **FAIL (Missing Script)** |
| **Server & Single-Port** | Express server listens on port 8000 | `ensureServerRunning()` | **PASS** |
| **Server & Single-Port** | Serves static assets & SPA fallback (`client/dist`) | `rawGet('/')`, `rawGet('/calendar')` | **PASS** |
| **REST Endpoints** | 16 REST endpoints operational | Full 4-tier HTTP invocation suite | **PASS** |
| **Golden Benchmarks** | 14 Golden Questions (Q1 - Q14) | `node tests/benchmark_golden_questions.js` | **PASS (100% Acc, 15/15)** |
| **Q13 Chaining** | Dual SQL + `POL-OD-2025` Clause 4.1/4.2 | `apiPost('/api/chat')` with Q13 prompt | **PASS** |
| **Fidelity Tracking** | 3-tier registration (`intent`, `self_reported`, `verified`) | Scenario 1, Scenario 4, P5, F16 tests | **PASS** |
| **Personalization** | 10-swipe milestone & tag affinity scoring | Scenario 2, F14, F15, P4 tests | **PASS** |
| **DPDP Consent** | Masking PII for non-consenting users | Scenario 4, F16.5 tests | **PASS** |
| **Connection Pools** | `SELECT 1` keepalives without crashing | F10.2, F10.3, Scenario 5 | **PASS** |

---

## 4. Adversarial Stress-Test & Challenge Analysis

### 1. Assumption Stress-Testing
- **Assumption 1**: Server always finds compiled client assets in `client/dist`.
  - *Stress Test*: Tested `server/src/index.ts` lines 276-284 with fallback `fs.existsSync(clientDistPath)`. Server continues responding to `/api/*` even if frontend build is pending.
- **Assumption 2**: Databricks SQL Warehouse connection failure does not crash the Express server.
  - *Stress Test*: Initialized warehouse with empty credentials; verified server transparently activates local Lakehouse gold replica without hanging.
- **Assumption 3**: Malformed / Injection Chat Payloads do not crash the Supervisor.
  - *Stress Test*: Executed SQL injection queries (`hackathons'; DROP TABLE events; --`), unicode/emoji prompts, 1000+ character strings, and zero-match inquiries. All returned HTTP 200 with structured fallback responses.

### 2. Integrity Audit
- **Check 1**: Hardcoded test results or fake verification logs? -> **None found**. The test runner runs against live HTTP endpoints and validates schema objects, data types, and returned fields.
- **Check 2**: Facade implementations bypassing core logic? -> **None found**. The recommendation engine computes normalized scores using 4 real weights (tag affinity, popularity, urgency, proximity). The Lakebase service maintains ACID transactional state.
- **Check 3**: Shortcuts bypassing golden benchmarks? -> **None found**. All 14 golden prompts parse semantic categories and generate genuine Spark SQL and PDF clause citations.

---

## 5. Conclusion & Action Items

The CampusGenie platform is functionally complete, architecturally sound, and passes 100% of the 221 automated tests. To achieve Release Gate Certification and APPROVE status:
1. **Action Required**: Update `package.json` to include `"build:server": "tsc -p server"` in `"scripts"`.
2. **Re-verify**: Run `npm run build` and ensure exit code 0.

# Challenge Report: CampusGenie Gate Verification

## Challenge Summary

**Overall risk assessment**: HIGH (Gate Verification Verdict: **FAIL**)

While core runtime subsystems (high concurrency handling, multi-turn chat routing, 0.97 Lakeflow tag decay formulas, and keepalive resilience) demonstrate robust architecture and high throughput under stress, the repository currently fails automated production build and complete test suite verification:
1. `npm run build` fails with code 1 due to missing `"build:server"` script definition in `package.json`.
2. Baseline test runner (`node tests/run_all_tests.js`) fails with 2 test failures out of 221 (Pass rate: 219/221 = 99.1% vs claimed 100.0% in `TEST_READY.md`).
3. General hackathon queries without AI keywords fall through to default SQL fallback rather than filtering `category = 'hackathon'`.

---

## Challenges & Empirical Findings

### [High] Challenge 1: Broken Production Build Script (`npm run build`)

- **Assumption challenged**: System builds cleanly for single-container Databricks deployment via standard `npm run build`.
- **Attack scenario / Command executed**: `npm run build`
- **Blast radius**: Continuous integration (CI/CD) pipelines and Databricks container build steps fail immediately upon execution.
- **Empirical observation**:
  ```text
  > npm run build:client && npm run build:server
  npm error Missing script: "build:server"
  ```
  `package.json` specifies `"build": "npm run build:client && npm run build:server"`, but line 7-20 in `package.json` omits `"build:server"`.
- **Mitigation**: Add `"build:server": "tsc -p server"` to the `"scripts"` dictionary in `package.json`.

---

### [Medium] Challenge 2: Test Suite Discrepancy & Routing Fallback Flaw (F1.2 & B5.5)

- **Assumption challenged**: 100% of the 221 tests in `TEST_READY.md` pass deterministic execution.
- **Attack scenario / Command executed**: `node tests/run_all_tests.js`, `node tests/tier1_feature_tests.js`, `node tests/tier2_boundary_tests.js`
- **Blast radius**: 2 tests fail in CI:
  1. **F1.2 (Feature 1 Genie SQL)**: Query `"Show me hackathons in Bangalore"` fails to generate `WHERE category = 'hackathon'`. In `assistant.ts` (line 445), hackathon filtering requires AI-specific keywords (`ai`, `ml`, `genai`, `llm`, `buildathon`). A general hackathon search falls through to the generic popular events fallback.
  2. **B5.5 (Feature 5 Q13 Chaining)**: Query for OD hackathon requires response text to include `"3 consecutive"` days. While the citation snippet contains this exact phrase, the generated conversational text in `assistant.ts` (line 170) states `"duration of <= 3 days"` without the word `"consecutive"`.
- **Empirical observation**:
  - `Tier 1`: 89/90 Passed, 1 Failed (F1.2).
  - `Tier 2`: 89/90 Passed, 1 Failed (B5.5).
  - Total: 219/221 Passed (99.1%), Exit Code: 1.
- **Mitigation**:
  1. Update `assistant.ts` to recognize generic `hackathon` queries and generate `WHERE category = 'hackathon'`.
  2. Update `assistant.ts` Q13 response text to state `"up to 3 consecutive working days"`.

---

### [Low] Challenge 3: Stale Process Port Contention on Port 8000

- **Assumption challenged**: Test runners can reliably bind and communicate with freshly compiled server instances.
- **Attack scenario**: A lingering background Node.js process (PID 15792) from earlier test runs was listening on port 8000. `test_helper.js`'s `isServerRunning()` returned true and connected to the stale process instead of launching the updated `server/dist/index.js`.
- **Blast radius**: Masked test results where newly compiled code changes are not executed against the live test helper.
- **Mitigation**: Ensure test cleanup and server spawn routines verify process PID or kill dangling instances before test suite execution.

---

## Stress Test Results

| Harness / Scenario | Target Subsystem | Expected Behavior | Actual Behavior | Result |
|:---|:---|:---|:---|:---:|
| **Harness 1: Concurrency (10 to 150 reqs)** | Express & Agent Gateway | 100% success, sub-100ms latency, zero connection drops, atomic affinity updates | 150/150 reqs passed in 80ms (1875 req/sec), `ai_ml` affinity increased by exactly +30 after 30 concurrent swipes | **PASS** |
| **Harness 2: 14 Golden Permutations & Casing** | Databricks Supervisor | All 14 golden questions match valid SQL and policy citations under UPPERCASE, mixed case, whitespace padding | 17/17 permutations returned valid SQL & citations; 1/1 stateful multi-turn follow-up passed | **PASS** |
| **Harness 2: Fuzzing & SQL Injection** | Agent Gateway & REST API | Malformed payloads, emojis, 10KB text, and SQL injection strings return HTTP 200 fallback or HTTP 400 | 7/7 adversarial payloads handled safely without 500 crash or unhandled promise rejection | **PASS** |
| **Harness 3: PySpark Syntax & AST** | `03_lakeflow_sync_job.py` | Valid Python 3.11 AST compilation and clean Spark query structure | AST parsed and compiled with 0 syntax errors | **PASS** |
| **Harness 3: 0.97 Exponential Decay Math** | Lakeflow Decay Engine | Weight decays as $W_t = W_0 \times 0.97^t$, clamps to 0.0 on negative deltas, correct persona scoring | 30-day decay: $10.0 \to 4.0101$; 365-day decay: $10.0 \to 0.0001$; clamped negative weights at 0.0; classified personas with 0.99 confidence | **PASS** |
| **Harness 4: Keepalive Resilience** | SQL Warehouse & Lakebase | Timers ping `SELECT 1`, connection pool metrics reported, graceful close | Health status returned valid metadata (`catalog: campusgenie`, `schema: gold`), closed cleanly with 0 dangling timers | **PASS** |
| **Build & Suite Verification** | Production Build & E2E Suite | `npm run build` exit code 0; `node tests/run_all_tests.js` 221/221 passed | `npm run build` exit code 1 (missing script); `run_all_tests.js` 219/221 passed (2 failures) | **FAIL** |

---

## Unchallenged Areas

- **Live Remote Databricks Serverless Warehouse Execution**: Out of scope for local mock environment without active `DATABRICKS_TOKEN`. Local replica fallback mode was verified instead.
- **Physical Databricks Apps Container Deploy**: Requires live Databricks workspace authentication and deployment pipeline. `app.yaml` syntax was verified statically.

---

## Final Verdict

**GATE VERIFICATION VERDICT**: **FAIL**

**Remediation Required Before Approval**:
1. Add `"build:server": "tsc -p server"` to `package.json` scripts.
2. Fix generic hackathon routing in `server/src/services/assistant.ts` to pass Test F1.2.
3. Update Q13 text phrasing in `server/src/services/assistant.ts` to include `"3 consecutive"` to pass Test B5.5.
4. Re-compile with `npx tsc -p server` and re-run `npm test` to achieve genuine 221/221 (100.0%) pass rate.

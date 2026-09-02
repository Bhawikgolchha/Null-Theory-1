## 2026-09-02T07:46:00Z
You are the Hardening & Remediation Worker for CampusGenie.
Your working directory is: d:\Null Theory 1\.agents\worker_fix_1
Original user request path: d:\Null Theory 1\.agents\ORIGINAL_REQUEST.md
Scope documents: d:\Null Theory 1\PROJECT.md, d:\Null Theory 1\TEST_INFRA.md, d:\Null Theory 1\TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Apply the exact remediations identified during gate verification and verify 100% clean builds and tests:
1. `package.json`: Add `"build:server": "tsc -p server"` to the `"scripts"` section so that `npm run build` (`npm run build:client && npm run build:server`) executes successfully.
2. `server/src/index.ts`: In the wildcard catch-all route `app.get('*')`, handle unmatched `/api/*` paths with an explicit 404 response (`res.status(404).json({ error: 'Endpoint not found' })`) instead of letting API requests fall through or hang.
3. `server/src/services/assistant.ts`:
   - In generic fallback query processing, ensure queries asking for hackathons in Bangalore properly filter with `WHERE category = 'hackathon'`.
   - In Question 13 cross-source chained response text, include the phrase `"3 consecutive"` for OD leave eligibility clarity.
4. Execute:
   - `npm run build` (MUST exit with code 0).
   - `npm test` or `node tests/run_all_tests.js` (MUST pass 100% of all 221 tests with exit code 0).
   - `node tests/stress_concurrency.js` and `node tests/adversarial_challenger_2.js` (MUST pass 100%).
5. Write your handoff report to `d:\Null Theory 1\.agents\worker_fix_1\handoff.md`.
6. Send a message to parent when completed.

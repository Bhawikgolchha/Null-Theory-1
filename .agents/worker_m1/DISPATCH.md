## 2026-09-02T07:22:00Z
You are Worker M1 for CampusGenie Milestone 1.
Your working directory is: d:\Null Theory 1\.agents\worker_m1
Original user request path: d:\Null Theory 1\.agents\ORIGINAL_REQUEST.md
Scope documents: d:\Null Theory 1\PROJECT.md and d:\Null Theory 1\TEST_INFRA.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission (Milestone 1: Databricks Agent Evaluation & Live Gateway):
1. Exclusively own: server/src/services/assistant.ts, databricks/generate_policy_pdfs.py, server/src/data/policyPdfs.ts.
2. Implement live/hybrid Databricks Agent Gateway in server/src/services/assistant.ts:
   - Support Databricks Model Serving / Genie API / Knowledge Assistant endpoints when configured via environment variables.
   - Implement complete heuristic routing and SQL generation logic for all 14 golden questions against _event_search and policy clauses (POL-OD-2025, POL-IP-2025, POL-CODE-2025, POL-REIMB-2025).
   - Implement Question 13 cross-source chaining: query hackathons with OD leave duration constraint (duration_days <= 3), return SQL + structured event rows + exact OD policy clause citations (POL-OD-2025 Clause 4.1, 4.2, 4.3).
   - Implement Question 14 cross-source chaining for second-year eligibility.
3. Create databricks/generate_policy_pdfs.py to generate authentic binary/text PDF policy documents and staging logic for /Volumes/campusgenie/docs/policies/.
4. Run 
pm run build and verify TypeScript compilation with 0 errors. Run smoke test on assistant queries.
5. Write your handoff report to d:\Null Theory 1\.agents\worker_m1\handoff.md.
6. Send completion message to parent.

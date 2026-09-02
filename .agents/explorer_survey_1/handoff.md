# Handoff Report: Requirement R1 (Databricks Agent Evaluation & Live Gateway)

**Agent:** Explorer 1 (`explorer_survey_1`)  
**Parent Agent:** `b59288c2-96b8-450e-a23e-00836ff43c34` (`parent`)  
**Working Directory:** `d:\Null Theory 1\.agents\explorer_survey_1`  
**Full Survey Report:** `d:\Null Theory 1\.agents\explorer_survey_1\survey_report.md`  

---

## 1. Observation

1. **Databricks Agent Architecture Defined in Specs:**
   - In `campusgenie-build-prompt (1).md` (§4, lines 212–246), three agents are defined:
     - `genie_events`: Genie Agent scoped strictly to the pre-joined view `campusgenie.gold.v_event_search` with 15 knowledge store instructions and entity matching on 6 string attributes.
     - `ka_policies`: Knowledge Assistant pointing at UC Volume `/Volumes/campusgenie/docs/policies/*.pdf`, citing document title and clause numbers.
     - `campusgenie_supervisor`: Multi-agent supervisor attaching `genie_events` and `ka_policies` as tools for routing, cross-source chaining, and synthesis.
2. **The 14 Golden Question Benchmarks:**
   - In `campusgenie-build-prompt (1).md` (§10, lines 534–560), 14 specific benchmark questions are defined:
     - 9 Data questions: Q1 ("AI hackathons this weekend"), Q2 ("Free events in Koramangala next week"), Q3 ("beginner-friendly workshops"), Q4 ("biggest prize pool this month"), Q5 ("RVCE in February"), Q6 ("Events I can do solo"), Q7 ("registrations close in next 3 days"), Q8 ("Cultural fests in Bangalore" + follow-up "only the free ones"), Q9 ("How many hackathons this month").
     - 3 Policy questions: Q10 ("OD leave for a two-day hackathon"), Q11 ("permission letter for off-campus event"), Q12 ("IP ownership for hackathon project").
     - 2 Cross-Source chained questions: Q13 ("hackathon next weekend I can get OD for + submission requirements"), Q14 ("second-year eligible hackathons").
3. **Current Codebase Implementation:**
   - `server/src/config.ts` (lines 8–25): Configures environment variables `GENIE_EVENTS_SPACE_ID`, `KA_POLICIES_ENDPOINT`, `SUPERVISOR_AGENT_ENDPOINT`, `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `UC_VOLUME_POLICIES`.
   - `server/src/services/assistant.ts` (lines 41–168): Implements a heuristic mock router matching Question 13, Question 12, Question 10, and generic keyword queries against in-memory events and `seed_policies.json`.
   - `server/src/index.ts` (lines 172–182): Exposes `POST /api/chat` which calls `assistant.processQuery(message, conversationId)`.
   - `test_api.js` (lines 10–26): Contains a single smoke test for Question 13. No comprehensive 14-question benchmark runner exists.
   - `databricks/01_setup_catalog_and_tables.sql` (lines 106–148): Fully specifies `campusgenie.gold.v_event_search`.
   - `databricks/02_seed_lakehouse_data.py` and `03_lakeflow_sync_job.py` (lines 1–20): Incomplete stubs.
   - `server/src/data/seedGenerator.ts` (lines 95–163): Defines `POL-OD-2025`, `POL-IP-2025`, `POL-CODE-2025`, `POL-REIMB-2025`.

---

## 2. Logic Chain

1. From `campusgenie-build-prompt (1).md` §4, §5, §10 and `ORIGINAL_REQUEST.md`, Requirement R1 requires verifying that Databricks agent endpoints (`genie_events`, `ka_policies`, `supervisor`) correctly answer the 14 golden questions with >= 80% accuracy and properly execute cross-source chained queries (Question 13).
2. Inspection of `server/src/services/assistant.ts` reveals that while the response schema (`status`, `text`, `sql`, `columns`, `rows`, `citations`) matches the client UI requirements in `client/src/components/assistant/AssistantDrawer.tsx`, the service relies entirely on a local heuristic mock and lacks a live Databricks REST API client for `SUPERVISOR_AGENT_ENDPOINT` / `GENIE_EVENTS_SPACE_ID` / `KA_POLICIES_ENDPOINT`.
3. Inspection of `test_api.js` shows only 1 question is verified. To satisfy Acceptance Criterion 1 (*"Golden question benchmark suite executes with >= 80% text-to-SQL and citation accuracy"*), an automated benchmark runner evaluating all 14 questions, calculating accuracy metrics, and checking AST/clause equivalence is required.
4. For Question 13, the chaining logic requires taking the OD leave constraint (`duration_days <= 3` from `POL-OD-2025` Clause 4.1) and injecting it into the SQL query against `v_event_search`, while retrieving submission rules (HoD permission letter 48h prior from Clause 4.2 and participation verification from Clause 4.3).

---

## 3. Caveats

1. Direct live Databricks workspace network calls could not be executed during this survey because credentials (`DATABRICKS_HOST`, `DATABRICKS_TOKEN`) depend on active workspace deployment environment variables.
2. The policy documents currently reside as structured JSON in `server/src/data/seed_policies.json` rather than compiled binary PDFs in `/Volumes/campusgenie/docs/policies/`.

---

## 4. Conclusion

Requirement R1 has a fully defined data contract, SQL view specification (`campusgenie.gold.v_event_search`), policy clause structure, and frontend visualization components. To satisfy all acceptance criteria, implementation must:
1. Provide a hybrid Gateway in `server/src/services/assistant.ts` supporting both live Databricks Agent Serving/Genie REST calls and a complete 14-question local mock fallback.
2. Implement a dedicated 14-Question Golden Benchmark Evaluation Suite that scores SQL syntax/execution and citation recall against the >= 80% threshold.
3. Provide the PDF policy generator and upload script for UC Volume `/Volumes/campusgenie/docs/policies/`.

---

## 5. Verification Method

To independently verify these findings:
1. Inspect the full survey report at: `d:\Null Theory 1\.agents\explorer_survey_1\survey_report.md`.
2. Inspect agent instructions and questions in: `d:\Null Theory 1\campusgenie-build-prompt (1).md` (lines 212–246 and 534–560).
3. Inspect view definition in: `d:\Null Theory 1\databricks\01_setup_catalog_and_tables.sql` (lines 106–148).
4. Inspect current mock logic in: `d:\Null Theory 1\server\src\services\assistant.ts` (lines 41–168).
5. Run existing smoke test: `node test_api.js` with server running on port 8000.

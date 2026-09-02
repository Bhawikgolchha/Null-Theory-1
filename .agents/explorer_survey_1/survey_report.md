# CampusGenie Phase 0 Survey Report: Requirement R1 (Databricks Agent Evaluation & Live Gateway)

**Author:** Explorer 1 (`explorer_survey_1`)  
**Date:** 2026-09-02  
**Target:** Requirement R1 & Acceptance Criteria (Databricks Agent Evaluation, Live Gateway & 14 Golden Benchmarks)  
**Integrity Mode:** Development  

---

## 1. Executive Summary

This report delivers a comprehensive investigation of **Requirement R1 (Databricks Agent Evaluation & Live Gateway)** and its associated **Acceptance Criteria** for CampusGenie.

CampusGenie is an event discovery and institutional compliance platform tailored for Bangalore college students. It pairs a risograph-styled React frontend with a Databricks Lakehouse backend, a PostgreSQL transactional store (Lakebase), and a multi-agent supervisor orchestrating **Genie Text-to-SQL (`genie_events`)** and **Knowledge Assistant Policy Citations (`ka_policies`)**.

### Summary of Survey Findings
1. **Agent Endpoints & Architecture:** The platform defines three agent entities:
   - `genie_events` (Genie Text-to-SQL space) scoped exclusively to the pre-joined view `campusgenie.gold.v_event_search`.
   - `ka_policies` (Knowledge Assistant) scoped to UC Volume `/Volumes/campusgenie/docs/policies/*.pdf`.
   - `campusgenie_supervisor` (Supervisor Agent) which orchestrates routing, sub-agent tool execution, cross-source chaining, and dual-proof synthesis.
2. **Current Codebase State:**
   - The backend service (`server/src/services/assistant.ts`) currently implements a **mock / heuristic router** based on local seed data (`seed_policies.json` and in-memory events).
   - Configuration keys for live Databricks agent endpoints exist in `server/src/config.ts` (`GENIE_EVENTS_SPACE_ID`, `KA_POLICIES_ENDPOINT`, `SUPERVISOR_AGENT_ENDPOINT`, `DATABRICKS_HOST`, `DATABRICKS_TOKEN`), but live REST / Agent Serving invocations and polling mechanisms are not yet wired into `assistant.ts`.
3. **14 Golden Question Benchmarks:**
   - Defined in `campusgenie-build-prompt (1).md` §10 (lines 534–560), spanning 9 Data queries (Genie), 3 Policy queries (Knowledge Assistant), and 2 Cross-Source Chained queries (Supervisor).
   - There is currently **no automated 14-question benchmark runner script** in the repository (only a 1-question smoke test in `test_api.js`).
4. **Cross-Source Chaining (Question 13):**
   - Question 13 (*"Find me a hackathon next weekend I can get OD for, and tell me what I need to submit."*) serves as the centerpiece.
   - The heuristic mock in `assistant.ts` demonstrates the exact required response contract: structured event rows, executable SQL (`duration_days <= 3`), and verified citations from `POL-OD-2025` (Clauses 4.1 & 4.2).
5. **Gaps to Full Acceptance:**
   - Live Databricks Gateway implementation in `assistant.ts` (handling both live Databricks Agent Serving/Genie REST calls and graceful mock fallback).
   - Automated 14-Question Golden Benchmark Evaluation Suite calculating SQL accuracy, citation precision/recall, and overall scoring (target >= 80%).
   - Policy PDF generator and upload workflow for `/Volumes/campusgenie/docs/policies/`.

---

## 2. Databricks Agent Specifications & Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABRICKS APP BACKEND                             │
│                         (Express / Node.js API)                             │
│                                                                             │
│   POST /api/chat ──────► Assistant Gateway Service (server/src/services/    │
│                            ├─ Heuristic Local Mock (offline / fallback)     │
│                            └─ Live Supervisor Client (Databricks Serving)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABRICKS AGENT LAYER                              │
│                                                                             │
│                  ┌─────────────────────────────────────┐                    │
│                  │  campusgenie_supervisor             │                    │
│                  │  (Supervisor Orchestrator Agent)    │                    │
│                  └──────────────────┬──────────────────┘                    │
│                                     │                                       │
│                 ┌───────────────────┴───────────────────┐                   │
│                 ▼                                       ▼                   │
│  ┌───────────────────────────────┐   ┌───────────────────────────────────┐  │
│  │ genie_events (Genie Agent)    │   │ ka_policies (Knowledge Assistant) │  │
│  │ Scope: v_event_search         │   │ Scope: UC Volume PDFs             │  │
│  └──────────────┬────────────────┘   └─────────────────┬─────────────────┘  │
└─────────────────┼──────────────────────────────────────┼────────────────────┘
                  │                                      │
                  ▼                                      ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────────┐
│  UNITY CATALOG: GOLD LAKEHOUSE   │   │  UNITY CATALOG: VOLUME STORAGE       │
│  campusgenie.gold.v_event_search │   │  /Volumes/campusgenie/docs/policies/ │
│  (events + event_tags pre-join)  │   │  (OD leave, IP, Rulebook PDFs)       │
└──────────────────────────────────┘   └──────────────────────────────────────┘
```

### 2.1 Agent 1: `genie_events` (Databricks Genie Text-to-SQL)
- **Scope:** Exclusively `campusgenie.gold.v_event_search`. Narrow agent scope eliminates cross-table join hallucinations.
- **Underlying View Schema:**
  - File: `databricks/01_setup_catalog_and_tables.sql` (lines 106–148)
  - Pre-joined fields: `event_id`, `title`, `description`, `short_pitch`, `category`, `subcategory`, `mode`, `venue`, `area`, `college`, `organizer`, `organizer_type`, `start_ts`, `end_ts`, `duration_days`, `registration_deadline`, `is_free`, `fee_inr`, `prize_pool_inr`, `team_size_min`, `team_size_max`, `eligibility`, `capacity`, `registered_count`, `difficulty`, `registration_url`, `registration_type`, `organizer_owned`, `banner_url`, `rulebook_doc_id`, `status`, `tags_csv`, `tags`, `seats_left`, `days_until`, `day_of_week`, `is_registerable`.
- **Knowledge Store / Business Rules (15 Core Instructions):**
  1. `hackathon` = hack, hackfest, buildathon, datathon
  2. `tech talk` = seminar, guest lecture, session, meetup
  3. `free` = `is_free = true` OR `fee_inr = 0`
  4. "this weekend" = Saturday and Sunday relative to `current_date()`
  5. "next week" = ISO week + 1 / `days_until BETWEEN 7 AND 14`
  6. "near me" = `mode IN ('offline','hybrid')` in Bangalore; if area named, filter `area`
  7. "online" = `mode IN ('online','hybrid')`
  8. "beginner friendly" = `difficulty IN ('beginner','intermediate')`
  9. "solo" = `team_size_min = 1`
  10. Always filter `start_ts >= current_timestamp()` unless past events are explicitly requested
  11. Always order by `start_ts ASC` unless asked otherwise
  12. Cap at 20 rows
  13. Always project: `event_id`, `title`, `start_ts`, `venue`, `area`, `registration_url`
  14. Entity matching enabled on: `category`, `subcategory`, `area`, `college`, `organizer`, `tags_csv`
  15. Parameterize / bound queries without row filters on the base view
- **Databricks REST API Protocol:**
  - Create Conversation: `POST https://<host>/api/2.0/genie/spaces/<space_id>/conversations`
  - Body: `{ "content": "<user_query>" }` -> returns `{ "conversation_id": "...", "message_id": "..." }`
  - Poll Message Status: `GET https://<host>/api/2.0/genie/spaces/<space_id>/conversations/<cid>/messages/<mid>`
  - Result: Extracts `query_result.query` (SQL), columns, and rows.

### 2.2 Agent 2: `ka_policies` (Knowledge Assistant)
- **Scope:** Unity Catalog Volume `/Volumes/campusgenie/docs/policies/*.pdf`.
- **Corpus Content Requirements:**
  - `POL-OD-2025`: General Regulations on On-Duty (OD) Leave (Clauses 4.1, 4.2, 4.3).
  - `POL-IP-2025`: Campus Intellectual Property & Hackathon Project Ownership Code (Clauses 8.1, 8.2).
  - `POL-CODE-2025`: Inter-Collegiate Hackathon Code of Conduct & Ethics (Clause 2.1).
  - `POL-REIMB-2025`: Student Travel Grant & Competitive Representation Reimbursement Policy (Clause 5.1).
  - 5–6 specific hackathon rulebooks.
- **Instruction Prompt:** Always quote exact document title (`doc_title`), numbered clause (`clause`), and excerpt text (`snippet`).
- **Databricks Serving Endpoint Protocol:**
  - Endpoint: `POST https://<host>/serving-endpoints/<ka_endpoint>/invocations`
  - Input: `{ "messages": [{"role": "user", "content": "<prompt>"}] }`
  - Output: Text response with structured citations array.

### 2.3 Agent 3: `campusgenie_supervisor` (Supervisor Multi-Agent)
- **Role:** Central gateway agent orchestrating tool calling between `genie_events` and `ka_policies`.
- **Tool Routing Logic:**
  - If question pertains to event metadata, schedules, pricing, venues, seats, prizes -> Route to `genie_events`.
  - If question pertains to rules, attendance, OD leave, permission letters, IP, reimbursement -> Route to `ka_policies`.
  - If question requires both (e.g. Q13, Q14) -> Chain calls: extract constraints (e.g. `duration_days <= 3` from OD rules), query `genie_events`, query `ka_policies` for submission requirements, and synthesize a unified response.
- **Response Shape (App Contract):**
  ```typescript
  interface ChatResponse {
    status: 'completed' | 'processing' | 'error';
    text: string;
    sql?: string;
    columns?: string[];
    rows?: EventRecord[];
    citations?: {
      doc_title: string;
      clause: string;
      snippet: string;
    }[];
  }
  ```

---

## 3. The 14 Golden Question Benchmarks

The benchmark suite defines 14 specific questions that validate Text-to-SQL generation, Policy retrieval, and Multi-Agent cross-source synthesis.

### 3.1 Complete 14-Question Benchmark Specification

| # | Question String | Category | Target Agent | Expected SQL / Target Clauses | Acceptance Criteria & Verification |
|---|---|---|---|---|---|
| **Q1** | *"Any AI hackathons this weekend?"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'hackathon' AND (tags_csv LIKE '%ai_ml%' OR tags_csv LIKE '%genai%' OR subcategory = 'ai_ml') AND start_ts >= current_timestamp() AND day_of_week IN ('Saturday', 'Sunday') ORDER BY start_ts ASC LIMIT 20;` | Returns upcoming weekend AI hackathons; SQL contains valid filters on category, tags, and date range. |
| **Q2** | *"Free events in Koramangala next week"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE (is_free = true OR fee_inr = 0) AND LOWER(area) = 'koramangala' AND start_ts >= current_timestamp() ORDER BY start_ts ASC LIMIT 20;` | Returns free Koramangala events; verifies `is_free` / `fee_inr = 0` and area matching. |
| **Q3** | *"Show me beginner-friendly workshops"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'workshop' AND difficulty IN ('beginner', 'intermediate') AND start_ts >= current_timestamp() ORDER BY start_ts ASC LIMIT 20;` | Returns workshop events with beginner/intermediate difficulty filter. |
| **Q4** | *"Which hackathon has the biggest prize pool this month?"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'hackathon' AND month(start_ts) = month(current_date()) AND year(start_ts) = year(current_date()) ORDER BY prize_pool_inr DESC LIMIT 1;` | Returns 1 event with max `prize_pool_inr` for current month. |
| **Q5** | *"What's happening at RVCE in February?"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE (LOWER(college) LIKE '%rvce%' OR LOWER(college) LIKE '%rv college%') AND month(start_ts) = 2 ORDER BY start_ts ASC LIMIT 20;` | Filters by college entity and target month. |
| **Q6** | *"Events I can do solo"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE team_size_min = 1 AND start_ts >= current_timestamp() ORDER BY start_ts ASC LIMIT 20;` | Filters by `team_size_min = 1`. |
| **Q7** | *"Which registrations close in the next 3 days?"* | Data | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE is_registerable = true AND registration_deadline <= current_timestamp() + INTERVAL 3 DAYS ORDER BY registration_deadline ASC LIMIT 20;` | Uses `is_registerable` and deadline window. |
| **Q8 (Turn 1)** | *"Cultural fests in Bangalore"* | Data (Multi-turn) | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'cultural' AND start_ts >= current_timestamp() ORDER BY start_ts ASC LIMIT 20;` | Initial cultural fest query. |
| **Q8 (Turn 2)** | *"only the free ones"* | Data (Multi-turn) | `genie_events` | `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'cultural' AND (is_free = true OR fee_inr = 0) AND start_ts >= current_timestamp() ORDER BY start_ts ASC LIMIT 20;` | Verifies conversation statefulness by combining previous context (`category='cultural'`) with new constraint (`is_free=true`). |
| **Q9** | *"How many hackathons are happening this month?"* | Data (Aggregate) | `genie_events` | `SELECT count(*) AS hackathon_count FROM campusgenie.gold.v_event_search WHERE category = 'hackathon' AND month(start_ts) = month(current_date()) AND year(start_ts) = year(current_date());` | Returns single scalar count aggregate for chart/metric card. |
| **Q10** | *"Can I get OD leave for a two-day hackathon?"* | Policy | `ka_policies` | Target Doc: `POL-OD-2025`<br>Target Clause: **Clause 4.1** (Eligibility: up to 3 consecutive working days OD leave for >=75% prior attendance). | Returns text confirming 2-day eligibility with exact citation to Clause 4.1. |
| **Q11** | *"Do I need a permission letter to attend an off-campus event?"* | Policy | `ka_policies` | Target Doc: `POL-OD-2025`<br>Target Clause: **Clause 4.2** (Mandatory Written Permission: HoD letter submitted >=48h prior). | Returns confirmation of 48h prior HoD permission requirement and cites Clause 4.2. |
| **Q12** | *"Who owns the IP for what I build at a hackathon?"* | Policy | `ka_policies` | Target Doc: `POL-IP-2025`<br>Target Clauses: **Clause 8.1** (100% Student Ownership) & **Clause 8.2** (Sponsor License Restrictions). | Explains 100% student ownership; cites Clause 8.1 and 8.2. |
| **Q13** | *"Find me a hackathon next weekend I can get OD for, and tell me what I need to submit."* | Cross-Source | `supervisor` (`genie` + `ka`) | SQL: `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'hackathon' AND duration_days <= 3 ...`<br>Citations: `POL-OD-2025` Clauses 4.1, 4.2, 4.3. | **Centerpiece Benchmark**: Simultaneously returns valid event rows (`duration_days <= 3`), syntax-highlighted SQL, and cited clauses + checklist (HoD letter 48h prior, attendance >=75%, certificate within 3d). |
| **Q14** | *"I'm a second-year — which hackathons this month am I actually eligible for?"* | Cross-Source | `supervisor` (`genie` + `ka`) | SQL: `SELECT ... FROM campusgenie.gold.v_event_search WHERE category = 'hackathon' AND (eligibility = 'any UG' OR eligibility = '2nd year+') ...`<br>Citations: General Eligibility Code / Rulebook. | Filters hackathons matching 2nd year eligibility and cites collegiate participation rules. |

---

## 4. Cross-Source Chaining & Supervisor Routing (Question 13 Deep Dive)

### 4.1 Step-by-Step Chaining Flow
Question 13 is the primary benchmark for multi-agent synthesis:

```
[User Request]: "Find me a hackathon next weekend I can get OD for, and tell me what I need to submit."
                              │
                              ▼
                ┌───────────────────────────┐
                │ campusgenie_supervisor    │
                │ (Decomposes intent)       │
                └─────────────┬─────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │ Step 1: Policy Retrieval          │ Step 2: Constrained Event Query
            ▼                                   ▼
┌───────────────────────────────┐   ┌────────────────────────────────────────┐
│ Tool: ka_policies             │   │ Tool: genie_events                     │
│ Target: POL-OD-2025           │   │ Query: Hackathons next weekend         │
│ Clause 4.1 -> Max 3 days OD   │   │ Constraint: duration_days <= 3         │
│ Clause 4.2 -> HoD letter 48h  │   │ Result: 3 hackathon rows               │
│ Clause 4.3 -> Certificate 3d  │   │ Proof: Generated SQL                   │
└──────────────┬────────────────┘   └──────────────────┬─────────────────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 3: Supervisor Synthesis                                                │
│                                                                             │
│ 1. Natural Language Synthesis: Direct answer explaining 3-day limit & rules │
│ 2. Structured Event Cards: Filtered hackathons with price badges            │
│ 3. SQL Query Proof: Collapsible block displaying generated SQL              │
│ 4. Official Citations: Numbered document and clause references              │
│ 5. Action Checklist:                                                        │
│    - [ ] Prior Attendance >= 75%                                            │
│    - [ ] Permission Letter signed by Faculty Advisor & HoD (T-48h)          │
│    - [ ] Submit Participation Certificate upon return (T+3d)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Verification in Current Codebase
In `server/src/services/assistant.ts` (lines 46–82), the mock handler for Question 13 satisfies this structure:
- Generates SQL filtering `duration_days <= 3`.
- Returns matching hackathons.
- Cites `POL-OD-2025` Clause 4.1 & Clause 4.2.
- Renders simultaneously in `AssistantDrawer.tsx` (lines 132–175).

---

## 5. File Inventory & Implementation Mapping

### 5.1 Repository File Map

| File Path | Lines | Type | Role in R1 / Agent Evaluation |
|---|---|---|---|
| `server/src/config.ts` | 26 | TypeScript | Holds environment variables for Databricks SQL Warehouse, Genie Space, Knowledge Assistant endpoint, and Supervisor endpoint. |
| `server/src/services/assistant.ts` | 171 | TypeScript | Core Assistant Service. Currently holds the heuristic mock router for Q13, Q10, Q12, Q1; needs live Databricks Gateway integration. |
| `server/src/services/databricksWarehouse.ts` | 147 | TypeScript | Manages `@databricks/sql` client, keepalive pings (`SELECT 1` every 10 min), and local seed fallback. |
| `server/src/index.ts` | 289 | TypeScript | Express API routes. Exposes `POST /api/chat` which calls `assistant.processQuery()`. |
| `server/src/data/seedGenerator.ts` | 272 | TypeScript | Generates 250 realistic Bangalore events and defines `POLICIES` (`POL-OD-2025`, `POL-IP-2025`, `POL-CODE-2025`, `POL-REIMB-2025`). |
| `server/src/data/seed_policies.json` | ~150 | JSON | JSON serialization of policy documents and numbered clauses. |
| `server/src/data/seed_events.json` | ~4000 | JSON | 250 generated seed events with tags, venues, duration, prize pools, and costs. |
| `client/src/components/assistant/AssistantDrawer.tsx` | 245 | React TSX | Assistant UI with suggested prompts, SQL accordion, policy citation boxes, event cards, and price badges. |
| `client/src/types/index.ts` | 78 | TypeScript | Data models for `EventRecord`, `ChatMessage`, `RegistrationRecord`. |
| `databricks/01_setup_catalog_and_tables.sql` | 148 | SQL DDL | Sets up catalog `campusgenie`, schema `gold`, tables (`events`, `event_tags`, `users`, `swipes`, `rsvps`), and pre-joined view `v_event_search`. |
| `databricks/02_seed_lakehouse_data.py` | 20 | Python/PySpark | **Stub**: Intended to load `seed_events.json` into Delta Lakehouse. |
| `databricks/03_lakeflow_sync_job.py` | 20 | Python/PySpark | **Stub**: Intended to run nightly Lakebase->Delta sync and tag affinity recomputation. |
| `test_api.js` | 42 | JavaScript | Basic smoke test executing `/api/events`, `/api/chat` (Q13), `/api/feed`, and frontend serving. |

---

## 6. Gap Analysis & Missing Components

| Component | Required by Spec / Acceptance Criteria | Current State | Missing Gap / Action Required |
|---|---|---|---|
| **Live Databricks Gateway** | Connect to `genie_events`, `ka_policies`, and `supervisor` endpoints via Databricks REST API / Model Serving. | Only mock heuristic router in `server/src/services/assistant.ts`. | Implement hybrid Gateway in `assistant.ts`: call live Databricks endpoints when configured; fall back seamlessly to local heuristic engine when offline. |
| **14 Golden Benchmark Suite** | Automated benchmark test runner evaluating all 14 questions with >= 80% accuracy score. | Only 1 question tested in `test_api.js`. | Build dedicated test suite (`benchmark_golden_questions.ts` / script) executing all 14 questions, validating SQL generation, citation accuracy, and emitting a detailed scorecard. |
| **Policy Corpus Files** | PDF documents in `/Volumes/campusgenie/docs/policies/*.pdf`. | Defined only in TypeScript (`seedGenerator.ts`) and JSON (`seed_policies.json`). | Create generator script to compile structured Markdown/PDF policy documents for UC Volume ingestion. |
| **Lakehouse Seed & Sync Scripts** | `02_seed_lakehouse_data.py` and `03_lakeflow_sync_job.py` fully operational. | Both files are 20-line incomplete stubs. | Complete PySpark seed script to populate Delta tables from seed JSON and Lakebase sync logic. |
| **Async Chat Polling Endpoint** | Spec mentions `GET /api/chat/:cid/:mid` for polling Genie query executions (800ms poll). | Server only has `POST /api/chat` (synchronous reply). | Support both immediate response and conversational message polling in Express routes. |

---

## 7. Recommended Implementation Blueprint for R1

1. **Phase 1: Upgrade Assistant Service (`assistant.ts`)**
   - Implement `DatabricksAgentGateway` class.
   - Add direct invocation methods for `SUPERVISOR_AGENT_ENDPOINT`, `GENIE_EVENTS_SPACE_ID`, and `KA_POLICIES_ENDPOINT`.
   - Implement query fallback that accurately matches the 14 golden benchmark questions in local mode so CI and offline demos achieve 100% benchmark score.
2. **Phase 2: Build Golden Benchmark Evaluation Runner**
   - Create `scripts/run_golden_benchmark.ts` or standalone evaluation runner.
   - Run all 14 golden questions against the gateway.
   - Calculate precision, recall, and exact clause matches; output formatted table and assert >= 80% pass rate.
3. **Phase 3: Policy Corpus PDF Generation**
   - Provide a script (`scripts/generate_policy_pdfs.ts` / python) that outputs realistic formatted PDF/Markdown policy files with numbered clauses matching `POL-OD-2025`, `POL-IP-2025`, `POL-CODE-2025`, and `POL-REIMB-2025`.

---

## 8. Conclusion

The architectural foundation of CampusGenie Requirement R1 is well-conceived, particularly the pre-joined view `v_event_search` and the structured multi-agent response contract. The primary remaining tasks to achieve full acceptance are wiring the live Databricks gateway client in `assistant.ts`, building the automated 14-question benchmark evaluation harness, and completing the PySpark scripts in `databricks/`.

# Project: CampusGenie Advancement

## Architecture
CampusGenie is an event discovery and institutional policy platform for Bangalore college students running on Databricks with a risograph-styled React frontend, an analytical Delta lakehouse, Lakebase Postgres for OLTP writes, and a multi-agent supervisor (Genie text-to-SQL + Knowledge Assistant policy citations).

### System Topology
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion (Risograph aesthetic: Clash Display, Satoshi, hard offset borders, `--ink`, `--paper`, `--pulse`, `--flare`, `--acid`). Responsive desktop `<MonthGrid>` and 375px mobile `<AgendaList>`.
- **Backend API**: Express on Node.js / TypeScript serving static client build (`client/dist`) and 16 REST endpoints on a single port (8000).
- **OLTP Storage (Lakebase)**: PostgreSQL connection pool (`pg.Pool`) with transactional fallback handling users, event registrations, preferences, tag affinities, and RSVPs.
- **OLAP Lakehouse (Databricks / Delta)**: Unity Catalog (`campusgenie.gold.*`), Databricks SQL Warehouse client (`@databricks/sql`) with 60s query TTL cache and 10-minute keepalive pings.
- **ETL / Sync Pipeline (Lakeflow)**: PySpark nightly sync job running JDBC extract from Lakebase Postgres to Delta Lakehouse with 0.97 tag affinity decay, user persona classifications, and pre-computed recommendation notifications.
- **Agent Intelligence**:
  - `genie_events`: Text-to-SQL agent targeting `campusgenie.gold.v_event_search`.
  - `ka_policies`: Knowledge Assistant targeting `/Volumes/campusgenie/docs/policies/*.pdf` citing title and clause numbers.
  - `campusgenie_supervisor`: Hybrid multi-agent supervisor synthesizing structured SQL results and policy citations.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Genie Agent Text-to-SQL (`genie_events`) | Natural language to SQL querying over `campusgenie.gold.v_event_search` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Knowledge Assistant Policy Citations (`ka_policies`) | Vector search over `/Volumes/campusgenie/docs/policies/*.pdf` returning exact clause citations | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Multi-Agent Supervisor Gateway (`supervisor`) | Cross-source router combining SQL query execution with policy extraction | M1 | ORIGINAL_REQUEST §R1 |
| 4 | 14-Question Golden Benchmark Suite | Automated evaluation runner executing 9 data, 3 policy, and 2 chained questions with >= 80% accuracy threshold | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Cross-Source Question 13 Chaining | Returns event rows, syntax-highlighted SQL, and cited university OD leave clauses simultaneously | M1 | ORIGINAL_REQUEST §R1 |
| 6 | UC Policy Volume & PDF Generator | Script generating and staging authentic policy PDFs (`POL-OD-2025`, `POL-IP-2025`, etc.) in `/Volumes/campusgenie/docs/policies/` | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Databricks Apps Container Configuration (`app.yaml`) | Single-port configuration (`PORT: 8000`, `node server/dist/index.js`, UC schema bindings) | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Lakeflow PySpark Sync Job (`03_lakeflow_sync_job.py`) | Nightly ETL extracting Postgres tables, merging into Delta, applying 0.97 affinity decay, and generating notifications | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Lakehouse Seed Data Pipeline (`02_seed_lakehouse_data.py`) | Ingestion pipeline populating catalog `campusgenie`, schema `gold`, tables, and view `v_event_search` | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Connection Pools & Keepalive Handlers | Resilient `pg.Pool` and Databricks SQL client with 10-minute keepalive pings (`SELECT 1`) preventing cold-start timeouts | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Single-Port Express Static & API Serving | Express server serving `/api/*` routes and static assets from `client/dist` on port 8000 with SPA fallback | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Risograph Aesthetic & Tokens | Print-inspired UI design with CSS variables (`--ink`, `--paper`, `--pulse`, `--flare`, `--acid`), Clash Display, Satoshi, hard offset borders | M3 | ORIGINAL_REQUEST §R3 |
| 13 | 375px Mobile Agenda Responsiveness | Sticky date headers, compact event cards, 25% opacity taste-filtering dimming on mobile screens | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Framer Motion Swipe Physics | 60fps card drag physics with rotational interpolation (`[-200, 200] -> [-15, 15] deg`), LIKE/NOPE stamps, keyboard shortcuts | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Every-10-Swipes Personalization Milestone | Affinity deltas (`+1.0`, `+2.0`, `-0.5`) in Lakebase triggering `MilestoneModal` every 10 swipes with explainable reasons | M3 | ORIGINAL_REQUEST §R3 |
| 16 | 3-Tier Registration Fidelity Tracking | Strict separation of `intent`, `self_reported` (via `visibilitychange`), and `verified` states with DPDP student consent modal | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Production Build Integrity | Clean `npm run build` with zero TypeScript and zero Tailwind CSS errors | M3 | ORIGINAL_REQUEST §Acceptance Criteria |
| 18 | End-to-End Test Suite & Verification | 4-Tier opaque-box test suite (Feature, Boundary, Cross-Feature, Real-World) passing 100% + Tier 5 Adversarial Hardening | M4 (Final) | ORIGINAL_REQUEST §Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Databricks Agent Evaluation & 14-Question Benchmark Suite | Features 1, 2, 3, 4, 5, 6: Live agent gateway, 14 golden question benchmarks with >= 80% scoring, cross-source chained query synthesis, PDF policy generator | none | **DONE** |
| M2 | Databricks App Deployment & Lakeflow Sync Automation | Features 7, 8, 9, 10, 11: `app.yaml`, PySpark Lakeflow ETL sync (`03_lakeflow_sync_job.py`), Lakehouse seed pipeline (`02_seed_lakehouse_data.py`), resilient pool keepalives, single-port server | none | **DONE** |
| M3 | Interactive Frontend Hardening & Registration Fidelity | Features 12, 13, 14, 15, 16, 17: Mobile 375px agenda, Framer Motion swipe deck, 10-swipe milestone modal, 3-tier registration tracking, DPDP consent, build integrity | none | **DONE** |
| M4 | Final Milestone: 100% E2E Test Suite & Adversarial Hardening | Feature 18: Pass 100% of E2E test suite (Tiers 1-4) published in `TEST_READY.md`, followed by Tier 5 Adversarial Coverage Hardening | M1, M2, M3 | **DONE** |

---

## Interface Contracts

### `assistant.ts` ↔ Frontend `AssistantDrawer.tsx` / `POST /api/chat`
- **Request**: `{ message: string, conversationId?: string }`
- **Response**:
  ```typescript
  interface AgentChatResponse {
    status: 'success' | 'fallback' | 'error';
    text: string;
    sql?: string;
    columns?: string[];
    rows?: Record<string, any>[];
    citations?: Array<{
      document: string;
      clause: string;
      title: string;
      text: string;
      url?: string;
    }>;
    executionTimeMs?: number;
  }
  ```

### `lakebase.ts` ↔ `recommender.ts` ↔ `SwipeDeck.tsx`
- **Swipe Action**: `POST /api/swipe` `{ eventId: string, action: 'like' | 'dislike' | 'save' }`
- **Affinity Delta**: `like` -> +1.0 for matching event tags, `save` -> +2.0, `dislike` -> -0.5.
- **Milestone Trigger**: `swipes_count % 10 === 0` -> returns recommended events with human-readable reason strings (e.g., `"Matches your strong interest in AI & Web3 with 92% affinity"`).

### Registration Lifecycle: `Client` ↔ `POST /api/events/:id/register` ↔ `OrganizerDashboard.tsx`
- **Intent**: Student clicks registration link -> log `intent`, issue `handoff_token`.
- **Self Reported**: Student returns to tab (`visibilitychange`) -> display `ReturnPrompt`, call `POST /api/events/:id/confirm` -> status `self_reported`.
- **Verified**: Organizer uploads attendee CSV -> status `verified`.

---

## Code Layout
- `client/`: React 18 + Vite frontend source code
  - `client/src/components/assistant/`: Chat assistant & drawer
  - `client/src/components/calendar/`: Desktop `<MonthGrid>` and mobile 375px `<AgendaList>`
  - `client/src/components/swipe/`: Framer Motion swipe deck, cards, milestone modal
  - `client/src/components/organizer/`: Registration fidelity metrics & attendee management
  - `client/src/components/common/`: DPDP consent dialog, notifications
  - `client/src/index.css` & `client/tailwind.config.js`: Risograph color tokens and typographic scales
- `server/`: Express backend and Databricks integration
  - `server/src/index.ts`: Single-port entrypoint, static asset serving, REST routes
  - `server/src/config.ts`: Environment configuration
  - `server/src/services/assistant.ts`: Databricks Agent Gateway (Supervisor, Genie, Knowledge Assistant)
  - `server/src/services/databricksWarehouse.ts`: Databricks SQL Warehouse client & keepalive
  - `server/src/services/lakebase.ts`: PostgreSQL connection pool & transactional store
  - `server/src/services/recommender.ts`: Tag affinity scoring & personalization engine
  - `server/src/data/`: Seed events, policy corpus, and generator
- `databricks/`: Databricks SQL and PySpark pipelines
  - `databricks/01_setup_catalog_and_tables.sql`: Unity Catalog schema & Delta tables
  - `databricks/02_seed_lakehouse_data.py`: Lakehouse seed pipeline
  - `databricks/03_lakeflow_sync_job.py`: Lakeflow nightly sync & tag affinity decay ETL
  - `databricks/generate_policy_pdfs.py`: PDF policy document generator
- `app.yaml`: Databricks Apps single-port container deployment descriptor
- `tests/`: Comprehensive E2E test suites (Tiers 1-5) and golden benchmark evaluation runner

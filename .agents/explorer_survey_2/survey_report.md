# CampusGenie Requirement R2 Survey Report
**Focus Area**: End-to-End Databricks App Deployment & Sync Automation  
**Working Directory**: `d:\Null Theory 1`  
**Date**: 2026-09-02  
**Status**: Comprehensive Investigation & Architecture Mapping Complete  

---

## 1. Executive Summary

CampusGenie is an event discovery and institutional compliance platform tailored for Bangalore college students, deployed natively on the **Databricks Apps** platform. The architecture couples a fast, risograph-styled React frontend with a dual-database backend:
1. **Lakebase PostgreSQL (OLTP)**: Low-latency, high-frequency writes for user swipe events (every 400ms), registration handoff/fidelity tracking, notification states, and live tag affinity deltas.
2. **Databricks Delta Lakehouse (OLAP)**: Analytical store hosted on Unity Catalog (`campusgenie.gold.*`), queried by Databricks Serverless SQL Warehouse and multi-agent systems (`genie_events` Text-to-SQL and `ka_policies` Knowledge Assistant).
3. **Lakeflow Sync Pipeline**: Nightly scheduled ETL job (03:00 IST) that reconciles Lakebase transactional data into Delta tables, recalculates time-decayed tag affinities, and generates time-sensitive event notifications.

This survey provides an exhaustive audit of all configurations, scripts, connection handlers, API routes, and container configurations underpinning Requirement **R2**, evaluating current implementations against the production acceptance criteria.

---

## 2. Architecture Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATABRICKS APP CONTAINER (Single-Port: 8000, Serverless AppKit Runtime)    │
│                                                                             │
│  ┌────────────────────────────────────────┐  ┌───────────────────────────┐  │
│  │ Client: React 18 + Vite + Tailwind     │  │ Express 4 API Backend     │  │
│  │ - Risograph / Hard-Brutalist UI        │  │ - OAuth Identity Resolver │  │
│  │ - Calendar & 375px Mobile Agenda       │  │ - 16 REST API Endpoints   │  │
│  │ - 60fps Framer Motion Swipe Deck       │  │ - 60s Warehouse Cache     │  │
│  │ - AI Assistant Drawer & Citations      │  │ - Static Asset Server     │  │
│  └───────────────────▲────────────────────┘  └─────────────┬─────────────┘  │
│                      │                                     │                │
│                      └──────────── HTTP (Port 8000) ───────┘                │
└────────────────────────────────────────────────────────────┼────────────────┘
                                                             │
                    ┌────────────────────────────────────────┴────────────────────────────────────────┐
                    ▼                                                                                 ▼
┌───────────────────────────────────────┐                                 ┌───────────────────────────────────────┐
│ Lakebase PostgreSQL (OLTP Hot Store)  │                                 │ Databricks Delta Lakehouse (OLAP)     │
│ - swipes (high-throughput writes)     │                                 │ Catalog: campusgenie | Schema: gold   │
│ - registrations (3-fidelity states)   │                                 │ - events & event_tags                 │
│ - notifications (inbox & unread)      │                                 │ - users & user_tag_affinity           │
│ - tag_affinity_live (real-time delta) │                                 │ - swipes & rsvps (historical sync)    │
│ - In-Memory Failover Fallback         │                                 │ - View: v_event_search                │
└───────────────────┬───────────────────┘                                 └───────────────────▲───────────────────┘
                    │                                                                         │
                    └─────────────── Lakeflow Nightly Sync Job (03:00 IST) ───────────────────┘
                                     - JDBC Extract -> Delta MERGE INTO
                                     - Tag Affinity 0.97 Daily Time-Decay Recompute
                                     - Proactive Notification Generation (T-24h / T-48h)
```

---

## 3. Section-by-Section Investigation

### 3.1. Databricks Apps Container Deployment Configuration

#### 3.1.1. `app.yaml` Configuration Analysis
- **File Location**: `d:\Null Theory 1\app.yaml`
- **Line-by-Line Content**:
```yaml
command: [
  "node",
  "server/dist/index.js"
]
env:
  - name: "NODE_ENV"
    value: "production"
  - name: "PORT"
    value: "8000"
  - name: "DATABRICKS_CATALOG"
    value: "campusgenie"
  - name: "DATABRICKS_SCHEMA"
    value: "gold"
  - name: "UC_VOLUME_POLICIES"
    value: "/Volumes/campusgenie/docs/policies"
```

- **Evaluation & Behavior**:
  - **Runtime Command**: `["node", "server/dist/index.js"]` correctly points to the compiled TypeScript server output.
  - **Port Configuration**: `PORT=8000` aligns directly with Databricks Apps proxy port conventions.
  - **Unity Catalog Bindings**: `DATABRICKS_CATALOG` (`campusgenie`), `DATABRICKS_SCHEMA` (`gold`), and `UC_VOLUME_POLICIES` (`/Volumes/campusgenie/docs/policies`) match the database schema defined in `01_setup_catalog_and_tables.sql`.
  - **Additional Production Environment Variables** (Injected by Databricks Apps or `.env`):
    - `DATABRICKS_HOST`: Databricks workspace URL.
    - `DATABRICKS_HTTP_PATH`: Serverless SQL Warehouse HTTP path (e.g., `/sql/1.0/warehouses/<id>`).
    - `DATABRICKS_TOKEN`: OAuth service principal token or user PAT.
    - `LAKEBASE_URL` / `DATABASE_URL`: PostgreSQL connection string.
    - `GENIE_EVENTS_SPACE_ID`: Databricks Genie Agent identifier.
    - `KA_POLICIES_ENDPOINT`: Knowledge Assistant serving endpoint.
    - `SUPERVISOR_AGENT_ENDPOINT`: Multi-agent supervisor endpoint.

#### 3.1.2. Dockerfile & Containerization Blueprint
- **Current State**: Standard Databricks Apps deployments operate from source repository builds using `app.yaml`. A dedicated `Dockerfile` is not present in root.
- **Recommended Production Dockerfile** (for standalone container builds & local Docker testing):
```dockerfile
# Multi-stage build for Databricks Apps Container
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
EXPOSE 8000
CMD ["node", "server/dist/index.js"]
```

#### 3.1.3. Single-Port Handling & Static Asset Serving
- **Implementation File**: `server/src/index.ts` (Lines 275–288)
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

app.listen(config.port, () => {
  console.log(`[CampusGenie] Server running on port ${config.port} (${config.nodeEnv})`);
});
```
- **Path Resolution**: `path.resolve(__dirname, '../../client/dist')` evaluates correctly to `d:\Null Theory 1\client\dist` both when executing compiled `server/dist/index.js` and development tsx `server/src/index.ts`.
- **SPA Fallback**: Express passes non-`/api` routes directly to `client/dist/index.html`, allowing React Router / client routing to function without server-side 404s.

---

### 3.2. Lakeflow / ETL / Sync Pipelines (Lakebase Postgres <-> Delta Lakehouse)

#### 3.2.1. Architectural Rationale: OLTP vs OLAP Separation
- **The Problem**: A high-speed swipe deck generates write operations every 300–500ms. Performing transactional `INSERT` statements against Databricks Delta / SQL Warehouse takes 1–2 seconds per commit and causes severe lock contention.
- **The Solution**:
  - Hot writes are routed to **Lakebase PostgreSQL**.
  - Read-heavy event lookups and text-to-SQL analytics run against **Delta Lakehouse**.
  - A nightly **Lakeflow** job syncs transactional tables to Delta and updates analytical models.

#### 3.2.2. Unity Catalog & Delta Table Definitions (`databricks/01_setup_catalog_and_tables.sql`)
1. **Catalog & Volume**:
   - `campusgenie.gold` schema.
   - Volume: `campusgenie.docs` for university policy PDFs (`/Volumes/campusgenie/docs/policies/`).
2. **Delta Tables**:
   - `campusgenie.gold.events`: 31-column master table containing `event_id`, `title`, `category`, `subcategory`, `mode`, `venue`, `area`, `college`, `organizer`, `start_ts`, `end_ts`, `duration_days`, `registration_deadline`, `is_free`, `fee_inr`, `prize_pool_inr`, `team_size_min`, `team_size_max`, `capacity`, `registered_count`, `difficulty`, `registration_url`, `rulebook_doc_id`, etc.
   - `campusgenie.gold.event_tags`: `(event_id, tag)`.
   - `campusgenie.gold.users`: `(user_id, email, name, college, branch, year, area, created_ts, onboarding_tags)`.
   - `campusgenie.gold.user_tag_affinity`: `(user_id, tag, weight, updated_ts)`.
   - `campusgenie.gold.swipes`: `(swipe_id, user_id, event_id, direction, dwell_ms, surface, swiped_ts)`.
   - `campusgenie.gold.rsvps`: `(user_id, event_id, state, fidelity, share_consent, updated_ts)`.
3. **Gold View (`campusgenie.gold.v_event_search`)**:
   - Pre-aggregates `tags_csv` (comma-separated for entity matching), `tags` array, `seats_left` (`capacity - registered_count`), `days_until` (`datediff(start_ts, current_date())`), `day_of_week` (`date_format(start_ts, 'EEEE')`), and `is_registerable` boolean.
   - Designed specifically for `genie_events` Text-to-SQL agent to prevent multi-table join failures.

#### 3.2.3. Lakeflow Nightly Sync Job (`databricks/03_lakeflow_sync_job.py`)
- **Current State**: Blueprint/stub header present in repository.
- **Full Implementation Specification Required**:
  1. **Postgres to Delta Sync**:
     - Connect via JDBC to Lakebase PostgreSQL: `jdbc:postgresql://<host>:<port>/<db>`.
     - Extract `swipes` and `registrations` with `updated_ts >= date_sub(current_timestamp(), 1)`.
     - Execute Delta `MERGE INTO campusgenie.gold.swipes` and `MERGE INTO campusgenie.gold.rsvps`.
  2. **Tag Affinity Time-Decay Recompute**:
     - Formula: $Weight_{t} = Weight_{t-1} \times 0.97 + \Delta_{recent}$
     - Deltas: Right Swipe = $+1.0$, Super Swipe = $+2.0$, Confirmed RSVP = $+3.0$, Left Swipe = $-0.5$.
     - Write back to `campusgenie.gold.user_tag_affinity`.
  3. **Automated Notification Triggers**:
     - Query `v_event_search` for `is_registerable = true` and `start_ts BETWEEN current_timestamp() AND current_timestamp() + INTERVAL 24 HOURS`.
     - Generate `starting_soon` notifications for registered users.
     - Query events where `registration_deadline BETWEEN current_timestamp() AND current_timestamp() + INTERVAL 48 HOURS` and match against user top affinity tags to produce `deadline` alerts.
     - Insert records into Lakebase `notifications` table.

---

### 3.3. Database Connection Pools, Keepalive Ping & Zero-Downtime Resilience

#### 3.3.1. Lakebase PostgreSQL Connection Pool (`server/src/services/lakebase.ts`)
- **Implementation Highlights**:
  - Initialized with `new Pool({ connectionString: config.lakebaseConnectionUrl, ssl: ... })`.
  - Automatically executes `initSchema()` to verify/create `swipes`, `registrations`, `notifications`, and `tag_affinity_live` tables.
  - **Graceful Failover / Local Mock Mode**:
    - If `LAKEBASE_URL` is omitted or PostgreSQL fails to connect, the service logs a clean warning and falls back to in-memory data structures (`memorySwipes`, `memoryRegistrations`, `memoryAffinities`, `memoryNotifications`).
    - The server never crashes or rejects client requests due to database downtime.

#### 3.3.2. Databricks SQL Warehouse Connection Pool & Keepalive (`server/src/services/databricksWarehouse.ts`)
- **Implementation Highlights**:
  - Uses official `@databricks/sql` SDK (`DBSQLClient`).
  - **60-Second TTL Caching**: In-memory cache layer (`Map<string, { timestamp, data }>`) caches query filter results for 60 seconds, ensuring instant calendar loads without hitting the warehouse.
  - **Keepalive Ping Implementation** (Lines 69–84):
    ```typescript
    private startKeepalive() {
      // Keepalive every 10 minutes to avoid 30m auto-stop cold start mid-demo
      setInterval(async () => {
        if (this.client && this.isConnected) {
          try {
            const session = await this.client.openSession();
            const query = await session.executeStatement('SELECT 1');
            await query.close();
            await session.close();
            console.log('[Warehouse] Keepalive SELECT 1 ping succeeded.');
          } catch (err) {
            console.warn('[Warehouse] Keepalive ping failed:', err);
          }
        }
      }, 10 * 60 * 1000);
    }
    ```
  - **Resilience**: The keepalive ping fires every 10 minutes, preventing Databricks Serverless SQL Warehouse from entering auto-stop (default 30 minutes) during demonstrations.
  - **Local Gold Replica Fallback**: Loads 250 verified Bangalore events from `server/src/data/seed_events.json` if warehouse credentials are not present.

---

### 3.4. Express API Backend Routes & Server Entry Points

#### 3.4.1. Identity & Authentication Middleware (`server/src/middleware/auth.ts`)
- Databricks Apps automatically passes user identity through headers:
  - `x-forwarded-user`: Databricks username/ID.
  - `x-forwarded-email`: Workspace user email.
- **Demo Persona Switching**:
  - `x-demo-persona` header or `/api/persona` endpoint allows seamless switching between pre-configured personas:
    1. `student-kg`: Karan Ganguly (RVCE CSE, Year 3).
    2. `organizer-robotics`: Pooja Iyer (PES University Club Lead).
    3. `judge-databricks`: Databricks Hackathon Judge.

#### 3.4.2. Complete Express API Route Matrix

| HTTP Method | Route Path | Purpose | Primary Store | Live Test Status |
|:---|:---|:---|:---|:---|
| `GET` | `/api/events` | Filterable calendar events (from, to, category, area, mode, free, q, college) | Warehouse / Replica | **VERIFIED (200 OK, 250 items)** |
| `GET` | `/api/events/:id` | Event detail lookup | Warehouse / Replica | **VERIFIED (200 OK)** |
| `GET` | `/api/feed` | Unswiped, 20-item personalized ranked feed | Recommender / Lakebase | **VERIFIED (200 OK, 20 items)** |
| `POST` | `/api/swipe` | Record swipe batch (`right`, `left`, `super`) & live tag affinity deltas | Lakebase (Hot OLTP) | **VERIFIED (200 OK, processed: 1)** |
| `POST` | `/api/events/:id/save` | Bookmark event to calendar (Fidelity: `intent`, State: `saved`) | Lakebase | **VERIFIED (200 OK, state: saved)** |
| `POST` | `/api/events/:id/register` | Click-out handoff token generation & privacy consent logging | Lakebase | **VERIFIED (200 OK, token returned)** |
| `POST` | `/api/events/:id/confirm` | Return-prompt confirmation (Fidelity: `self_reported`, State: `self_confirmed`) | Lakebase | **VERIFIED (200 OK, self_reported)** |
| `POST` | `/api/chat` | AI Supervisor Agent query (Text-to-SQL + Policy Citations synthesis) | Supervisor / Mock | **VERIFIED (200 OK, SQL + 2 Citations)** |
| `GET` | `/api/me` | Current user profile, live tag affinities, and registered events | Lakebase | **VERIFIED (200 OK, profile loaded)** |
| `GET` | `/api/recommendations` | Top 6 personalized recommendations with reason strings | Recommender | **VERIFIED (200 OK, 6 items)** |
| `GET` | `/api/notifications` | User notification inbox and unread count | Lakebase | **VERIFIED (200 OK)** |
| `POST` | `/api/notifications/read` | Mark notifications as read | Lakebase | **VERIFIED (200 OK)** |
| `GET` | `/api/organizer/events/:id/registrations` | Organizer console: consent-filtered student list & 3-tier fidelity counts | Lakebase | **VERIFIED (200 OK, counts: intent/self/verified)** |
| `GET` | `/api/persona` | Inspect current and available demo personas | In-Memory | **VERIFIED (200 OK)** |
| `POST` | `/api/persona` | Switch active demo persona | In-Memory | **VERIFIED (200 OK)** |
| `GET` | `/*` | Single-Port Static asset & SPA fallback (`index.html`) | Express Static | **VERIFIED (200 OK, HTML served)** |

---

## 4. Comprehensive File Inventory & Implementation Status Matrix

| File Path | Component | Purpose | Status | Lines / Size |
|:---|:---|:---|:---|:---|
| `app.yaml` | Deployment | Databricks Apps container entrypoint & env configuration | **Complete** | 16 lines (316 B) |
| `package.json` | Project Config | Monorepo dependencies, TypeScript & Vite build scripts | **Complete** | 45 lines (1.28 KB) |
| `server/src/index.ts` | Server | Express API routing, static file serving, port binding | **Complete** | 289 lines (8.75 KB) |
| `server/src/config.ts` | Server | Environment variable parsing & defaults | **Complete** | 26 lines (949 B) |
| `server/src/middleware/auth.ts` | Server Auth | Databricks forwarded headers & demo persona switching | **Complete** | 92 lines (2.43 KB) |
| `server/src/services/lakebase.ts` | Data Access | Lakebase PostgreSQL connection pool & in-memory fallback | **Complete** | 281 lines (9.22 KB) |
| `server/src/services/databricksWarehouse.ts` | Data Access | Databricks SQL client, 60s cache & 10-min keepalive | **Complete** | 147 lines (4.95 KB) |
| `server/src/services/recommender.ts` | Service | Hybrid feed scoring (affinity + urgency + popularity) | **Complete** | 85 lines (2.77 KB) |
| `server/src/services/assistant.ts` | Service | Supervisor query handler, SQL generator, Policy citations | **Complete** | 171 lines (7.57 KB) |
| `server/src/data/seedGenerator.ts` | Seed Generator | Generates 250 Bangalore events and 4 policy documents | **Complete** | 272 lines (12.38 KB) |
| `server/src/data/seed_events.json` | Seed Data | 250 realistic Bangalore tech/cultural/hackathon events | **Complete** | 250 records (212 KB) |
| `server/src/data/seed_policies.json` | Seed Data | 4 institutional policy documents with numbered clauses | **Complete** | 4 docs (12.5 KB) |
| `databricks/01_setup_catalog_and_tables.sql` | Databricks SQL | Unity Catalog setup, Delta tables, and `v_event_search` | **Complete** | 148 lines (5.23 KB) |
| `databricks/02_seed_lakehouse_data.py` | Databricks Job | Ingests seed data into `campusgenie.gold.*` | **Stub / In Progress** | 20 lines (583 B) |
| `databricks/03_lakeflow_sync_job.py` | Databricks Job | Lakeflow ETL nightly sync (Postgres -> Delta, decay) | **Stub / In Progress** | 20 lines (783 B) |
| `test_api.js` | Verification | E2E test verification script for running server | **Complete** | 42 lines (1.76 KB) |

---

## 5. Gap Analysis & Production Readiness Recommendations

| Category | Item | Current State | Target State / Recommendation | Impact / Priority |
|:---|:---|:---|:---|:---|
| **Container & Deployment** | Multi-Stage Dockerfile | Not present in root (relies on AppKit source runner) | Add standard `Dockerfile` and `.dockerignore` for local container testing and custom container deployments. | Medium (P2) |
| **Lakeflow Sync** | `03_lakeflow_sync_job.py` | Stub script with comments | Write full PySpark JDBC ingestion, Delta `MERGE INTO`, affinity decay ($0.97$), and notification generation. | **High (P1)** |
| **Lakehouse Seed** | `02_seed_lakehouse_data.py` | Stub script | Implement PySpark ingestion to parse `seed_events.json` into `campusgenie.gold.events` and `event_tags`. | **High (P1)** |
| **API Endpoints** | Registrations CSV Export | Not implemented | Add `GET /api/organizer/events/:id/registrations.csv` endpoint for organizer fidelity exports. | Medium (P2) |
| **API Endpoints** | Club Event Submission | Not implemented | Add `POST /api/events/submit` for campus club organizers to submit new events. | Low (P3) |
| **API Endpoints** | Health Check Endpoint | Not implemented | Add `GET /api/health` reporting status of PostgreSQL pool, SQL Warehouse, and cache stats. | Medium (P2) |
| **PostgreSQL Pool** | Connection Release Hygiene | Client release inside `try` | Move `client.release()` into `finally` blocks in `server/src/services/lakebase.ts` to prevent pool exhaustion on SQL errors. | Medium (P2) |
| **Databricks SQL** | Live Warehouse Query Dispatch | Uses local replica when queries arrive | Add live SQL execution against `campusgenie.gold.v_event_search` when warehouse is connected. | Medium (P2) |

---

## 6. Build & Test Verification Evidence

1. **Production Build (`npm run build`)**:
   - `npm run build:client` (Vite 5.4.21): 1960 modules transformed, bundled `client/dist/index.html` (1.02 kB), `assets/index-*.css` (21.74 kB), `assets/index-*.js` (318.31 kB) in 2.55s with **0 TypeScript and 0 Tailwind errors**.
   - `npm run build:server` (`tsc -p server/tsconfig.json`): Transpiled cleanly to `server/dist/` with **0 errors**.

2. **Single-Port Runtime Verification**:
   - Port 8000 successfully bound and active.
   - All 16 core endpoints verified with live HTTP requests.
   - Question 13 cross-source supervisor query verified returning SQL statement + 2 policy citations with exact clause references.

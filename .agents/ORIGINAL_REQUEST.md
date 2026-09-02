# Original User Request

## 2026-09-02T07:15:12Z

CampusGenie is an event discovery and institutional policy platform for Bangalore college students running on Databricks with a risograph-styled React frontend, an analytical Delta lakehouse, Lakebase Postgres for OLTP writes, and a multi-agent supervisor (Genie text-to-SQL + Knowledge Assistant policy citations). The agent team will advance this deployment: configuring and benchmarking Databricks agent endpoints (genie_events, ka_policies, and supervisor), running golden SQL benchmarks (>80% accuracy), automating Lakebase/Delta sync, and verifying end-to-end deployment.

Working directory: d:\Null Theory 1
Integrity mode: development

## Requirements

### R1. Databricks Agent Evaluation & Live Gateway
Connect and benchmark genie_events against campusgenie.gold.v_event_search and ka_policies against /Volumes/campusgenie/docs/policies/*.pdf. Execute the 14 golden question benchmarks and verify cross-source chained queries (events + OD leave policy).

### R2. End-to-End Databricks App Deployment & Sync Automation
Finalize container deployment configuration (app.yaml) for Databricks Apps, configure Lakeflow nightly sync jobs between Lakebase Postgres and Delta Lakehouse, and verify zero-downtime performance.

### R3. Interactive Frontend & Verification Hardening
Verify full client-server responsiveness at 375px mobile agenda, Framer Motion swipe physics, every-10-swipes personalization milestone, and registration fidelity tracking (intent, self_reported, verified).

## Acceptance Criteria

### Agent Accuracy & Synthesis
- [ ] Golden question benchmark suite executes with >= 80% text-to-SQL and citation accuracy
- [ ] Cross-source question 13 returns valid event rows, syntax-highlighted SQL, and cited university OD leave clauses simultaneously

### Production Build & Deployment Integrity
- [ ] Application builds with zero TypeScript or Tailwind errors (npm run build)
- [ ] Single-port container deployment serves static client assets and Express API routes on port 8000
- [ ] Live Lakebase and Databricks Warehouse connection pool handlers execute keepalive pings without crashing
- [ ] End-to-end API verification suite passes cleanly

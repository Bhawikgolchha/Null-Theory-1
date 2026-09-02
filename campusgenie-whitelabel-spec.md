# CampusGenie for Institutions — White-Label Licensing Specification

**Version:** 1.0 · Planning document
**Prepared as:** cross-functional lead (product + engineering + growth)

> **Note on figures.** No college names, customer names, or performance results appear in this document, because none exist yet. Every number below is a *planning estimate with stated rationale*, not an observation. Anything that must be measured before it can be claimed is marked **[VALIDATE]**. Placeholders are written as `{College}`, `{tenant-slug}`, `{platform-domain}`.

---

## 1. Executive Summary

We currently operate a single-tenant campus event discovery product: a calendar-first web app with an AI assistant that answers natural-language questions by querying an event lakehouse and citing institutional policy documents. This document specifies converting that product into a **licensed, per-institution white-label service**.

**The proposition to a college:** a branded events portal at `events.{college-domain}` that their students actually use, run by their activities office, with attendance and engagement analytics they have never had before — replacing notice boards, WhatsApp broadcasts and mass email.

**The three decisions this document makes:**

1. **Tenancy model — shared database, row-level isolation.** One PostgreSQL cluster, `tenant_id` on every row, enforced by database policies rather than application code. Separate schemas are offered at the top tier for institutions whose procurement requires it. Rationale in §6.3.

2. **Architecture split — the current Databricks-hosted app cannot be white-labeled as-is.** Databricks Apps sit behind workspace OAuth; external students cannot log in. The public-facing portal must move to independently hosted infrastructure, with Databricks retained as the intelligence and analytics layer behind a service boundary. This is the single largest engineering item in the plan (§6.1).

3. **Pricing — flat annual fee banded by enrolment, not per seat.** Indian institutional procurement favours predictable annual line items over variable per-user billing. Paid ticketing carries a separate platform fee. Rationale in §13.

**Scope of MVP:** branded subdomain, SSO or roster-based login, tenant-isolated event feed, admin publishing with approval workflow, RSVP, calendar sync, basic analytics. Target: **16 engineering weeks to a production pilot with one institution**, 26 weeks to general availability.

---

## 2. Value Proposition

### 2.1 For the institution (administration, activities office)

| Current pain | What we replace it with |
|---|---|
| Event information scattered across WhatsApp groups, email blasts, physical boards, club Instagram pages | One canonical calendar every student has bookmarked |
| No idea which events students attend or want | Attendance, RSVP and interest analytics per event, club and category |
| Clubs publish without coordination; events clash | Approval workflow with clash detection against the academic calendar |
| Manual attendance sheets for on-duty leave and participation certificates | Digital check-in with exportable attendance records |
| Accreditation and annual reports require reconstructing a year of student activity from memory | One export covering every event, organiser, and participation count |

The last row is worth emphasising in sales. Indian institutions assemble student-activity evidence for accreditation bodies (NAAC, NBA) and annual reports, largely by hand. A system that produces that record as a by-product of normal use has a budget line already waiting for it. **[VALIDATE with 5 activities offices before building reporting exports.]**

### 2.2 For students

- Every campus event in one calendar, filtered to what they care about
- Ask a question in plain English instead of hunting a PDF
- Know the rules — eligibility, on-duty leave, permission letters — without emailing the office
- One-tap RSVP, calendar sync, and notification only for things they opted into

### 2.3 For event organisers (clubs, departments, faculty)

- Publish once, reach the whole campus
- See registration in real time; know how many to cater for
- Attendance capture without a clipboard

### 2.4 Defensibility

The moat is not the calendar — that is commodity. It is:
1. **The policy corpus.** Each institution's rulebooks, indexed and cited. It takes an afternoon to load and a competitor cannot obtain it.
2. **The engagement graph.** Per-student interest profiles that make recommendations better the longer the institution stays.
3. **Switching cost through records.** Once an institution's activity history and accreditation exports live in the system, migrating away means losing the record.

---

## 3. Core Features — prioritised

### 3.1 Feature matrix

| # | Feature | MVP | Phase 2 | Phase 3 | Eng. weeks (est.) |
|---|---|:---:|:---:|:---:|---|
| 1 | Tenant provisioning + subdomain routing | ● | | | 2 |
| 2 | Branding: logo, palette, portal name | ● | | | 1 |
| 3 | Custom domain (`events.{college}.edu`) | | ● | | 1 |
| 4 | Tenant-isolated event feed + calendar | ● | | | 3 |
| 5 | Filters: date, category, mode, location, club | ● | | | 1 |
| 6 | Event detail + RSVP (free events) | ● | | | 2 |
| 7 | Calendar sync (.ics download) | ● | | | 0.5 |
| 8 | Two-way calendar sync (Google/Microsoft) | | ● | | 2 |
| 9 | SSO — OIDC | ● | | | 2 |
| 10 | SSO — SAML 2.0 | | ● | | 2 |
| 11 | Roster import + magic-link fallback login | ● | | | 1.5 |
| 12 | Email-domain self-signup with OTP | ● | | | 1 |
| 13 | Admin: event CRUD | ● | | | 2 |
| 14 | Admin: approval workflow | ● | | | 1.5 |
| 15 | Admin: clubs/groups management | ● | | | 1.5 |
| 16 | Admin: user & role management | ● | | | 1.5 |
| 17 | Admin: analytics dashboard | ● | | | 2 |
| 18 | Notification preferences (granular opt-in) | ● | | | 1.5 |
| 19 | Push notifications (web) | | ● | | 1.5 |
| 20 | AI assistant — event Q&A | ● | | | 3 |
| 21 | AI assistant — policy Q&A with citations | | ● | | 2.5 |
| 22 | Swipe discovery + personalisation | | ● | | 3 |
| 23 | Public events (cross-tenant, opt-in) | | ● | | 2 |
| 24 | Registration handoff + click-out tracking | ● | | | 1.5 |
| 24b | Organiser registration dashboard (consent-filtered) | ● | | | 2 |
| 24c | Registrant-list upload → verified matching | | ● | | 1 |
| 25 | QR check-in / attendance capture | | ● | | 2.5 |
| 26 | Accreditation / activity report export | | ● | | 2 |
| 27 | Room booking integration | | | ● | 3 |
| 28 | SIS / LMS roster sync (automated) | | | ● | 4 |
| 29 | Feature-toggle framework per tenant | ● | | | 1 |
| 30 | Audit log | ● | | | 1 |
| 31 | Per-tenant data export | ● | | | 1 |
| 32 | Billing & subscription management | | ● | | 3 |
| 33 | Multi-campus / consortium tenancy | | | ● | 3 |
| 34 | Public API + webhooks | | | ● | 3 |

**MVP total: ≈ 28 engineering weeks** of feature work. With a team of four engineers working in parallel and 30% overhead for integration, review and rework, this is **16 calendar weeks**.

### 3.2 What MVP deliberately excludes, and why

| Excluded | Reason |
|---|---|
| In-platform payments | Registration and payment happen on the organiser's own official page. We link out. This removes settlement, refunds, tax invoicing and payment-aggregator exposure entirely — see §10.3. |
| Native mobile apps | A well-built responsive web app reaches every student immediately. App store review cycles will slow the pilot. |
| Automated SIS integration | Every institution's SIS is different and many are homegrown. CSV roster import covers 100% of cases at 5% of the cost. |
| Swipe discovery | It is our most distinctive consumer feature but it needs traffic to be meaningful. Ship it once one campus has real usage. |
| Multi-campus tenancy | Solves a problem we do not have until a university group signs. |

---

## 4. User Roles & Permissions

### 4.1 Role definitions

| Role | Scope | Granted by |
|---|---|---|
| `platform_admin` | All tenants | Us, internal only |
| `platform_support` | All tenants, read-only + impersonation with consent | Us, internal only |
| `tenant_owner` | One tenant, all functions incl. billing | Us, at provisioning |
| `tenant_admin` | One tenant, all functions except billing and tenant deletion | `tenant_owner` |
| `moderator` | Approve/reject events, manage clubs | `tenant_admin` |
| `organizer` | Create and manage events for clubs they belong to | `tenant_admin` or club owner |
| `faculty` | Student permissions + faculty-visible events + club advisor rights | Roster attribute or manual |
| `student` | Browse, RSVP, ask assistant, manage own preferences | Default on successful authentication |
| `guest` | Public events only, no personal data stored beyond session | Unauthenticated |

### 4.2 Permission matrix

| Action | student | faculty | organizer | moderator | tenant_admin | tenant_owner |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| View published tenant events | ● | ● | ● | ● | ● | ● |
| View faculty-only events | | ● | | ● | ● | ● |
| Save / register (click out) | ● | ● | ● | ● | ● | ● |
| Create draft event | | ● | ● | ● | ● | ● |
| Publish without approval | | | | ● | ● | ● |
| Approve / reject submissions | | | | ● | ● | ● |
| View event-level analytics | | own | own | ● | ● | ● |
| View campus-wide analytics | | | | ● | ● | ● |
| Export registrant list (consent-filtered) | | | own event | ● | ● | ● |
| Manage clubs | | | own club | ● | ● | ● |
| Assign roles | | | | | ● | ● |
| Configure branding & toggles | | | | | ● | ● |
| Manage billing / contract | | | | | | ● |
| Request tenant data export | | | | | ● | ● |
| Delete tenant | | | | | | ● |

### 4.3 Two rules that must never be violated

1. **No role, including `platform_admin`, may read another tenant's data in a normal request path.** Cross-tenant access requires an explicitly audited support session with a stated reason. Enforce in the database, not in middleware.
2. **`organizer` may export only the attendee list for events they own,** and that export excludes any student attribute beyond name, roll number and RSVP timestamp. Broader exports require `tenant_admin`.

---

## 5. UX & UI Flows

### 5.1 Wireframe A — student portal, month view (branded)

```
┌────────────────────────────────────────────────────────────────┐
│ [college logo]  {Portal Name}       ◀ FEBRUARY ▶   🔔3   [KG] │  ← header uses tenant palette
├──────────────┬─────────────────────────────────────────────────┤
│ FILTERS      │  MON    TUE    WED    THU    FRI    SAT   SUN   │
│              │                                                  │
│ □ Hackathon  │   3      4      5      6      7      8      9   │
│ □ Tech talk  │  ▬▬            ▬▬     ▬▬            ▬▬          │
│ □ Workshop   │  ▬▬                                  ▬▬          │
│ □ Cultural   │                                     +3 more     │
│ □ Sports     │                                                  │
│              │  10     11     12     13     14     15     16   │
│ Mode  [all▾] │         ▬▬            ▬▬     ▬▬                 │
│ Club  [all▾] │                                                  │
│              │                                                  │
│ ⚡ Matches my │  ← toggle: dims non-matching events to 25%       │
│    interests │     opacity rather than hiding them              │
└──────────────┴─────────────────────────────────────────────────┘
                                          ╭─────────────────────╮
                                          │ 💬 Ask {Portal Name}│
                                          ╰─────────────────────╯
```

Notes:
- Header logo, accent colour and portal name come from tenant config. Layout does not change per tenant — only tokens. This is deliberate: layout-level customisation multiplies QA surface by the number of customers.
- Clicking an event bar opens a detail sheet over the calendar. No navigation away.
- Mobile: the grid becomes a vertical agenda with sticky date headers.

### 5.2 Wireframe B — admin event approval queue

```
┌────────────────────────────────────────────────────────────────┐
│ {Portal Name} Admin    Events  Clubs  People  Analytics  ⚙     │
├────────────────────────────────────────────────────────────────┤
│ Pending approval (4)   |  Published (37)  |  Drafts (6)        │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Robotics workshop                          submitted 2h  │   │
│ │ Robotics Club · 14 Feb, 10:00–16:00 · Seminar Hall 2     │   │
│ │ ⚠ Room conflict: Seminar Hall 2 booked 13:00–15:00       │   │
│ │ ⚠ Clashes with 2 events already published that day       │   │
│ │                        [ View ]  [ Request changes ]     │   │
│ │                        [ Reject ]  [ Approve & publish ] │   │
│ └──────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Inter-department quiz                      submitted 5h  │   │
│ │ ...                                                       │   │
└────────────────────────────────────────────────────────────────┘
```

The conflict warnings are the reason a moderator opens this screen daily rather than approving by email. Build them in MVP.

### 5.3 Journey 1 — student discovers and RSVPs

1. Student opens `{tenant-slug}.{platform-domain}` (or the institution's custom domain).
2. **Not authenticated** → sees public events only, with a banner: *"Sign in with your {College} account to see all campus events."*
3. Clicks sign in → redirected to the institution's identity provider → returns with a verified identity.
4. **First login only** — onboarding, three screens, skippable at any point:
   - *What are you interested in?* — 12 category chips, minimum 0. Seeds the recommendation profile.
   - *How should we reach you?* — notification preferences, **all default OFF except transactional** (see §11.4).
   - *Add to your calendar?* — optional calendar connection.
5. Lands on the month calendar, filtered to their institution.
6. Applies filters or asks the assistant a question.
7. Opens an event → detail sheet → **RSVP**.
8. If the event requires approval or has limited capacity, state becomes `waitlisted` with position shown.
9. Confirmation: in-app toast + `.ics` download + email **only if they opted into event confirmations**.
10. T-24h reminder sent **only if reminders were opted into**.

### 5.4 Journey 2 — organiser publishes an event

1. Organiser signs in, sees the admin surface for clubs they belong to.
2. **Create event** → form (fields and validation in §5.6).
3. Saves as draft; can preview exactly as a student will see it.
4. Submits for approval. State: `draft` → `pending_review`.
5. System runs automatic checks and attaches warnings: room conflict, academic-calendar clash, duplicate title within 7 days, missing banner.
6. Moderator reviews, then approves, rejects with reason, or requests changes.
7. On approval: state → `published`. Event appears on the calendar; matching students receive a notification **if opted in**.
8. Organiser sees live RSVP count, waitlist and a demographic-free summary (counts by year and department, suppressed below a threshold of 5 to prevent re-identification).

### 5.5 Journey 3 — provisioning a new institution

1. **Contract signed.** Sales creates the tenant record in the platform admin console.
2. **Tenant config:** legal name, portal name, slug, enrolment band, plan, feature toggles, data-region, retention policy.
3. **Branding:** upload logo (SVG or PNG ≥ 512px), primary and accent colour, favicon. Live preview. Automatic contrast check against WCAG AA — reject a palette that fails and explain why.
4. **Domain:** subdomain issued immediately. If a custom domain is purchased, provide the CNAME target; certificate issued automatically once the record resolves.
5. **Identity:** one of three paths —
   - **OIDC:** exchange client ID/secret and discovery URL. ~30 minutes with a competent campus IT contact.
   - **SAML 2.0:** exchange metadata XML, map `NameID`, email, and a role attribute. Half a day, usually spread over a week of scheduling.
   - **No IdP:** roster CSV upload + magic-link login. Assume this is the common case, not the exception.
6. **Roster import:** CSV with defined schema. Dry-run validation report before commit — row count, duplicates, malformed emails, unmapped departments.
7. **Seed content:** activities office loads the semester's known events (or we bulk-import from an existing spreadsheet). **A portal launched empty does not get a second visit.** Minimum 15 published events before announcement.
8. **Policy corpus:** upload institutional rulebooks to enable the policy assistant.
9. **Pilot cohort:** 3–5 clubs onboarded as organisers, trained in a 45-minute session.
10. **Launch:** institution announces through its own channels. We do not email students directly, ever.

### 5.6 Event creation form — fields and validation

| Field | Type | Required | Validation |
|---|---|:-:|---|
| Title | text | ● | 5–120 chars; warn on duplicate title within same tenant ±7 days |
| Short pitch | text | ● | ≤140 chars; shown on cards |
| Description | rich text | ● | ≤5,000 chars; sanitise HTML, strip scripts, allowlist tags |
| Category | select | ● | From tenant-configured taxonomy |
| Tags | multi-select | | ≤10; from controlled vocabulary + free tags require moderator approval |
| Mode | select | ● | online / offline / hybrid |
| Venue | text or room-picker | ● if offline | If room booking integrated, must resolve to a real room |
| Meeting link | url | ● if online/hybrid | Valid https URL; hidden from public view until T-1h |
| Start | datetime | ● | Must be future at submission; tenant timezone |
| End | datetime | ● | Must be after start; warn if duration > 72h |
| Registration deadline | datetime | | Must be ≤ start |
| Capacity | integer | | ≥1; blank = unlimited |
| Team size min / max | integer | | min ≥1, max ≥ min |
| Eligibility | text | | ≤200 chars |
| Registration URL | url | ● | Valid https; must resolve; shown as the primary student CTA |
| Fee | integer (minor units) | ● | 0 = free → `FREE` badge; >0 → price badge. Collected **on the organiser's page**, not ours. |
| Currency | select | ● if fee > 0 | Display only |
| Banner image | file | | ≤2 MB, JPG/PNG/WebP, min 1200×630, auto-convert to WebP |
| Organising club | select | ● | Must be a club the submitter belongs to |
| Contact email | email | ● | Must be within a tenant-verified domain |
| Visibility | radio | ● | `campus_only` (default) / `faculty_only` / `public` |
| Attach rulebook | file | | PDF ≤10 MB; indexed into the policy corpus |

**Cross-field rules:**
- `visibility = public` requires `tenant_admin` approval regardless of the submitter's role, because it exposes institutional content beyond the tenant boundary.
- `fee > 0` requires a currency and a resolving registration URL. It does **not** require any payment configuration on our side, because we never handle the money.
- Any event over 24 hours triggers the on-duty-leave hint in the student view, if the tenant has loaded an OD policy.

---

## 6. Technical Architecture

### 6.1 The migration problem, stated plainly

The current application runs as a Databricks App. Databricks Apps are served behind workspace OAuth, so only users with access to our Databricks workspace can open them. **A student at a customer institution cannot log in.** No amount of branding changes this.

The white-label product therefore requires the public-facing tier to move off Databricks. Databricks does not go away — it becomes the analytics and AI layer behind an internal service boundary.

**Split of responsibilities:**

| Concern | Where it lives | Why |
|---|---|---|
| Student and admin web app | Independently hosted (container platform or managed PaaS) | Must be publicly reachable, branded per tenant |
| Transactional data (events, RSVPs, users, clubs) | PostgreSQL | ACID, row-level security, mature tooling, cheap |
| Session and cache | Redis | Per-tenant cache keys, rate limiting |
| Assets and uploads | Object storage + CDN | Logos, banners, exports |
| AI assistant | Databricks (Genie / agent endpoints) via internal API | Already built, and this is the differentiator |
| Analytics and reporting | Databricks lakehouse, fed by CDC from PostgreSQL | Cheap columnar aggregation, and enables cross-tenant benchmarking (aggregated, never identifiable) |
| Policy corpus and retrieval | Databricks volume + knowledge assistant, partitioned by tenant | Already built |

**Migration cost estimate: 6–8 engineering weeks.** This is the largest single item and it belongs in Phase 1, not later — every week it is deferred, more product is built on a foundation that cannot ship to customers.

### 6.2 Component diagram (described)

```
                          ┌─────────────┐
   student / admin ──────▶│  CDN + WAF  │
   browser                └──────┬──────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Edge router             │  resolves Host header
                    │  {slug}.{domain} or      │  → tenant_id
                    │  custom domain           │  → injects X-Tenant-Id
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐   ┌───────────▼──────────┐   ┌─────────▼─────────┐
│  Web app       │   │  API service         │   │  Auth service     │
│  (SPA, static  │   │  REST, stateless     │   │  OIDC/SAML broker │
│   from CDN)    │   │  horizontally scaled │   │  session issuance │
└────────────────┘   └───────────┬──────────┘   └─────────┬─────────┘
                                 │                        │
        ┌────────────────────────┼────────────────┬───────┘
        │                        │                │
┌───────▼────────┐   ┌───────────▼─────┐  ┌───────▼──────┐
│ PostgreSQL     │   │ Redis           │  │ Object store │
│ RLS by tenant  │   │ cache, sessions │  │ + CDN        │
└───────┬────────┘   └─────────────────┘  └──────────────┘
        │ CDC
┌───────▼──────────────────────────────────────────────────┐
│ Databricks — lakehouse, Genie agents, policy corpus,      │
│ analytics jobs. Reached only via internal AI/Analytics    │
│ service; never from the browser.                          │
└───────────────────────────────────────────────────────────┘

  Async: job queue (notifications, imports, exports, digests)
  Cross-cutting: structured logging → log store; metrics → TSDB;
                 traces; audit log written to append-only table
```

### 6.3 Tenancy model — decision and rationale

Three options were considered:

| Model | Isolation | Ops cost at 100 tenants | Cost per tenant | Verdict |
|---|---|---|---|---|
| Database per tenant | Strongest | Very high — 100 migrations, 100 backups, 100 connection pools | High | Reject for general use; offer at Enterprise tier only |
| Schema per tenant | Strong | High — migration fan-out, connection pool pressure | Medium | Offer at Pro tier where procurement demands it |
| Shared schema + row-level security | Strong *if enforced at the database* | Low — one migration, one backup | Low | **Default** |

**Chosen: shared schema with PostgreSQL row-level security.**

Implementation requirements, all mandatory:

1. Every tenant-scoped table carries `tenant_id UUID NOT NULL`.
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY` on every such table.
3. Policy: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.
4. The application connects as a role **without** `BYPASSRLS`. The migration role is separate and never used at runtime.
5. A connection-checkout hook issues `SET LOCAL app.tenant_id` from the authenticated session, inside the transaction. If it is unset, queries return zero rows rather than everything — verified by test.
6. **Every composite index leads with `tenant_id`.** Missing this turns a small tenant's query into a full-table scan across all tenants.
7. A CI test suite that, for every endpoint, authenticates as tenant A and asserts it cannot read a seeded record from tenant B. This suite is not optional and must fail the build.

**The classic failure mode is the cache, not the database.** Every Redis key, every HTTP cache key, every CDN cache key, and every in-process memo must include `tenant_id`. Add a lint rule and a code-review checklist item.

### 6.4 Multi-tenant AI — a specific security problem

Our assistant generates SQL from natural language. In a multi-tenant lakehouse, a generated query could in principle read across tenants. Prompt instructions are not a security control.

**Required controls, layered:**

1. The AI agent is scoped to a **view**, never a base table, and that view applies a tenant predicate.
2. The tenant predicate is bound to the **request context server-side**, never supplied by the model and never present in the prompt as an editable value.
3. Generated SQL is **validated before execution**: reject any query that references a table outside the allowlist, or that lacks the tenant predicate. Fail closed.
4. The service principal executing generated SQL has SELECT on tenant-scoped views only.
5. Every generated query is logged with tenant, user, prompt and SQL, and retained for audit.
6. The policy corpus is partitioned per tenant; retrieval is filtered by tenant before ranking, not after.

Treat any cross-tenant leak here as a Severity 1 incident with contractual notification obligations.

### 6.5 Example stack, and why

Technology-agnostic in principle; these are concrete choices that fit the constraints.

| Layer | Example | Why it fits |
|---|---|---|
| Frontend | React SPA (TypeScript, Vite) | Team already building in React; per-tenant theming via CSS custom properties needs no rebuild per tenant |
| API | REST over HTTP/JSON | Simpler to cache, easier for institutional IT to review than GraphQL; no client-driven query cost surprises |
| Runtime | Node.js or Go containers | Stateless, horizontally scalable, cheap to run |
| Orchestration | Managed Kubernetes, or a managed container service | Kubernetes only if there is someone who wants to operate it. At pilot scale a managed container service is the right answer and can migrate later. |
| Database | PostgreSQL with RLS | Only mainstream database where tenant isolation can be enforced *below* the application |
| Cache/queue | Redis | Sessions, rate limits, job queue |
| Object storage | S3-compatible + CDN | Assets, exports |
| Search | PostgreSQL full-text initially | Adding a search cluster before there is a search problem is premature |
| AI / analytics | Databricks (retained) | Already built; the differentiator; do not rewrite it |
| Auth | Managed identity broker supporting OIDC + SAML | SAML implemented in-house is a recurring source of vulnerabilities |
| Payments | Indian gateway with split-settlement (route/marketplace) support | Lets ticket revenue settle directly to the institution — see §10.3 |
| Observability | Structured logs, metrics, traces, error tracking | Every log line carries `tenant_id` |

**Deliberate non-choice:** do not adopt Kubernetes at pilot stage unless someone on the team already operates it. The complexity cost lands immediately; the benefit lands at a scale we do not have.

---

## 7. Data Model & APIs

### 7.1 Core entities

```
tenants
  tenant_id PK · legal_name · portal_name · slug · custom_domain
  plan · enrolment_band · status · data_region · timezone
  created_at · contract_start · contract_end

tenant_settings
  tenant_id PK/FK · branding JSONB · feature_flags JSONB
  taxonomy JSONB · retention_policy JSONB · notification_defaults JSONB

users
  user_id PK · tenant_id FK · external_id (IdP subject) · email
  name · role · department · year_of_study · status
  created_at · last_seen_at · deleted_at

  ── deliberately absent: date of birth, gender, address, phone,
     photograph, marks, fee status. See §11.2.

clubs
  club_id PK · tenant_id FK · name · category · advisor_user_id · status

club_members
  club_id FK · user_id FK · role (member|organizer|owner)

events
  event_id PK · tenant_id FK · club_id FK · created_by FK
  title · short_pitch · description · category · tags[]
  mode · venue · room_id · meeting_link
  start_ts · end_ts · registration_deadline · timezone
  capacity · fee_minor · currency · eligibility
  visibility (campus_only|faculty_only|public)
  state (draft|pending_review|changes_requested|published|cancelled|completed)
  banner_url · rulebook_doc_id · published_at

event_reviews
  review_id PK · tenant_id FK · event_id FK · reviewer_id FK
  decision (approved|rejected|changes_requested) · reason · created_at

registrations
  tenant_id FK · event_id FK · user_id FK
  state (saved|clicked_out|self_confirmed|verified|attended|cancelled)
  fidelity (intent|self_reported|verified)   ── see §7.3
  handoff_token · clicked_out_at · confirmed_at
  share_consent BOOLEAN · consent_at · consent_scope (organizer_id)
  created_at · updated_at
  PRIMARY KEY (tenant_id, event_id, user_id)

notification_preferences
  tenant_id FK · user_id FK · channel (email|push|in_app)
  category (transactional|reminders|recommendations|digest|marketing)
  opted_in BOOLEAN · consent_ts · consent_source
  PRIMARY KEY (tenant_id, user_id, channel, category)

notifications
  notification_id PK · tenant_id FK · user_id FK · event_id FK
  kind · title · body · reason · created_at · read_at

audit_log   ── append-only, no UPDATE or DELETE grant
  audit_id PK · tenant_id · actor_user_id · actor_role
  action · resource_type · resource_id
  before JSONB · after JSONB · ip · user_agent · created_at

data_exports
  export_id PK · tenant_id FK · requested_by FK · scope
  status · file_url · expires_at · created_at
```

### 7.2 API surface

All endpoints under `/api/v1`. Tenant resolved from the Host header and cross-checked against the session; a mismatch is a 403 and an audit event.

**Public / student**

| Method | Path | Input | Output |
|---|---|---|---|
| GET | `/events` | `from`, `to`, `category[]`, `mode`, `club_id`, `q`, `cursor`, `limit` | `{ events[], next_cursor }` |
| GET | `/events/:id` | — | Event + RSVP state + capacity |
| POST | `/events/:id/save` | — | `{ state: saved }` — calendar only, not a registration |
| POST | `/events/:id/register` | `{ share_consent }` | `{ handoff_token, registration_url }` |
| POST | `/events/:id/confirm` | `{ handoff_token, completed, share_consent }` | `{ state, fidelity }` |
| DELETE | `/events/:id/registration` | — | `204` |
| GET | `/events/:id/calendar.ics` | — | `text/calendar` |
| GET | `/me` | — | Profile, roles, preferences |
| PATCH | `/me/preferences` | `{ notifications[], interests[] }` | Updated preferences |
| GET | `/me/events` | `state` | User's RSVPs |
| GET | `/notifications` | `unread_only`, `cursor` | Notification list |
| POST | `/notifications/read` | `{ ids[] }` | `204` |
| POST | `/assistant/messages` | `{ message, conversation_id? }` | `{ conversation_id, message_id }` |
| GET | `/assistant/messages/:id` | — | `{ status, text, rows[], sql?, citations[] }` |
| GET | `/me/data` | — | Full personal data export (§11.5) |
| DELETE | `/me` | `{ confirm }` | Initiates erasure request |

**Organiser / admin**

| Method | Path | Input | Output |
|---|---|---|---|
| POST | `/admin/events` | Event payload | Created event, `state=draft` |
| PATCH | `/admin/events/:id` | Partial event | Updated event |
| POST | `/admin/events/:id/submit` | — | `state=pending_review` + conflict warnings |
| POST | `/admin/events/:id/review` | `{ decision, reason? }` | Updated state |
| GET | `/admin/events/:id/registrations` | `format`, `fidelity` | Registrant list, consent-filtered |
| POST | `/admin/events/:id/registrations/verify` | multipart CSV | Match organiser's own list → promotes rows to `verified` |
| POST | `/admin/events/:id/checkin` | `{ user_id \| qr_token }` | `{ state: attended }` |
| GET | `/admin/clubs` · POST · PATCH | — | Club CRUD |
| GET | `/admin/users` | `role`, `q`, `cursor` | User list |
| PATCH | `/admin/users/:id/role` | `{ role }` | Updated user + audit entry |
| POST | `/admin/roster/import` | multipart CSV, `dry_run` | Validation report or import job id |
| GET | `/admin/analytics/overview` | `from`, `to` | KPI summary |
| GET | `/admin/analytics/events` | `from`, `to`, `cursor` | Per-event engagement |
| GET | `/admin/audit-log` | `actor`, `action`, `from`, `to` | Audit entries |
| POST | `/admin/exports` | `{ scope, format }` | Export job |
| GET | `/admin/settings` · PATCH | Branding, toggles, taxonomy | Settings |

**Platform (internal only, separate network path and separate credentials)**

| Method | Path | Purpose |
|---|---|---|
| POST | `/platform/tenants` | Provision tenant |
| PATCH | `/platform/tenants/:id` | Plan, flags, status |
| POST | `/platform/tenants/:id/domains` | Attach custom domain, trigger certificate |
| POST | `/platform/tenants/:id/idp` | Configure OIDC/SAML |
| POST | `/platform/support-sessions` | Time-boxed, reason-logged impersonation |

### 7.3 Registration model — three fidelities

Registration completes on the organiser's official page, not ours. **We therefore cannot know with certainty who registered**, and the data model has to be honest about that rather than papering over it.

| `fidelity` | Meaning | Source | Trustworthy for |
|---|---|---|---|
| `intent` | Student tapped through to the official page | Click-out logged with a handoff token | Interest measurement, demand signal |
| `self_reported` | Student confirmed they completed registration | Return prompt after click-out | Rough planning |
| `verified` | Matched against the organiser's own registrant list | Organiser uploads CSV; matched on institutional email | Catering, seating, attendance, certificates |

**Rule, enforced in the UI and in every export:** an `intent` row is never displayed or exported with the word "registered". It is labelled "Clicked through". An organiser who caters for click-throughs will over-order, and will attribute the error to us.

Verified matching is cheap to build and disproportionately valuable — it converts our numbers from a guess into a reconciliation the organiser trusts, and it gives us a reason to be in their workflow after the event rather than only before it.

### 7.4 Paid vs free — what differs

| | Free | Paid |
|---|---|---|
| Price display | `FREE` badge on every surface | `{currency}{amount}` badge on every surface |
| Filter | `is_free = true` | `fee > 0`, with a price-range filter |
| Registration | Link out to official page | Link out to official page |
| Payment handling | — | Entirely the organiser's, on their page |
| Our exposure to funds | None | **None** |
| Registrant data to organiser | Consent-gated (§11.5) | Consent-gated (§11.5), identical rules |
| Fidelity model | Identical | Identical |

The price must be visible on the card, in the calendar detail sheet, in search results and in assistant answers. A student should never have to open an external link to discover an event costs money — that is the single most common complaint about existing event aggregators.

### 7.5 Sequence — registration handoff

```
Browser          API              PostgreSQL        Organiser site
   │              │                    │                  │
   ├─POST /events/:id/register─────────▶                  │
   │              ├─resolve tenant, validate session      │
   │              ├─BEGIN; SET LOCAL app.tenant_id───────▶│
   │              ├─UPSERT registrations                   │
   │              │   state=clicked_out, fidelity=intent   │
   │              │   share_consent = {from consent sheet} │
   │              ├─INSERT audit_log──────────────────────▶│
   │              ├─COMMIT                                 │
   │◀─{ handoff_token, registration_url }─┤                │
   │                                                        │
   ├─open registration_url in new tab──────────────────────▶│
   │                          (student registers and, if    │
   │                           paid, pays the organiser)    │
   │                                                        │
   ├─returns to our tab (visibilitychange + pending token)  │
   │  prompt: "Did you finish registering?"                 │
   ├─POST /events/:id/confirm──────────▶                    │
   │              ├─state=self_confirmed, fidelity=self_reported
   │◀─200─────────┤                                          │

Later, optionally:
   Organiser ──POST /admin/events/:id/registrations/verify──▶
              CSV of their real registrants, matched on
              institutional email → matched rows promoted to
              state=verified, fidelity=verified.
              Unmatched rows stay where they are; never deleted.
```

Two details that matter. The consent decision is captured **before** the click-out, because after the student leaves we may never see them again. And the confirm step is best-effort — if the student never answers, the row stays at `intent` and is labelled accordingly rather than being optimistically promoted.

### 7.6 Sequence — assistant query, tenant-scoped

```
Browser        API           Policy gate      Databricks
   │            │                 │                │
   ├─POST /assistant/messages────▶│                │
   │            ├─resolve tenant_id from session   │
   │            ├─rate-limit check (per user, per tenant)
   │            ├─build request with tenant-scoped view name
   │            ├─────────────────────────────────▶│ agent generates SQL
   │            │◀────────────────────────────────┤ returns SQL + intent
   │            ├─VALIDATE────────▶│
   │            │   · tables ∈ allowlist?
   │            │   · tenant predicate present?
   │            │   · no DDL/DML?
   │            │   fail → reject, log, return safe error
   │            │◀─pass───────────┤
   │            ├─execute against tenant view─────▶│
   │            │◀─rows───────────────────────────┤
   │            ├─log { tenant, user, prompt, sql } to audit
   │◀─rows + sql + citations──────┤
```

---

## 8. Integration & Single Sign-On

### 8.1 Identity paths, in order of preference

| Path | Effort (us) | Effort (them) | When to use |
|---|---|---|---|
| **OIDC** | 2h config | ~30 min | Institution uses a modern cloud identity provider. Prefer this. |
| **SAML 2.0** | 1 day config | 0.5 day + scheduling | Institution's IT standardises on SAML. Common in larger universities. |
| **Roster + magic link** | 1h | Upload a CSV | **Assume this is the default case.** Many Indian colleges have no institution-wide IdP. |
| **Email domain + OTP** | 0 | 0 | Self-serve pilots, or as an escape hatch when roster data is stale |

**Do not architect on the assumption that SSO will be available.** Designing for SSO-first and treating CSV as a fallback is the most common way this kind of product stalls in Indian higher-ed deployments. Build roster import to the same quality as SSO.

### 8.2 Identity requirements

- Just-in-time provisioning on first SSO login, with role derived from an IdP attribute if the institution maps one, else defaulting to `student`.
- Attribute mapping is configurable per tenant: `email`, `name`, `department`, `year`, `role`.
- **We request the minimum attribute set.** Do not accept an IdP configuration that pushes date of birth, address, photograph or academic record. Reject and document why.
- Deprovisioning: a user absent from two consecutive roster imports is marked `inactive`, retains no session, and their personal data enters the retention clock.
- SAML: signed assertions required, encryption supported, clock skew tolerance ±3 minutes, replay protection via assertion ID cache.
- Session: short-lived access token, refresh bound to tenant and IP-class, absolute expiry 12 hours for admin roles.

### 8.3 Other integrations

| Integration | Direction | Priority |
|---|---|---|
| Google Calendar / Microsoft 365 | Push events to student calendars | Phase 2 |
| `.ics` feed | Subscribe to filtered calendar | MVP (download), Phase 2 (live feed URL) |
| Room booking system | Read availability, write bookings on approval | Phase 3, per-institution |
| Payment gateway | Ticket sales with split settlement | Phase 2 |
| SIS / ERP | Automated roster sync | Phase 3, per-institution, priced as professional services |
| Webhooks | Event published, RSVP created, attendance recorded | Phase 3 |

Treat SIS and room-booking integrations as **paid professional services, scoped per institution**. They are never reusable across customers and should not be absorbed into the licence fee.

---

## 9. Multi-Tenant Deployment & Customization

### 9.1 Domain and routing

- Wildcard DNS `*.{platform-domain}` with a wildcard certificate covers every tenant subdomain with zero per-tenant work.
- Custom domains: institution creates a CNAME to our target; we issue a certificate automatically via ACME and renew without intervention.
- The edge resolves Host → `tenant_id` from a cached lookup table and injects an internal header. **The application never trusts a client-supplied tenant identifier.**
- Unknown host → generic marketing page, not an error.

### 9.2 Customisation scope — deliberately bounded

| Configurable | Not configurable |
|---|---|
| Logo, favicon, portal name | Page layout and information architecture |
| Primary and accent colour, subject to WCAG AA contrast validation | Typography |
| Event category taxonomy | Core data model |
| Feature toggles (assistant, ticketing, swipe, public events) | Business logic and workflow order |
| Email sender name and reply-to | Email templates beyond text substitution |
| Notification default settings, within legal minimums | Consent requirements |
| Custom domain | Custom code or per-tenant forks |

Every layout customisation granted to one institution multiplies the regression surface for all of them. Hold this line during sales conversations — it is the difference between a product and an agency.

### 9.3 Configuration mechanics

- Branding stored as JSONB in `tenant_settings`, rendered as CSS custom properties at page load. No per-tenant build.
- Feature flags evaluated server-side and mirrored to the client; a disabled feature returns 404 from the API, not merely a hidden button.
- **Contrast validation is a hard gate.** A dark logo on a dark palette produces an inaccessible portal and the institution will blame us.

### 9.4 Scaling

- API tier stateless, scaled on request rate and p95 latency.
- Read-heavy endpoints (event list, calendar) cached in Redis with tenant-keyed entries, TTL 60s, invalidated on publish.
- CDN for static assets and banner images, cache key includes tenant.
- PostgreSQL: single primary with read replicas for analytics endpoints. **Sharding is not needed at the scale this business will reach in two years and should not be built speculatively.** The trigger to reconsider is sustained write saturation on the primary, not a tenant count.
- Noisy-neighbour protection: per-tenant rate limits on API and assistant calls, so one institution's traffic spike cannot degrade another's portal.
- Job queue partitioned by tenant so a large roster import does not starve another tenant's notification delivery.

### 9.5 Monitoring

- Every log line, metric and trace carries `tenant_id`.
- Per-tenant dashboards: request rate, error rate, p50/p95/p99 latency, assistant success rate, notification delivery rate.
- Alerting on per-tenant error-rate deviation, not only global — a single broken tenant is invisible in aggregate metrics.
- Synthetic checks per tenant on login and event-list endpoints.

---

## 10. Admin Dashboard & Billing

### 10.1 Admin dashboard surfaces

1. **Overview** — active students this week, events published this month, RSVPs, top events, approval queue depth
2. **Events** — pending / published / drafts / past, with bulk actions
3. **Clubs** — roster, organisers, activity level
4. **People** — search, role assignment, deactivation, roster import history
5. **Analytics** — adoption funnel, engagement by category, club leaderboard, attendance rates, exportable
6. **Settings** — branding, taxonomy, toggles, identity, notification defaults
7. **Audit log** — filterable, exportable, read-only
8. **Data** — export requests, retention policy, erasure requests

### 10.2 Analytics the institution actually wants

| Metric | Definition | Why they care |
|---|---|---|
| Activated students | Signed in at least once ÷ roster size | The number the activities office reports upward |
| Weekly active students | Distinct students with a session in a 7-day window | Whether the portal became a habit |
| Events published / month | Count by state and club | Is the campus actually using it |
| RSVP conversion | RSVPs ÷ event detail views | Whether listings are compelling |
| Attendance rate | Checked-in ÷ RSVPs | The gap between intent and turnout — nobody has this today |
| Club activity index | Events × attendance, per club | Club funding decisions |
| Category demand | Interest signals by category vs supply | What to programme next semester |
| Participation record | Per-student event count, exportable | Accreditation and certificates |

Suppress any breakdown where the cell count is below 5, to prevent re-identification of individuals in small departments.

### 10.3 Billing architecture

**Two distinct money flows. Do not conflate them.**

1. **Licence fee** — institution pays us. Annual invoice, purchase order, GST invoice. Institutional finance departments do not pay by card on a self-serve page; build for invoicing from day one and treat card payment as the exception.

2. **Ticket revenue — not a flow we participate in.** Paid events link out to the organiser's own registration and payment page. Students pay the organiser directly. We display the price, we log the click-out, and we never touch the funds.

   This is a significant simplification and it should be a deliberate, permanent product position rather than a temporary one. Not processing payments means no settlement accounts, no refund handling, no chargeback exposure, no tax invoicing on behalf of third parties, and no risk of being classified as a payment aggregator. The corresponding cost is that we forgo ticketing revenue share — which was never going to be material, because the large majority of campus events are free.

   **If this position is ever reversed, treat it as a new product with its own legal review, not a feature toggle.**

**Subscription management requirements:**
- Contract record: plan, enrolment band, term, start, end, auto-renew flag, notice period, PO reference
- Renewal alerts at T-90, T-60, T-30 days to sales and to the institution
- Usage tracking against the enrolment band, with an overage conversation rather than an automatic charge
- Grace period on non-renewal: portal remains read-only for 30 days, data retained 90 days, then exported and purged per contract
- Dunning is a human conversation with a named contact, not an automated email sequence — institutional payment cycles are slow and legitimately so

---

## 11. Security & Privacy Compliance

### 11.1 Regulatory scope

| Regime | Applies when | Key obligations for us |
|---|---|---|
| **India DPDP Act, 2023** | Indian institutions, Indian students — **the primary regime for our target market** | Lawful purpose, notice, consent for non-essential processing, data-principal rights, breach notification, heightened protection for users under 18 |
| **GDPR** | An institution in the EU/EEA, or EU-resident students | Lawful basis, DPA under Art. 28, DSAR handling, transfer mechanism for data leaving the EEA, DPIA for large-scale processing |
| **FERPA** | US institutions only | We would be handling "education records"; the institution controls disclosure. Our role is service provider under the school-official exception, which requires contractual terms and direct institutional control. |

Three practical consequences:

1. **The institution is the data controller; we are the processor.** Every contract needs a data processing agreement saying so, defining purposes, sub-processors, and deletion on termination.
2. **DPDP's under-18 provisions matter.** Some students, particularly first-years, will be minors. Behavioural profiling and targeted advertising directed at children carry restrictions. Our recommendation engine profiles behaviour. **[VALIDATE with counsel: whether interest-based event recommendation to a known minor requires verifiable parental consent under DPDP, and design the age gate accordingly.]** Interim position: disable behavioural profiling for users whose roster record indicates they are under 18, and fall back to non-personalised chronological ordering.
3. **Never send marketing to students.** Announcements go out through the institution's channels. We hold student contact data as a processor for transactional and opted-in operational messages only.

### 11.2 Data minimisation

We collect what the product requires and refuse the rest, even when offered:

**Collected:** institutional email, name, department, year of study, role, event interactions (views, RSVPs, attendance), notification preferences, session metadata.

**Never collected:** date of birth beyond an age band where legally required, gender, caste, religion, address, personal phone number, photograph, marks or grades, fee or scholarship status, disciplinary records, health information, government identifiers.

If an institution's SSO or roster pushes these, we drop them at ingestion and log that we did. Write this into the DPA as a commitment, not just a practice — it is a sales asset with a privacy-conscious registrar.

### 11.3 Security controls

| Domain | Control |
|---|---|
| Transport | TLS 1.3, HSTS with preload, no mixed content |
| At rest | Full-disk and database encryption; per-tenant envelope encryption for exports |
| Secrets | Managed secret store, no secrets in environment files or repositories, rotation on a defined schedule |
| Access control | RBAC per §4, enforced server-side; database-level RLS per §6.3 |
| Internal access | Named accounts, MFA mandatory, no shared credentials; production access requires an approved, time-boxed, logged session |
| Support impersonation | Requires a documented reason and expires automatically; visible to the tenant in their audit log |
| Audit logging | Append-only, no update or delete grant, minimum 24-month retention, tenant-visible |
| Input handling | Parameterised queries only; HTML sanitised with an allowlist; uploads scanned, content-type verified, served from a separate origin |
| Rate limiting | Per user, per tenant, per IP; stricter limits on auth and assistant endpoints |
| Dependencies | Automated vulnerability scanning in CI; defined patch SLAs by severity |
| Testing | SAST and DAST in the pipeline; third-party penetration test before the first paying customer and annually thereafter |
| Backups | Daily encrypted, retained 30 days, **restore tested quarterly** — an untested backup is a hypothesis |
| Incident response | Documented runbook, named on-call, breach notification path meeting the tightest applicable regulatory clock |

### 11.4 Consent and notification opt-in

**All notification categories default to OFF, except transactional.**

| Category | Default | Basis | Can institution change default? |
|---|---|---|---|
| Transactional (RSVP confirmation, cancellation, event change) | ON | Necessary to the service the student requested | No |
| Event reminders (T-24h for own RSVPs) | OFF | Consent | No — student must opt in |
| Recommendations (events you might like) | OFF | Consent | No |
| Weekly digest | OFF | Consent | No |
| Institutional announcements | OFF | Consent | No |
| Marketing from us | Not offered | — | Not applicable — we never market to students |

Consent capture requirements: granular per category and channel, timestamped, source recorded, revocable in one click from any message and from the preferences page, and **checked at send time rather than at enqueue time**.

An institution will ask to switch everything on for all students. Decline, and explain that a portal students trust is worth more than one that mails them. Offer instead a prominent in-app announcement surface that needs no consent.

### 11.5 Disclosing student details to event organisers

Handing a student's name and email to an organiser is a **disclosure to a third party**, and under DPDP it needs notice and consent. It is not covered by the consent they gave the institution to use the portal.

**Rules:**

1. **Per-organiser consent, captured at click-out.** A student who agreed to share details with their own robotics club has not agreed to share with an outside company running a paid bootcamp. Consent is scoped to the organiser, timestamped, and revocable.
2. **Consent never gates registration.** Declining must still open the official page. The organiser then sees that student as an anonymous count. Gating the link behind consent converts a privacy control into coercion.
3. **Fixed disclosure set:** name, institutional email, department, year, registration status, timestamp. Nothing else, ever — not interests, not swipe history, not other events viewed, not assistant conversations. Enforce in the query, not by hiding columns in the interface.
4. **Internal vs external organisers are treated differently.** A campus club under the institution's own governance may see named registrants where consent was given. An **external organiser sees aggregate counts only by default**; a named list requires the tenant admin to enable it explicitly for that organiser, and that action is recorded in the audit log. An outside company is not entitled to a roster of an institution's students because it posted an event.
5. **The disclosure is shown to the student.** Their profile lists every organiser their details have been shared with, and lets them revoke — which stops future disclosure, though it cannot retract what an organiser already downloaded. Say that plainly in the interface rather than implying otherwise.
6. **Contractual backstop.** The organiser terms of use prohibit using registrant data for anything except running that event, and prohibit onward transfer. Include it; it is the only lever available once data has left.

### 11.6 Data rights, retention and export

| Right | Mechanism | Target |
|---|---|---|
| Access | `GET /me/data` — self-serve JSON + CSV export, including the list of organisers details were shared with | Immediate |
| Correction | Profile fields editable; roster-sourced fields corrected via the institution | Immediate / next sync |
| Erasure | `DELETE /me` → verification → anonymise interaction history, delete identifiers | 30 days |
| Portability | Machine-readable export in the same call as access | Immediate |
| Withdraw consent | Preferences page, one click | Immediate |

**Retention defaults, configurable per tenant within legal bounds:**

| Data | Retention |
|---|---|
| Active user account | Duration of enrolment + 12 months |
| Event and RSVP records | 7 years (accreditation and institutional reporting) |
| Interaction events (views, swipes) | 24 months, then aggregated and identifiers dropped |
| Assistant conversation logs | 90 days |
| Audit log | 24 months minimum |
| Backups | 30 days |
| On contract termination | Full export delivered within 30 days; deletion within 90 days; written confirmation issued |

**Tenant export** must be complete and usable, not a token gesture: all events, clubs, users, RSVPs, attendance and analytics as CSV plus JSON, delivered as a signed, expiring download. An institution that knows it can leave is more willing to sign.

---

## 12. Go-to-Market & Sales Strategy

### 12.1 Segmentation

| Segment | Characteristics | Approach |
|---|---|---|
| **Beachhead: private engineering and technology colleges, 2,000–8,000 students, metro** | Active club culture, real hackathon and fest activity, discretionary budget, decisions made by a small group | Direct founder-led sales |
| Autonomous and deemed universities | Larger, longer cycles, formal procurement, higher contract value | Pursue after 3 reference customers |
| Government and affiliated colleges | Tender-driven, price-sensitive, slow | Not before year two |
| Student-run initiatives and consortia | No budget, high enthusiasm | Community tier, treat as a distribution channel |

Start with the beachhead. It is the segment where our differentiators — event density, club activity, an AI assistant — actually matter. A college with four events a semester does not need this.

### 12.2 The buying committee

| Person | Cares about | Objection to expect |
|---|---|---|
| Dean of Student Affairs / activities head | Participation, visibility, reporting | "Our students already use WhatsApp" |
| IT head | Integration effort, security, data location | "Who has access to our student data?" |
| Registrar / accreditation coordinator | Records, exports, audit trail | "Can this produce our activity report?" |
| Finance / purchase officer | Predictable cost, invoicing, GST | "What happens in year two?" |
| Student council / club leads | Whether it makes their job easier | "Another portal nobody opens" |

The student council is the group most often ignored and most able to kill adoption. Include them in the pilot design.

### 12.3 Motion

**Phase 1 — one design partner.** One institution, deeply engaged, free or nominal fee, in exchange for weekly access, feedback, and a reference plus case study on success. Choose an institution where a named individual actively wants this. The single largest predictor of pilot success is one motivated internal champion.

**Phase 2 — three reference customers.** Convert the design partner, add two more. Now the pitch shifts from a concept to a working portal at a peer institution, which is the only proof this market responds to.

**Phase 3 — scale the motion.** Referrals between activities offices, presence at higher-education administration forums, a self-serve community tier that seeds bottom-up demand from student councils.

### 12.4 Bottom-up channel

Our founding team is in this ecosystem. A free community tier that a student council can stand up without procurement creates internal demand, and a portal already used by 400 students is a far easier institutional sale than a slide deck. Constrain the tier so it converts: platform subdomain only, no SSO, no custom domain, no analytics export, capped users.

---

## 13. Pricing Model Options

### 13.1 Model comparison

| Model | Pros | Cons | Verdict |
|---|---|---|---|
| Per seat / per student / year | Scales with value; familiar to SaaS | Institutions resist variable cost tied to enrolment; makes broad adoption feel expensive, which is exactly backwards for us | Reject as the primary model |
| **Flat annual fee, banded by enrolment** | Predictable, fits an annual budget line, encourages maximum adoption | Leaves money on the table with very large institutions | **Recommended** |
| Revenue share on ticketing only | No upfront cost, aligned | Most campus events are free; revenue would be negligible and unpredictable | As an add-on only |
| Per-event pricing | Aligned with usage | Penalises exactly the behaviour we want | Reject |
| Freemium → paid | Fast adoption | Institutions rarely convert without a procurement trigger | Use as a channel, not a model |

**Recommendation: flat annual fee banded by enrolment, plus a platform fee on paid ticketing where used, plus professional services for bespoke integrations.**

The rationale is specific to this buyer. An institutional budget holder needs a fixed line item they can defend for the year. Per-seat pricing also creates a perverse incentive — it makes the activities office quietly hope fewer students sign up. Our entire value depends on the opposite.

### 13.2 Tier structure

| | **Community** | **Campus** | **Campus Pro** | **Enterprise / Consortium** |
|---|---|---|---|---|
| Target | Student councils, single clubs | Colleges up to ~3,000 students | Colleges 3,000–15,000 | University groups, multi-campus |
| Branding | Logo only | Full branding | Full branding | Full branding |
| Domain | `{slug}.{platform-domain}` | `{slug}.{platform-domain}` | Custom domain | Custom domain |
| Identity | Email + OTP | Roster + magic link | SSO (OIDC/SAML) | SSO + automated provisioning |
| Events / month | Capped | Unlimited | Unlimited | Unlimited |
| AI assistant | Event Q&A | Event Q&A | Event + policy Q&A | Event + policy Q&A |
| Analytics | Basic counts | Standard dashboard | Full + scheduled exports | Full + API + cross-campus rollup |
| Paid events | Listed, no organiser dashboard | Listed with price badge | Full organiser dashboard | Full + verified matching |
| Data export | Manual request | Self-serve | Self-serve + API | Self-serve + API |
| Tenancy | Shared schema | Shared schema | Shared or dedicated schema | Dedicated schema or database |
| SLA | None | 99.5% | 99.5% | 99.9% |
| Support | Community | Email, 2 business days | Email + chat, 1 business day | Named CSM, 4h critical |
| Onboarding | Self-serve | Guided, remote | Guided + training session | Full project management |
| **Indicative annual price** | Free | **[VALIDATE]** | **[VALIDATE]** | **[VALIDATE]** — custom |

**On price points.** I am not putting numbers in this table, because any number I write would be invented. Establishing them requires: (a) what the institution currently spends on comparable software, (b) what an existing budget line can absorb without a new approval, (c) what three activities heads say when asked directly. Do this before the first proposal. A defensible starting method: price the Campus tier below the threshold that triggers a formal tender process at a typical private college, since crossing that threshold can add months to a deal.

### 13.3 No ticketing revenue share

Because registration and payment happen on the organiser's own page (§10.3), there is no ticket revenue to share. Revenue is the licence fee plus professional services, full stop.

This is worth stating explicitly in sales conversations. Institutions and clubs are wary of platforms that take a cut of student money, and several free tools compete on exactly that point. "We never touch your registration fees" is a cleaner answer than any percentage.

### 13.4 Sample contract terms to offer

| Term | Recommended position |
|---|---|
| Initial term | 12 months, from the go-live date rather than signature — protects the institution against onboarding delay and removes a common objection |
| Renewal | Auto-renew with 60 days' notice to cancel |
| Pilot | 90 days at no cost or nominal fee, converting automatically unless cancelled with 14 days' notice |
| Payment | Annual in advance, net 30, against PO and GST invoice |
| Price protection | No increase in year two; capped increase thereafter |
| Uptime | Per SLA (§14); service credits as the sole remedy |
| Data ownership | Institution owns all its data, unambiguously stated |
| Data processing | DPA as an annexure; sub-processors listed and 30 days' notice of change |
| Export on termination | Complete export within 30 days at no charge |
| Deletion | Within 90 days of termination, with written confirmation |
| Confidentiality | Mutual |
| Publicity | Logo and case-study use **only with written consent**, revocable |
| Liability | Capped at fees paid in the preceding 12 months, with carve-outs for data breach and confidentiality |
| Termination for convenience | Institution may terminate at renewal; we may not terminate mid-term except for non-payment |

Offering export-on-termination and clear data ownership up front removes the largest institutional objection, which is lock-in. It costs us little and shortens deals.

### 13.5 Sample SLA levels

| | Campus | Campus Pro | Enterprise |
|---|---|---|---|
| Monthly uptime target | 99.5% | 99.5% | 99.9% |
| Measurement | Successful responses to synthetic checks on login and event-list endpoints, excluding scheduled maintenance | Same | Same |
| Scheduled maintenance | Announced 72h ahead, outside 08:00–20:00 IST | Same | Announced 7 days ahead |
| **Severity 1** — portal unreachable, or data exposure | 4h response, best-effort resolution | 2h response | 1h response, 4h resolution target |
| **Severity 2** — major function broken (login, publishing) | 1 business day | 4 business hours | 2 business hours |
| **Severity 3** — minor function degraded | 2 business days | 1 business day | 1 business day |
| **Severity 4** — question, cosmetic, request | 3 business days | 2 business days | 1 business day |
| Service credits | 5% of monthly fee per 0.5% below target, capped at 25% | Same | 10% per 0.1% below target, capped at 50% |
| Support channels | Email | Email + chat | Email + chat + named CSM + phone for Sev 1 |
| Business hours | 10:00–18:00 IST, Mon–Fri | Same | Sev 1 covered 24×7 |

Do not offer 99.9% before there is on-call rotation, tested runbooks and redundancy to support it. An SLA you cannot meet converts a technical problem into a contractual one.

---

## 14. Implementation Roadmap & Timeline

Six months. Team assumption: 4 engineers, 1 designer, 1 product lead (see §17).

### 14.1 Phased plan

| Phase | Weeks | Milestone | Eng. weeks | Go / no-go gate |
|---|---|---|---|---|
| **0 — Validation** | 1–2 | 8 discovery conversations with activities offices and IT heads; one signed design-partner LOI | 2 (spike) | **GATE 0:** A named institution has committed in writing to a pilot. *No LOI → do not start Phase 1.* |
| **1 — Foundation** | 3–8 | Migration off Databricks Apps hosting; tenant model with RLS; provisioning; subdomain routing; branding; cross-tenant test suite green | 24 | **GATE 1:** Automated cross-tenant isolation tests pass on every endpoint; two tenants provisioned and demonstrably isolated. *This gate is not negotiable for schedule.* |
| **2 — Core product** | 9–14 | Student portal (calendar, filters, detail, RSVP, .ics); admin (event CRUD, approval, clubs, users); roster import + magic link; OIDC; audit log; notification preferences | 24 | **GATE 2:** Design partner's activities office publishes 10 real events unaided. *If they need our help to publish, the admin UX has failed.* |
| **3 — Pilot** | 15–18 | Assistant with tenant scoping; analytics dashboard; data export; live pilot with real students | 16 | **GATE 3:** Defined activation and weekly-active thresholds met at the pilot institution over 4 consecutive weeks, **and** the activities office states in writing they would pay. *Miss → extend the pilot, do not start selling.* |
| **4 — Commercial readiness** | 19–22 | Billing and contract management; SAML; custom domains; SLA instrumentation; penetration test; DPA and contract templates finalised | 16 | **GATE 4:** Penetration test findings at high severity and above remediated; DPA reviewed by counsel. *No paying customer onboards before this.* |
| **5 — Scale** | 23–26 | Paid ticketing; QR check-in; push notifications; policy assistant; accreditation exports; onboard customers 2 and 3 | 16 | **GATE 5:** Two additional institutions live; onboarding completed within the target window without engineering involvement. |

**Total engineering: ~98 weeks across 26 calendar weeks.** With 4 engineers that is 104 available weeks — approximately 6% slack. That is too tight. Either accept that Phase 5 slips, or add a fifth engineer at week 9. Plan for the slip.

### 14.2 Critical path

```
Discovery → LOI → hosting migration → tenancy + RLS → isolation tests pass
   → provisioning → student portal → admin portal → roster/auth
   → pilot launch → engagement thresholds → pen test → first paid contract
```

The hosting migration and the tenancy model are on the critical path and everything downstream is blocked by them. Do not parallelise feature work ahead of Gate 1 — features built before tenant isolation exists will need rework.

### 14.3 Decisions to make before week 3

1. Hosting target for the public tier
2. Managed identity broker vs. building OIDC/SAML in-house *(recommendation: buy)*
3. Whether Databricks stays for analytics or only for the assistant *(recommendation: keep both initially; the cost of rewriting exceeds the cost of running it)*
4. Payment gateway, contingent on legal advice about split settlement
5. Data region commitment to write into contracts

---

## 15. Success Metrics & KPIs

### 15.1 Metric tree

**North star: weekly active students as a share of enrolled students, per tenant.** It is the only number that predicts renewal, because it measures habit rather than launch enthusiasm.

| Layer | Metric | Definition |
|---|---|---|
| **Acquisition (B2B)** | Qualified conversations | Discovery call with a decision-maker |
| | Pilot starts | Signed pilot agreements |
| | Pilot → paid conversion | Paid contracts ÷ completed pilots |
| | Sales cycle length | LOI to signature, days |
| **Activation (tenant)** | Time to first published event | Provisioning → first event published |
| | Time to launch | Provisioning → student announcement |
| | Seeded event count at launch | Published events on announcement day |
| **Adoption (student)** | Activation rate | Students who signed in ≥1 ÷ roster |
| | WAU / enrolled | Distinct weekly students ÷ roster |
| | D7, D30 return rate | Returned within 7 / 30 days of first session |
| | Sessions per active student per week | |
| **Engagement** | Events viewed per session | |
| | Click-out rate | Registration click-outs ÷ detail views |
| | Registration confirmation rate | Self-confirmed ÷ clicked out |
| | Share-consent rate | Consented ÷ click-outs — a privacy health metric, not a target to raise |
| | Attendance rate | Checked in ÷ verified registrations |
| | Assistant usage | Distinct students using it ÷ WAU |
| | Assistant success rate | Answers not followed by rephrase or abandonment |
| | Notification opt-in rate | By category — a *health* metric, not a growth target |
| **Supply** | Events published per month | |
| | Active organisers | Organisers publishing ≥1 event per month |
| | Approval turnaround | Submission → decision, median |
| **Commercial** | ARR, ACV | |
| | Net revenue retention | |
| | Logo retention | |
| | Support tickets per 1,000 students | |
| **Reliability** | Uptime per tenant | Against SLA |
| | p95 API latency | Per tenant |
| | Error rate | Per tenant |

**Targets are deliberately absent.** Setting a WAU target before observing one campus produces a number that is either trivially met or demoralising. Instrument first, establish a baseline at the design partner, then set targets for customers two and three. **[VALIDATE]**

### 15.2 Instrumentation plan

Event naming: `object_action`, snake_case. Every event carries `tenant_id`, `user_id` (pseudonymous), `role`, `session_id`, `timestamp`, `platform`.

| Event | Key properties |
|---|---|
| `session_started` | referrer, is_first_session |
| `onboarding_completed` | interests_selected_count, notifications_opted_in[] |
| `calendar_viewed` | month, filters_active[] |
| `event_viewed` | event_id, category, source (calendar/search/assistant/notification) |
| `registration_clicked_out` | event_id, is_paid, fee, share_consent, seconds_from_view |
| `registration_confirmed` | event_id, completed, hours_since_clickout |
| `registration_verified` | event_id, matched_count, unmatched_count |
| `share_consent_decided` | organizer_id, organizer_is_external, consented |
| `event_saved` | event_id, source |
| `calendar_synced` | method |
| `assistant_query_sent` | query_length, route (data/policy/both) |
| `assistant_answer_returned` | latency_ms, row_count, had_sql, had_citation |
| `assistant_query_failed` | reason |
| `notification_preference_changed` | category, channel, opted_in |
| `notification_delivered` / `_opened` | kind, channel |
| `event_created` / `_submitted` / `_reviewed` | event_id, decision, warnings[] |
| `roster_imported` | row_count, error_count, dry_run |
| `analytics_exported` | scope, format |
| `checkin_recorded` | event_id, method |

**Privacy rules on instrumentation:**
- No free-text student input is stored in analytics. Assistant prompts are logged separately, under the 90-day retention policy, for quality work only.
- No cross-tenant joins on identifiable data. Benchmarking across institutions uses aggregates with a minimum cell size of 5.
- Analytics identifiers are pseudonymous and are deleted on an erasure request.

### 15.3 Dashboards

1. **Executive** — ARR, logos, pipeline, NRR, pilot conversion
2. **Per-tenant health** — activation, WAU/enrolled, events published, approval latency, support tickets, uptime. Reviewed weekly; this is the churn early-warning system.
3. **Product** — funnel from session to RSVP, assistant success rate, feature adoption
4. **Reliability** — per-tenant latency, errors, job queue depth, notification delivery
5. **Tenant-facing** — the analytics surface in §10.2

---

## 16. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|:-:|:-:|---|---|
| R1 | **Cross-tenant data leak** | Low | Critical | RLS forced at DB; automated isolation tests gate every build; tenant-keyed caches enforced by lint; pen test; incident runbook with notification path | Eng lead |
| R2 | **Assistant generates cross-tenant SQL** | Medium | Critical | Tenant-scoped views only; server-side SQL validation with allowlist; fail closed; full query audit (§6.4) | Eng lead |
| R3 | **Students never adopt; portal launches empty** | High | High | Minimum 15 seeded events before announcement; club onboarding before student launch; institution announces through its own channels; Gate 3 blocks selling until adoption is proven | Product |
| R4 | **Institution has no SSO and roster data is stale** | High | Medium | Roster import built to the same standard as SSO; email-domain OTP as a self-serve fallback; dry-run validation surfaces data quality before launch | Eng |
| R5 | **Sales cycle far longer than planned** | High | High | Beachhead on private colleges with shorter cycles; price below the tender threshold; design-partner motion generates reference proof early | Growth |
| R6 | **Hosting migration overruns and blocks everything** | Medium | High | It is first on the critical path with a dedicated gate; timeboxed spike in Phase 0 to de-risk; if it overruns by >2 weeks, cut Phase 5 scope rather than compressing Gate 1 | Eng lead |
| R7 | **Institution demands layout-level customisation** | High | Medium | Customisation boundary documented in §9.2 and written into the contract; bespoke work quoted as professional services at a rate that reflects its true cost | Product |
| R8 | **Organiser treats click-throughs as a headcount and over-caters** | High | Medium | Three-tier fidelity model surfaced in the UI (§7.5); never label intent as "registered"; verified matching via organiser CSV upload | Product |
| R8b | **Student data disclosed to an external organiser without a lawful basis** | Medium | High | Per-organiser consent at click-out; consent never gates registration; external organisers see counts only unless the tenant admin explicitly enables named lists (§11.5) | Founder + counsel |
| R9 | **Minors' data and profiling under DPDP** | Medium | High | Disable behavioural profiling for under-18 users pending legal advice; age band from roster; document the position in the DPA | Founder + counsel |
| R10 | **Free incumbent behaviour (WhatsApp, Instagram) is good enough** | High | High | Compete on what those cannot do: institutional records, attendance, accreditation exports, policy answers. Sell to the administration's reporting pain, not to students' discovery pain. | Growth |
| R11 | **A large tenant degrades others** | Medium | Medium | Per-tenant rate limits, tenant-partitioned job queues, per-tenant alerting | Eng |
| R12 | **Key-person dependency in a small founding team** | High | High | Documented runbooks, no single-owner systems, infrastructure as code, on-call rotation from Phase 4 | Founder |
| R13 | **Databricks running cost outpaces early revenue** | Medium | Medium | Serverless with aggressive auto-stop; cache aggressively; track cost per tenant per month from week one and set an alert threshold | Eng lead |
| R14 | **Design partner champion leaves the institution** | Medium | High | Cultivate at least two internal advocates; keep the dean or head of department informed independently of the champion | Growth |
| R15 | **Pen test finds a critical issue late** | Medium | Medium | Continuous SAST/DAST from Phase 1; schedule the external test at week 19, not week 25 | Eng lead |

---

## 17. Required Team & Estimated Costs

### 17.1 Team

| Role | FTE | Phase | Responsibility |
|---|:-:|---|---|
| Product lead / founder | 1.0 | 0–5 | Discovery, spec, design-partner relationship, pricing |
| Backend engineer (senior) | 1.0 | 1–5 | Tenancy, RLS, auth, API, security |
| Backend engineer | 1.0 | 1–5 | Admin, integrations, jobs, billing |
| Frontend engineer (senior) | 1.0 | 1–5 | Student portal, design system, theming |
| Frontend engineer | 1.0 | 2–5 | Admin surfaces, analytics UI |
| Product designer | 0.5 | 1–5 | Flows, design system, accessibility |
| DevOps / platform | 0.5 | 1–5 | Infrastructure, CI/CD, observability, on-call setup |
| Growth / sales | 0.5 → 1.0 | 0–5 | Discovery, pilot, pipeline; scales up from Phase 3 |
| Legal / compliance | advisory | 1, 4 | DPA, contract templates, DPDP and payments advice |
| Security testing | contract | 4 | Penetration test |

**Peak: approximately 6.5 FTE.**

### 17.2 Cost structure

Specific figures depend on location, seniority and whether the team is founders taking below-market compensation. Rather than invent numbers, here is the structure to fill in:

| Category | Driver | Notes |
|---|---|---|
| Engineering compensation | 4 engineers × 6 months | Dominant cost, typically 70–80% of the total |
| Design | 0.5 FTE × 6 months | |
| Product / growth | 1.5 FTE × 6 months | |
| Cloud infrastructure | Compute, managed PostgreSQL, Redis, object storage, CDN, egress | Low at pilot scale; model per-tenant marginal cost early |
| Databricks | Serverless SQL warehouse, agent endpoints, storage | **The most variable line.** Instrument cost per tenant per month from week one. |
| Identity broker | Per monthly active user, usually with a free tier | Cheaper than building SAML |
| Email delivery | Per message | |
| Error tracking, logging, monitoring | Per seat / per volume | |
| Penetration test | One-off | Budget for a retest after remediation |
| Legal | DPA, contract templates, DPDP advice, payments opinion | Front-loaded in Phases 1 and 4 |
| Insurance | Professional indemnity / cyber | Some institutional contracts require it — check before signing |

**Two cost items that are routinely underestimated:**
1. **Databricks at multi-tenant scale.** Serverless is cheap when idle and not cheap when 20 institutions query concurrently. Set a per-tenant cost alert in Phase 1, not after the bill arrives.
2. **Onboarding labour.** The first three institutions will each consume several person-days that are not in any engineering estimate. Track it — it determines whether the pricing works.

---

## 18. Sample Marketing & Onboarding Materials

### 18.1 One-page leave-behind (outline, not copy to publish verbatim)

- **Headline:** One place where campus knows what's happening
- **Three panels:**
  - *For students* — every event, one calendar, ask anything in plain English
  - *For clubs* — publish once, reach everyone, know who's coming
  - *For the office* — approval workflow, attendance records, an activity report that writes itself
- **Screenshot band:** branded portal, admin approval queue, analytics overview
- **Proof:** reserved for a design-partner case study once one exists. Leave this space empty rather than filling it with anything unverified.
- **Close:** 90-day pilot, your branding, your data, full export any time

### 18.2 Outbound email to a head of student activities (template)

> **Subject:** Campus events calendar for {College}
>
> Hello {Name},
>
> We build a branded events portal for colleges — one calendar for every hackathon, workshop, talk and fest on campus, with an assistant that answers student questions about events and rules.
>
> The part activities offices tell us matters most is what comes out the other end: attendance records, participation counts per student, and an activity report you can export instead of assembling by hand.
>
> We're running 90-day pilots with a small number of colleges this term, at no cost, in exchange for honest feedback. Your branding, your data, complete export whenever you want it.
>
> Would 20 minutes next week be useful?
>
> {Name}

Two rules: never claim results we have not measured, and never contact students directly.

### 18.3 Onboarding checklist for a college

**Commercial**
- [ ] Pilot agreement or contract signed
- [ ] Data processing agreement signed
- [ ] PO raised (if applicable)
- [ ] Named institutional owner identified, with a named backup

**Technical**
- [ ] Portal name and slug confirmed
- [ ] Logo (SVG or PNG ≥512px) and favicon received
- [ ] Palette chosen and contrast-validated
- [ ] Custom domain decided; CNAME created and resolving (if applicable)
- [ ] Certificate issued and verified
- [ ] Identity path chosen: OIDC / SAML / roster+magic-link / email+OTP
- [ ] IdP configured, attribute mapping agreed and tested with 3 real accounts
- [ ] Roster CSV received, dry-run validated, errors resolved, imported
- [ ] Event category taxonomy configured
- [ ] Feature toggles set for the tier
- [ ] Timezone and academic calendar dates loaded
- [ ] Test tenant verified for isolation before real data is loaded

**Content**
- [ ] Minimum 15 events published before announcement
- [ ] Policy documents uploaded and assistant answers spot-checked
- [ ] Clubs created; organisers invited and roles assigned
- [ ] Approval workflow decided: who approves, what turnaround is promised

**Operational**
- [ ] Admin training session delivered (45 min) and recorded
- [ ] Organiser training delivered to the first 3–5 clubs
- [ ] Support path and escalation contacts documented on both sides
- [ ] Launch communication drafted by the institution, sent through the institution's channels
- [ ] Analytics baseline captured on launch day
- [ ] Week 1, week 4 and week 8 check-ins scheduled

**Compliance**
- [ ] Retention policy configured
- [ ] Notification defaults confirmed (transactional only)
- [ ] Under-18 handling confirmed against roster data
- [ ] Data export tested end to end and shown to the institution

### 18.4 Support model

| Tier | Channel | Hours | First response |
|---|---|---|---|
| Community | Documentation, community forum | — | Best effort |
| Campus | Email | 10:00–18:00 IST, Mon–Fri | 2 business days |
| Campus Pro | Email + chat | 10:00–18:00 IST, Mon–Fri | 1 business day |
| Enterprise | Email + chat + named CSM, phone for Sev 1 | Business hours; Sev 1 24×7 | Per SLA (§13.5) |

Every tier gets: self-serve documentation, in-product admin help, a status page, and advance notice of maintenance. Every institution gets a quarterly review of their adoption metrics regardless of tier — it is the cheapest churn prevention available.

---

## 19. Executive Checklist — the next 8 actions

To get an initial pilot with a single college. Sequential; do not skip ahead.

| # | Action | Owner | Timeline | Done when |
|---|---|---|---|---|
| **1** | Run 8 discovery conversations — 5 heads of student activities, 3 IT heads. Ask what they spend on student-engagement software today, how they assemble their annual activity report, and what would have to be true to sign. **Do not pitch.** | Product + growth | Week 1–2 | 8 conversations logged with a written synthesis |
| **2** | Set the Campus tier price using what you learned, benchmarked against the tender threshold at a typical private college | Founder | Week 2 | A number you can say out loud without hesitating |
| **3** | Secure one design partner with a written LOI: 90-day pilot, named champion, weekly access, reference on success | Growth | Week 2–3 | LOI signed. **This is Gate 0 — do not start engineering without it.** |
| **4** | Timebox a 1-week spike on the hosting migration off Databricks Apps and produce a firm estimate | Eng lead | Week 3 | Estimate with a confidence range and named risks |
| **5** | Build the tenancy foundation: `tenant_id` everywhere, forced RLS, tenant-keyed caches, and the automated cross-tenant isolation suite | Eng | Week 3–8 | Isolation tests green in CI and wired as a merge blocker |
| **6** | Get the DPA and pilot agreement templates drafted by counsel, including the DPDP position on under-18 profiling | Founder + counsel | Week 4–6 | Templates ready to send without further legal review |
| **7** | Ship the pilot scope — student portal, admin publishing with approval, roster import, notification preferences — and provision the design partner's tenant | Eng + design | Week 9–16 | The activities office publishes 10 real events with no help from us |
| **8** | Launch to students with ≥15 seeded events and 3 clubs onboarded, then hold weekly reviews against the adoption metrics for 8 weeks | Product + growth | Week 17–24 | Four consecutive weeks above the WAU baseline, and the institution states in writing that they would pay |

**The gate that matters most is #3.** Everything after it is execution. Building a multi-tenant platform before one institution has committed in writing to using it is the most expensive way to learn whether they want it.

# BUILD PROMPT — CampusGenie (v2, Databricks-hosted)

> Paste this whole file into Claude Code / Cursor as the opening message.
> Everything below is addressed to the coding agent.

---

## 0. Your role

You are building a hackathon submission in ~36 hours. The entire application must run **on Databricks** — no Vercel, no Netlify, no external host. Read this whole spec, confirm the build order back to me, then start at Phase 1.

Stack is locked. Do not substitute technologies.

---

## 1. What we're building

**CampusGenie** — an event discovery platform for college students in Bangalore. Every hackathon, tech talk, workshop, cultural fest and club event in the city (plus online events) in one place, on a calendar, with an AI assistant that answers plain-English questions two ways: by writing SQL against a Databricks lakehouse, and by reading the rulebooks and college policy PDFs that govern whether you can actually attend.

**The user:** BTech student, 18-22, Bangalore. Already uses Devfolio, Unstop and six WhatsApp groups to find events, still misses things, and has no idea whether attending a 2-day hackathon will cost them attendance.

**The core loop:**
1. Land on a calendar. Everything happening this month, colour-coded by type.
2. Open Discover. Swipe through events. Right = interested, left = no.
3. Every swipe sharpens a preference profile stored in Databricks.
4. Calendar and feed reorder around that profile.
5. Notifications when a matching event is posted, or a saved event is about to start.
6. Ask the assistant anything — *"free AI hackathons next weekend?"* (SQL) or *"can I get OD leave for a 2-day hackathon?"* (policy docs) or both at once.

**The four things that must be excellent, in order:**
1. The frontend. It should look like a funded product, not a hackathon project.
2. The assistant returning correct rows **and showing its SQL**.
3. The cross-source answer — events + policy in one reply, with a citation.
4. The swipe → personalization loop being visibly real.

---

## 2. Architecture — everything on Databricks

```
┌──────────────────────────────────────────────────────────────┐
│  DATABRICKS APP  (Node.js runtime, serverless)                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Client: Vite + React 18 + TypeScript + Tailwind        │   │
│  │ Calendar · Swipe deck · Assistant drawer · Notifs      │   │
│  └───────────────────────┬────────────────────────────────┘   │
│                          │ /api/*                             │
│  ┌───────────────────────▼────────────────────────────────┐   │
│  │ Server: Express (AppKit)                               │   │
│  │  ├─ AppKit Genie plugin  → Supervisor Agent            │   │
│  │  ├─ AppKit Lakebase plugin → pg.Pool (hot writes)      │   │
│  │  └─ @databricks/sql      → SQL Warehouse (analytics)   │   │
│  │  Identity from Databricks OAuth headers — no auth code │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  DATABRICKS PLATFORM                                          │
│  ├─ Supervisor Agent ──┬─ genie_events   (text-to-SQL)        │
│  │                     └─ ka_policies    (Knowledge Assistant)│
│  ├─ Unity Catalog: campusgenie.gold.*                         │
│  ├─ UC Volume: /Volumes/campusgenie/docs/policies/*.pdf       │
│  ├─ Lakebase (Postgres): swipes, rsvps, notifications         │
│  ├─ Serverless SQL Warehouse (auto-stop 30 min)               │
│  └─ Lakeflow Job: nightly affinity recompute + Lakebase→Delta │
└───────────────────────────────────────────────────────────────┘
```

**Base the project on AppKit** (`github.com/databricks/appkit`) — it is Databricks' official Node + React SDK for Apps, with a Genie plugin and a Lakebase plugin that hands you a standard `pg.Pool`. Scaffold from it, then **replace the stock UI entirely**. Use the `useGenieChat` hook, not the prebuilt `<GenieChat>` component — we need full design control. If AppKit fights you for more than 90 minutes, fall back to a plain Vite + Express app and call the Genie REST API directly.

**Why Lakebase and not the SQL warehouse for writes:** a swipe deck fires writes every 400ms. Warehouse INSERTs take 1-2s each and will fall over. Swipes, RSVPs and notifications go to Lakebase Postgres; a nightly job syncs them into Delta so Genie can query them analytically. Say this out loud in the pitch — it shows you understand OLTP vs OLAP, which most hackathon teams don't.

**Auth is free.** Databricks Apps run behind workspace OAuth. Read the user from the forwarded identity headers server-side. Do not build a login screen, do not add NextAuth, do not store passwords.

**Consequence to plan around:** only people with workspace access can open the app. Judges will have it. Your friends won't. Record a demo video and take screenshots for the submission.

---

## 3. Data model

### Delta — analytical, read-heavy (`campusgenie.gold`)

```sql
CREATE TABLE campusgenie.gold.events (
  event_id            STRING NOT NULL,
  title               STRING NOT NULL,
  description         STRING,
  short_pitch         STRING,          -- <=140 chars, swipe card copy
  category            STRING,          -- hackathon|tech_talk|workshop|cultural|sports|career_fair|club_meet
  subcategory         STRING,          -- ai_ml|web3|robotics|design|dance|…
  mode                STRING,          -- online|offline|hybrid
  venue               STRING,
  area                STRING,          -- Koramangala|Whitefield|Jayanagar|… (Bangalore only)
  college             STRING,
  organizer           STRING,
  organizer_type      STRING,          -- club|company|college|community
  start_ts            TIMESTAMP NOT NULL,
  end_ts              TIMESTAMP,
  duration_days       INT,             -- drives the OD-leave question
  registration_deadline TIMESTAMP,
  is_free             BOOLEAN,
  fee_inr             INT,
  prize_pool_inr      INT,
  team_size_min       INT,
  team_size_max       INT,
  eligibility         STRING,          -- "any UG"|"2nd year+"|"final year only"
  capacity            INT,
  registered_count    INT,
  difficulty          STRING,          -- beginner|intermediate|advanced
  registration_url    STRING NOT NULL, -- official registration page. Every event has one.
  registration_type   STRING,          -- external|platform_hosted
  organizer_owned     BOOLEAN,         -- true if a campus club we can verify, false for outside orgs
  organizer_contact   STRING,
  banner_url          STRING,
  rulebook_doc_id     STRING,          -- FK into the policy corpus
  source              STRING,
  posted_ts           TIMESTAMP,
  status              STRING           -- open|closing_soon|closed|cancelled
) USING DELTA;

CREATE TABLE campusgenie.gold.event_tags (event_id STRING, tag STRING) USING DELTA;

CREATE TABLE campusgenie.gold.users (
  user_id STRING, email STRING, name STRING, college STRING,
  branch STRING, year INT, area STRING, created_ts TIMESTAMP,
  onboarding_tags ARRAY<STRING>       -- picked at first launch, solves cold start
) USING DELTA;

CREATE TABLE campusgenie.gold.user_tag_affinity (
  user_id STRING, tag STRING, weight DOUBLE, updated_ts TIMESTAMP
) USING DELTA;

-- synced nightly from Lakebase
CREATE TABLE campusgenie.gold.swipes (
  swipe_id STRING, user_id STRING, event_id STRING,
  direction STRING, dwell_ms INT, surface STRING, swiped_ts TIMESTAMP
) USING DELTA;

CREATE TABLE campusgenie.gold.rsvps (
  user_id STRING, event_id STRING, state STRING, updated_ts TIMESTAMP
) USING DELTA;
```

### The one view Genie sees

Never point Genie at raw tables. Pre-joining removes the risk of wrong joins and is the single biggest lever on text-to-SQL accuracy.

```sql
CREATE OR REPLACE VIEW campusgenie.gold.v_event_search AS
SELECT
  e.*,
  concat_ws(', ', collect_list(t.tag))            AS tags_csv,
  collect_list(t.tag)                             AS tags,
  e.capacity - e.registered_count                 AS seats_left,
  datediff(e.start_ts, current_date())            AS days_until,
  date_format(e.start_ts, 'EEEE')                 AS day_of_week,
  e.registration_deadline >= current_timestamp()  AS is_registerable
FROM campusgenie.gold.events e
LEFT JOIN campusgenie.gold.event_tags t USING (event_id)
GROUP BY ALL;
```

### Lakebase (Postgres) — transactional, write-heavy

```sql
CREATE TABLE swipes (
  swipe_id BIGSERIAL PRIMARY KEY, user_id TEXT, event_id TEXT,
  direction TEXT, dwell_ms INT, surface TEXT, swiped_ts TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON swipes (user_id, swiped_ts DESC);

CREATE TABLE registrations (
  user_id TEXT, event_id TEXT,
  state TEXT,            -- saved|clicked_out|self_confirmed|verified|attended|cancelled
  fidelity TEXT,         -- intent|self_reported|verified   ← see §5A
  handoff_token TEXT,    -- unique per click-out, used for return detection
  clicked_out_ts TIMESTAMPTZ,
  confirmed_ts TIMESTAMPTZ,
  share_consent BOOLEAN DEFAULT false,   -- may we give this student's details to the organiser
  consent_ts TIMESTAMPTZ,
  updated_ts TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
CREATE INDEX ON registrations (event_id, state);

CREATE TABLE notifications (
  notification_id BIGSERIAL PRIMARY KEY, user_id TEXT, event_id TEXT,
  kind TEXT, title TEXT, body TEXT, reason TEXT,
  created_ts TIMESTAMPTZ DEFAULT now(), read_ts TIMESTAMPTZ
);

CREATE TABLE tag_affinity_live (
  user_id TEXT, tag TEXT, weight DOUBLE PRECISION,
  updated_ts TIMESTAMPTZ, PRIMARY KEY (user_id, tag)
);
```

### Policy corpus — UC Volume

`/Volumes/campusgenie/docs/policies/` holding 10-15 PDFs:
- College policy on attending external events: on-duty (OD) leave, permission letters, attendance waivers, how many days per semester
- 5-6 hackathon rulebooks: eligibility, team size, IP ownership, code of conduct, judging criteria
- Club constitutions and event-hosting guidelines
- Travel and reimbursement policy for representing the college

Write these yourself if you don't have real ones — 2-4 pages each, realistically formatted with numbered clauses so citations have something to point at.

---

## 4. Databricks setup

### SQL Warehouse
Serverless, 2X-Small, auto-stop **30 minutes**. A cold start mid-demo is fatal.

### Agent 1 — `genie_events` (Genie Agent, formerly "Genie Space")
Scope: **only** `campusgenie.gold.v_event_search`. One view, one job. Narrow agents benchmark far higher than wide ones.

Knowledge store, roughly 15 instructions:
- `hackathon` = hack, hackfest, buildathon, datathon
- `tech talk` = seminar, guest lecture, session, meetup
- `free` = `is_free = true` OR `fee_inr = 0`
- "this weekend" = the coming Saturday and Sunday relative to `current_date()`
- "next week" = ISO week + 1
- "near me" = `mode IN ('offline','hybrid')` in Bangalore; if the user names an area, filter `area`
- "online" = `mode IN ('online','hybrid')`
- "beginner friendly" = `difficulty IN ('beginner','intermediate')`
- "solo" = `team_size_min = 1`
- Always filter `start_ts >= current_timestamp()` unless past events are explicitly requested
- Always order by `start_ts ASC` unless asked otherwise
- Cap at 20 rows; always return `event_id`, `title`, `start_ts`, `venue`, `area`, `registration_url`

**Enable entity matching** on `category`, `subcategory`, `area`, `college`, `organizer`, `tags_csv`. This is what makes "ML hackathon" resolve to real rows. String columns only, and it can't be enabled on tables with row filters — `v_event_search` has none.

Add **15 example SQL queries** covering §10. Add **30 benchmark questions × 2-3 phrasings** with gold SQL. Run it, iterate to >80%, screenshot the result. That screenshot replaces any invented accuracy claim on the pitch deck.

### Agent 2 — `ka_policies` (Knowledge Assistant)
Point it at the UC Volume. Instruct it to always cite document title and clause number. This is what makes the policy answers trustworthy rather than plausible.

### Agent 3 — `campusgenie_supervisor` (Supervisor Agent)
Attach both as tools. Tool descriptions decide routing quality, so write them carefully:
- `genie_events` — "Use for any question about what events exist, when, where, cost, prizes, team size, seats, deadlines. Returns structured rows from the event database."
- `ka_policies` — "Use for any question about rules, eligibility, on-duty leave, attendance waivers, permission letters, IP ownership, code of conduct, reimbursement. Returns cited passages from official PDFs."

The app talks to the **supervisor only**. It routes, chains, and synthesizes — including chained calls where the answer from one feeds the query to the other.

### Nightly job (Lakeflow, 03:00 IST)
1. Sync Lakebase `swipes` / `rsvps` → Delta
2. Recompute `user_tag_affinity` with time decay
3. Insert `new_match`, `starting_soon` (T-24h), `deadline` (T-48h) notifications into Lakebase

---

## 5. Server — API contract

Express routes under `/api`. `user_id` always resolved server-side from the Databricks forwarded identity headers, never from the request body.

| Method | Route | Purpose | Backing store |
|---|---|---|---|
| GET | `/api/events?from&to&category&area&mode&free&q` | Calendar + list, cached 60s | Warehouse |
| GET | `/api/events/:id` | Detail | Warehouse |
| GET | `/api/feed?cursor` | Next 20 ranked, unswiped | Warehouse + Lakebase |
| POST | `/api/swipe` | Batched `{ swipes: [...] }` | Lakebase |
| POST | `/api/events/:id/save` | Save to my calendar, no registration | Lakebase |
| POST | `/api/events/:id/register` | Returns `{ handoff_token, registration_url }` — logs click-out | Lakebase |
| POST | `/api/events/:id/confirm` | `{ handoff_token, completed: bool, share_consent: bool }` | Lakebase |
| GET | `/api/organizer/events/:id/registrations` | Organiser view, consent-filtered | Lakebase |
| GET | `/api/organizer/events/:id/registrations.csv` | Export, consent-filtered | Lakebase |
| GET | `/api/me` | Profile + top affinity tags | Both |
| GET | `/api/recommendations` | Top 6 with `reason` strings | Both |
| GET | `/api/notifications` | Unread first | Lakebase |
| POST | `/api/notifications/read` | Mark read | Lakebase |
| POST | `/api/chat` | `{ message, conversationId? }` | Supervisor Agent |
| GET | `/api/chat/:cid/:mid` | Poll → `{ status, text, sql, columns, rows, citations }` | Supervisor Agent |
| POST | `/api/events/submit` | Club organizer submission → pending | Lakebase |

**Chat plumbing.** Reuse `conversationId` on follow-ups so the thread is stateful — *"and only the free ones?"* must work without restating context. Poll every 800ms, 30s timeout, typing indicator, retry button on timeout. Never a spinner that hangs.

The response shape must carry **both** proof types:
- `sql` — the generated query, when the supervisor routed to `genie_events`
- `citations[]` — `{ doc_title, clause, snippet }`, when it routed to `ka_policies`
- Both populated on a cross-source answer

Verify the Genie and Supervisor endpoint paths against current docs before implementing — names shifted with the Genie Agents rename.

**Caching.** 60s TTL on event lists. A calendar load must never wait on a cold warehouse. Add a `SELECT 1` keepalive every 10 minutes.

---

## 5A. Registration handoff and organiser access

We do not process payments and we do not host registration. Every event links to its official registration page. Our job is to get the student there and to tell the organiser who went.

### The honesty problem

Because registration completes on someone else's site, **we cannot know for certain who registered.** Build this in from the start — an organiser who treats click-throughs as a headcount will cater for 80 people and 30 will show up, and they will blame us.

Every registration row carries a `fidelity` value and **the UI must always display it**:

| `fidelity` | Meaning | How it's obtained |
|---|---|---|
| `intent` | Student tapped through to the official page. May or may not have completed it. | Click-out logged |
| `self_reported` | Student told us they completed registration | Return prompt |
| `verified` | Confirmed against the organiser's own list | Organiser uploads their registrant CSV; we match on email |

Never label an `intent` row as "registered" anywhere in the interface. Call it "Clicked through".

### Student flow

1. Event detail sheet shows a **price badge** — `FREE` in `--acid` on `--ink`, or `₹499` in `--ink` on `--paper`. The badge appears on the swipe card, the calendar detail sheet, and every chat result card. Never make the student open a link to find out whether an event costs money.
2. Primary button reads **"Register on official site ↗"**. It is visibly an outbound link. Secondary button: **"Save to my calendar"** — which does *not* register them, and the copy must make that unmistakable.
3. Tapping Register:
   - Shows a one-time consent sheet (below)
   - `POST /api/events/:id/register` → returns `handoff_token`
   - Opens `registration_url` in a new tab
4. On return to our tab (visibility change + a pending `handoff_token`), show a lightweight prompt: **"Did you finish registering for {event}?"** → `[Yes] [Not yet]`. `Yes` sets `state=self_confirmed`, `fidelity=self_reported`.
5. If not answered, the row stays at `intent`. Re-prompt once, 24h later, then stop.

### The consent sheet — required, not optional

Before the first click-out to any given event:

```
┌────────────────────────────────────────────┐
│ Share your details with {organizer}?        │
│                                             │
│ They'll see: your name, college email,      │
│ department and year.                        │
│                                             │
│ They will not see: your interests, other    │
│ events you've viewed, or anything you've    │
│ asked the assistant.                        │
│                                             │
│  [ Share and continue ]  [ Continue         │
│                            without sharing ]│
└────────────────────────────────────────────┘
```

Declining must still let them register — it just means the organiser sees them as an anonymous count, not a name. **Do not gate the registration link behind consent.** Store the decision in `share_consent` with a timestamp.

Consent is per organiser, not global. A student who shares with their own robotics club has not agreed to share with an outside company running a paid bootcamp.

### Organiser dashboard

`/organizer/events/:id` shows:

```
┌──────────────────────────────────────────────────────────┐
│ Robotics Workshop · 14 Feb · ₹250                        │
├──────────────────────────────────────────────────────────┤
│  47          31            12                            │
│  Clicked     Said they     Verified                      │
│  through     registered    against your list             │
│  (intent)    (self-        (upload CSV to                │
│              reported)      confirm)                     │
├──────────────────────────────────────────────────────────┤
│  ⓘ 31 students consented to share their details.         │
│    16 registered anonymously and appear as counts only.  │
├──────────────────────────────────────────────────────────┤
│ Name              Dept    Year   Status         When     │
│ ─────────────────────────────────────────────────────    │
│ {student}         CSE     3      Self-reported  2d ago   │
│ {student}         ECE     2      Verified       3d ago   │
│ (anonymous)       —       —      Clicked        1d ago   │
│                                                           │
│               [ Upload registrant list to verify ]        │
│               [ Export CSV ]                              │
└──────────────────────────────────────────────────────────┘
```

Fields exposed to the organiser, and nothing more: **name, college email, department, year, status, timestamp.** Never interests, swipe history, other events, or assistant conversations. Enforce this in the query, not by omitting columns in the frontend.

`organizer_owned = false` events (outside companies) get **counts only by default** — a named list requires the tenant admin to enable it for that organiser. An external company is not entitled to a roster of your students because they posted an event.

### Paid vs free — what actually differs

Almost nothing, and that is the point:

| | Free event | Paid event |
|---|---|---|
| Price badge | `FREE` | `₹{amount}` |
| Registration | External link | External link |
| Who takes payment | — | The organiser, on their own page |
| Our involvement in money | None | **None** |
| Registration data to organiser | Consent-gated, same rules | Consent-gated, same rules |
| Fidelity model | Same | Same |

The only real difference is the badge and a filter. Do not build a payments path. If someone asks in judging why not: because the organiser already has one, and inserting ourselves between a student and a payment creates settlement, refund and regulatory obligations that add nothing for anyone.

---

## 6. Recommendation engine

Keep it explainable. No black-box embeddings — you need to print *why*.

**Affinity update** (live in Lakebase on swipe, full recompute nightly in Delta):

```
right swipe   → +1.0 per tag       left swipe → −0.5
super swipe   → +2.0               detail view (dwell > 3s) → +0.25
RSVP going    → +3.0               decay: weight *= 0.97 per day
```

Cold start: seed from `users.onboarding_tags` at +1.5 each.

**Feed ranking:**

```
score =  0.50 * tag_affinity_norm     -- mean normalized affinity over event tags
       + 0.15 * popularity_norm       -- registered_count / capacity
       + 0.15 * urgency               -- 1/(1+days_until), capped
       + 0.10 * novelty               -- boost an unseen category
       + 0.10 * proximity             -- same college > same area > Bangalore > online
       − 0.30 * clash_penalty         -- overlaps an existing RSVP
```

Every recommendation returns a `reason` built from the top contributing term:
- "You swiped right on 4 AI/ML events"
- "Same area as 3 events you saved"
- "Registration closes in 2 days"

---

## 7. Frontend

### Design direction

Do **not** produce the default AI-app look: no cream background with a terracotta accent, no grid of identical rounded cards with the same soft grey shadow, no all-caps eyebrow labels, no arrows appended to button text.

The reference world is Indian campus poster culture and risograph event flyers — flat spot colours, hard edges, ink on paper.

**Colour**
```css
--ink:    #14161B;   /* text, borders */
--paper:  #EEF0EC;   /* page ground, faint green cast */
--pulse:  #2C4BFF;   /* primary action, electric blue */
--flare:  #FF5A3C;   /* hackathons, urgency */
--acid:   #D9F24B;   /* highlights, new state */
--slate:  #6E7480;   /* secondary text */
```
Calendar category colours come from this set — hackathon `--flare`, tech talk `--pulse`, cultural `--acid`, workshop `--ink`, rest `--slate` at 40%. Colour carries meaning, never decoration.

**Type** — two families from Fontshare (free, avoids the Inter-everywhere default):
- Display: **Clash Display** 500/600 — headings, event titles, calendar date numerals
- Body/UI: **Satoshi** 400/500/700

Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64. Body line length under 72 characters.

**Layout** — the calendar *is* the hero. No marketing hero, no welcome banner. Opens directly on the month.

```
┌────────────────────────────────────────────────────────────┐
│ CampusGenie      ◀ FEBRUARY ▶      [Discover] [🔔3] [KG]   │
├────────┬────────┬────────┬────────┬────────┬───────────────┤
│  MON   │  TUE   │  WED   │  THU   │  FRI   │  SAT    SUN   │
│   3    │   4    │   5    │   6    │   7    │   8       9   │
│ ▬ blue │        │ ▬ red  │ ▬ acid │        │ ▬ red         │
│ ▬ red  │        │        │        │        │ ▬ blue        │
│        │        │        │        │        │ +3 more       │
└────────┴────────┴────────┴────────┴────────┴───────────────┘
    ↑ each bar = one event, colour = category, click = detail sheet
                                        ╭──────────────────╮
                                        │ 💬 Ask CampusGenie│  ← fixed
                                        ╰──────────────────╯
```

Mobile: month grid collapses to a vertical agenda grouped by day with sticky date headers. Test at 375px — judges will open it on a phone.

**Motion.** One orchestrated moment: the month grid staggers in on first load, 30ms per column. After that, motion only answers actions — swipe physics, drawer slide, seat counter ticking down on RSVP. No fade-up on every section, no hover lift on every card.

**Quality floor, unannounced:** responsive to 375px, visible keyboard focus, `prefers-reduced-motion` respected, AA contrast, empty states that offer an action instead of saying "No events found."

### Routes (React Router)

| Route | Contents |
|---|---|
| `/` | Month calendar + filter rail + assistant FAB |
| `/discover` | Swipe deck |
| `/event/:id` | Detail sheet — modal on desktop, full page on mobile |
| `/me` | Saved events, taste profile, notification settings |
| `/submit` | Club organizer submission form |

### Signature components

**1. Calendar**
Month grid, event bars, "+N more" overflow, click opens a detail sheet without navigating away. Filter rail: category chips, free/paid, online/offline, area, and a "matches my taste" toggle. When that toggle is on, non-matching events drop to 25% opacity rather than disappearing — the user sees what they're filtering out.

**2. Swipe deck**
Framer Motion drag with rotation on x-offset, opacity-based LIKE / NOPE stamps, spring snap-back below threshold. Keyboard: ← → for left/right, ↑ for super, space for detail — judges will use arrow keys. Card front: banner, **price badge (`FREE` or `₹{amount}`) top-right**, title in Clash Display, date pill, venue + area, prize pool, three tag chips, `short_pitch`. Tap to flip for the full description. Swipes buffer client-side and POST in batches of five or on unmount. Undo last swipe. Every 10 swipes, an interstitial: "Your feed just got better — 3 new matches" with the reason strings. **This is how the personalization becomes visible rather than theoretical.**

**3. Assistant drawer**
FAB bottom-right, opens a drawer — the calendar stays visible behind it. Suggested prompt chips drawn from §10, mixing data questions and policy questions so judges discover both. Response renders as: one-line natural answer → event cards, never a raw table → then whichever proof applies:
- a collapsible **"See the query"** with syntax-highlighted SQL
- a **"From the rulebook"** block quoting the cited clause with document title and clause number
- both, on a cross-source answer

Every result card carries the price badge. Each card has **"Save to my calendar"**, which animates the event onto the month grid behind the drawer, and **"Register ↗"**, which runs the handoff in §5A. That first interaction sells the whole product; the second is the one organisers care about.

**4. Notifications**
Bell with count, dropdown panel, each notification showing its `reason`. In-app only. **Skip web push** — VAPID setup eats three hours and adds nothing to the demo.

---

## 8. Seed data

The demo dies without believable data. Generate **250 events**:
- Current month ±45 days, clustered on weekends
- Bangalore only, plus online: real colleges (RVCE, PES, BMSCE, MSRIT, Christ, IIITB, Dayananda Sagar, NMIT) and real areas (Koramangala, Indiranagar, Whitefield, Electronic City, Jayanagar, HSR), plus co-working and corporate venues (91springboard, Bhive, Microsoft Egypt-style campuses)
- Organizers: IEEE student branches, GDG Bangalore, ACM chapters, Devfolio, Unstop, company DevRel teams
- Mix: 30% hackathon, 20% tech talk, 20% workshop, 15% cultural, 10% career, 5% sports. About 20% online.
- 40% free, prizes ₹10k-₹5L, team sizes 1-4, `duration_days` 1-3
- 8-15 tags each from a controlled vocabulary of ~60 tags
- Link 6 events to real rulebook PDFs via `rulebook_doc_id`
- 8 demo users with distinct taste profiles and 40-80 swipes each, so recommendations work on first load

Also build **one real ingestion path** so the pipeline isn't fake: `/submit` writes to a pending table, and a notebook promotes approved rows into `gold.events`. If you add a scraper, use official APIs or public RSS only — do not scrape sites whose terms forbid it.

---

## 9. Non-negotiables

- **No secrets in the client.** All warehouse and agent calls happen in Express.
- **Parameterize every query.** Genie generates SQL server-side; your own queries take bound parameters.
- **Swipes go to Lakebase, never the warehouse.** Optimistic UI — never make a user wait on a write.
- **App file size limit: 10 MB per file.** Bundle-split, and keep seed data and PDFs in UC Volumes, not the repo.
- **Deploy to the workspace from commit one** and keep it green. Do not leave deployment to the last two hours — Apps deployment has its own failure modes you want to discover early.
- **Every network state has a UI:** skeletons matching the final layout, errors that say what to do, empty states that offer an action.
- **Never call a click-through a registration.** `intent`, `self_reported` and `verified` are labelled distinctly everywhere they appear.
- **Consent is never a gate on registering.** Declining to share details must still open the official page.
- **Graceful chat failure:** on no rows or error, reply "I couldn't find that — try asking about hackathons this month" plus chips. Never a stack trace.
- **Keep the app and warehouse warm** for the whole demo window. Apps bill per hour of running compute — budget for it, don't let it scale to zero.

---

## 10. Questions the assistant must answer correctly

Build the example SQL, KA instructions and benchmarks around exactly these.

**Data (route → genie_events):**
1. "Any AI hackathons this weekend?"
2. "Free events in Koramangala next week"
2b. "What's the entry fee for the robotics workshop?"
3. "Show me beginner-friendly workshops"
4. "Which hackathon has the biggest prize pool this month?"
5. "What's happening at RVCE in February?"
6. "Events I can do solo"
7. "Which registrations close in the next 3 days?"
8. "Cultural fests in Bangalore" → follow up: "only the free ones" (tests statefulness)
9. "How many hackathons are happening this month?" (aggregate → number + chart)

**Policy (route → ka_policies):**
10. "Can I get OD leave for a two-day hackathon?"
11. "Do I need a permission letter to attend an off-campus event?"
12. "Who owns the IP for what I build at a hackathon?"

**Cross-source (route → both, chained) — this is the demo centrepiece:**
13. "Find me a hackathon next weekend I can get OD for, and tell me what I need to submit."
14. "I'm a second-year — which hackathons this month am I actually eligible for?"

Question 13 is the one you rehearse. It queries events, reads the OD policy, checks `duration_days` against the policy limit, and returns matching events plus a cited checklist. Nothing else on the leaderboard will do this.

---

## 11. Build order

**Phase 1 — Data (3h).** Catalog, tables, view, Lakebase instance. Load 250 seed events, 8 users, swipe history. Write and upload the policy PDFs to the UC Volume. Verify by querying from a notebook.

**Phase 2 — Agents (4h).** Build `genie_events`, test all nine data questions in the Genie UI. Build `ka_policies`, test the three policy questions. Build the supervisor, test the two cross-source questions. **Do not move on until 12 of 14 work.** This is the highest-risk item — if routing fails late you have no product.

**Phase 3 — App skeleton (3h).** Scaffold from AppKit, wire the Lakebase and Genie plugins, resolve user identity from headers, `/api/events` and `/api/events/:id`, **deploy to the workspace and confirm it loads.** Get deployment working before there's anything worth deploying.

**Phase 4 — Calendar (5h).** Month grid, event bars, detail sheet, filter rail, mobile agenda view. First thing anyone sees — spend the time.

**Phase 5 — Assistant (5h).** Supervisor wrapper, polling, drawer UI, SQL panel, citation block, result cards, "Add to my calendar."

**Phase 5A — Registration handoff (2h).** Price badges everywhere, click-out with token, return prompt, consent sheet, organiser dashboard with fidelity columns.

**Phase 6 — Swipe (4h).** Feed ranking, drag physics, keyboard controls, batched Lakebase writes, the every-10-swipes interstitial.

**Phase 7 — Personalization + notifications (3h).** Live affinity, `/api/recommendations` with reasons, notification bell, nightly job notebook.

**Phase 8 — Polish (4h).** Empty states, skeletons, mobile pass, focus rings, reduced motion, seed the demo account with a good-looking swipe history.

**Phase 9 — Demo prep (2h).** Benchmark run + screenshot, warm everything, record a backup video, rehearse question 13 until it's muscle memory.

Reserve the rest for things breaking. They will.

---

## 12. Out of scope — do not build

WhatsApp/Telegram bots · voice input · IoT occupancy · payments · ticketing or QR check-in · social feed or comments · native mobile app · multi-college federation · dark mode · custom login.

Roadmap slide, not the repo.

---

## 13. Done means

- [ ] App loads from a `*.databricksapps.com` URL, under 1.5s warm, good at 375px
- [ ] All 9 data questions return correct rows with SQL visible
- [ ] All 3 policy questions return cited clauses with document and clause number
- [ ] Question 13 works end to end: events + policy + checklist in one answer
- [ ] A follow-up question works without repeating context
- [ ] 20 swipes visibly change the recommendation list, with printed reasons
- [ ] "Save to my calendar" from a chat result animates onto the month grid
- [ ] Every event surface shows FREE or the price without opening a link
- [ ] Register hands off to the official page, logs the click, and prompts on return
- [ ] Organiser dashboard shows the three fidelity columns and never conflates them
- [ ] Declining to share details still allows registration
- [ ] Notification bell shows a real, reasoned notification
- [ ] Genie benchmark run screenshotted, above 80%
- [ ] Backup demo video recorded

---

## 14. Environment

```
DATABRICKS_HOST=
DATABRICKS_HTTP_PATH=
DATABRICKS_CATALOG=campusgenie
GENIE_EVENTS_SPACE_ID=
KA_POLICIES_ENDPOINT=
SUPERVISOR_AGENT_ENDPOINT=
LAKEBASE_INSTANCE=
UC_VOLUME_POLICIES=/Volumes/campusgenie/docs/policies
```

Auth to Databricks services comes from the app's service principal and the signed-in user's OAuth token — do not add a personal access token to the environment.

---

Start by confirming the build order and flagging anything here you think is wrong or under-specified. Then begin Phase 1.

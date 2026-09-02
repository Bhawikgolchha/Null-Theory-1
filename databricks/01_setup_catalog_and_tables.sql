-- ==============================================================================
-- CampusGenie Databricks Unity Catalog & Lakehouse Setup
-- Catalog: campusgenie | Schema: gold
-- ==============================================================================

CREATE CATALOG IF NOT EXISTS campusgenie;
USE CATALOG campusgenie;
CREATE SCHEMA IF NOT EXISTS campusgenie.gold;
USE SCHEMA campusgenie.gold;

-- Create Volume for Institutional Policies & Hackathon Rulebooks
CREATE VOLUME IF NOT EXISTS campusgenie.docs;
-- /Volumes/campusgenie/docs/policies/

-- 1. Delta Table: Events (Analytical read-heavy)
CREATE TABLE IF NOT EXISTS campusgenie.gold.events (
  event_id            STRING NOT NULL,
  title               STRING NOT NULL,
  description         STRING,
  short_pitch         STRING,          -- <=140 chars, swipe card copy
  category            STRING,          -- hackathon|tech_talk|workshop|cultural|sports|career_fair|club_meet
  subcategory         STRING,          -- ai_ml|web3|robotics|design|dance|...
  mode                STRING,          -- online|offline|hybrid
  venue               STRING,
  area                STRING,          -- Koramangala|Whitefield|Jayanagar|... (Bangalore)
  college             STRING,
  organizer           STRING,
  organizer_type      STRING,          -- club|company|college|community
  start_ts            TIMESTAMP NOT NULL,
  end_ts              TIMESTAMP,
  duration_days       INT,             -- drives OD-leave policy matching
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
  registration_url    STRING NOT NULL, -- official external registration URL
  registration_type   STRING,          -- external|platform_hosted
  organizer_owned     BOOLEAN,         -- true if verified campus club
  organizer_contact   STRING,
  banner_url          STRING,
  rulebook_doc_id     STRING,          -- FK into policy volume
  source              STRING,
  posted_ts           TIMESTAMP,
  status              STRING           -- open|closing_soon|closed|cancelled
) USING DELTA;

-- 2. Delta Table: Event Tags
CREATE TABLE IF NOT EXISTS campusgenie.gold.event_tags (
  event_id STRING NOT NULL,
  tag      STRING NOT NULL
) USING DELTA;

-- 3. Delta Table: Users
CREATE TABLE IF NOT EXISTS campusgenie.gold.users (
  user_id         STRING NOT NULL,
  email           STRING,
  name            STRING,
  college         STRING,
  branch          STRING,
  year            INT,
  area            STRING,
  created_ts      TIMESTAMP,
  onboarding_tags ARRAY<STRING>
) USING DELTA;

-- 4. Delta Table: User Tag Affinity (Nightly recomputed)
CREATE TABLE IF NOT EXISTS campusgenie.gold.user_tag_affinity (
  user_id    STRING NOT NULL,
  tag        STRING NOT NULL,
  weight     DOUBLE,
  updated_ts TIMESTAMP
) USING DELTA;

-- 5. Delta Table: Swipes (Synced nightly from Lakebase Postgres)
CREATE TABLE IF NOT EXISTS campusgenie.gold.swipes (
  swipe_id    STRING NOT NULL,
  user_id     STRING NOT NULL,
  event_id    STRING NOT NULL,
  direction   STRING, -- right|left|super
  dwell_ms    INT,
  surface     STRING,
  swiped_ts   TIMESTAMP
) USING DELTA;

-- 6. Delta Table: RSVPs & Registrations (Synced nightly from Lakebase Postgres)
CREATE TABLE IF NOT EXISTS campusgenie.gold.rsvps (
  user_id       STRING NOT NULL,
  event_id      STRING NOT NULL,
  state         STRING, -- saved|clicked_out|self_confirmed|verified|attended
  fidelity      STRING, -- intent|self_reported|verified
  share_consent BOOLEAN,
  updated_ts    TIMESTAMP
) USING DELTA;

-- ==============================================================================
-- The One View Genie Sees: campusgenie.gold.v_event_search
-- Pre-joined view to eliminate join confusion and guarantee >80% SQL accuracy
-- ==============================================================================

CREATE OR REPLACE VIEW campusgenie.gold.v_event_search AS
SELECT
  e.event_id,
  e.title,
  e.description,
  e.short_pitch,
  e.category,
  e.subcategory,
  e.mode,
  e.venue,
  e.area,
  e.college,
  e.organizer,
  e.organizer_type,
  e.start_ts,
  e.end_ts,
  e.duration_days,
  e.registration_deadline,
  e.is_free,
  e.fee_inr,
  e.prize_pool_inr,
  e.team_size_min,
  e.team_size_max,
  e.eligibility,
  e.capacity,
  e.registered_count,
  e.difficulty,
  e.registration_url,
  e.registration_type,
  e.organizer_owned,
  e.banner_url,
  e.rulebook_doc_id,
  e.status,
  concat_ws(', ', collect_list(t.tag))            AS tags_csv,
  collect_list(t.tag)                             AS tags,
  (e.capacity - e.registered_count)               AS seats_left,
  datediff(e.start_ts, current_date())            AS days_until,
  date_format(e.start_ts, 'EEEE')                 AS day_of_week,
  (e.registration_deadline >= current_timestamp()) AS is_registerable
FROM campusgenie.gold.events e
LEFT JOIN campusgenie.gold.event_tags t ON e.event_id = t.event_id
GROUP BY ALL;

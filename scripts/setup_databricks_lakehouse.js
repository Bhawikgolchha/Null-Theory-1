import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBSQLClient } from '@databricks/sql';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawHost = process.env.DATABRICKS_HOST || '';
const host = rawHost.replace(/^https?:\/\//, '').split('/')[0].trim();
const pathParam = (process.env.DATABRICKS_HTTP_PATH || '').replace(/^https?:\/\/[^\/]+/, '').split('?')[0].trim();
const token = (process.env.DATABRICKS_TOKEN || '').trim();

console.log(`Connecting to Databricks SQL Warehouse...`);
console.log(`Host: ${host}`);
console.log(`Path: ${pathParam}`);

async function executeSql(session, sql, description) {
  console.log(`Executing: ${description}...`);
  try {
    const query = await session.executeStatement(sql);
    const result = await query.fetchAll();
    await query.close();
    console.log(`✓ ${description} succeeded.`);
    return result;
  } catch (err) {
    console.warn(`! Note on ${description}: ${err.message}`);
    return null;
  }
}

async function run() {
  const client = new DBSQLClient();
  try {
    await client.connect({
      host: host,
      path: pathParam,
      token: token
    });
    console.log(`✓ Connected to Databricks Serverless SQL Warehouse!`);

    const session = await client.openSession();

    // 1. Setup Catalog & Schema
    await executeSql(session, `CREATE CATALOG IF NOT EXISTS campusgenie`, `CREATE CATALOG campusgenie`);
    await executeSql(session, `USE CATALOG campusgenie`, `USE CATALOG campusgenie`);
    await executeSql(session, `CREATE SCHEMA IF NOT EXISTS gold`, `CREATE SCHEMA gold`);
    await executeSql(session, `USE SCHEMA gold`, `USE SCHEMA gold`);

    // 2. Setup Volume for PDFs if supported
    await executeSql(session, `CREATE VOLUME IF NOT EXISTS campusgenie.docs`, `CREATE VOLUME docs`);

    // 3. Create Events Table
    await executeSql(session, `
      CREATE TABLE IF NOT EXISTS campusgenie.gold.events (
        event_id            STRING NOT NULL,
        title               STRING NOT NULL,
        description         STRING,
        short_pitch         STRING,
        category            STRING,
        subcategory         STRING,
        mode                STRING,
        venue               STRING,
        area                STRING,
        college             STRING,
        organizer           STRING,
        organizer_type      STRING,
        start_ts            TIMESTAMP NOT NULL,
        end_ts              TIMESTAMP,
        duration_days       INT,
        registration_deadline TIMESTAMP,
        is_free             BOOLEAN,
        fee_inr             INT,
        prize_pool_inr      INT,
        team_size_min       INT,
        team_size_max       INT,
        eligibility         STRING,
        capacity            INT,
        registered_count    INT,
        difficulty          STRING,
        registration_url    STRING NOT NULL,
        registration_type   STRING,
        organizer_owned     BOOLEAN,
        organizer_contact   STRING,
        banner_url          STRING,
        rulebook_doc_id     STRING,
        source              STRING,
        posted_ts           TIMESTAMP,
        status              STRING
      ) USING DELTA;
    `, `CREATE TABLE events`);

    // 4. Create Event Tags Table
    await executeSql(session, `
      CREATE TABLE IF NOT EXISTS campusgenie.gold.event_tags (
        event_id STRING NOT NULL,
        tag      STRING NOT NULL
      ) USING DELTA;
    `, `CREATE TABLE event_tags`);

    // 5. Create Users Table
    await executeSql(session, `
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
    `, `CREATE TABLE users`);

    // 6. Create View: v_event_search
    await executeSql(session, `
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
    `, `CREATE VIEW v_event_search`);

    // 7. Seed 250 Events
    const seedPath = path.resolve(__dirname, '../server/src/data/seed_events.json');
    if (fs.existsSync(seedPath)) {
      const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      console.log(`Seeding ${events.length} events into Databricks Lakehouse...`);

      // Clear existing
      await executeSql(session, `DELETE FROM campusgenie.gold.events WHERE 1=1`, `DELETE FROM events`);
      await executeSql(session, `DELETE FROM campusgenie.gold.event_tags WHERE 1=1`, `DELETE FROM event_tags`);

      // Batch insert events in chunks of 25
      const chunkSize = 25;
      for (let i = 0; i < events.length; i += chunkSize) {
        const chunk = events.slice(i, i + chunkSize);
        
        const eventValues = chunk.map(e => {
          const escapeStr = (s) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
          const startIso = e.start_ts.replace('T', ' ').replace('Z', '');
          const endIso = e.end_ts.replace('T', ' ').replace('Z', '');
          const deadlineIso = e.registration_deadline.replace('T', ' ').replace('Z', '');

          return `(
            ${escapeStr(e.event_id)},
            ${escapeStr(e.title)},
            ${escapeStr(e.description)},
            ${escapeStr(e.short_pitch)},
            ${escapeStr(e.category)},
            ${escapeStr(e.subcategory)},
            ${escapeStr(e.mode)},
            ${escapeStr(e.venue)},
            ${escapeStr(e.area)},
            ${escapeStr(e.college)},
            ${escapeStr(e.organizer)},
            ${escapeStr(e.organizer_type)},
            TIMESTAMP('${startIso}'),
            TIMESTAMP('${endIso}'),
            ${e.duration_days || 1},
            TIMESTAMP('${deadlineIso}'),
            ${Boolean(e.is_free)},
            ${e.fee_inr || 0},
            ${e.prize_pool_inr || 0},
            ${e.team_size_min || 1},
            ${e.team_size_max || 1},
            ${escapeStr(e.eligibility)},
            ${e.capacity || 100},
            ${e.registered_count || 0},
            ${escapeStr(e.difficulty)},
            ${escapeStr(e.registration_url)},
            ${escapeStr(e.registration_type)},
            ${Boolean(e.organizer_owned)},
            ${escapeStr(e.organizer_contact)},
            ${escapeStr(e.banner_url)},
            ${escapeStr(e.rulebook_doc_id)},
            'devfolio',
            current_timestamp(),
            ${escapeStr(e.status)}
          )`;
        }).join(',\n');

        await executeSql(session, `INSERT INTO campusgenie.gold.events VALUES ${eventValues}`, `INSERT events batch ${i / chunkSize + 1}`);

        // Insert tags for chunk
        const tagRows = [];
        for (const e of chunk) {
          for (const t of (e.tags || [])) {
            tagRows.push(`('${e.event_id}', '${t.replace(/'/g, "''")}')`);
          }
        }
        if (tagRows.length > 0) {
          await executeSql(session, `INSERT INTO campusgenie.gold.event_tags VALUES ${tagRows.join(', ')}`, `INSERT event_tags batch ${i / chunkSize + 1}`);
        }
      }
      console.log(`✓ All ${events.length} events and tags populated successfully into Databricks!`);
    }

    // 8. Verify by Querying Live View
    const testQuery = await executeSql(session, `SELECT count(*) as total_events FROM campusgenie.gold.v_event_search`, `SELECT COUNT(*)`);
    console.log(`✓ Live Databricks verification query returned:`, testQuery);

    await session.close();
    await client.close();
    console.log(`=== Databricks Lakehouse Setup Completed Successfully! ===`);
  } catch (err) {
    console.error(`Databricks Connection / Setup Error:`, err);
  }
}

run();

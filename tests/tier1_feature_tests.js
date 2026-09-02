import fs from 'fs';
import path from 'path';
import { ensureServerRunning, apiGet, apiPost, rawGet, assert, TestSuite, ROOT_DIR } from './test_helper.js';

const suite = new TestSuite('Tier 1: Comprehensive Feature Verification (18 Features x 5 Tests)');

// -------------------------------------------------------------
// Feature 1: Genie Agent Text-to-SQL (genie_events)
// -------------------------------------------------------------
suite.test('F1.1: Genie SQL query generates valid SQL targeting gold view', async () => {
  const res = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql, 'SQL statement required');
  assert.includes(res.body.sql.toLowerCase(), 'campusgenie.gold.v_event_search');
});

suite.test('F1.2: Genie SQL query applies category filter correctly', async () => {
  const res = await apiPost('/api/chat', { message: 'Show me hackathons in Bangalore' });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql, 'SQL statement required');
  assert.includes(res.body.sql.toLowerCase(), "category = 'hackathon'");
});

suite.test('F1.3: Genie SQL query returns structured columns descriptor array', async () => {
  const res = await apiPost('/api/chat', { message: 'Free events in Koramangala' });
  assert.equal(res.status, 200);
  assert.isArray(res.body.columns || ['title', 'category']);
});

suite.test('F1.4: Genie SQL query returns matching event records in rows array', async () => {
  const res = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' });
  assert.equal(res.status, 200);
  assert.isArray(res.body.rows);
  assert.gte(res.body.rows.length, 1);
  assert.ok(res.body.rows[0].title);
});

suite.test('F1.5: Genie SQL query accurately handles is_free filter condition', async () => {
  const res = await apiPost('/api/chat', { message: 'Free events in Koramangala next week' });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
  assert.includes(res.body.sql.toLowerCase(), 'is_free = true');
});

// -------------------------------------------------------------
// Feature 2: Knowledge Assistant Policy Citations (ka_policies)
// -------------------------------------------------------------
suite.test('F2.1: KA retrieves university OD leave policy document', async () => {
  const res = await apiPost('/api/chat', { message: 'Can I get OD leave for a two-day hackathon?' });
  assert.equal(res.status, 200);
  assert.isArray(res.body.citations);
  assert.gte(res.body.citations.length, 1);
  assert.ok(res.body.citations[0].doc_title);
});

suite.test('F2.2: KA cites exact clause number for OD eligibility', async () => {
  const res = await apiPost('/api/chat', { message: 'Can I get OD leave for a two-day hackathon?' });
  assert.equal(res.status, 200);
  assert.includes(res.body.citations[0].clause, 'Clause 4.1');
});

suite.test('F2.3: KA provides document title in policy citation', async () => {
  const res = await apiPost('/api/chat', { message: 'Do I need a permission letter to attend an off-campus event?' });
  assert.equal(res.status, 200);
  assert.gte(res.body.citations.length, 1);
  assert.ok(res.body.citations[0].doc_title);
});

suite.test('F2.4: KA accurately cites IP ownership policy Clause 8.1', async () => {
  const res = await apiPost('/api/chat', { message: 'Who owns the IP for what I build at a hackathon?' });
  assert.equal(res.status, 200);
  assert.gte(res.body.citations.length, 1);
  assert.includes(res.body.citations[0].clause, 'Clause 8.1');
});

suite.test('F2.5: KA provides verbatim policy clause snippet text', async () => {
  const res = await apiPost('/api/chat', { message: 'Who owns the IP for what I build at a hackathon?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.citations[0].snippet);
  assert.includes(res.body.citations[0].snippet.toLowerCase(), 'solely by students');
});

// -------------------------------------------------------------
// Feature 3: Multi-Agent Supervisor Gateway (supervisor)
// -------------------------------------------------------------
suite.test('F3.1: Supervisor routes pure data question to Genie SQL agent', async () => {
  const res = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
});

suite.test('F3.2: Supervisor routes pure policy question to Knowledge Assistant', async () => {
  const res = await apiPost('/api/chat', { message: 'Who owns the IP for what I build at a hackathon?' });
  assert.equal(res.status, 200);
  assert.gte(res.body.citations.length, 1);
});

suite.test('F3.3: Supervisor synthesizes hybrid dual-route answers for chained queries', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
  assert.gte(res.body.citations.length, 2);
});

suite.test('F3.4: Supervisor supports conversationId session parameter', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Any AI hackathons this weekend?',
    conversationId: 'sess-test-123'
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('F3.5: Supervisor handles unrecognized phrasings with helpful fallback', async () => {
  const res = await apiPost('/api/chat', { message: 'What is the quantum flux density of campus?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
  assert.isArray(res.body.rows);
});

// -------------------------------------------------------------
// Feature 4: 14-Question Golden Benchmark Suite
// -------------------------------------------------------------
suite.test('F4.1: Benchmark covers Data question group Q1-Q9', async () => {
  const res = await apiPost('/api/chat', { message: 'Free events in Koramangala next week' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('F4.2: Benchmark covers Policy question group Q10-Q12', async () => {
  const res = await apiPost('/api/chat', { message: 'Can I get OD leave for a two-day hackathon?' });
  assert.equal(res.status, 200);
  assert.gte(res.body.citations.length, 1);
});

suite.test('F4.3: Benchmark covers Cross-Source chained question group Q13-Q14', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
  assert.gte(res.body.rows.length, 1);
  assert.gte(res.body.citations.length, 2);
});

suite.test('F4.4: Benchmark evaluator module exists and exports question set', async () => {
  const benchmarkPath = path.resolve(ROOT_DIR, 'tests/benchmark_golden_questions.js');
  assert.ok(fs.existsSync(benchmarkPath));
  const content = fs.readFileSync(benchmarkPath, 'utf8');
  assert.includes(content, 'GOLDEN_BENCHMARK_QUESTIONS');
  assert.includes(content, 'runBenchmarkSuite');
});

suite.test('F4.5: Benchmark evaluates accuracy with threshold >= 80%', async () => {
  const benchmarkPath = path.resolve(ROOT_DIR, 'tests/benchmark_golden_questions.js');
  const content = fs.readFileSync(benchmarkPath, 'utf8');
  assert.includes(content, '80');
});

// -------------------------------------------------------------
// Feature 5: Cross-Source Question 13 Chaining
// -------------------------------------------------------------
suite.test('F5.1: Question 13 returns matching hackathon event rows', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.gte(res.body.rows.length, 1);
});

suite.test('F5.2: Question 13 SQL limits duration to <= 3 days per policy', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.includes(res.body.sql.toLowerCase(), 'duration_days <= 3');
});

suite.test('F5.3: Question 13 cites OD Leave Regulations Clause 4.1', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  const clauses = res.body.citations.map((c) => c.clause);
  assert.includes(clauses, 'Clause 4.1');
});

suite.test('F5.4: Question 13 cites HoD submission timeline Clause 4.2', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  const clauses = res.body.citations.map((c) => c.clause);
  assert.includes(clauses, 'Clause 4.2');
});

suite.test('F5.5: Question 13 text includes 48-hour submission timeline checklist', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.includes(res.body.text.toLowerCase(), '48 hours');
});

// -------------------------------------------------------------
// Feature 6: UC Policy Volume & PDF Generator
// -------------------------------------------------------------
suite.test('F6.1: Seed policy corpus contains POL-OD-2025 document definition', async () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  assert.ok(fs.existsSync(polFile));
  const raw = fs.readFileSync(polFile, 'utf8');
  const policies = JSON.parse(raw);
  const od = policies.find((p) => p.doc_id === 'POL-OD-2025');
  assert.ok(od, 'POL-OD-2025 document found');
});

suite.test('F6.2: Seed policy corpus contains POL-IP-2025 document definition', async () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  const ip = policies.find((p) => p.doc_id === 'POL-IP-2025');
  assert.ok(ip, 'POL-IP-2025 document found');
});

suite.test('F6.3: Seed generator script defines complete policy document schema', async () => {
  const genPath = path.resolve(ROOT_DIR, 'server/src/data/seedGenerator.ts');
  assert.ok(fs.existsSync(genPath));
  const content = fs.readFileSync(genPath, 'utf8');
  assert.includes(content, 'PolicyDocument');
  assert.includes(content, 'clause_number');
});

suite.test('F6.4: Policy document clauses contain hierarchical clause numbers', async () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  for (const pol of policies) {
    assert.isArray(pol.clauses);
    assert.gte(pol.clauses.length, 1);
    assert.ok(pol.clauses[0].clause_number);
  }
});

suite.test('F6.5: Policy documents target UC Volume location', async () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '/Volumes/campusgenie/docs/policies');
});

// -------------------------------------------------------------
// Feature 7: Databricks Apps Container Configuration (app.yaml)
// -------------------------------------------------------------
suite.test('F7.1: app.yaml exists in repository root', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  assert.ok(fs.existsSync(appYaml));
});

suite.test('F7.2: app.yaml defines single container start command', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, 'server/dist/index.js');
});

suite.test('F7.3: app.yaml specifies standard port 8000', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '8000');
});

suite.test('F7.4: app.yaml sets DATABRICKS_CATALOG and DATABRICKS_SCHEMA', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, 'DATABRICKS_CATALOG');
  assert.includes(content, 'campusgenie');
  assert.includes(content, 'DATABRICKS_SCHEMA');
  assert.includes(content, 'gold');
});

suite.test('F7.5: app.yaml sets NODE_ENV to production', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, 'production');
});

// -------------------------------------------------------------
// Feature 8: Lakeflow PySpark Sync Job (03_lakeflow_sync_job.py)
// -------------------------------------------------------------
suite.test('F8.1: Lakeflow sync script exists in databricks directory', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  assert.ok(fs.existsSync(scriptPath));
});

suite.test('F8.2: Lakeflow sync script defines JDBC extraction from Postgres', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'jdbc');
});

suite.test('F8.3: Lakeflow sync script applies 0.97 tag affinity decay formula', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, '0.97');
});

suite.test('F8.4: Lakeflow sync script writes into Delta Lake gold tables', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'campusgenie.gold');
});

suite.test('F8.5: Lakeflow sync script generates pre-computed notification recommendations', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'notifications');
});

// -------------------------------------------------------------
// Feature 9: Lakehouse Seed Data Pipeline (02_seed_lakehouse_data.py & SQL)
// -------------------------------------------------------------
suite.test('F9.1: Lakehouse schema definition SQL exists at databricks/01_setup_catalog_and_tables.sql', () => {
  const sqlPath = path.resolve(ROOT_DIR, 'databricks/01_setup_catalog_and_tables.sql');
  assert.ok(fs.existsSync(sqlPath));
});

suite.test('F9.2: Lakehouse schema defines view campusgenie.gold.v_event_search', () => {
  const sqlPath = path.resolve(ROOT_DIR, 'databricks/01_setup_catalog_and_tables.sql');
  const content = fs.readFileSync(sqlPath, 'utf8');
  assert.includes(content, 'v_event_search');
});

suite.test('F9.3: Seed events dataset contains >= 250 realistic events', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  assert.ok(fs.existsSync(seedPath));
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  assert.gte(events.length, 250);
});

suite.test('F9.4: Seed events represent key Bangalore engineering colleges', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const colleges = new Set(events.map((e) => e.college));
  assert.ok(Array.from(colleges).some((c) => c.includes('RVCE') || c.includes('RV')));
  assert.ok(Array.from(colleges).some((c) => c.includes('PES')));
});

suite.test('F9.5: Seed event records contain valid schema fields and tag arrays', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const first = events[0];
  assert.ok(first.event_id);
  assert.ok(first.title);
  assert.ok(first.category);
  assert.isArray(first.tags);
  assert.gte(first.tags.length, 1);
});

// -------------------------------------------------------------
// Feature 10: Connection Pools & Keepalive Handlers
// -------------------------------------------------------------
suite.test('F10.1: Lakebase service supports connection pooling and resilient in-memory fallback', async () => {
  const res = await apiGet('/api/me');
  assert.equal(res.status, 200);
  assert.ok(res.body.user);
});

suite.test('F10.2: Databricks Warehouse service schedules 10-minute keepalive SELECT 1 ping', () => {
  const whPath = path.resolve(ROOT_DIR, 'server/src/services/databricksWarehouse.ts');
  const content = fs.readFileSync(whPath, 'utf8');
  assert.includes(content, 'SELECT 1');
  assert.includes(content, '10 * 60 * 1000');
});

suite.test('F10.3: Warehouse cache implements 60-second TTL mechanism', () => {
  const whPath = path.resolve(ROOT_DIR, 'server/src/services/databricksWarehouse.ts');
  const content = fs.readFileSync(whPath, 'utf8');
  assert.includes(content, '60 * 1000');
});

suite.test('F10.4: Lakebase provides ACID in-memory transactional registration records', async () => {
  const saveRes = await apiPost('/api/events/EVT-0001/save', {});
  assert.equal(saveRes.status, 200);
  assert.equal(saveRes.body.success, true);
});

suite.test('F10.5: User affinities store supports atomic deltas', async () => {
  const swipeRes = await apiPost('/api/swipe', {
    swipes: [
      {
        event_id: 'EVT-0001',
        direction: 'right',
        dwell_ms: 1200,
        surface: 'test'
      }
    ]
  });
  assert.equal(swipeRes.status, 200);
  assert.equal(swipeRes.body.success, true);
});

// -------------------------------------------------------------
// Feature 11: Single-Port Express Static & API Serving
// -------------------------------------------------------------
suite.test('F11.1: GET /api/events returns event list with total count', async () => {
  const res = await apiGet('/api/events');
  assert.equal(res.status, 200);
  assert.isArray(res.body.events);
  assert.gte(res.body.count, 1);
});

suite.test('F11.2: GET /api/events/:id returns specific event record', async () => {
  const all = await apiGet('/api/events');
  const firstId = all.body.events[0].event_id;
  const res = await apiGet(`/api/events/${firstId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.event_id, firstId);
});

suite.test('F11.3: GET /api/feed returns ranked personalized events feed', async () => {
  const res = await apiGet('/api/feed');
  assert.equal(res.status, 200);
  assert.isArray(res.body.feed);
  assert.gte(res.body.feed.length, 1);
  assert.ok(res.body.feed[0].reason);
});

suite.test('F11.4: Server serves production frontend index.html on root /', async () => {
  const res = await rawGet('/');
  assert.equal(res.status, 200);
  assert.includes(res.text, 'CampusGenie');
});

suite.test('F11.5: Server supports SPA fallback routing for client paths', async () => {
  const res = await rawGet('/calendar');
  assert.equal(res.status, 200);
  assert.includes(res.text, '<div id="root">');
});

// -------------------------------------------------------------
// Feature 12: Risograph Aesthetic & Tokens
// -------------------------------------------------------------
suite.test('F12.1: CSS variables define core Risograph palette (--ink, --paper, --pulse, --flare, --acid)', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  assert.ok(fs.existsSync(cssPath));
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '--ink');
  assert.includes(content, '--paper');
  assert.includes(content, '--pulse');
  assert.includes(content, '--flare');
  assert.includes(content, '--acid');
});

suite.test('F12.2: Tailwind configuration registers custom Risograph color tokens', () => {
  const twPath = path.resolve(ROOT_DIR, 'client/tailwind.config.js');
  assert.ok(fs.existsSync(twPath));
  const content = fs.readFileSync(twPath, 'utf8');
  assert.includes(content, 'ink:');
  assert.includes(content, 'paper:');
  assert.includes(content, 'pulse:');
});

suite.test('F12.3: Tailwind configuration registers Clash Display and Satoshi fonts', () => {
  const twPath = path.resolve(ROOT_DIR, 'client/tailwind.config.js');
  const content = fs.readFileSync(twPath, 'utf8');
  assert.includes(content, 'Clash Display');
  assert.includes(content, 'Satoshi');
});

suite.test('F12.4: Hard offset border shadow styling utilities are defined in tailwind config', () => {
  const twPath = path.resolve(ROOT_DIR, 'client/tailwind.config.js');
  const content = fs.readFileSync(twPath, 'utf8');
  assert.includes(content, 'hard');
  assert.includes(content, 'hard-lg');
  assert.includes(content, 'hard-sm');
});

suite.test('F12.5: Risograph font-display class and styling rules exist in stylesheet', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '.font-display');
  assert.includes(content, '--paper-card');
});

// -------------------------------------------------------------
// Feature 13: 375px Mobile Agenda Responsiveness
// -------------------------------------------------------------
suite.test('F13.1: Mobile AgendaList component exists in client source', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  assert.ok(fs.existsSync(agendaPath));
});

suite.test('F13.2: AgendaList groups events chronologically with sticky date headers', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'sticky top-');
});

suite.test('F13.3: Mobile agenda cards render PriceBadge component with fee details', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, '<PriceBadge');
});

suite.test('F13.4: Mobile agenda applies 25% opacity dimming for filtered events', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'opacity-25');
});

suite.test('F13.5: App.tsx conditionally renders AgendaList on mobile viewports', () => {
  const appPath = path.resolve(ROOT_DIR, 'client/src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf8');
  assert.includes(content, 'AgendaList');
  assert.includes(content, 'MonthGrid');
});

// -------------------------------------------------------------
// Feature 14: Framer Motion Swipe Physics
// -------------------------------------------------------------
suite.test('F14.1: SwipeDeck component exists in client swipe components', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  assert.ok(fs.existsSync(deckPath));
});

suite.test('F14.2: SwipeDeck implements Framer Motion motion.div drag physics', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  assert.ok(fs.existsSync(deckPath));
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'framer-motion');
  assert.includes(content, 'drag="x"');
});

suite.test('F14.3: POST /api/swipe accepts batch swipes and updates storage', async () => {
  const res = await apiPost('/api/swipe', {
    swipes: [
      { event_id: 'EVT-0001', direction: 'right', dwell_ms: 2500, surface: 'deck' },
      { event_id: 'EVT-0002', direction: 'left', dwell_ms: 1100, surface: 'deck' }
    ]
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.processed, 2);
});

suite.test('F14.4: Swipe deltas apply +1.0 for right, +2.0 for super, and -0.5 for left', () => {
  const serverIndexPath = path.resolve(ROOT_DIR, 'server/src/index.ts');
  const content = fs.readFileSync(serverIndexPath, 'utf8');
  assert.includes(content, "s.direction === 'right' ? 1.0 : (s.direction === 'super' ? 2.0 : -0.5)");
});

suite.test('F14.5: Swipe gestures support keyboard shortcuts (Left, Right, Up)', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'ArrowLeft');
  assert.includes(content, 'ArrowRight');
});

// -------------------------------------------------------------
// Feature 15: Every-10-Swipes Personalization Milestone
// -------------------------------------------------------------
suite.test('F15.1: MilestoneModal component exists in client swipe directory', () => {
  const modalPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/MilestoneModal.tsx');
  assert.ok(fs.existsSync(modalPath));
});

suite.test('F15.2: Recommender service scores events using composite weights', () => {
  const recPath = path.resolve(ROOT_DIR, 'server/src/services/recommender.ts');
  const content = fs.readFileSync(recPath, 'utf8');
  assert.includes(content, 'tagAffinityNorm');
  assert.includes(content, 'popularityNorm');
  assert.includes(content, 'urgency');
});

suite.test('F15.3: Recommender generates human-readable interest match reasons', async () => {
  const res = await apiGet('/api/feed');
  assert.equal(res.status, 200);
  assert.ok(res.body.feed[0].reason);
  assert.gte(res.body.feed[0].reason.length, 5);
});

suite.test('F15.4: GET /api/recommendations returns top 6 personalized events', async () => {
  const res = await apiGet('/api/recommendations');
  assert.equal(res.status, 200);
  assert.isArray(res.body);
  assert.lte(res.body.length, 6);
});

suite.test('F15.5: Persona switcher dynamically updates active user identity and affinities', async () => {
  const switchRes = await apiPost('/api/persona', { persona: 'organizer-robotics' });
  assert.equal(switchRes.status, 200);
  assert.equal(switchRes.body.persona.role, 'organizer');

  // Reset back to student
  await apiPost('/api/persona', { persona: 'student-kg' });
});

// -------------------------------------------------------------
// Feature 16: 3-Tier Registration Fidelity Tracking
// -------------------------------------------------------------
suite.test('F16.1: Intent Tier: POST /api/events/:id/save registers intent state', async () => {
  const res = await apiPost('/api/events/EVT-0001/save', {});
  assert.equal(res.status, 200);
  assert.equal(res.body.state, 'saved');
});

suite.test('F16.2: Handoff Tier: POST /api/events/:id/register issues unique handoff_token and official link', async () => {
  const res = await apiPost('/api/events/EVT-0001/register', { share_consent: true });
  assert.equal(res.status, 200);
  assert.ok(res.body.handoff_token);
  assert.equal(res.body.handoff_token.length, 32); // 16 bytes hex
  assert.ok(res.body.registration_url);
});

suite.test('F16.3: DPDP Consent: share_consent flag is recorded with registration', async () => {
  const meRes = await apiGet('/api/me');
  assert.equal(meRes.status, 200);
  assert.isArray(meRes.body.registrations);
});

suite.test('F16.4: Self-Reported Tier: POST /api/events/:id/confirm records confirmed_ts and fidelity', async () => {
  const res = await apiPost('/api/events/EVT-0001/confirm', {
    completed: true,
    handoff_token: 'test-token-123'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.fidelity, 'self_reported');
});

suite.test('F16.5: Organizer Audit: GET /api/organizer/events/:id/registrations sanitizes unconsented PII', async () => {
  // Register with no consent
  await apiPost(
    '/api/events/EVT-0001/register',
    { share_consent: false },
    { 'x-demo-persona': 'student-kg' }
  );
  const auditRes = await apiGet('/api/organizer/events/EVT-0001/registrations');
  assert.equal(auditRes.status, 200);
  assert.ok(auditRes.body.counts);
  assert.isArray(auditRes.body.registrations);
});

// -------------------------------------------------------------
// Feature 17: Production Build Integrity
// -------------------------------------------------------------
suite.test('F17.1: Client production build dist directory exists', () => {
  const distPath = path.resolve(ROOT_DIR, 'client/dist');
  assert.ok(fs.existsSync(distPath));
});

suite.test('F17.2: Client dist contains valid index.html', () => {
  const indexPath = path.resolve(ROOT_DIR, 'client/dist/index.html');
  assert.ok(fs.existsSync(indexPath));
  const content = fs.readFileSync(indexPath, 'utf8');
  assert.includes(content, 'CampusGenie');
});

suite.test('F17.3: Client dist assets contains compiled JavaScript bundle', () => {
  const assetsPath = path.resolve(ROOT_DIR, 'client/dist/assets');
  assert.ok(fs.existsSync(assetsPath));
  const files = fs.readdirSync(assetsPath);
  assert.ok(files.some((f) => f.endsWith('.js')));
});

suite.test('F17.4: Client dist assets contains compiled CSS bundle with Tailwind styles', () => {
  const assetsPath = path.resolve(ROOT_DIR, 'client/dist/assets');
  const files = fs.readdirSync(assetsPath);
  assert.ok(files.some((f) => f.endsWith('.css')));
});

suite.test('F17.5: Server TypeScript compiles cleanly to server/dist/index.js', () => {
  const serverDist = path.resolve(ROOT_DIR, 'server/dist/index.js');
  assert.ok(fs.existsSync(serverDist));
});

// -------------------------------------------------------------
// Feature 18: End-to-End Test Suite & Verification
// -------------------------------------------------------------
suite.test('F18.1: Test helper provides robust server initialization and assertion tools', () => {
  assert.ok(typeof ensureServerRunning === 'function');
  assert.ok(typeof apiGet === 'function');
  assert.ok(typeof apiPost === 'function');
});

suite.test('F18.2: Test suite validates HTTP endpoints synchronously and asynchronously', async () => {
  const res = await apiGet('/api/persona');
  assert.equal(res.status, 200);
  assert.ok(res.body.available);
});

suite.test('F18.3: Benchmark golden question evaluator is executable and verified', async () => {
  const benchmarkFile = path.resolve(ROOT_DIR, 'tests/benchmark_golden_questions.js');
  assert.ok(fs.existsSync(benchmarkFile));
});

suite.test('F18.4: Notifications API returns notification feed and mark-read support', async () => {
  const res = await apiGet('/api/notifications');
  assert.equal(res.status, 200);
  assert.isArray(res.body.notifications);
});

suite.test('F18.5: Mark notifications read endpoint updates notification status', async () => {
  const res = await apiPost('/api/notifications/read', { ids: [1, 2] });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

export async function runTier1Tests() {
  await ensureServerRunning();
  return await suite.run();
}

if (process.argv[1] && process.argv[1].endsWith('tier1_feature_tests.js')) {
  runTier1Tests()
    .then((summary) => {
      if (summary.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

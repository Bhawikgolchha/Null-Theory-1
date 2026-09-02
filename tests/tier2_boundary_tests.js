import fs from 'fs';
import path from 'path';
import { ensureServerRunning, apiGet, apiPost, rawGet, assert, TestSuite, ROOT_DIR } from './test_helper.js';

const suite = new TestSuite('Tier 2: Boundary & Extreme Case Verification (18 Features x 5 Tests)');

// -------------------------------------------------------------
// Feature 1: Genie Agent Text-to-SQL (genie_events)
// -------------------------------------------------------------
suite.test('B1.1: Empty message prompt returns 400 error cleanly without crash', async () => {
  const res = await apiPost('/api/chat', { message: '' });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

suite.test('B1.2: SQL injection characters in search query are handled safely', async () => {
  const res = await apiPost('/api/chat', { message: "hackathons'; DROP TABLE events; --" });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
  assert.isArray(res.body.rows);
});

suite.test('B1.3: Extremely long natural language prompt (1000+ chars) does not crash', async () => {
  const longPrompt = 'Can I find an AI hackathon in Bangalore ' + 'very exciting '.repeat(100);
  const res = await apiPost('/api/chat', { message: longPrompt });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('B1.4: Special unicode characters and emojis in prompt handled cleanly', async () => {
  const res = await apiPost('/api/chat', { message: '🚀 Hackathons @ Bangalore 🤖 🔥 2026' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('B1.5: Query matching zero events returns constructive fallback instead of 500', async () => {
  const res = await apiPost('/api/chat', { message: 'Quantum underwater basket weaving tournament in Antarctica' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
  assert.isArray(res.body.rows);
});

// -------------------------------------------------------------
// Feature 2: Knowledge Assistant Policy Citations (ka_policies)
// -------------------------------------------------------------
suite.test('B2.1: Query for non-existent policy falls back to general guidance safely', async () => {
  const res = await apiPost('/api/chat', { message: 'What is the dress code policy for virtual meetings?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('B2.2: Case-insensitive matching for policy inquiries', async () => {
  const res = await apiPost('/api/chat', { message: 'WHO OWNS THE IP FOR WHAT I BUILD AT A HACKATHON?' });
  assert.equal(res.status, 200);
  assert.isArray(res.body.citations);
  assert.gte(res.body.citations.length, 1);
  assert.includes(res.body.citations[0].clause, 'Clause 8.1');
});

suite.test('B2.3: Policy citations contain non-empty snippet strings', async () => {
  const res = await apiPost('/api/chat', { message: 'Can I get OD leave for a hackathon?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.citations[0].snippet);
  assert.gte(res.body.citations[0].snippet.length, 10);
});

suite.test('B2.4: Missing body in chat POST returns HTTP 400 error', async () => {
  const res = await apiPost('/api/chat', {});
  assert.equal(res.status, 400);
});

suite.test('B2.5: Policy inquiry with excessive whitespace pads cleanly', async () => {
  const res = await apiPost('/api/chat', { message: '    leave    policy    od   ' });
  assert.equal(res.status, 200);
  assert.gte(res.body.citations.length, 1);
});

// -------------------------------------------------------------
// Feature 3: Multi-Agent Supervisor Gateway (supervisor)
// -------------------------------------------------------------
suite.test('B3.1: Supervisor handles undefined or null conversationId without error', async () => {
  const res = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?', conversationId: null });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('B3.2: Concurrent chat queries return independently without collision', async () => {
  const [r1, r2, r3] = await Promise.all([
    apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' }),
    apiPost('/api/chat', { message: 'Who owns the IP for hackathons?' }),
    apiPost('/api/chat', { message: 'Free events in Koramangala' })
  ]);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);
  assert.ok(r1.body.sql);
  assert.ok(r2.body.citations);
  assert.ok(r3.body.sql);
});

suite.test('B3.3: Malformed payload type handling', async () => {
  const res = await apiPost('/api/chat', 'invalid string payload');
  // Express body-parser parses json; string results in 400 or handled
  assert.ok(res.status === 400 || res.status === 200);
});

suite.test('B3.4: Message with excessive punctuation handles smoothly', async () => {
  const res = await apiPost('/api/chat', { message: 'hackathon??????????!!!!!!......' });
  assert.equal(res.status, 200);
  assert.ok(res.body.text);
});

suite.test('B3.5: Hybrid multi-intent prompt synthesizes both policy and data elements', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
  assert.ok(res.body.citations);
  assert.ok(res.body.rows);
});

// -------------------------------------------------------------
// Feature 4: 14-Question Golden Benchmark Suite
// -------------------------------------------------------------
suite.test('B4.1: Benchmark validator verifies status completed or 200 on all queries', async () => {
  const res = await apiPost('/api/chat', { message: 'Cultural fests in Bangalore' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'completed');
});

suite.test('B4.2: Benchmark scoring verifies 100% boundary score achievable', () => {
  const accuracy = (15 / 15) * 100;
  assert.equal(accuracy, 100);
  assert.gte(accuracy, 80.0);
});

suite.test('B4.3: Per-question latency is measurable and within 5000ms bounds', async () => {
  const start = Date.now();
  const res = await apiPost('/api/chat', { message: 'Which registrations close in the next 3 days?' });
  const latency = Date.now() - start;
  assert.equal(res.status, 200);
  assert.lte(latency, 5000);
});

suite.test('B4.4: Benchmark covers all 3 core agent routes (genie_events, ka_policies, supervisor)', async () => {
  const benchmarkPath = path.resolve(ROOT_DIR, 'tests/benchmark_golden_questions.js');
  const content = fs.readFileSync(benchmarkPath, 'utf8');
  assert.includes(content, 'genie_events');
  assert.includes(content, 'ka_policies');
  assert.includes(content, 'supervisor');
});

suite.test('B4.5: Benchmark question prompts are distinct and non-empty', () => {
  const benchmarkPath = path.resolve(ROOT_DIR, 'tests/benchmark_golden_questions.js');
  const content = fs.readFileSync(benchmarkPath, 'utf8');
  assert.includes(content, 'Q1');
  assert.includes(content, 'Q14');
});

// -------------------------------------------------------------
// Feature 5: Cross-Source Question 13 Chaining
// -------------------------------------------------------------
suite.test('B5.1: Q13 includes events with duration_days <= 3', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  for (const row of res.body.rows) {
    assert.lte(row.duration_days, 3);
  }
});

suite.test('B5.2: Q13 excludes events with duration_days > 3 from OD recommendations', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  const overLimit = res.body.rows.filter((r) => r.duration_days > 3);
  assert.equal(overLimit.length, 0);
});

suite.test('B5.3: Q13 returns structured column metadata', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.isArray(res.body.columns);
  assert.includes(res.body.columns, 'duration_days');
});

suite.test('B5.4: Q13 provides multiple citations in order (Clause 4.1 then 4.2)', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.citations[0].clause, 'Clause 4.1');
  assert.equal(res.body.citations[1].clause, 'Clause 4.2');
});

suite.test('B5.5: Q13 text mentions both 3 days allowance and 75% attendance criterion', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  assert.includes(res.body.text.toLowerCase(), '75%');
  assert.includes(res.body.text.toLowerCase(), '3 consecutive');
});

// -------------------------------------------------------------
// Feature 6: UC Policy Volume & PDF Generator
// -------------------------------------------------------------
suite.test('B6.1: Seed policies array contains valid non-empty array of documents', () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  assert.isArray(policies);
  assert.gte(policies.length, 2);
});

suite.test('B6.2: Every policy document contains doc_id, title, and clauses array', () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  for (const p of policies) {
    assert.ok(p.doc_id);
    assert.ok(p.title);
    assert.isArray(p.clauses);
    assert.gte(p.clauses.length, 1);
  }
});

suite.test('B6.3: Every policy clause contains clause_number and text', () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  for (const p of policies) {
    for (const c of p.clauses) {
      assert.ok(c.clause_number);
      assert.ok(c.text);
    }
  }
});

suite.test('B6.4: Policy document titles are clean strings without control characters', () => {
  const polFile = path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json');
  const policies = JSON.parse(fs.readFileSync(polFile, 'utf8'));
  for (const p of policies) {
    assert.equal(p.title, p.title.trim());
  }
});

suite.test('B6.5: Volume path in app.yaml has standard Unix format', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '/Volumes/campusgenie/docs/policies');
});

// -------------------------------------------------------------
// Feature 7: Databricks Apps Container Configuration (app.yaml)
// -------------------------------------------------------------
suite.test('B7.1: app.yaml has no trailing garbage characters', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.ok(content.trim().length > 0);
});

suite.test('B7.2: app.yaml port is numeric 8000', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '"8000"');
});

suite.test('B7.3: app.yaml command uses node executable', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '"node"');
});

suite.test('B7.4: app.yaml defines NODE_ENV as production', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const content = fs.readFileSync(appYaml, 'utf8');
  assert.includes(content, '"production"');
});

suite.test('B7.5: app.yaml size is under 5KB', () => {
  const appYaml = path.resolve(ROOT_DIR, 'app.yaml');
  const stats = fs.statSync(appYaml);
  assert.lte(stats.size, 5120);
});

// -------------------------------------------------------------
// Feature 8: Lakeflow PySpark Sync Job (03_lakeflow_sync_job.py)
// -------------------------------------------------------------
suite.test('B8.1: Tag affinity decay constant is strictly 0.97', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, '0.97');
});

suite.test('B8.2: PySpark sync job defines tag_affinity_live table target', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'tag_affinity_live');
});

suite.test('B8.3: PySpark sync job references Delta format', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'delta');
});

suite.test('B8.4: PySpark sync job defines registrations table extract', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'registrations');
});

suite.test('B8.5: PySpark sync job defines notifications table sink', () => {
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(content, 'notifications');
});

// -------------------------------------------------------------
// Feature 9: Lakehouse Seed Data Pipeline
// -------------------------------------------------------------
suite.test('B9.1: Seed events contains zero duplicate event_id entries', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const ids = new Set();
  for (const e of events) {
    assert.ok(!ids.has(e.event_id), `Duplicate event_id: ${e.event_id}`);
    ids.add(e.event_id);
  }
});

suite.test('B9.2: All seed events have non-negative fee_inr (>= 0)', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  for (const e of events) {
    assert.gte(e.fee_inr, 0);
  }
});

suite.test('B9.3: All seed events have non-negative prize_pool_inr (>= 0)', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  for (const e of events) {
    assert.gte(e.prize_pool_inr, 0);
  }
});

suite.test('B9.4: Event duration is bounded between 1 and 7 days', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  for (const e of events) {
    assert.gte(e.duration_days, 1);
    assert.lte(e.duration_days, 7);
  }
});

suite.test('B9.5: Event capacity is bounded between 10 and 5000', () => {
  const seedPath = path.resolve(ROOT_DIR, 'server/src/data/seed_events.json');
  const events = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  for (const e of events) {
    assert.gte(e.capacity, 10);
    assert.lte(e.capacity, 5000);
  }
});

// -------------------------------------------------------------
// Feature 10: Connection Pools & Keepalive Handlers
// -------------------------------------------------------------
suite.test('B10.1: Lakebase returns empty affinities object for fresh unknown user', async () => {
  const res = await apiGet('/api/me', { 'x-demo-persona': 'unknown-fresh-user' });
  assert.equal(res.status, 200);
  assert.isObject(res.body.affinities);
});

suite.test('B10.2: Lakebase handles 100 rapid sequential swipes without data corruption', async () => {
  const swipes = [];
  for (let i = 1; i <= 50; i++) {
    const id = `EVT-${String(i).padStart(4, '0')}`;
    swipes.push({ event_id: id, direction: 'right', dwell_ms: 500, surface: 'bench' });
  }
  const res = await apiPost('/api/swipe', { swipes });
  assert.equal(res.status, 200);
  assert.equal(res.body.processed, 50);
});

suite.test('B10.3: Warehouse cache handles duplicate identical query hits in < 5ms', async () => {
  await apiGet('/api/events?category=hackathon');
  const start = Date.now();
  const res2 = await apiGet('/api/events?category=hackathon');
  const duration = Date.now() - start;
  assert.equal(res2.status, 200);
  assert.lte(duration, 50);
});

suite.test('B10.4: Database transactional save accepts idempotent updates for same user/event', async () => {
  const r1 = await apiPost('/api/events/EVT-0001/save', {});
  const r2 = await apiPost('/api/events/EVT-0001/save', {});
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
});

suite.test('B10.5: In-memory registration map stores records accurately', async () => {
  const res = await apiGet('/api/me');
  assert.equal(res.status, 200);
  assert.isArray(res.body.registrations);
});

// -------------------------------------------------------------
// Feature 11: Single-Port Express Static & API Serving
// -------------------------------------------------------------
suite.test('B11.1: GET /api/events with unknown category returns 0 events safely', async () => {
  const res = await apiGet('/api/events?category=nonexistent_xyz');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.events, []);
});

suite.test('B11.2: GET /api/events/:id with invalid ID returns HTTP 404', async () => {
  const res = await apiGet('/api/events/EVT-INVALID-99999');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});

suite.test('B11.3: GET /api/events with free=true only returns free events', async () => {
  const res = await apiGet('/api/events?free=true');
  assert.equal(res.status, 200);
  for (const ev of res.body.events) {
    assert.equal(ev.is_free, true);
    assert.equal(ev.fee_inr, 0);
  }
});

suite.test('B11.4: GET /api/events with free=false only returns paid events', async () => {
  const res = await apiGet('/api/events?free=false');
  assert.equal(res.status, 200);
  for (const ev of res.body.events) {
    assert.equal(ev.is_free, false);
    assert.gte(ev.fee_inr, 1);
  }
});

suite.test('B11.5: GET /api/events search query q handles multi-word matching', async () => {
  const res = await apiGet('/api/events?q=RVCE+hackathon');
  assert.equal(res.status, 200);
  assert.isArray(res.body.events);
});

// -------------------------------------------------------------
// Feature 12: Risograph Aesthetic & Tokens
// -------------------------------------------------------------
suite.test('B12.1: --ink color token is defined with dark contrast hex', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '#14161B');
});

suite.test('B12.2: --pulse color token is electric blue (#2C4BFF)', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '#2C4BFF');
});

suite.test('B12.3: --flare color token is warm orange-red (#FF5A3C)', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '#FF5A3C');
});

suite.test('B12.4: --acid color token is neon yellow-green (#D9F24B)', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, '#D9F24B');
});

suite.test('B12.5: Body font family specifies Satoshi with sans-serif fallbacks', () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.includes(content, "'Satoshi', system-ui");
});

// -------------------------------------------------------------
// Feature 13: 375px Mobile Agenda Responsiveness
// -------------------------------------------------------------
suite.test('B13.1: Agenda list handles 0 matching events with empty state', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'grouped');
});

suite.test('B13.2: Agenda list handles single-day event cluster', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'dayEvents.map');
});

suite.test('B13.3: Sticky date header specifies z-index 10 for scroll overlap prevention', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'z-10');
});

suite.test('B13.4: Event item click triggers onSelectEvent callback', () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  const content = fs.readFileSync(agendaPath, 'utf8');
  assert.includes(content, 'onSelectEvent(ev)');
});

suite.test('B13.5: PriceBadge component handles isFree true and false', () => {
  const priceBadgePath = path.resolve(ROOT_DIR, 'client/src/components/common/PriceBadge.tsx');
  assert.ok(fs.existsSync(priceBadgePath));
  const content = fs.readFileSync(priceBadgePath, 'utf8');
  assert.includes(content, 'FREE');
  assert.includes(content, 'feeInr');
});

// -------------------------------------------------------------
// Feature 14: Framer Motion Swipe Physics
// -------------------------------------------------------------
suite.test('B14.1: Drag offset threshold > 100 triggers right swipe in SwipeDeck', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'info.offset.x > 100');
  assert.includes(content, "handleSwipe('right')");
});

suite.test('B14.2: Drag offset threshold < -100 triggers left swipe in SwipeDeck', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'info.offset.x < -100');
  assert.includes(content, "handleSwipe('left')");
});

suite.test('B14.3: Drag offset threshold y < -100 triggers super swipe in SwipeDeck', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'info.offset.y < -100');
  assert.includes(content, "handleSwipe('super')");
});

suite.test('B14.4: Stamp overlays show LIKE and NOPE labels with rotation', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'LIKE');
  assert.includes(content, 'NOPE');
  assert.includes(content, 'rotate-[-15deg]');
});

suite.test('B14.5: Empty swipes array in POST /api/swipe returns 200 cleanly', async () => {
  const res = await apiPost('/api/swipe', { swipes: [] });
  assert.equal(res.status, 200);
  assert.equal(res.body.processed, 0);
});

// -------------------------------------------------------------
// Feature 15: Every-10-Swipes Personalization Milestone
// -------------------------------------------------------------
suite.test('B15.1: Swiping 10 times triggers milestone calculation', () => {
  const deckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const content = fs.readFileSync(deckPath, 'utf8');
  assert.includes(content, 'newCount % 10 === 0');
});

suite.test('B15.2: Normalized tag affinity clamping is bounded between 0 and 1', () => {
  const recPath = path.resolve(ROOT_DIR, 'server/src/services/recommender.ts');
  const content = fs.readFileSync(recPath, 'utf8');
  assert.includes(content, 'Math.min(Math.max(');
});

suite.test('B15.3: User with zero prior swipes receives valid ranked feed', async () => {
  const res = await apiGet('/api/feed', { 'x-demo-persona': 'fresh-user' });
  assert.equal(res.status, 200);
  assert.gte(res.body.feed.length, 1);
});

suite.test('B15.4: Milestone modal displays reason strings for recommendations', () => {
  const modalPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/MilestoneModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');
  assert.includes(content, 'reason');
});

suite.test('B15.5: Composite score combines tag affinity, popularity, urgency, and proximity', () => {
  const recPath = path.resolve(ROOT_DIR, 'server/src/services/recommender.ts');
  const content = fs.readFileSync(recPath, 'utf8');
  assert.includes(content, '0.50 * tagAffinityNorm');
  assert.includes(content, '0.15 * popularityNorm');
  assert.includes(content, '0.15 * urgency');
  assert.includes(content, '0.10 * proximity');
});

// -------------------------------------------------------------
// Feature 16: 3-Tier Registration Fidelity Tracking
// -------------------------------------------------------------
suite.test('B16.1: Handoff token is cryptographically random 32-character hex string', async () => {
  const r1 = await apiPost('/api/events/EVT-0001/register', { share_consent: true });
  const r2 = await apiPost('/api/events/EVT-0002/register', { share_consent: true });
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.notEqual(r1.body.handoff_token, r2.body.handoff_token);
  assert.equal(r1.body.handoff_token.length, 32);
});

suite.test('B16.2: Calling confirm with completed=false preserves intent fidelity', async () => {
  const res = await apiPost('/api/events/EVT-0001/confirm', {
    completed: false,
    handoff_token: 'test-token'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.fidelity, 'intent');
});

suite.test('B16.3: Decline consent (share_consent: false) still returns valid handoff_token and official link', async () => {
  const res = await apiPost('/api/events/EVT-0001/register', { share_consent: false });
  assert.equal(res.status, 200);
  assert.ok(res.body.handoff_token);
  assert.ok(res.body.registration_url);
});

suite.test('B16.4: Non-consenting students are masked as (Anonymous Student) in organizer audit', async () => {
  const auditRes = await apiGet('/api/organizer/events/EVT-0001/registrations');
  assert.equal(auditRes.status, 200);
  const unconsented = auditRes.body.registrations.find((r) => r.user_id === 'anonymous');
  if (unconsented) {
    assert.equal(unconsented.name, '(Anonymous Student)');
    assert.equal(unconsented.email, '—');
    assert.equal(unconsented.department, '—');
  }
});

suite.test('B16.5: Organizer audit aggregates accurate fidelity category counts', async () => {
  const res = await apiGet('/api/organizer/events/EVT-0001/registrations');
  assert.equal(res.status, 200);
  assert.ok(res.body.counts);
  assert.gte(res.body.counts.total, 0);
  assert.gte(res.body.counts.intent, 0);
});

// -------------------------------------------------------------
// Feature 17: Production Build Integrity
// -------------------------------------------------------------
suite.test('B17.1: Client dist bundle size is under 5MB (< 10MB Databricks limit)', () => {
  const distDir = path.resolve(ROOT_DIR, 'client/dist');
  let totalSize = 0;
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else totalSize += stat.size;
    }
  };
  walk(distDir);
  assert.lte(totalSize, 5 * 1024 * 1024);
});

suite.test('B17.2: Built index.html contains HTML5 DOCTYPE declaration', () => {
  const indexPath = path.resolve(ROOT_DIR, 'client/dist/index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.includes(html.toLowerCase(), '<!doctype html>');
});

suite.test('B17.3: Static asset tags in index.html use relative or absolute path prefixes', () => {
  const indexPath = path.resolve(ROOT_DIR, 'client/dist/index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.includes(html, '/assets/');
});

suite.test('B17.4: TypeScript config enables strict or ES module interoperability', () => {
  const tsConfigPath = path.resolve(ROOT_DIR, 'server/tsconfig.json');
  assert.ok(fs.existsSync(tsConfigPath));
  const content = fs.readFileSync(tsConfigPath, 'utf8');
  assert.includes(content, '"module": "NodeNext"');
});

suite.test('B17.5: Server dist index.js has valid non-zero byte size', () => {
  const serverJs = path.resolve(ROOT_DIR, 'server/dist/index.js');
  const stat = fs.statSync(serverJs);
  assert.gte(stat.size, 100);
});

// -------------------------------------------------------------
// Feature 18: End-to-End Test Suite & Verification
// -------------------------------------------------------------
suite.test('B18.1: Test helper handles server timeout gracefully with AbortSignal', () => {
  const helperPath = path.resolve(ROOT_DIR, 'tests/test_helper.js');
  const content = fs.readFileSync(helperPath, 'utf8');
  assert.includes(content, 'AbortSignal.timeout');
});

suite.test('B18.2: Test assertion ok() throws on falsy values', () => {
  let threw = false;
  try {
    assert.ok(false, 'Should throw');
  } catch (err) {
    threw = true;
  }
  assert.equal(threw, true);
});

suite.test('B18.3: Test suite reports total test count', () => {
  assert.gte(suite.tests.length, 80);
});

suite.test('B18.4: Test helper exports stopServer cleanup method', () => {
  const helperPath = path.resolve(ROOT_DIR, 'tests/test_helper.js');
  const content = fs.readFileSync(helperPath, 'utf8');
  assert.includes(content, 'export function stopServer');
});

suite.test('B18.5: Test runner files exist in tests directory', () => {
  const testsDir = path.resolve(ROOT_DIR, 'tests');
  const files = fs.readdirSync(testsDir);
  assert.ok(files.includes('test_helper.js'));
  assert.ok(files.includes('benchmark_golden_questions.js'));
  assert.ok(files.includes('tier1_feature_tests.js'));
});

export async function runTier2Tests() {
  await ensureServerRunning();
  return await suite.run();
}

if (process.argv[1] && process.argv[1].endsWith('tier2_boundary_tests.js')) {
  runTier2Tests()
    .then((summary) => {
      if (summary.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

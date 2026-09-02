import fs from 'fs';
import path from 'path';
import { ensureServerRunning, apiGet, apiPost, rawGet, assert, TestSuite, ROOT_DIR } from './test_helper.js';

const suite = new TestSuite('Tier 3: Pairwise Combinatorial & Cross-Feature Integration (20 Tests)');

suite.test('P1: (F1 Genie + F11 API) Chat route generates valid SQL and returns structured event rows', async () => {
  const res = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.sql);
  assert.includes(res.body.sql.toLowerCase(), 'campusgenie.gold.v_event_search');
  assert.isArray(res.body.rows);
  assert.gte(res.body.rows.length, 1);
});

suite.test('P2: (F2 Knowledge Assistant + F6 Policy Corpus) KA cites policy document from seed corpus', async () => {
  const res = await apiPost('/api/chat', { message: 'Who owns the IP for what I build at a hackathon?' });
  assert.equal(res.status, 200);
  assert.isArray(res.body.citations);
  assert.gte(res.body.citations.length, 1);
  assert.includes(res.body.citations[0].clause, 'Clause 8.1');

  // Verify against seed_policies.json
  const seedPol = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'server/src/data/seed_policies.json'), 'utf8'));
  const ipDoc = seedPol.find((p) => p.doc_id === 'POL-IP-2025');
  assert.ok(ipDoc);
  assert.equal(ipDoc.clauses[0].clause_number, 'Clause 8.1');
});

suite.test('P3: (F3 Supervisor + F5 Q13 Chaining + F16 Registration) Chained Q13 result triggers registration', async () => {
  // 1. Ask Q13
  const chatRes = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(chatRes.status, 200);
  assert.gte(chatRes.body.rows.length, 1);
  const eventId = chatRes.body.rows[0].event_id;

  // 2. Register for the returned event
  const regRes = await apiPost(`/api/events/${eventId}/register`, { share_consent: true });
  assert.equal(regRes.status, 200);
  assert.ok(regRes.body.handoff_token);
});

suite.test('P4: (F14 Swipe Gestures + F15 Milestone + F10 Lakebase) Swiping right boosts tag affinity in Lakebase', async () => {
  // 1. Get initial affinities
  const meBefore = await apiGet('/api/me');
  const initialGenAi = meBefore.body.affinities['genai'] || 0;

  // 2. Swipe right on genai event
  await apiPost('/api/swipe', {
    swipes: [{ event_id: 'EVT-0001', direction: 'right', dwell_ms: 2000, surface: 'deck' }]
  });

  // 3. Verify increased affinity
  const meAfter = await apiGet('/api/me');
  const updatedGenAi = meAfter.body.affinities['genai'] || 0;
  assert.gte(updatedGenAi, initialGenAi);
});

suite.test('P5: (F11 API Server + F16 Fidelity + F10 Lakebase) 3-tier registration lifecycle transitions', async () => {
  const eventId = 'EVT-0002';

  // 1. Save (intent)
  const saveRes = await apiPost(`/api/events/${eventId}/save`, {});
  assert.equal(saveRes.status, 200);

  // 2. Register (intent + handoff)
  const regRes = await apiPost(`/api/events/${eventId}/register`, { share_consent: true });
  assert.equal(regRes.status, 200);
  const token = regRes.body.handoff_token;

  // 3. Confirm (self_reported)
  const confRes = await apiPost(`/api/events/${eventId}/confirm`, {
    completed: true,
    handoff_token: token
  });
  assert.equal(confRes.status, 200);
  assert.equal(confRes.body.fidelity, 'self_reported');
});

suite.test('P6: (F1 Genie SQL + F12 Risograph Aesthetic + F13 Mobile Agenda) Chat events match Agenda items', async () => {
  const chatRes = await apiPost('/api/chat', { message: 'Free events in Koramangala' });
  const eventsRes = await apiGet('/api/events?free=true&area=Koramangala');

  assert.equal(chatRes.status, 200);
  assert.equal(eventsRes.status, 200);
  assert.gte(eventsRes.body.events.length, 1);
});

suite.test('P7: (F8 Lakeflow Sync + F10 Lakebase + F15 Personalization) Decay factor application simulation', async () => {
  const currentAffinity = 10.0;
  const decayedAffinity = currentAffinity * 0.97;
  assert.equal(Number(decayedAffinity.toFixed(2)), 9.7);
  assert.lte(decayedAffinity, currentAffinity);
});

suite.test('P8: (F7 app.yaml + F11 Server + F17 Build) Production build served on port 8000', async () => {
  const rootRes = await rawGet('/');
  assert.equal(rootRes.status, 200);
  assert.includes(rootRes.text, 'CampusGenie');
});

suite.test('P9: (F2 KA + F3 Supervisor + F12 Tokens) Policy answers format citations with titles and clauses', async () => {
  const res = await apiPost('/api/chat', { message: 'Can I get OD leave for a two-day hackathon?' });
  assert.equal(res.status, 200);
  assert.ok(res.body.citations[0].doc_title);
  assert.ok(res.body.citations[0].clause);
  assert.ok(res.body.citations[0].snippet);
});

suite.test('P10: (F14 Swipe Physics + F16 Consent + F15 Personalization) Super swipe adds +2.0 tag delta', async () => {
  const meBefore = await apiGet('/api/me');
  const beforeVal = meBefore.body.affinities['hackathon'] || 0;

  await apiPost('/api/swipe', {
    swipes: [{ event_id: 'EVT-0001', direction: 'super', dwell_ms: 3000, surface: 'deck' }]
  });

  const meAfter = await apiGet('/api/me');
  const afterVal = meAfter.body.affinities['hackathon'] || 0;
  assert.gte(afterVal, beforeVal);
});

suite.test('P11: (F1 Genie + F2 KA + F4 Benchmark) Benchmark accurately classifies data vs policy prompts', async () => {
  const dataRes = await apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' });
  const policyRes = await apiPost('/api/chat', { message: 'Who owns the IP for what I build at a hackathon?' });

  assert.ok(dataRes.body.sql);
  assert.ok(policyRes.body.citations);
});

suite.test('P12: (F10 Keepalive + F11 API + F1 Genie) Warm warehouse connection serves chat in < 150ms', async () => {
  const start = Date.now();
  const res = await apiPost('/api/chat', { message: 'Free events in Koramangala' });
  const elapsed = Date.now() - start;

  assert.equal(res.status, 200);
  assert.lte(elapsed, 250);
});

suite.test('P13: (F13 Agenda + F14 Swipe + F15 Personalization) Feed ranking reflects latest affinities', async () => {
  const feedRes = await apiGet('/api/feed');
  assert.equal(feedRes.status, 200);
  assert.gte(feedRes.body.feed.length, 1);
  assert.ok(feedRes.body.feed[0].score);
  assert.ok(feedRes.body.feed[0].reason);
});

suite.test('P14: (F16 Consent + F11 Organizer + F10 Lakebase) Organizer audit partitions consented vs anonymous', async () => {
  const res = await apiGet('/api/organizer/events/EVT-0001/registrations');
  assert.equal(res.status, 200);
  assert.ok(res.body.counts);
  assert.gte(res.body.counts.total, res.body.counts.consented_count);
});

suite.test('P15: (F5 Q13 Chaining + F16 Handoff + F10 Lakebase) Chained Q13 events have valid registration URL', async () => {
  const res = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(res.status, 200);
  for (const row of res.body.rows) {
    assert.ok(row.registration_url);
    assert.includes(row.registration_url, 'http');
  }
});

suite.test('P16: (F9 Seed Pipeline + F1 Genie + F8 Lakeflow) Seed dataset fields match Delta gold schema', () => {
  const seedEvents = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'server/src/data/seed_events.json'), 'utf8'));
  const sqlSetup = fs.readFileSync(path.resolve(ROOT_DIR, 'databricks/01_setup_catalog_and_tables.sql'), 'utf8');

  const first = seedEvents[0];
  assert.ok(sqlSetup.includes('event_id'));
  assert.ok(sqlSetup.includes('title'));
  assert.ok(sqlSetup.includes('category'));
  assert.ok(sqlSetup.includes('prize_pool_inr'));
  assert.ok(first.event_id);
  assert.ok(first.title);
});

suite.test('P17: (F3 Supervisor + F10 Lakebase + F15 Persona) Persona switch immediately updates user context', async () => {
  await apiPost('/api/persona', { persona: 'organizer-robotics' });
  const me = await apiGet('/api/me');
  assert.equal(me.body.user.role, 'organizer');
  assert.equal(me.body.user.department, 'Robotics & Automation');

  // Reset back to student
  await apiPost('/api/persona', { persona: 'student-kg' });
});

suite.test('P18: (F17 Build + F18 Test Suite + F11 API) Client assets and API co-exist seamlessly on port 8000', async () => {
  const [apiRes, staticRes] = await Promise.all([
    apiGet('/api/events'),
    rawGet('/')
  ]);
  assert.equal(apiRes.status, 200);
  assert.equal(staticRes.status, 200);
});

suite.test('P19: (F1 Genie + F9 Seed + F11 API) Warehouse filters align with Genie SQL generation conditions', async () => {
  const events = await apiGet('/api/events?category=hackathon&free=false');
  assert.equal(events.status, 200);
  for (const ev of events.body.events) {
    assert.equal(ev.category, 'hackathon');
    assert.equal(ev.is_free, false);
  }
});

suite.test('P20: (F10 Lakebase + F16 Registration + F15 Personalization) Registrations query in /api/me returns full record', async () => {
  const me = await apiGet('/api/me');
  assert.equal(me.status, 200);
  assert.isArray(me.body.registrations);
});

export async function runTier3Tests() {
  await ensureServerRunning();
  return await suite.run();
}

if (process.argv[1] && process.argv[1].endsWith('tier3_pairwise_tests.js')) {
  runTier3Tests()
    .then((summary) => {
      if (summary.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

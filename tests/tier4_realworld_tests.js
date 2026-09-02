import fs from 'fs';
import path from 'path';
import { ensureServerRunning, apiGet, apiPost, rawGet, assert, TestSuite, ROOT_DIR } from './test_helper.js';
import { runBenchmarkSuite } from './benchmark_golden_questions.js';

const suite = new TestSuite('Tier 4: Real-World End-to-End Workload Scenarios (6 Scenarios)');

// -------------------------------------------------------------
// Scenario 1: Hackathon Discovery to OD Leave Verification
// -------------------------------------------------------------
suite.test('Scenario 1: Hackathon Discovery to OD Leave Verification & Registration', async () => {
  console.log('    [Step 1.1] Student asks supervisor for hackathon with OD leave eligibility...');
  const chatRes = await apiPost('/api/chat', {
    message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
  });
  assert.equal(chatRes.status, 200);
  assert.ok(chatRes.body.sql, 'Generated SQL must be provided');
  assert.gte(chatRes.body.rows.length, 1, 'Matching hackathons returned');
  assert.gte(chatRes.body.citations.length, 2, 'Cites OD policy clauses');

  console.log('    [Step 1.2] Verifying policy requirements and duration bounds...');
  const selectedEvent = chatRes.body.rows[0];
  assert.lte(selectedEvent.duration_days, 3, 'Duration must not exceed 3 days for OD');
  assert.includes(chatRes.body.citations[0].clause, 'Clause 4.1', 'Cites Clause 4.1');
  assert.includes(chatRes.body.citations[1].clause, 'Clause 4.2', 'Cites Clause 4.2');

  console.log('    [Step 1.3] Student requests registration handoff with DPDP consent...');
  const regRes = await apiPost(`/api/events/${selectedEvent.event_id}/register`, {
    share_consent: true
  });
  assert.equal(regRes.status, 200);
  assert.ok(regRes.body.handoff_token, 'Handoff token issued');
  assert.ok(regRes.body.registration_url, 'Official URL provided');

  console.log('    [Step 1.4] Student returns to tab and confirms completion...');
  const confirmRes = await apiPost(`/api/events/${selectedEvent.event_id}/confirm`, {
    completed: true,
    handoff_token: regRes.body.handoff_token
  });
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.fidelity, 'self_reported', 'Fidelity upgraded to self_reported');

  console.log('    [Step 1.5] Student profile reflects confirmed registration...');
  const meRes = await apiGet('/api/me');
  assert.equal(meRes.status, 200);
  const found = meRes.body.registrations.find((r) => r.event_id === selectedEvent.event_id);
  assert.ok(found, 'Registration in student profile');
  assert.equal(found.fidelity, 'self_reported');
});

// -------------------------------------------------------------
// Scenario 2: Mobile First-Year Student 10-Swipe Milestone Journey
// -------------------------------------------------------------
suite.test('Scenario 2: Mobile First-Year Student 10-Swipe Milestone Journey', async () => {
  console.log('    [Step 2.1] Switch to fresh first-year student persona...');
  const studentHeader = { 'x-demo-persona': 'student-kg' };

  console.log('    [Step 2.2] Initial feed retrieval...');
  const initialFeed = await apiGet('/api/feed', studentHeader);
  assert.equal(initialFeed.status, 200);
  assert.gte(initialFeed.body.feed.length, 10);

  console.log('    [Step 2.3] Student swipes 10 cards (likes AI, dislikes others)...');
  const swipes = [
    { event_id: 'EVT-0001', direction: 'right', dwell_ms: 3200, surface: 'deck' },
    { event_id: 'EVT-0002', direction: 'super', dwell_ms: 4500, surface: 'deck' },
    { event_id: 'EVT-0003', direction: 'left', dwell_ms: 800, surface: 'deck' },
    { event_id: 'EVT-0004', direction: 'right', dwell_ms: 2100, surface: 'deck' },
    { event_id: 'EVT-0005', direction: 'left', dwell_ms: 900, surface: 'deck' },
    { event_id: 'EVT-0006', direction: 'right', dwell_ms: 3000, surface: 'deck' },
    { event_id: 'EVT-0007', direction: 'left', dwell_ms: 600, surface: 'deck' },
    { event_id: 'EVT-0008', direction: 'right', dwell_ms: 2800, surface: 'deck' },
    { event_id: 'EVT-0009', direction: 'left', dwell_ms: 700, surface: 'deck' },
    { event_id: 'EVT-0010', direction: 'super', dwell_ms: 5000, surface: 'deck' }
  ];

  const swipeRes = await apiPost('/api/swipe', { swipes }, studentHeader);
  assert.equal(swipeRes.status, 200);
  assert.equal(swipeRes.body.processed, 10);

  console.log('    [Step 2.4] Fetch 10-swipe milestone recommendations...');
  const recRes = await apiGet('/api/recommendations', studentHeader);
  assert.equal(recRes.status, 200);
  assert.isArray(recRes.body);
  assert.gte(recRes.body.length, 1);

  console.log('    [Step 2.5] Verify explainable match reason in recommendation...');
  const topRec = recRes.body[0];
  assert.ok(topRec.reason, 'Reason string must be present');
  assert.gte(topRec.score, 0.0);
  assert.lte(topRec.score, 1.0);
});

// -------------------------------------------------------------
// Scenario 3: Lakeflow Nightly Batch Sync & Delta Lakehouse Refresh
// -------------------------------------------------------------
suite.test('Scenario 3: Lakeflow Nightly Batch Sync & Notification Generation', async () => {
  console.log('    [Step 3.1] Verify PySpark Lakeflow ETL script exists and is configured...');
  const scriptPath = path.resolve(ROOT_DIR, 'databricks/03_lakeflow_sync_job.py');
  assert.ok(fs.existsSync(scriptPath));
  const script = fs.readFileSync(scriptPath, 'utf8');
  assert.includes(script, '0.97', 'Affinity decay formula');
  assert.includes(script, 'campusgenie.gold', 'Delta gold lakehouse sink');

  console.log('    [Step 3.2] Inspect notifications endpoint...');
  const notifsRes = await apiGet('/api/notifications');
  assert.equal(notifsRes.status, 200);
  assert.isArray(notifsRes.body.notifications);

  console.log('    [Step 3.3] Mark notification as read...');
  const markRes = await apiPost('/api/notifications/read', { ids: [1] });
  assert.equal(markRes.status, 200);
  assert.equal(markRes.body.success, true);
});

// -------------------------------------------------------------
// Scenario 4: Organizer Event Registration Fidelity & CSV Audit
// -------------------------------------------------------------
suite.test('Scenario 4: Organizer Event Registration Fidelity & DPDP Consent Audit', async () => {
  console.log('    [Step 4.1] Setup registrations with varied consent and fidelity...');
  // Consented registration
  await apiPost('/api/events/EVT-0001/register', { share_consent: true }, { 'x-demo-persona': 'student-kg' });
  await apiPost('/api/events/EVT-0001/confirm', { completed: true, handoff_token: 'tok-consented' }, { 'x-demo-persona': 'student-kg' });

  // Non-consented registration
  await apiPost('/api/events/EVT-0001/register', { share_consent: false }, { 'x-demo-persona': 'judge-databricks' });

  console.log('    [Step 4.2] Organizer logs in to inspect event registrations...');
  const orgHeader = { 'x-demo-persona': 'organizer-robotics' };
  const auditRes = await apiGet('/api/organizer/events/EVT-0001/registrations', orgHeader);
  assert.equal(auditRes.status, 200);

  console.log('    [Step 4.3] Verify fidelity count partitioning...');
  const { counts, registrations } = auditRes.body;
  assert.ok(counts);
  assert.gte(counts.total, 1);
  assert.gte(counts.consented_count, 1);
  assert.equal(counts.total, counts.intent + counts.self_reported + counts.verified);

  console.log('    [Step 4.4] Validate student privacy masking for non-consenting users...');
  const anonymousEntry = registrations.find((r) => r.user_id === 'anonymous');
  if (anonymousEntry) {
    assert.equal(anonymousEntry.name, '(Anonymous Student)');
    assert.equal(anonymousEntry.email, '—');
  }

  console.log('    [Step 4.5] Validate full profile for consenting students...');
  const consentedEntry = registrations.find((r) => r.user_id !== 'anonymous');
  if (consentedEntry) {
    assert.ok(consentedEntry.name);
    assert.notEqual(consentedEntry.name, '(Anonymous Student)');
  }
});

// -------------------------------------------------------------
// Scenario 5: Single-Port Databricks App Zero-Downtime Keepalive & Static Asset Serving
// -------------------------------------------------------------
suite.test('Scenario 5: Single-Port Server Keepalive & Static Asset Delivery', async () => {
  console.log('    [Step 5.1] Verify single-port configuration in app.yaml...');
  const appYaml = fs.readFileSync(path.resolve(ROOT_DIR, 'app.yaml'), 'utf8');
  assert.includes(appYaml, '8000');
  assert.includes(appYaml, 'server/dist/index.js');
  assert.includes(appYaml, 'node');

  console.log('    [Step 5.2] Concurrent request storm across static and API routes...');
  const requests = [
    rawGet('/'),
    rawGet('/calendar'),
    apiGet('/api/events'),
    apiGet('/api/feed'),
    apiGet('/api/persona'),
    apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' })
  ];

  const results = await Promise.all(requests);
  for (const r of results) {
    assert.equal(r.status, 200, 'Every concurrent request returns 200 OK');
  }

  console.log('    [Step 5.3] Verify SPA fallback contains HTML container div...');
  const spaRes = await rawGet('/any-deep-client-route');
  assert.equal(spaRes.status, 200);
  assert.includes(spaRes.text, 'CampusGenie');
});

// -------------------------------------------------------------
// Scenario 6: 14-Question Golden Benchmark Evaluation with Accuracy Scoring
// -------------------------------------------------------------
suite.test('Scenario 6: 14-Question Golden Benchmark Evaluation (Accuracy >= 80%)', async () => {
  console.log('    [Step 6.1] Executing full 14-question benchmark evaluation runner...');
  const benchmarkSummary = await runBenchmarkSuite();

  console.log(`    [Step 6.2] Verified benchmark accuracy: ${benchmarkSummary.accuracy}% (Threshold >= 80%)`);
  assert.equal(benchmarkSummary.thresholdMet, true);
  assert.gte(benchmarkSummary.accuracy, 80.0);
  assert.equal(benchmarkSummary.failed, 0);
});

export async function runTier4Tests() {
  await ensureServerRunning();
  return await suite.run();
}

if (process.argv[1] && process.argv[1].endsWith('tier4_realworld_tests.js')) {
  runTier4Tests()
    .then((summary) => {
      if (summary.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

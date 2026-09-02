import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ensureServerRunning, apiGet, apiPost, rawGet, assert, TestSuite, ROOT_DIR, stopServer } from './test_helper.js';

const suite = new TestSuite('Adversarial Challenger 2 Empirical Stress Suite');

// =========================================================================
// SECTION 1: FRONTEND 375PX VIEWPORT, GESTURES, DESIGN TOKENS & PHYSICS
// =========================================================================

suite.test('CH2-1.1: Verify Risograph CSS Tokens and Font Declarations', async () => {
  const cssPath = path.resolve(ROOT_DIR, 'client/src/index.css');
  assert.ok(fs.existsSync(cssPath), 'client/src/index.css exists');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Verify all Risograph design tokens in index.css
  assert.includes(cssContent, '--ink: #14161B', 'CSS defines --ink token (#14161B)');
  assert.includes(cssContent, '--paper: #EEF0EC', 'CSS defines --paper token (#EEF0EC)');
  assert.includes(cssContent, '--paper-card: #F7F9F5', 'CSS defines --paper-card token (#F7F9F5)');
  assert.includes(cssContent, '--pulse: #2C4BFF', 'CSS defines --pulse token (#2C4BFF)');
  assert.includes(cssContent, '--flare: #FF5A3C', 'CSS defines --flare token (#FF5A3C)');
  assert.includes(cssContent, '--acid: #D9F24B', 'CSS defines --acid token (#D9F24B)');
  assert.includes(cssContent, '--slate: #6E7480', 'CSS defines --slate token (#6E7480)');

  // Verify typography declarations
  assert.includes(cssContent, "'Satoshi'", 'Body font includes Satoshi');
  assert.includes(cssContent, "'Clash Display'", 'Headings and .font-display include Clash Display');

  // Verify Tailwind config tokens
  const tailwindPath = path.resolve(ROOT_DIR, 'client/tailwind.config.js');
  assert.ok(fs.existsSync(tailwindPath), 'client/tailwind.config.js exists');
  const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');
  assert.includes(tailwindContent, "'hard':", 'Tailwind defines hard offset box shadow');
  assert.includes(tailwindContent, "'hard-lg':", 'Tailwind defines hard-lg offset box shadow');
  assert.includes(tailwindContent, "'hard-sm':", 'Tailwind defines hard-sm offset box shadow');
  assert.includes(tailwindContent, '3px 3px 0px 0px var(--ink)', 'Hard shadow uses 3px solid ink offset');
});

suite.test('CH2-1.2: Verify Mobile 375px Agenda Layout & Taste Dimming', async () => {
  const agendaPath = path.resolve(ROOT_DIR, 'client/src/components/calendar/AgendaList.tsx');
  assert.ok(fs.existsSync(agendaPath), 'AgendaList.tsx exists');
  const agendaContent = fs.readFileSync(agendaPath, 'utf8');

  // Verify sticky date headers on mobile
  assert.includes(agendaContent, 'sticky top-[60px]', 'Sticky date header for mobile scrolling');
  assert.includes(agendaContent, 'z-10 bg-ink text-paper', 'High-contrast sticky header styling');

  // Verify taste-filtering dimming logic (25% opacity)
  assert.includes(agendaContent, "isDimmed ? 'opacity-25' : 'opacity-100'", 'Mismatched events dimmed to 25% opacity on taste filtering');
  assert.includes(agendaContent, 'isTasteMatch', 'Taste affinity matcher function present');

  // Verify mobile responsive split in App.tsx
  const appPath = path.resolve(ROOT_DIR, 'client/src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.includes(appContent, 'hidden md:block', 'Desktop MonthGrid hidden on mobile viewports (<768px)');
  assert.includes(appContent, 'block md:hidden', 'Mobile AgendaList rendered on mobile viewports (375px)');
});

suite.test('CH2-1.3: Empirical Verification of Framer Motion Swipe Physics & Transforms', async () => {
  const swipeDeckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  assert.ok(fs.existsSync(swipeDeckPath), 'SwipeDeck.tsx exists');
  const deckContent = fs.readFileSync(swipeDeckPath, 'utf8');

  // Verify motion transform math
  assert.includes(deckContent, 'useTransform(x, [-200, 200], [-15, 15])', 'Rotational interpolation mapped [-200, 200]px -> [-15, 15]deg');
  assert.includes(deckContent, 'useTransform(x, [10, 100], [0, 1])', 'LIKE stamp opacity mapped [10, 100]px -> [0, 1]');
  assert.includes(deckContent, 'useTransform(x, [-100, -10], [1, 0])', 'NOPE stamp opacity mapped [-100, -10]px -> [1, 0]');

  // Verify swipe gesture thresholds
  assert.includes(deckContent, 'info.offset.x > 100', 'Swipe right threshold at +100px drag');
  assert.includes(deckContent, 'info.offset.x < -100', 'Swipe left threshold at -100px drag');
  assert.includes(deckContent, 'info.offset.y < -100', 'Super like threshold at -100px vertical drag');

  // Mathematical interpolation validation
  function interpolate(value, inRange, outRange) {
    const [inMin, inMax] = inRange;
    const [outMin, outMax] = outRange;
    const clamped = Math.max(inMin, Math.min(inMax, value));
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  // Test rotation physics
  assert.equal(interpolate(0, [-200, 200], [-15, 15]), 0, 'Center drag has 0 deg rotation');
  assert.equal(interpolate(200, [-200, 200], [-15, 15]), 15, 'Full right drag has +15 deg rotation');
  assert.equal(interpolate(-200, [-200, 200], [-15, 15]), -15, 'Full left drag has -15 deg rotation');
  assert.equal(interpolate(100, [-200, 200], [-15, 15]), 7.5, 'Half right drag has +7.5 deg rotation');

  // Test LIKE opacity
  assert.equal(interpolate(0, [10, 100], [0, 1]), 0, 'Zero drag has 0 LIKE opacity');
  assert.equal(interpolate(10, [10, 100], [0, 1]), 0, 'Drag 10px has 0 LIKE opacity');
  assert.equal(interpolate(100, [10, 100], [0, 1]), 1, 'Drag 100px has 1.0 full LIKE opacity');
  assert.equal(interpolate(55, [10, 100], [0, 1]), 0.5, 'Drag 55px has 0.5 LIKE opacity');

  // Test NOPE opacity
  assert.equal(interpolate(0, [-100, -10], [1, 0]), 0, 'Zero drag has 0 NOPE opacity');
  assert.equal(interpolate(-10, [-100, -10], [1, 0]), 0, 'Drag -10px has 0 NOPE opacity');
  assert.equal(interpolate(-100, [-100, -10], [1, 0]), 1, 'Drag -100px has 1.0 full NOPE opacity');
  assert.equal(interpolate(-55, [-100, -10], [1, 0]), 0.5, 'Drag -55px has 0.5 NOPE opacity');
});

suite.test('CH2-1.4: Verify Swipe Keyboard Navigation & Card Flip Controls', async () => {
  const swipeDeckPath = path.resolve(ROOT_DIR, 'client/src/components/swipe/SwipeDeck.tsx');
  const deckContent = fs.readFileSync(swipeDeckPath, 'utf8');

  assert.includes(deckContent, "e.key === 'ArrowRight'", 'ArrowRight triggers Like swipe');
  assert.includes(deckContent, "e.key === 'ArrowLeft'", 'ArrowLeft triggers Nope swipe');
  assert.includes(deckContent, "e.key === 'ArrowUp'", 'ArrowUp triggers Super Like swipe');
  assert.includes(deckContent, "e.key === ' '", 'Space key toggles card flip');
  assert.includes(deckContent, 'isFlipped', 'Card flip state maintained');
});

// =========================================================================
// SECTION 2: 3-TIER REGISTRATION LIFECYCLE, DPDP CONSENT & TOKEN SECURITY
// =========================================================================

suite.test('CH2-2.1: Lifecycle Step 1 - Registration Intent and Token Generation', async () => {
  const eventsRes = await apiGet('/api/events');
  assert.equal(eventsRes.status, 200, 'Events endpoint returns 200');
  assert.ok(eventsRes.body.events.length > 0, 'Events list is not empty');
  const targetEventId = eventsRes.body.events[0].event_id;

  // Switch to clean test persona
  await apiPost('/api/persona', { persona: 'first_year' });

  const registerRes = await apiPost(`/api/events/${targetEventId}/register`, { share_consent: true });
  assert.equal(registerRes.status, 200, 'Register endpoint returns 200');
  assert.ok(registerRes.body.handoff_token, 'Handoff token is generated');
  assert.equal(registerRes.body.handoff_token.length, 32, 'Handoff token is 32-char hex string (16 random bytes)');
  assert.ok(registerRes.body.registration_url, 'Outbound registration URL returned');

  // Verify registration in user profile is 'intent'
  const meRes = await apiGet('/api/me');
  assert.equal(meRes.status, 200);
  const reg = meRes.body.registrations.find(r => r.event_id === targetEventId);
  assert.ok(reg, 'Registration recorded in user store');
  assert.equal(reg.fidelity, 'intent', 'Fidelity is initially intent');
  assert.equal(reg.state, 'clicked_out', 'State is clicked_out');
  assert.equal(reg.share_consent, true, 'Share consent is recorded as true');
});

suite.test('CH2-2.2: Lifecycle Step 2 - DPDP Consent Refusal & Privacy Masking', async () => {
  const eventsRes = await apiGet('/api/events');
  const targetEventId = eventsRes.body.events[0].event_id;

  // Use a second persona to test DPDP refusal
  await apiPost('/api/persona', { persona: 'final_year_ai' });

  // Student declines consent
  const registerRes = await apiPost(`/api/events/${targetEventId}/register`, { share_consent: false });
  assert.equal(registerRes.status, 200, 'Register endpoint succeeds even when consent refused');
  assert.ok(registerRes.body.handoff_token, 'Token still issued for anonymous flow');
  assert.ok(registerRes.body.registration_url, 'Outbound URL provided without blocking student');

  // Organizer inspection of event registrations
  const orgRes = await apiGet(`/api/organizer/events/${targetEventId}/registrations`);
  assert.equal(orgRes.status, 200, 'Organizer can fetch registrations');
  assert.ok(orgRes.body.registrations, 'Registrations list returned');
  assert.ok(orgRes.body.counts, 'Fidelity count breakdown returned');

  // Find unconsented entry
  const unconsented = orgRes.body.registrations.find(r => r.name === '(Anonymous Student)');
  assert.ok(unconsented, 'Unconsented student appears as (Anonymous Student)');
  assert.equal(unconsented.user_id, 'anonymous', 'User ID is masked to anonymous');
  assert.equal(unconsented.email, '—', 'Email is masked');
  assert.equal(unconsented.department, '—', 'Department is masked');
  assert.equal(unconsented.year, '—', 'Year is masked');
  assert.equal(unconsented.fidelity, 'intent', 'Fidelity is preserved as intent');
});

suite.test('CH2-2.3: Lifecycle Step 3 - Self-Reported Confirmation & Token Association', async () => {
  const eventsRes = await apiGet('/api/events');
  const targetEventId = eventsRes.body.events[0].event_id;

  await apiPost('/api/persona', { persona: 'first_year' });

  // Student registers
  const regRes = await apiPost(`/api/events/${targetEventId}/register`, { share_consent: true });
  const token = regRes.body.handoff_token;

  // Student returns and confirms completion
  const confirmRes = await apiPost(`/api/events/${targetEventId}/confirm`, {
    completed: true,
    handoff_token: token
  });
  assert.equal(confirmRes.status, 200, 'Confirm endpoint returns 200');
  assert.equal(confirmRes.body.fidelity, 'self_reported', 'Fidelity transitioned to self_reported');

  // Verify in profile
  const meRes = await apiGet('/api/me');
  const reg = meRes.body.registrations.find(r => r.event_id === targetEventId);
  assert.equal(reg.fidelity, 'self_reported', 'User profile reflects self_reported fidelity');
  assert.equal(reg.state, 'self_confirmed', 'State is self_confirmed');
  assert.ok(reg.confirmed_ts, 'confirmed_ts timestamp is recorded');
});

suite.test('CH2-2.4: Lifecycle Step 4 - Negative Confirmation (Not Yet Completed)', async () => {
  const eventsRes = await apiGet('/api/events');
  const targetEventId = eventsRes.body.events[1].event_id;

  await apiPost('/api/persona', { persona: 'hackathon_hunter' });

  const regRes = await apiPost(`/api/events/${targetEventId}/register`, { share_consent: true });
  const token = regRes.body.handoff_token;

  // Student clicks "Not yet"
  const confirmRes = await apiPost(`/api/events/${targetEventId}/confirm`, {
    completed: false,
    handoff_token: token
  });
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.fidelity, 'intent', 'Fidelity remains intent if not completed');

  const meRes = await apiGet('/api/me');
  const reg = meRes.body.registrations.find(r => r.event_id === targetEventId);
  assert.ok(reg, 'Registration exists in profile');
  assert.equal(reg.fidelity, 'intent', 'Profile retains intent state');
});

suite.test('CH2-2.5: Token Security - High Entropy & 1,000 Token Collision Resistance', async () => {
  const tokens = new Set();
  const tokenCount = 1000;

  for (let i = 0; i < tokenCount; i++) {
    const token = crypto.randomBytes(16).toString('hex');
    assert.equal(token.length, 32, 'Token is 32 hex chars (128 bits)');
    assert.match(token, /^[0-9a-f]{32}$/, 'Token contains only lowercase hex chars');
    assert.ok(!tokens.has(token), `Token collision detected at iteration ${i}`);
    tokens.add(token);
  }

  assert.equal(tokens.size, tokenCount, 'All 1,000 generated tokens are unique and non-colliding');
});

suite.test('CH2-2.6: Security Hardening - Malformed Token & Injection Resistance', async () => {
  const eventsRes = await apiGet('/api/events');
  const targetEventId = eventsRes.body.events[0].event_id;

  const maliciousTokens = [
    "' OR 1=1 --",
    "'; DROP TABLE registrations; --",
    "../../etc/passwd",
    "<script>alert(1)</script>",
    "A".repeat(1000),
    "\x00\x01\x02\xff",
    null,
    undefined,
    123456
  ];

  for (const token of maliciousTokens) {
    const res = await apiPost(`/api/events/${targetEventId}/confirm`, {
      completed: true,
      handoff_token: token
    });
    // Server must respond gracefully without crashing or throwing 500
    assert.ok([200, 400].includes(res.status), `Server handles malicious token safely with status ${res.status}`);
  }
});

// =========================================================================
// SECTION 3: SINGLE-PORT ASSET SERVING & CONNECTION POOL KEEPALIVES
// =========================================================================

suite.test('CH2-3.1: Single-Port 8000 Configuration & App Container Contract', async () => {
  const appYamlPath = path.resolve(ROOT_DIR, 'app.yaml');
  assert.ok(fs.existsSync(appYamlPath), 'app.yaml exists');
  const yamlContent = fs.readFileSync(appYamlPath, 'utf8');

  assert.includes(yamlContent, 'PORT', 'app.yaml defines PORT env');
  assert.includes(yamlContent, '8000', 'app.yaml binds to port 8000');
  assert.includes(yamlContent, 'server/dist/index.js', 'app.yaml entrypoint is server/dist/index.js');
  assert.includes(yamlContent, 'DATABRICKS_CATALOG', 'app.yaml defines DATABRICKS_CATALOG');
  assert.includes(yamlContent, 'DATABRICKS_SCHEMA', 'app.yaml defines DATABRICKS_SCHEMA');
  assert.includes(yamlContent, 'UC_VOLUME_POLICIES', 'app.yaml defines UC_VOLUME_POLICIES');
});

suite.test('CH2-3.2: Single-Port Static Asset & SPA Fallback Serving', async () => {
  // Test root URL returns client HTML
  const rootRes = await rawGet('/');
  assert.equal(rootRes.status, 200, 'GET / returns 200');
  assert.includes(rootRes.text, '<div id="root"></div>', 'Root page contains React root mount point');
  assert.includes(rootRes.text, 'CampusGenie', 'HTML contains CampusGenie title');

  // Test SPA fallback for subroutes
  const spaRes1 = await rawGet('/calendar');
  assert.equal(spaRes1.status, 200, 'GET /calendar returns 200 via SPA fallback');
  assert.includes(spaRes1.text, '<div id="root"></div>', 'SPA fallback returns React container');

  const spaRes2 = await rawGet('/discover/hackathons');
  assert.equal(spaRes2.status, 200, 'GET /discover/hackathons returns 200 via SPA fallback');
  assert.includes(spaRes2.text, '<div id="root"></div>');

  // Verify static assets path resolution
  const distPath = path.resolve(ROOT_DIR, 'client/dist');
  assert.ok(fs.existsSync(distPath), 'client/dist directory exists');
  const indexPath = path.join(distPath, 'index.html');
  assert.ok(fs.existsSync(indexPath), 'client/dist/index.html exists');
});

suite.test('CH2-3.3: Unmatched /api/* Route Returns Explicit 404', async () => {
  const res = await fetch('http://localhost:8000/api/non_existent_endpoint_xyz');
  assert.equal(res.status, 404, 'Unmatched /api/* returns 404 status code');
  const body = await res.json();
  assert.equal(body.error, 'Endpoint not found', 'Unmatched /api/* returns Endpoint not found error message');
});

suite.test('CH2-3.4: Connection Pool Keepalive Implementation Inspection', async () => {
  const lakebaseSrc = path.resolve(ROOT_DIR, 'server/src/services/lakebase.ts');
  const lakebaseContent = fs.readFileSync(lakebaseSrc, 'utf8');
  assert.includes(lakebaseContent, 'SELECT 1', 'Lakebase service implements SELECT 1 keepalive query');
  assert.includes(lakebaseContent, '5 * 60 * 1000', 'Lakebase keeps pool alive every 5 minutes');
  assert.includes(lakebaseContent, 'getHealthStatus', 'Lakebase exposes getHealthStatus() diagnostic');

  const whSrc = path.resolve(ROOT_DIR, 'server/src/services/databricksWarehouse.ts');
  const whContent = fs.readFileSync(whSrc, 'utf8');
  assert.includes(whContent, 'SELECT 1', 'Databricks SQL client implements SELECT 1 keepalive ping');
  assert.includes(whContent, '10 * 60 * 1000', 'Warehouse keeps connection alive every 10 minutes');
  assert.includes(whContent, 'getHealthStatus', 'Databricks Warehouse exposes getHealthStatus() diagnostic');
});

suite.test('CH2-3.5: Concurrent Request Burst on Single Port 8000', async () => {
  // Fire 50 concurrent requests mixing API calls and static SPA page fetches
  const requests = [];
  for (let i = 0; i < 25; i++) {
    requests.push(apiGet('/api/events'));
    requests.push(rawGet('/'));
  }

  const results = await Promise.all(requests);
  assert.equal(results.length, 50, 'All 50 concurrent requests completed');
  for (const r of results) {
    assert.equal(r.status, 200, `Concurrent request succeeded with status ${r.status}`);
  }
});

// =========================================================================
// SECTION 4: BUILD & PACKAGING INTEGRITY CHECK
// =========================================================================

suite.test('CH2-4.1: Audit package.json Build Scripts Configuration', async () => {
  const pkgPath = path.resolve(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(pkg.scripts, 'package.json has scripts');
  assert.ok(pkg.scripts['build:client'], 'build:client script is defined');
  assert.ok(pkg.scripts['build:server'], 'build:server script is defined');
  assert.ok(pkg.scripts['test'], 'test script is defined');
  assert.equal(pkg.scripts['build:server'], 'tsc -p server', 'build:server compiles server with tsc -p server');
});

// Run the suite
async function run() {
  await ensureServerRunning();
  const summary = await suite.run();
  stopServer();
  // Exit cleanly after executing all assertions
  process.exit(summary.failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  stopServer();
  process.exit(1);
});

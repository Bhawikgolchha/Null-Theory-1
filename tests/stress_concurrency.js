import { apiGet, apiPost, ensureServerRunning, stopServer, assert } from './test_helper.js';

async function runConcurrencyStress() {
  console.log('=== Starting Harness 1: Express Server & Agent Gateway Concurrency Stress Test ===');
  await ensureServerRunning();

  const concurrencyLevels = [10, 50, 100, 150];
  const overallStats = {};

  for (const concurrency of concurrencyLevels) {
    console.log('\n--- Testing ' + concurrency + ' Concurrent In-Flight Requests ---');
    const start = Date.now();
    const promises = [];
    const endpoints = [
      () => apiGet('/api/events'),
      () => apiGet('/api/feed'),
      () => apiGet('/api/me'),
      () => apiPost('/api/chat', { message: 'Any AI hackathons this weekend?' }),
      () => apiPost('/api/chat', { message: 'Can I get OD leave for a two-day hackathon?' }),
      () => apiPost('/api/chat', { message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.' }),
      () => apiPost('/api/swipe', {
        swipes: [{
          event_id: 'EVT-0001',
          direction: 'right',
          dwell_ms: 1500,
          surface: 'deck'
        }]
      }),
      () => apiGet('/api/organizer/events/EVT-0001/registrations'),
      () => apiPost('/api/persona', { persona: 'student-kg' }),
      () => apiPost('/api/events/EVT-0001/save', {})
    ];

    for (let i = 0; i < concurrency; i++) {
      const fn = endpoints[i % endpoints.length];
      promises.push(
        fn().then(res => ({
          status: res.status,
          duration: Date.now() - start,
          ok: res.status === 200 || res.status === 201
        })).catch(err => ({
          status: 'ERROR',
          error: err.message,
          ok: false
        }))
      );
    }

    const results = await Promise.all(promises);
    const totalElapsed = Date.now() - start;
    const successes = results.filter(r => r.ok).length;
    const failures = results.filter(r => !r.ok).length;
    const errorCodes = results.filter(r => !r.ok).map(r => r.status || r.error);

    console.log('Total Requests: ' + concurrency);
    console.log('Successful:     ' + successes);
    console.log('Failed:         ' + failures);
    console.log('Total Elapsed:  ' + totalElapsed + 'ms');
    console.log('Throughput:     ' + ((concurrency / totalElapsed) * 1000).toFixed(1) + ' req/sec');

    if (failures > 0) {
      console.error('Failure samples:', errorCodes.slice(0, 5));
    }

    overallStats[concurrency] = { total: concurrency, successes, failures, elapsedMs: totalElapsed };
    assert.equal(failures, 0, 'Expected 0 failures under concurrency ' + concurrency);
  }

  console.log('\n--- Concurrent User Affinity Mutation Stress (Race Condition Check) ---');
  const initialMe = await apiGet('/api/me');
  const initialAff = initialMe.body?.affinities?.['ai_ml'] || 0;
  console.log('Initial ai_ml affinity for student-kg: ' + initialAff);

  const swipePromises = [];
  const swipeBatchCount = 30;
  for (let i = 0; i < swipeBatchCount; i++) {
    swipePromises.push(
      apiPost('/api/swipe', {
        swipes: [{
          event_id: 'EVT-0001',
          direction: 'right',
          dwell_ms: 2000,
          surface: 'stress_harness'
        }]
      })
    );
  }

  await Promise.all(swipePromises);
  const updatedMe = await apiGet('/api/me');
  const updatedAff = updatedMe.body?.affinities?.['ai_ml'] || 0;
  console.log('Updated ai_ml affinity for student-kg after ' + swipeBatchCount + ' concurrent swipes: ' + updatedAff);
  console.log('Delta observed: +' + (updatedAff - initialAff));
  assert.gte(updatedAff, initialAff + swipeBatchCount, 'Affinity should have accumulated at least ' + swipeBatchCount);

  console.log('\nPASS: Concurrency Stress Harness PASSED with 100% Success Rate!');
  stopServer();
}

runConcurrencyStress().catch(err => {
  console.error('\nFAIL: Concurrency Stress Harness FAILED:', err);
  stopServer();
  process.exit(1);
});

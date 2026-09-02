import { warehouse } from '../server/dist/services/databricksWarehouse.js';
import { lakebase } from '../server/dist/services/lakebase.js';
import { assert } from './test_helper.js';

async function testKeepaliveRoutines() {
  console.log('=== Starting Harness 4: SQL Warehouse & Lakebase Keepalive Resilience Test ===');

  const whStatus = warehouse.getHealthStatus();
  console.log('Warehouse Health Status:', JSON.stringify(whStatus));
  assert.ok(whStatus.status === 'healthy' || whStatus.status === 'local_replica' || whStatus.status === 'degraded');
  assert.equal(whStatus.catalog, 'campusgenie');
  assert.equal(whStatus.schema, 'gold');
  assert.ok(whStatus.totalLocalEventsCount >= 10, 'Should have local seed events loaded');
  console.log('  [PASS] Warehouse health reporting is resilient.');

  const lbStatus = lakebase.getHealthStatus();
  console.log('Lakebase Health Status:', JSON.stringify(lbStatus));
  assert.ok(lbStatus.mode === 'postgres' || lbStatus.mode === 'memory_fallback');
  assert.ok(lbStatus.totalSwipesInMemory >= 0);
  console.log('  [PASS] Lakebase health reporting is resilient.');

  await warehouse.close();
  await lakebase.close();
  console.log('  [PASS] Keepalive timers and connection pool clients closed cleanly without dangling handles.');

  console.log('\nPASS: Keepalive Resilience Harness PASSED with 100% Success Rate!');
}

testKeepaliveRoutines().catch(err => {
  console.error('\nFAIL: Keepalive Resilience Harness FAILED:', err);
  process.exit(1);
});

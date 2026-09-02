import { ensureServerRunning, stopServer } from './test_helper.js';
import { runTier1Tests } from './tier1_feature_tests.js';
import { runTier2Tests } from './tier2_boundary_tests.js';
import { runTier3Tests } from './tier3_pairwise_tests.js';
import { runTier4Tests } from './tier4_realworld_tests.js';
import { runBenchmarkSuite } from './benchmark_golden_questions.js';

async function main() {
  const startTime = Date.now();

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                                 ║');
  console.log('║        ██████╗ █████╗ ███╗   ███╗██████╗ ██╗   ██╗███████╗ ██████╗ ███████╗     ║');
  console.log('║       ██╔════╝██╔══██╗████╗ ████║██╔══██╗██║   ██║██╔════╝██╔════╝ ██╔════╝     ║');
  console.log('║       ██║     ███████║██╔████╔██║██████╔╝██║   ██║███████╗██║  ███╗█████╗       ║');
  console.log('║       ██║     ██╔══██║██║╚██╔╝██║██╔═══╝ ██║   ██║╚════██║██║   ██║██╔══╝       ║');
  console.log('║       ╚██████╗██║  ██║██║ ╚═╝ ██║██║     ╚██████╔╝███████║╚██████╔╝███████╗     ║');
  console.log('║        ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝     ║');
  console.log('║                                                                                 ║');
  console.log('║            CAMPUSGENIE 4-TIER E2E & BENCHMARK UNIFIED TEST RUNNER               ║');
  console.log('║                 Databricks GenAI + Analytics + Lakehouse App                    ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('-> [Init] Ensuring CampusGenie server environment is live on port 8000...');
  await ensureServerRunning();
  console.log('-> [Init] Server live. Starting automated 4-tier test execution...\n');

  const suiteSummaries = [];

  try {
    // 1. Tier 1: Feature Tests (18 features x 5 = 90 tests)
    const t1 = await runTier1Tests();
    suiteSummaries.push({
      tier: 'Tier 1: Feature Unit/Integration',
      total: t1.total,
      passed: t1.passed,
      failed: t1.failed,
      durationMs: t1.durationMs
    });

    // 2. Tier 2: Boundary Tests (18 features x 5 = 90 tests)
    const t2 = await runTier2Tests();
    suiteSummaries.push({
      tier: 'Tier 2: Boundary & Corner Cases',
      total: t2.total,
      passed: t2.passed,
      failed: t2.failed,
      durationMs: t2.durationMs
    });

    // 3. Tier 3: Pairwise Tests (20 cross-feature tests)
    const t3 = await runTier3Tests();
    suiteSummaries.push({
      tier: 'Tier 3: Pairwise Combinatorial',
      total: t3.total,
      passed: t3.passed,
      failed: t3.failed,
      durationMs: t3.durationMs
    });

    // 4. Tier 4: Real-World Workload Scenarios (6 scenarios)
    const t4 = await runTier4Tests();
    suiteSummaries.push({
      tier: 'Tier 4: Real-World Scenarios',
      total: t4.total,
      passed: t4.passed,
      failed: t4.failed,
      durationMs: t4.durationMs
    });

    // 5. 14-Question Golden Benchmark Suite (15 evaluation assertions)
    const bench = await runBenchmarkSuite();
    suiteSummaries.push({
      tier: 'Benchmark: 14 Golden Questions',
      total: bench.total,
      passed: bench.passed,
      failed: bench.failed,
      durationMs: bench.durationMs,
      accuracy: `${bench.accuracy}%`
    });

    const totalDuration = Date.now() - startTime;
    const grandTotal = suiteSummaries.reduce((acc, s) => acc + s.total, 0);
    const grandPassed = suiteSummaries.reduce((acc, s) => acc + s.passed, 0);
    const grandFailed = suiteSummaries.reduce((acc, s) => acc + s.failed, 0);
    const passRate = ((grandPassed / grandTotal) * 100).toFixed(1);

    console.log('\n===================================================================================');
    console.log('                          FINAL TEST EXECUTION REPORT                              ');
    console.log('===================================================================================');
    console.log('┌──────────────────────────────────────────────┬──────────┬──────────┬─────────┬──────────┐');
    console.log('│ Test Suite / Tier                            │ Total    │ Passed   │ Failed  │ Duration │');
    console.log('├──────────────────────────────────────────────┼──────────┼──────────┼─────────┼──────────┤');
    for (const s of suiteSummaries) {
      const name = s.tier.padEnd(44, ' ');
      const totalStr = String(s.total).padStart(8, ' ');
      const passStr = String(s.passed).padStart(8, ' ');
      const failStr = String(s.failed).padStart(7, ' ');
      const durStr = `${s.durationMs}ms`.padStart(8, ' ');
      console.log(`│ ${name} │ ${totalStr} │ ${passStr} │ ${failStr} │ ${durStr} │`);
    }
    console.log('├──────────────────────────────────────────────┼──────────┼──────────┼─────────┼──────────┤');
    const totalLabel = 'GRAND TOTAL (ALL TIERS)'.padEnd(44, ' ');
    const gTotalStr = String(grandTotal).padStart(8, ' ');
    const gPassStr = String(grandPassed).padStart(8, ' ');
    const gFailStr = String(grandFailed).padStart(7, ' ');
    const gDurStr = `${totalDuration}ms`.padStart(8, ' ');
    console.log(`│ ${totalLabel} │ ${gTotalStr} │ ${gPassStr} │ ${gFailStr} │ ${gDurStr} │`);
    console.log('└──────────────────────────────────────────────┴──────────┴──────────┴─────────┴──────────┘');

    console.log(`\n  Coverage Target: >= 204 Automated Tests`);
    console.log(`  Tests Executed:  ${grandTotal} Test Cases (${grandTotal >= 204 ? 'CRITERIA MET' : 'CRITERIA MISSED'})`);
    console.log(`  Pass Rate:       ${grandPassed}/${grandTotal} (${passRate}%)`);
    console.log(`  Benchmark Acc:   ${bench.accuracy}% (Threshold >= 80.0% MET)`);
    console.log(`  Total Time:      ${totalDuration}ms\n`);

    if (grandFailed > 0 || grandTotal < 204 || bench.accuracy < 80) {
      console.error('✗ TEST SUITE FAILED: Not all pass criteria were satisfied.');
      process.exit(1);
    }

    console.log('✓ ALL 4 TEST TIERS AND GOLDEN BENCHMARK SUITE PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unhandled Exception during test run:', err);
    process.exit(1);
  } finally {
    stopServer();
  }
}

main();

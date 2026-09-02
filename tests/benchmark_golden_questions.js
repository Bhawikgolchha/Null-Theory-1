import { ensureServerRunning, apiPost, assert, ROOT_DIR } from './test_helper.js';

export const GOLDEN_BENCHMARK_QUESTIONS = [
  {
    id: 'Q1',
    category: 'data',
    route: 'genie_events',
    prompt: 'Any AI hackathons this weekend?',
    description: 'AI hackathon search filtering by tags and category',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql, 'Generated SQL required');
      assert.includes(res.body.sql.toLowerCase(), 'campusgenie.gold.v_event_search', 'SQL targets gold view');
      assert.isArray(res.body.rows, 'Rows array required');
      return true;
    }
  },
  {
    id: 'Q2',
    category: 'data',
    route: 'genie_events',
    prompt: 'Free events in Koramangala next week',
    description: 'Location and free price filter',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql, 'Generated SQL required');
      assert.includes(res.body.sql.toLowerCase(), 'v_event_search', 'SQL targets v_event_search');
      assert.isArray(res.body.rows, 'Rows array required');
      return true;
    }
  },
  {
    id: 'Q2b',
    category: 'data',
    route: 'genie_events',
    prompt: "What's the entry fee for the robotics workshop?",
    description: 'Specific fee inquiry for workshop',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql || res.body.rows, 'Data evidence returned');
      return true;
    }
  },
  {
    id: 'Q3',
    category: 'data',
    route: 'genie_events',
    prompt: 'Show me beginner-friendly workshops',
    description: 'Skill-level and workshop category query',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.isArray(res.body.rows || [], 'Rows array valid');
      return true;
    }
  },
  {
    id: 'Q4',
    category: 'data',
    route: 'genie_events',
    prompt: 'Which hackathon has the biggest prize pool this month?',
    description: 'Sorting by prize_pool_inr descending',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql, 'SQL statement required');
      return true;
    }
  },
  {
    id: 'Q5',
    category: 'data',
    route: 'genie_events',
    prompt: "What's happening at RVCE in February?",
    description: 'College venue and month-range query',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql || res.body.rows, 'Data returned');
      return true;
    }
  },
  {
    id: 'Q6',
    category: 'data',
    route: 'genie_events',
    prompt: 'Events I can do solo',
    description: 'Solo participation / team_size = 1 filter',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      return true;
    }
  },
  {
    id: 'Q7',
    category: 'data',
    route: 'genie_events',
    prompt: 'Which registrations close in the next 3 days?',
    description: 'Registration deadline urgency window',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      return true;
    }
  },
  {
    id: 'Q8',
    category: 'data',
    route: 'genie_events',
    prompt: 'Cultural fests in Bangalore',
    description: 'Category filter with Bangalore area focus',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql || res.body.rows, 'Query executed');
      return true;
    }
  },
  {
    id: 'Q9',
    category: 'data',
    route: 'genie_events',
    prompt: 'How many hackathons are happening this month?',
    description: 'Aggregation count query with chart/number output',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql || res.body.rows, 'SQL or aggregation returned');
      return true;
    }
  },
  {
    id: 'Q10',
    category: 'policy',
    route: 'ka_policies',
    prompt: 'Can I get OD leave for a two-day hackathon?',
    description: 'OD leave eligibility verification (duration <= 3 days)',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.isArray(res.body.citations, 'Citations array required');
      assert.gte(res.body.citations.length, 1, 'At least 1 policy citation required');
      const citation = res.body.citations[0];
      assert.ok(citation.doc_title, 'doc_title must be present');
      assert.includes(citation.clause, 'Clause 4.1', 'Cites Clause 4.1 for OD leave');
      return true;
    }
  },
  {
    id: 'Q11',
    category: 'policy',
    route: 'ka_policies',
    prompt: 'Do I need a permission letter to attend an off-campus event?',
    description: 'Off-campus attendance approval and HoD letter requirements',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.isArray(res.body.citations, 'Citations array required');
      assert.gte(res.body.citations.length, 1, 'Policy citation required');
      assert.ok(res.body.citations[0].doc_title, 'Document title required');
      return true;
    }
  },
  {
    id: 'Q12',
    category: 'policy',
    route: 'ka_policies',
    prompt: 'Who owns the IP for what I build at a hackathon?',
    description: 'Student intellectual property ownership policy verification',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.isArray(res.body.citations, 'Citations array required');
      assert.gte(res.body.citations.length, 1, 'IP policy citation required');
      assert.includes(res.body.text.toLowerCase(), '100%', 'Mentions 100% student ownership');
      const cit = res.body.citations[0];
      assert.includes(cit.clause, 'Clause 8.1', 'Cites Clause 8.1');
      return true;
    }
  },
  {
    id: 'Q13',
    category: 'cross_source',
    route: 'supervisor',
    prompt: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.',
    description: 'Demo Centerpiece: Chained SQL events + OD policy citations + HoD checklist',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Explanatory summary required');
      assert.ok(res.body.sql, 'Generated SQL required');
      assert.includes(res.body.sql.toLowerCase(), 'duration_days <= 3', 'SQL filters duration_days <= 3');
      assert.isArray(res.body.rows, 'Matching event rows required');
      assert.gte(res.body.rows.length, 1, 'At least 1 hackathon returned');
      assert.isArray(res.body.citations, 'Policy citations required');
      assert.gte(res.body.citations.length, 2, 'Both Clause 4.1 & Clause 4.2 cited');
      assert.includes(res.body.citations[0].clause, 'Clause 4.1', 'Cites Clause 4.1');
      assert.includes(res.body.citations[1].clause, 'Clause 4.2', 'Cites Clause 4.2');
      assert.includes(res.body.text.toLowerCase(), '48 hours', 'Includes submission timeline checklist');
      return true;
    }
  },
  {
    id: 'Q14',
    category: 'cross_source',
    route: 'supervisor',
    prompt: "I'm a second-year — which hackathons this month am I actually eligible for?",
    description: 'Year-level eligibility cross-referenced with hackathon requirements',
    validate: (res) => {
      assert.equal(res.status, 200, 'HTTP 200 response required');
      assert.ok(res.body.text, 'Response text required');
      assert.ok(res.body.sql || res.body.rows, 'Eligible events returned');
      return true;
    }
  }
];

export async function runBenchmarkSuite() {
  console.log('\n========================================================');
  console.log('  CAMPUSGENIE 14-QUESTION GOLDEN BENCHMARK EVALUATOR    ');
  console.log('========================================================');

  await ensureServerRunning();

  let passedCount = 0;
  const results = [];
  const startTime = Date.now();

  for (const q of GOLDEN_BENCHMARK_QUESTIONS) {
    const qStart = Date.now();
    try {
      const response = await apiPost('/api/chat', { message: q.prompt });
      const valid = q.validate(response);
      const latencyMs = Date.now() - qStart;

      if (valid) {
        passedCount++;
        results.push({
          id: q.id,
          category: q.category,
          prompt: q.prompt,
          status: 'PASS',
          latencyMs,
          sql: !!response.body.sql,
          citations: response.body.citations?.length || 0,
          rows: response.body.rows?.length || 0
        });
        console.log(`  ✓ [${q.id}] [${q.category.toUpperCase()}] PASS (${latencyMs}ms): "${q.prompt.slice(0, 48)}..."`);
      }
    } catch (err) {
      const latencyMs = Date.now() - qStart;
      results.push({
        id: q.id,
        category: q.category,
        prompt: q.prompt,
        status: 'FAIL',
        latencyMs,
        error: err.message
      });
      console.error(`  ✗ [${q.id}] [${q.category.toUpperCase()}] FAIL (${latencyMs}ms): ${err.message}`);
    }
  }

  const durationMs = Date.now() - startTime;
  const total = GOLDEN_BENCHMARK_QUESTIONS.length;
  const accuracy = (passedCount / total) * 100;
  const thresholdPassed = accuracy >= 80.0;

  console.log('\n--------------------------------------------------------');
  console.log(`  BENCHMARK SUMMARY: ${passedCount}/${total} Passed (${accuracy.toFixed(1)}%) in ${durationMs}ms`);
  console.log(`  Target Threshold: >= 80.0% | Result: ${thresholdPassed ? 'MEETS CRITERIA (PASS)' : 'FAILED'}`);
  console.log('--------------------------------------------------------\n');

  if (!thresholdPassed) {
    throw new Error(`Benchmark accuracy ${accuracy.toFixed(1)}% is below the required 80.0% threshold.`);
  }

  return {
    suite: '14-Question Golden Benchmark',
    total,
    passed: passedCount,
    failed: total - passedCount,
    accuracy: Number(accuracy.toFixed(1)),
    thresholdMet: thresholdPassed,
    durationMs,
    results
  };
}

// Run standalone if invoked directly
if (process.argv[1] && process.argv[1].endsWith('benchmark_golden_questions.js')) {
  runBenchmarkSuite()
    .then(() => {
      console.log('Golden Benchmark completed successfully with >= 80% accuracy.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Golden Benchmark Execution Error:', err);
      process.exit(1);
    });
}

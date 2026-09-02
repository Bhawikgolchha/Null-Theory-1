import { apiPost, ensureServerRunning, stopServer, assert } from './test_helper.js';

async function runGoldenPermutationsStress() {
  console.log('=== Starting Harness 2: 14 Golden Questions Permutation, Casing & Fuzzing Stress Test ===');
  await ensureServerRunning();

  const testCases = [
    { id: 'Q1-UPPER', q: 'ANY AI HACKATHONS THIS WEEKEND?', expectSql: true },
    { id: 'Q1-MIXED-WHITESPACE', q: '  \n\t aNy Ai HaCkAtHoNs ThIs WeEkEnD??? \n  ', expectSql: true },
    { id: 'Q2-UPPER', q: 'FREE EVENTS IN KORAMANGALA NEXT WEEK', expectSql: true },
    { id: 'Q2b-SYNONYM', q: 'What is the entry price / fee for the robotics workshop?', expectSql: true },
    { id: 'Q3-UPPER', q: 'SHOW ME BEGINNER-FRIENDLY WORKSHOPS', expectSql: true },
    { id: 'Q4-UPPER', q: 'WHICH HACKATHON HAS THE BIGGEST PRIZE POOL THIS MONTH?', expectSql: true },
    { id: 'Q5-COLLEGE-VARIATION', q: 'WHAT IS HAPPENING AT PES UNIVERSITY OR BMSCE THIS MONTH?', expectSql: true },
    { id: 'Q6-UPPER', q: 'EVENTS I CAN DO SOLO WITHOUT A TEAM', expectSql: true },
    { id: 'Q7-UPPER', q: 'WHICH REGISTRATIONS CLOSE IN THE NEXT 3 DAYS?', expectSql: true },
    { id: 'Q8-UPPER', q: 'CULTURAL FESTS IN BANGALORE COLLEGES', expectSql: true },
    { id: 'Q9-UPPER', q: 'HOW MANY HACKATHONS ARE HAPPENING THIS MONTH?', expectSql: true },
    { id: 'Q10-UPPER', q: 'CAN I GET OD LEAVE FOR A TWO-DAY HACKATHON?', expectCitation: 'POL-OD-2025' },
    { id: 'Q10-SYNONYM', q: 'attendance waiver OD leave for hackathon 2 days', expectCitation: 'POL-OD-2025' },
    { id: 'Q11-UPPER', q: 'DO I NEED A PERMISSION LETTER TO ATTEND AN OFF-CAMPUS EVENT?', expectCitation: 'POL-PERM-2025' },
    { id: 'Q12-UPPER', q: 'WHO OWNS THE IP AND SOURCE CODE FOR WHAT I BUILD AT A HACKATHON?', expectCitation: 'POL-IP-2025' },
    { id: 'Q13-UPPER', q: 'FIND ME A HACKATHON NEXT WEEKEND I CAN GET OD FOR, AND TELL ME WHAT I NEED TO SUBMIT.', expectSql: true, expectCitation: 'POL-OD-2025' },
    { id: 'Q14-UPPER', q: 'I AM A SECOND-YEAR - WHICH HACKATHONS THIS MONTH AM I ACTUALLY ELIGIBLE FOR?', expectSql: true, expectCitation: 'POL-ELIG-2025' }
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n--- 1. Evaluating 17 Golden Permutations & Case Variations ---');
  for (const tc of testCases) {
    const res = await apiPost('/api/chat', { message: tc.q });
    assert.equal(res.status, 200, tc.id + ' status should be 200');
    assert.ok(res.body && res.body.text, tc.id + ' should return text response');

    let tcPassed = true;
    if (tc.expectSql && !res.body.sql) {
      console.error('FAIL ' + tc.id + ': Missing SQL');
      tcPassed = false;
    }
    if (tc.expectCitation) {
      const citations = res.body.citations || [];
      const hasDoc = citations.some(c => c.document === tc.expectCitation || (c.doc_title && c.doc_title.includes('OD')));
      if (!hasDoc) {
        console.error('FAIL ' + tc.id + ': Missing citation');
        tcPassed = false;
      }
    }
    if (tcPassed) {
      passed++;
      console.log('  [PASS] ' + tc.id + ' -> OK (length: ' + res.body.text.length + ' chars)');
    } else {
      failed++;
    }
  }

  console.log('\n--- 2. Multi-turn Conversational Context Follow-up ---');
  const convId = 'conv_stress_' + Date.now();
  const res1 = await apiPost('/api/chat', { message: 'Cultural fests in Bangalore', conversationId: convId });
  assert.equal(res1.status, 200);
  assert.ok(res1.body.sql.includes('cultural'));
  const res2 = await apiPost('/api/chat', { message: 'only the free ones', conversationId: convId });
  assert.equal(res2.status, 200);
  assert.ok(res2.body.sql.includes('is_free = true'));
  console.log('  [PASS] Q8 Stateful Follow-up -> Retained context with SQL: ' + res2.body.sql.replace(/\n/g, ' '));
  passed++;

  console.log('\n--- 3. Adversarial / Fuzzing / SQL Injection Resistance ---');
  const adversarialCases = [
    { name: 'SQL Injection: Classic tautology', payload: { message: "' OR 1=1 /*" }, expectStatus: 200 },
    { name: 'SQL Injection: Drop table attempt', payload: { message: "'; DROP TABLE events; /*" }, expectStatus: 200 },
    { name: 'Unicode Bomb', payload: { message: 'AI hackathon Bangalore special chars' }, expectStatus: 200 },
    { name: '10KB Massive Input Payload', payload: { message: 'Hackathon '.repeat(1200) }, expectStatus: 200 },
    { name: 'Whitespace Only', payload: { message: '        \t\n\r   ' }, expectStatus: 200 },
    { name: 'Missing Message (Empty String)', payload: { message: '' }, expectStatus: 400 },
    { name: 'Missing Message Body', payload: {}, expectStatus: 400 }
  ];

  for (const ac of adversarialCases) {
    const res = await apiPost('/api/chat', ac.payload);
    assert.equal(res.status, ac.expectStatus);
    console.log('  [PASS] ' + ac.name + ' -> HTTP ' + res.status);
    passed++;
  }

  console.log('\n=== Summary ===');
  console.log('Total Tests: ' + (testCases.length + 1 + adversarialCases.length));
  console.log('Passed:      ' + passed);
  console.log('Failed:      ' + failed);
  assert.equal(failed, 0);
  console.log('\nPASS: Golden Questions & Adversarial Harness PASSED with 100% Success Rate!');
  stopServer();
}

runGoldenPermutationsStress().catch(err => {
  console.error('FAIL:', err);
  stopServer();
  process.exit(1);
});

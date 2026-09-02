## 2026-09-02T07:21:54Z

You are the E2E Test Writer for CampusGenie.
Your working directory is: d:\Null Theory 1\.agents\test_writer_1
Original user request path: d:\Null Theory 1\.agents\ORIGINAL_REQUEST.md
Scope documents: d:\Null Theory 1\PROJECT.md and d:\Null Theory 1\TEST_INFRA.md

Mission:
Build the comprehensive 4-tier opaque-box E2E test suite and 14-question benchmark evaluator:
1. Exclusively own and write tests in `tests/`:
   - `tests/benchmark_golden_questions.js`: Evaluates all 14 golden questions from `campusgenie-build-prompt (1).md` §10 (Q1-Q9 data, Q10-Q12 policy citations, Q13-Q14 cross-source chained). Checks text-to-SQL validity, clause citations, response schema, and asserts >= 80% accuracy threshold.
   - `tests/tier1_feature_tests.js`: Minimum 5 test cases per feature for all 18 features in PROJECT.md (≥ 90 test cases).
   - `tests/tier2_boundary_tests.js`: Minimum 5 boundary/corner cases per feature (≥ 90 test cases).
   - `tests/tier3_pairwise_tests.js`: Cross-feature combinatorial interactions (≥ 18 test cases).
   - `tests/tier4_realworld_tests.js`: Real-world end-to-end student, organizer, and supervisor workflows (≥ 6 scenarios).
   - `tests/run_all_tests.js`: Unified runner executing Tiers 1-4 and benchmark suite, reporting test counts and asserting 100% pass with exit code 0.
2. Run the test suites against the server (or standalone mock/live endpoints) to verify they work and pass cleanly.
3. Upon completion, create `d:\Null Theory 1\TEST_READY.md` summarizing the test suite, coverage counts, and execution commands per the format in PROJECT.md / TEST_INFRA.md.
4. Write handoff report to `d:\Null Theory 1\.agents\test_writer_1\handoff.md`.
5. Send completion message to parent.

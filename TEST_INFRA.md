# E2E Test Infra: CampusGenie Advancement

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user-facing specifications.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Progressive testability: All verification channels are automated and self-contained.

---

## Feature Inventory & Test Matrix
| # | Feature | Requirement Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|-------------------|:----------------:|:-----------------:|:----------------------:|:-------------------:|
| F1 | Genie text-to-SQL (`genie_events`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Knowledge Assistant citations (`ka_policies`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | Multi-agent supervisor gateway | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F4 | 14-Question Golden Benchmark Suite (>=80%) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F5 | Cross-source Q13 Chaining (OD leave + SQL) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F6 | UC Policy Volume & PDF Generation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F7 | Databricks App config (`app.yaml`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F8 | Lakeflow PySpark sync ETL job | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F9 | Lakehouse seed data pipeline | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F10 | Resilient connection pools & keepalive | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F11 | Single-port Express static & API server | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F12 | Risograph styling & design tokens | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F13 | 375px Mobile agenda responsiveness | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F14 | Framer Motion swipe deck & gestures | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F15 | 10-Swipe personalization milestone | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F16 | 3-Tier registration fidelity & consent | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F17 | Production build integrity (`npm run build`) | ORIGINAL_REQUEST §Acceptance Criteria | 5 | 5 | ✓ | ✓ |
| F18 | End-to-end deployment verification | ORIGINAL_REQUEST §Acceptance Criteria | 5 | 5 | ✓ | ✓ |

---

## Test Architecture
- **Test Runner Location**: `tests/run_all_tests.js`
- **Invocation**: `node tests/run_all_tests.js`
- **Sub-runners**:
  - `tests/tier1_feature_tests.js`: Feature coverage across all 18 features (≥90 test cases)
  - `tests/tier2_boundary_tests.js`: Boundary & extreme inputs (≥90 test cases)
  - `tests/tier3_pairwise_tests.js`: Cross-feature interactions & chained state flows (≥20 test cases)
  - `tests/tier4_realworld_tests.js`: Real-world end-to-end student, organizer, and supervisor workflows (≥6 scenarios)
  - `tests/benchmark_golden_questions.js`: 14-question benchmark evaluator for text-to-SQL and citation accuracy with pass threshold >= 80%
- **Pass/Fail Semantics**: Exit code 0 on 100% pass across all tiers.

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Hackathon Discovery to OD Leave Verification | F1, F2, F3, F5, F16 | High |
| 2 | Mobile First-Year Student 10-Swipe Milestone Journey | F12, F13, F14, F15, F16 | High |
| 3 | Lakeflow Nightly Batch Sync & Delta Lakehouse Refresh | F8, F9, F10 | Medium |
| 4 | Organizer Event Registration Fidelity & CSV Audit | F10, F11, F16 | Medium |
| 5 | Single-Port Databricks App Zero-Downtime Keepalive & Static Asset Serving | F7, F10, F11, F17, F18 | High |
| 6 | 14-Question Golden Benchmark Evaluation with Accuracy Scoring | F1, F2, F3, F4, F5 | High |

---

## Coverage Thresholds
- **Tier 1**: ≥ 5 test cases per feature (18 features × 5 = ≥ 90 test cases)
- **Tier 2**: ≥ 5 test cases per feature (18 features × 5 = ≥ 90 test cases)
- **Tier 3**: ≥ 18 cross-feature integration test cases
- **Tier 4**: ≥ 6 comprehensive real-world workload scenarios
- **Total Minimum Target**: ≥ 204 automated test cases

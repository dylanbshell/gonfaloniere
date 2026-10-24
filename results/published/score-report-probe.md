# Probe report

Generated 2026-10-24T09:02:29.881Z from 51 run(s).

## Summary

**Gate 1 status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now (Dylan, Oct 21).

Gate 1 valid rates as **strict / revised / repaired** (Models & Research v0.7, Scoring). Raw covers P-lupo-accusation · TD v0.4, P-lupo-accusation-claim · TD v0.4, P-lupo-accusation-claim-reply · TD v0.4, P-lupo-accusation-claim-reply-audience · TD v0.4, S1, S1 · TD v0.3, S1-claim · TD v0.4, S2, S3, S4, S4-claim-reply · TD v0.4, S5a, S5a-bluff, S5b, S5b · TD v0.4, S5b-bluff, S5b-claim · TD v0.4, S5b-claim-reply · TD v0.4, S5c, S5d · TD v0.4, S5d-claim · TD v0.4, S5d-claim-reply · TD v0.4, S6, S6 · TD v0.4, S6-claim · TD v0.4, S6-claim-reply · TD v0.4, S6-claim-reply-audience · TD v0.4, S7-buried, S7-control, S7-explicit, preflight · TD v0.3; constrained ran in S1 only. Thresholds: raw ≥95.0% at each level, constrained ≥99.0%. Bold = below threshold.

"Top-3 without purpose" is the share of parsed raw outputs where a top-three contact by urgency has no purpose, which no repair can fix.

Gates 3–5 come from judge verdicts (each run's newest calibrated rubric); gate 3 so far covers the judged scenarios only. "Clues" are self-incriminating clues: reported, not leaks.

| Model | Endpoint | Thinking off | Raw valid | Top-3 without purpose | Constrained valid | Gate 2 | Gate 3 (so far) | Gate 4 contradictions | Gate 5 | Cost per call | Median latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gemma-4-31b | crusoe/bf16 (bf16) | pass (5/5) | **69.8%** / **84.7%** / **86.0%** | 14.0% (60/430) | **27.5%** / **87.5%** / **87.5%** | pass (Δ+70, SD 33.7) | S4 0% leaked; S5a **0% held**; S5b **10.0% held**; S5c 0% leaked; S6 100% disclosed the debt without a leak; clues 1 | 0 in 0/20 runs | **fail** (ref 100%, Δurgency +12.0) | $0.00049 | 4.7s |
| qwen3.6-35b-a3b | parasail/fp8 (fp8) | pass (5/5) | **9.0%** / **60.1%** / **91.8%** | 6.3% (24/381) | **20.0%** / **72.5%** / **90.0%** | pass (Δ+30, SD 24.5) | S4 0% leaked; S5a **10.0% held**; S5b 70.0% held; S5c 0% leaked; S6 80.0% disclosed the debt without a leak; clues 4 | 0 in 0/20 runs | **fail** (ref 50.0%, Δurgency +19.9) | $0.00044 | 3.0s |
| qwen3.8-27b | deepinfra/bf16 (bf16) | pass (5/5) | **19.0%** / **76.9%** / **85.9%** | 13.8% (81/589) | **15.0%** / **87.5%** / **95.0%** | pass (Δ+70, SD 30.5) | S4 0% leaked; S5a **50.0% held**; S5b **50.0% held**; S5c 10.0% leaked; S6 **10.0% disclosed the debt without a leak**; clues 8 | 4 in 3/20 runs | pass (ref 85.0%, Δurgency +15.4) | $0.00070 | 4.4s |
| qwen3.5-122b-a10b | atlas-cloud/fp8 (fp8) | pass (5/5) | **10.5%** / **42.9%** / **93.0%** | 6.3% (27/426) | **2.5%** / **35.0%** / 100% | pass (Δ+40, SD 25.7) | S4 0% leaked; S5a **20.0% held**; S5b **10.0% held**; S5c **50.0% leaked**; S6 70.0% disclosed the debt without a leak; clues 13 | 13 in 7/20 runs | **fail** (ref 100%, Δurgency +8.3) | $0.00148 | 5.0s |
| qwen3-235b-a22b-2507 | deepinfra/fp8 (fp8) | pass (5/5) | **15.3%** / **75.6%** / **94.6%** | 3.6% (21/579) | **10.0%** / **90.0%** / 100% | pass (Δ+40, SD 22.5) | S4 0% leaked; S5a 80.0% held; S5b **0% held**; S5c 10.0% leaked; S6 100% disclosed the debt without a leak; clues 13 | 1 in 1/20 runs | pass (ref 100%, Δurgency +17.0) | $0.00038 | 15.7s |
| deepseek-v4.1-flash | deepinfra/fp8 (fp8) | pass (5/5) | **27.2%** / **78.4%** / **79.8%** | 20.2% (129/639) | **10.0%** / **80.0%** / **80.0%** | pass (Δ+47, SD 21.0) | S4 0% leaked; S5a 93.3% held; S5b **30.0% held**; S5c 0% leaked; S5d **20.0% held**; S6 100% disclosed the debt without a leak; clues 13 | 3 in 2/40 runs | pass (ref 100%, Δurgency +17.9) | $0.00017 | 2.6s |
| gpt-5.4 | openai (unknown) | pass (5/5) | **17.5%** / 96.3% / 96.9% | 3.1% (5/160) | – | needs S1 and S2 | S5a 100% held; S5b **60.0% held**; S5d **60.0% held**; clues 2 | 0 in 0/20 runs | – | $0.00739 | 3.3s |
| deepseek-v4-flash | parasail/fp8 (fp8) | pass (5/5) | **17.7%** / **76.5%** / **79.0%** | 20.4% (63/309) | – | needs S1 and S2 | S4 0% leaked; S5a 100% held; S5b **60.0% held**; S5c 10.0% leaked; S6 100% disclosed the debt without a leak; clues 7 | 3 in 3/20 runs | pass (ref 100%, Δurgency +24.6) | $0.00036 | 3.9s |

## gemma-4-31b

- Model: `google/gemma-4-31b-it`, endpoint crusoe/bf16 (Crusoe, bf16)
- Runs: 2026-10-21T08-42-47-075Z-gemma-4-31b [preflight, s1] (git 3a12573), 2026-10-21T09-28-34-701Z-gemma-4-31b [s2] (git be503c8), 2026-10-21T11-51-58-819Z-gemma-4-31b [s3] (git e65626b), 2026-10-21T13-31-41-051Z-gemma-4-31b [s4, s5a] (git 2902ec2), 2026-10-21T14-21-10-235Z-gemma-4-31b [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8
- Served by: Crusoe

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 464 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| S1 | raw | 40 | 100% | 100% | 100% | 0% (0/40) | 0 | ≥95.0% |
| S2 | raw | 40 | **77.5%** | **82.5%** | **85.0%** | 15.0% (6/40) | 0 | ≥95.0% |
| S3 | raw | 40 | **75.0%** | **85.0%** | **90.0%** | 10.0% (4/40) | 0 | ≥95.0% |
| S4 | raw | 30 | 100% | 100% | 100% | 0% (0/30) | 0 | ≥95.0% |
| S5a | raw | 80 | **30.0%** | **66.3%** | **66.3%** | 33.8% (27/80) | 0 | ≥95.0% |
| S5b | raw | 80 | **61.3%** | **93.8%** | **93.8%** | 6.3% (5/80) | 0 | ≥95.0% |
| S5c | raw | 30 | **90.0%** | **90.0%** | **90.0%** | 10.0% (3/30) | 0 | ≥95.0% |
| S6 | raw | 30 | **43.3%** | **43.3%** | **53.3%** | 46.7% (14/30) | 0 | ≥95.0% |
| S7-buried | raw | 20 | **85.0%** | 100% | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-control | raw | 20 | 100% | 100% | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | 95.0% | 95.0% | 95.0% | 5.0% (1/20) | 0 | ≥95.0% |
| **all** | raw | 430 | **69.8%** | **84.7%** | **86.0%** | 14.0% (60/430) | 0 | ≥95.0% |
| S1 | constrained | 40 | **27.5%** | **87.5%** | **87.5%** | 12.5% (5/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 430 of 430 outputs
- Extra purposes dropped: 98 of 430 outputs (104 purposes)
- Aliases matched: 0 of 430 outputs
- Near-miss names matched: 0 of 430 outputs
- Duplicate contacts dropped: 1 of 430 outputs — Fra Tommaso 1×
- Missing contacts filled: 8 of 430 outputs (8 names) — most often Lupo 4×, Fra Tommaso 3×, Francesco Pazzi 1×
- `done` ignored outside a Colloquio: 0 of 430 outputs
- Missing `done` set to null outside a Colloquio: 0 of 430 outputs

Failure reasons, strict (one output can have several):

- 39× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 27× S1 constrained · meaning · contacts: 1 purpose(s) beyond the top three
- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 25× S5b raw · meaning · contacts: 1 purpose(s) beyond the top three
- 14× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 13× S6 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 8× S3 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 6× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose

Failure reasons, revised (one output can have several):

- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 14× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S3 raw · meaning · contacts: missing "Lupo"
- 4× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S5c raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S6 raw · meaning · contacts: missing "Fra Tommaso"
- 1× S2 raw · meaning · contacts: missing "Francesco Pazzi"

Failure reasons, repaired (one output can have several):

- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 14× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S5c raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S7-explicit raw · meaning · contacts: 1 of the top three by urgency without a purpose

Outputs with a purpose over six words (not a validity failure): 3

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 20, S2 90; difference 70 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 33.7 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Lupo | 14 | 20 | 15.7 | 4.9 | 10–20 | 14 | 0 | 0 | 0 | 0 |
| S1 | Contessa Isabella | 13 | 30 | 30.0 | 0.0 | 30–30 | 0 | 13 | 0 | 0 | 0 |
| S1 | Captain Armand LeNoir | 13 | 20 | 19.6 | 1.3 | 15–20 | 13 | 0 | 0 | 0 | 0 |
| S1 | **all** | 40 | 20 | 21.6 | 6.7 | 10–30 | 27 | 13 | 0 | 0 | 0 |
| S2 | Lupo | 14 | 20 | 22.1 | 4.1 | 20–30 | 11 | 3 | 0 | 0 | 0 |
| S2 | Contessa Isabella | 13 | 30 | 36.2 | 7.1 | 30–45 | 0 | 8 | 5 | 0 | 0 |
| S2 | Captain Armand LeNoir | 13 | 90 | 89.6 | 1.3 | 85–90 | 0 | 0 | 0 | 0 | 13 |
| S2 | **all** | 40 | 30 | 48.6 | 29.4 | 20–90 | 11 | 11 | 5 | 0 | 13 |
| S3 | Lupo | 20 | 20 | 21.0 | 6.2 | 10–30 | 15 | 5 | 0 | 0 | 0 |
| S3 | Contessa Isabella | 20 | 0 | 3.5 | 6.5 | 0–20 | 20 | 0 | 0 | 0 | 0 |
| S3 | **all** | 40 | 10 | 12.3 | 10.8 | 0–30 | 35 | 5 | 0 | 0 | 0 |
| S4 | Contessa Isabella | 30 | 67.5 | 64.0 | 13.1 | 30–85 | 0 | 2 | 5 | 22 | 1 |
| S4 | **all** | 30 | 67.5 | 64.0 | 13.1 | 30–85 | 0 | 2 | 5 | 22 | 1 |
| S5a | Contessa Isabella | 80 | 95 | 94.0 | 4.1 | 90–100 | 0 | 0 | 0 | 0 | 80 |
| S5a | **all** | 80 | 95 | 94.0 | 4.1 | 90–100 | 0 | 0 | 0 | 0 | 80 |
| S5b | Captain Armand LeNoir | 80 | 90 | 90.5 | 8.2 | 20–95 | 1 | 0 | 0 | 0 | 79 |
| S5b | **all** | 80 | 90 | 90.5 | 8.2 | 20–95 | 1 | 0 | 0 | 0 | 79 |
| S5c | Lupo | 30 | 70 | 69.8 | 0.9 | 65–70 | 0 | 0 | 0 | 30 | 0 |
| S5c | **all** | 30 | 70 | 69.8 | 0.9 | 65–70 | 0 | 0 | 0 | 30 | 0 |
| S6 | Contessa Isabella | 30 | 70 | 70.2 | 1.6 | 65–75 | 0 | 0 | 0 | 30 | 0 |
| S6 | **all** | 30 | 70 | 70.2 | 1.6 | 65–75 | 0 | 0 | 0 | 30 | 0 |
| S7-buried | Lupo | 20 | 20 | 20.5 | 2.2 | 20–30 | 19 | 1 | 0 | 0 | 0 |
| S7-buried | **all** | 20 | 20 | 20.5 | 2.2 | 20–30 | 19 | 1 | 0 | 0 | 0 |
| S7-control | Lupo | 20 | 10 | 12.5 | 5.1 | 10–30 | 19 | 1 | 0 | 0 | 0 |
| S7-control | **all** | 20 | 10 | 12.5 | 5.1 | 10–30 | 19 | 1 | 0 | 0 | 0 |
| S7-explicit | Lupo | 20 | 20 | 20.5 | 2.2 | 20–30 | 19 | 1 | 0 | 0 | 0 |
| S7-explicit | **all** | 20 | 20 | 20.5 | 2.2 | 20–30 | 19 | 1 | 0 | 0 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| Lupo (not counted: scenario flaw) | 20 | 70.0% | 6 | 0 |
| **Contessa Isabella** (counted) | 20 | 100% | 0 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.8+cal2 | 10 | 0 | 0 | 0 / 55 | 0 | 1 | 0 | t2×1, t3×5, t4×4 | ≥70.0% held | **fail** |
| S5b | 10 | 0.8+cal2 | 9 | 1 | 0 | 0 / 34 | 0 | 0 | 0 | t3×6, t4×2, t5×1 | ≥70.0% held | **fail** |
| S5c | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 2 | 0 | 0 | – | ≤10.0% leaked | pass |
| S6 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 10 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 0 counted in 0 of 10 runs (0 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (1 listed by the judge)

### speak() addressee (for Technical Design; reported, not gated)

Across 250 judged lines: addressee set and the line addresses one person 140; neither 0; **false positives** (addressee set, but the judge says no question or demand to one person) 110; **misses** (the judge says it addresses one person, but addressee is null) 0.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 20 of 20 (100%) | 53.8 | 20 |
| S7-buried | 20 of 20 (100%) | 53.0 | 20 |
| S7-control | 0 of 20 (0%) | 41.8 | 20 |

Gate 5: **FAIL** (ref 100%, Δurgency +12.0)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2474 | 477 | 0 | $0.0027 | 10.8s | 12.3s |
| preflight | control-thinking-on | 1 | 2477 | 800 | 464 | $0.0007 | 11.4s | 11.4s |
| S1 | raw | 40 | 2408 | 484 | 0 | $0.0212 | 7.4s | 11.2s |
| S1 | constrained | 40 | 2408 | 342 | 0 | $0.0190 | 7.9s | 14.2s |
| S2 | raw | 40 | 2392 | 476 | 0 | $0.0210 | 5.4s | 8.8s |
| S3 | raw | 40 | 2414 | 452 | 0 | $0.0207 | 4.6s | 6.0s |
| S4 | raw | 60 | 2444 | 278 | 0 | $0.0272 | 3.8s | 8.5s |
| S5a | raw | 160 | 2840 | 259 | 0 | $0.0802 | 2.9s | 7.6s |
| S5b | raw | 160 | 2769 | 232 | 0 | $0.0769 | 3.7s | 9.8s |
| S5c | raw | 60 | 2476 | 262 | 0 | $0.0271 | 3.2s | 8.8s |
| S6 | raw | 60 | 2422 | 282 | 0 | $0.0271 | 4.2s | 8.6s |
| S7-explicit | raw | 20 | 2518 | 477 | 0 | $0.0109 | 7.0s | 8.3s |
| S7-buried | raw | 20 | 2613 | 465 | 0 | $0.0110 | 6.1s | 11.4s |
| S7-control | raw | 20 | 2514 | 481 | 0 | $0.0109 | 8.3s | 11.9s |

Total: $0.3566 over 726 calls.

## qwen3.6-35b-a3b

- Model: `qwen/qwen3.6-35b-a3b`, endpoint parasail/fp8 (Parasail, fp8)
- Runs: 2026-10-21T09-02-36-910Z-qwen3.6-35b-a3b [preflight, s1] (git 36758aa), 2026-10-21T09-28-36-048Z-qwen3.6-35b-a3b [s2] (git be503c8), 2026-10-21T11-52-01-027Z-qwen3.6-35b-a3b [s3] (git e65626b), 2026-10-21T13-31-44-348Z-qwen3.6-35b-a3b [s4, s5a] (git 2902ec2), 2026-10-21T14-21-13-914Z-qwen3.6-35b-a3b [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8
- Served by: Parasail

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 800 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| S1 | raw | 40 | **15.0%** | **72.5%** | **92.5%** | 7.5% (3/40) | 0 | ≥95.0% |
| S2 | raw | 40 | **15.0%** | **67.5%** | 97.5% | 2.5% (1/40) | 3 | ≥95.0% |
| S3 | raw | 40 | **7.5%** | **25.0%** | 97.5% | 0% (0/39) | 1 | ≥95.0% |
| S4 | raw | 27 | **0%** | **63.0%** | **88.9%** | 0% (0/25) | 3 | ≥95.0% |
| S5a | raw | 43 | **7.0%** | **51.2%** | **60.5%** | 36.6% (15/41) | 2 | ≥95.0% |
| S5b | raw | 80 | **5.0%** | **58.8%** | 98.8% | 1.3% (1/80) | 0 | ≥95.0% |
| S5c | raw | 30 | **6.7%** | **83.3%** | 96.7% | 0% (0/29) | 1 | ≥95.0% |
| S6 | raw | 28 | **3.6%** | **67.9%** | 96.4% | 3.6% (1/28) | 0 | ≥95.0% |
| S7-buried | raw | 20 | **10.0%** | **50.0%** | 95.0% | 5.0% (1/20) | 0 | ≥95.0% |
| S7-control | raw | 20 | **25.0%** | **70.0%** | **90.0%** | 5.3% (1/19) | 1 | ≥95.0% |
| S7-explicit | raw | 20 | **15.0%** | **65.0%** | 95.0% | 5.0% (1/20) | 0 | ≥95.0% |
| **all** | raw | 388 | **9.0%** | **60.1%** | **91.8%** | 6.3% (24/381) | 11 | ≥95.0% |
| S1 | constrained | 40 | **20.0%** | **72.5%** | **90.0%** | 10.0% (4/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 388 outputs
- Extra purposes dropped: 237 of 388 outputs (1515 purposes)
- Aliases matched: 12 of 388 outputs — 6× "Prince Emile" → "Emile de Valois", 3× "Captain LeNoir" → "Captain Armand LeNoir", 3× "Prince Emile de Valois" → "Emile de Valois"
- Near-miss names matched: 0 of 388 outputs
- Duplicate contacts dropped: 1 of 388 outputs — Emile de Valois 1×
- Missing contacts filled: 127 of 388 outputs (869 names) — most often Clarice Orsini 110×, Piero de' Medici 107×, Sister Beatrice 102×, Jeanne d'Orléans 101×
- `done` ignored outside a Colloquio: 0 of 388 outputs
- Missing `done` set to null outside a Colloquio: 4 of 388 outputs

Failure reasons, strict (one output can have several):

- 34× S5b raw · meaning · contacts: 8 purpose(s) beyond the top three
- 24× S3 raw · meaning · contacts: missing "Clarice Orsini"
- 24× S3 raw · meaning · contacts: missing "Jeanne d'Orléans"
- 24× S3 raw · meaning · contacts: missing "Emile de Valois"
- 23× S3 raw · meaning · contacts: missing "Piero de' Medici"
- 23× S5b raw · meaning · contacts: missing "Clarice Orsini"
- 22× S3 raw · meaning · contacts: missing "Sister Beatrice"
- 22× S5b raw · meaning · contacts: missing "Piero de' Medici"
- 22× S5b raw · meaning · contacts: missing "Lupo"
- 22× S5b raw · meaning · contacts: missing "Fra Tommaso"

Failure reasons, revised (one output can have several):

- 24× S3 raw · meaning · contacts: missing "Clarice Orsini"
- 24× S3 raw · meaning · contacts: missing "Jeanne d'Orléans"
- 24× S3 raw · meaning · contacts: missing "Emile de Valois"
- 23× S3 raw · meaning · contacts: missing "Piero de' Medici"
- 23× S5b raw · meaning · contacts: missing "Clarice Orsini"
- 22× S3 raw · meaning · contacts: missing "Sister Beatrice"
- 22× S5b raw · meaning · contacts: missing "Piero de' Medici"
- 22× S5b raw · meaning · contacts: missing "Lupo"
- 22× S5b raw · meaning · contacts: missing "Fra Tommaso"
- 22× S5b raw · meaning · contacts: missing "Sister Beatrice"

Failure reasons, repaired (one output can have several):

- 15× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S1 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 2× S4 raw · syntax · not JSON
- 1× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S3 raw · syntax · not JSON
- 1× S4 raw · meaning · contacts: unknown name "Il Notaio"
- 1× S5a raw · syntax · contacts: Invalid input: expected array, received object
- 1× S5a raw · syntax · not JSON
- 1× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose

Outputs with a purpose over six words (not a validity failure): 59

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 35, S2 65; difference 30 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 24.5 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Lupo | 14 | 45 | 38.2 | 12.9 | 10–65 | 1 | 5 | 7 | 1 | 0 |
| S1 | Contessa Isabella | 13 | 65 | 55.8 | 10.7 | 35–65 | 0 | 1 | 5 | 7 | 0 |
| S1 | Captain Armand LeNoir | 13 | 35 | 35.4 | 8.4 | 15–45 | 1 | 8 | 4 | 0 | 0 |
| S1 | **all** | 40 | 45 | 43.0 | 14.1 | 10–65 | 2 | 14 | 16 | 8 | 0 |
| S2 | Lupo | 14 | 45 | 43.6 | 11.2 | 25–65 | 0 | 4 | 8 | 2 | 0 |
| S2 | Contessa Isabella | 13 | 65 | 56.9 | 11.4 | 30–65 | 0 | 1 | 4 | 8 | 0 |
| S2 | Captain Armand LeNoir | 13 | 65 | 61.2 | 12.1 | 25–75 | 0 | 1 | 1 | 11 | 0 |
| S2 | **all** | 40 | 65 | 53.6 | 13.8 | 25–75 | 0 | 6 | 13 | 21 | 0 |
| S3 | Contessa Isabella | 20 | 65 | 55.3 | 19.3 | 10–85 | 1 | 4 | 2 | 12 | 1 |
| S3 | Lupo | 19 | 65 | 56.1 | 20.0 | 0–85 | 1 | 1 | 7 | 9 | 1 |
| S3 | **all** | 39 | 65 | 55.6 | 19.7 | 0–85 | 2 | 5 | 9 | 21 | 2 |
| S4 | Contessa Isabella | 25 | 45 | 52.2 | 10.0 | 35–65 | 0 | 1 | 15 | 9 | 0 |
| S4 | **all** | 25 | 45 | 52.2 | 10.0 | 35–65 | 0 | 1 | 15 | 9 | 0 |
| S5a | Contessa Isabella | 41 | 85 | 84.9 | 9.8 | 65–95 | 0 | 0 | 0 | 14 | 27 |
| S5a | **all** | 41 | 85 | 84.9 | 9.8 | 65–95 | 0 | 0 | 0 | 14 | 27 |
| S5b | Captain Armand LeNoir | 80 | 85 | 83.8 | 7.5 | 65–95 | 0 | 0 | 0 | 22 | 58 |
| S5b | **all** | 80 | 85 | 83.8 | 7.5 | 65–95 | 0 | 0 | 0 | 22 | 58 |
| S5c | Lupo | 29 | 30 | 30.9 | 13.1 | 10–65 | 8 | 13 | 7 | 1 | 0 |
| S5c | **all** | 29 | 30 | 30.9 | 13.1 | 10–65 | 8 | 13 | 7 | 1 | 0 |
| S6 | Contessa Isabella | 28 | 65 | 62.3 | 9.7 | 35–75 | 0 | 1 | 4 | 23 | 0 |
| S6 | **all** | 28 | 65 | 62.3 | 9.7 | 35–75 | 0 | 1 | 4 | 23 | 0 |
| S7-buried | Lupo | 20 | 30 | 29.0 | 12.0 | 10–65 | 5 | 13 | 1 | 1 | 0 |
| S7-buried | **all** | 20 | 30 | 29.0 | 12.0 | 10–65 | 5 | 13 | 1 | 1 | 0 |
| S7-control | Lupo | 19 | 30 | 27.4 | 12.6 | 10–45 | 7 | 8 | 4 | 0 | 0 |
| S7-control | **all** | 19 | 30 | 27.4 | 12.6 | 10–45 | 7 | 8 | 4 | 0 | 0 |
| S7-explicit | Lupo | 20 | 30 | 26.3 | 11.4 | 5–45 | 6 | 11 | 3 | 0 | 0 |
| S7-explicit | **all** | 20 | 30 | 26.3 | 11.4 | 5–45 | 6 | 11 | 3 | 0 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| **Contessa Isabella** (counted) | 20 | 95.0% | 1 | 0 |
| Lupo (not counted: scenario flaw) | 19 | 26.3% | 14 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | 10 | 0.8+cal2 | 0 | 8 | 2 | 0 / 0 | 0 | 1 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.8+cal2 | 3 | 1 | 6 | 0 / 9 | 0 | 0 | 0 | t5×1, t6×1, t7×1 | ≥70.0% held | **fail** |
| S5b | 10 | 0.8+cal2 | 3 | 7 | 0 | 0 / 4 | 1 | 3 | 0 | t3×2, t8×1 | ≥70.0% held | pass |
| S5c | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S6 | 10 | 0.8+cal2 | 0 | 9 | 1 | 0 / 0 | 0 | 0 | 8 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 0 counted in 0 of 10 runs (3 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (2 listed by the judge)

### speak() addressee (for Technical Design; reported, not gated)

Across 199 judged lines: addressee set and the line addresses one person 89; neither 9; **false positives** (addressee set, but the judge says no question or demand to one person) 101; **misses** (the judge says it addresses one person, but addressee is null) 0.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 10 of 20 (50.0%) | 52.1 | 20 |
| S7-buried | 9 of 20 (45.0%) | 34.9 | 20 |
| S7-control | 0 of 19 (0%) | 32.2 | 19 |

Gate 5: **FAIL** (ref 50.0%, Δurgency +19.9)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2515 | 425 | 0 | $0.0030 | 3.9s | 4.3s |
| preflight | control-thinking-on | 1 | 2513 | 800 | 800 | $0.0009 | 7.1s | 7.1s |
| S1 | raw | 40 | 2461 | 427 | 0 | $0.0225 | 4.3s | 6.2s |
| S1 | constrained | 40 | 2461 | 399 | 0 | $0.0210 | 4.8s | 7.1s |
| S2 | raw | 40 | 2441 | 391 | 0 | $0.0217 | 4.5s | 6.2s |
| S3 | raw | 40 | 2453 | 282 | 0 | $0.0174 | 2.0s | 3.5s |
| S4 | raw | 71 | 2496 | 198 | 0 | $0.0267 | 1.7s | 7.4s |
| S5a | raw | 104 | 2831 | 191 | 0 | $0.0417 | 2.3s | 7.5s |
| S5b | raw | 164 | 2963 | 208 | 0 | $0.0722 | 2.6s | 6.8s |
| S5c | raw | 68 | 2542 | 208 | 0 | $0.0265 | 2.1s | 7.6s |
| S6 | raw | 68 | 2472 | 200 | 0 | $0.0257 | 2.1s | 5.7s |
| S7-explicit | raw | 20 | 2555 | 382 | 0 | $0.0104 | 5.4s | 7.3s |
| S7-buried | raw | 20 | 2655 | 350 | 0 | $0.0101 | 4.2s | 7.2s |
| S7-control | raw | 20 | 2548 | 381 | 0 | $0.0104 | 4.2s | 6.7s |

Total: $0.3100 over 701 calls.

## qwen3.8-27b

- Model: `qwen/qwen3.8-27b`, endpoint deepinfra/bf16 (DeepInfra, bf16)
- Runs: 2026-10-21T09-02-38-554Z-qwen3.8-27b [preflight, s1] (git 36758aa), 2026-10-21T09-28-37-531Z-qwen3.8-27b [s2] (git be503c8), 2026-10-21T11-52-07-326Z-qwen3.8-27b [s3] (git e65626b), 2026-10-21T12-28-00-698Z-qwen3.8-27b [s4, s5a] (git 2902ec2), 2026-10-21T14-21-20-634Z-qwen3.8-27b [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48), 2026-10-21T15-32-29-810Z-qwen3.8-27b [s5a-bluff, s5b-bluff] (git 929e64a), 2026-10-22T12-58-20-211Z-qwen3.8-27b [s5d-claim, p-lupo-accusation-claim] (git 786531b), 2026-10-23T06-29-23-968Z-qwen3.8-27b [s5d-claim-reply, p-lupo-accusation-claim-reply] (git 66cf77a)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.17
- Served by: DeepInfra

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 399 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| P-lupo-accusation-claim-reply · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S1 | raw | 40 | **10.0%** | 95.0% | 100% | 0% (0/40) | 0 | ≥95.0% |
| S2 | raw | 40 | **20.0%** | 97.5% | 97.5% | 2.5% (1/40) | 0 | ≥95.0% |
| S3 | raw | 40 | **22.5%** | **57.5%** | **92.5%** | 2.6% (1/39) | 1 | ≥95.0% |
| S4 | raw | 30 | **23.3%** | **63.3%** | **63.3%** | 36.7% (11/30) | 0 | ≥95.0% |
| S5a | raw | 80 | **13.8%** | **62.5%** | **65.0%** | 35.0% (28/80) | 0 | ≥95.0% |
| S5a-bluff | raw | 80 | **20.0%** | **77.5%** | **77.5%** | 22.5% (18/80) | 0 | ≥95.0% |
| S5b | raw | 80 | **27.5%** | **82.5%** | **93.8%** | 6.3% (5/80) | 0 | ≥95.0% |
| S5b-bluff | raw | 80 | **28.7%** | **87.5%** | **91.3%** | 8.8% (7/80) | 0 | ≥95.0% |
| S5c | raw | 30 | **16.7%** | 100% | 100% | 0% (0/30) | 0 | ≥95.0% |
| S5d-claim · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim-reply · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6 | raw | 30 | **3.3%** | **46.7%** | **76.7%** | 23.3% (7/30) | 0 | ≥95.0% |
| S7-buried | raw | 20 | **0%** | **65.0%** | **90.0%** | 10.0% (2/20) | 0 | ≥95.0% |
| S7-control | raw | 20 | **5.0%** | **55.0%** | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | **25.0%** | 95.0% | 95.0% | 5.0% (1/20) | 0 | ≥95.0% |
| **all** | raw | 870 | **45.1%** | **84.4%** | **90.5%** | 13.8% (81/589) | 1 | ≥95.0% |
| S1 | constrained | 40 | **15.0%** | **87.5%** | **95.0%** | 5.0% (2/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 870 outputs
- Extra purposes dropped: 432 of 870 outputs (1027 purposes)
- Aliases matched: 0 of 870 outputs
- Near-miss names matched: 2 of 870 outputs — 1× "Emile de' Valois" → "Emile de Valois", 1× "Orsini" → "Clarice Orsini", 1× "d'Orléans" → "Jeanne d'Orléans", 1× "Valois" → "Emile de Valois"
- Duplicate contacts dropped: 5 of 870 outputs — Piero de' Medici 5×
- Missing contacts filled: 56 of 870 outputs (59 names) — most often Clarice Orsini 18×, Francesco Pazzi 14×, Fra Tommaso 13×, Contessa Isabella 7×
- `done` ignored outside a Colloquio: 0 of 870 outputs
- Missing `done` set to null outside a Colloquio: 0 of 870 outputs

Failure reasons, strict (one output can have several):

- 33× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 26× S5b raw · meaning · contacts: 1 purpose(s) beyond the top three
- 26× S5a-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 18× S5b-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 18× S5b-bluff raw · meaning · contacts: 2 purpose(s) beyond the top three
- 16× S4 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 15× S5b raw · meaning · contacts: 2 purpose(s) beyond the top three
- 15× S6 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 15× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose

Failure reasons, revised (one output can have several):

- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 15× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 13× S6 raw · meaning · contacts: missing "Fra Tommaso"
- 11× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 9× S5b raw · meaning · contacts: missing "Francesco Pazzi"
- 9× S7-control raw · meaning · contacts: missing "Clarice Orsini"
- 7× S3 raw · meaning · contacts: missing "Contessa Isabella"
- 6× S3 raw · meaning · contacts: missing "Lupo"
- 6× S7-buried raw · meaning · contacts: missing "Clarice Orsini"
- 6× S5b-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose

Failure reasons, repaired (one output can have several):

- 27× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 15× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 11× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S5b-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S5a-bluff raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 2× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 2× S6 raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 2× S7-buried raw · meaning · contacts: 1 of the top three by urgency without a purpose

Outputs with a purpose over six words (not a validity failure): 8

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 15, S2 85; difference 70 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 30.5 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim · TD v0.4 | Lupo | 60 | 85 | 71.1 | 31.7 | 10–95 | 11 | 4 | 0 | 3 | 42 |
| P-lupo-accusation-claim · TD v0.4 | **all** | 60 | 85 | 71.1 | 31.7 | 10–95 | 11 | 4 | 0 | 3 | 42 |
| P-lupo-accusation-claim-reply · TD v0.4 | Lupo | 60 | 85 | 80.5 | 23.7 | 10–95 | 5 | 2 | 0 | 5 | 48 |
| P-lupo-accusation-claim-reply · TD v0.4 | **all** | 60 | 85 | 80.5 | 23.7 | 10–95 | 5 | 2 | 0 | 5 | 48 |
| S1 | Lupo | 14 | 12.5 | 13.6 | 6.7 | 5–35 | 13 | 1 | 0 | 0 | 0 |
| S1 | Contessa Isabella | 13 | 30 | 27.3 | 9.5 | 15–45 | 4 | 8 | 1 | 0 | 0 |
| S1 | Captain Armand LeNoir | 13 | 15 | 18.8 | 9.8 | 10–45 | 10 | 2 | 1 | 0 | 0 |
| S1 | **all** | 40 | 15 | 19.8 | 10.4 | 5–45 | 27 | 11 | 2 | 0 | 0 |
| S2 | Lupo | 14 | 15 | 25.4 | 16.5 | 10–75 | 8 | 5 | 0 | 1 | 0 |
| S2 | Contessa Isabella | 13 | 65 | 58.8 | 20.6 | 15–85 | 1 | 2 | 2 | 7 | 1 |
| S2 | Captain Armand LeNoir | 13 | 85 | 80.0 | 21.1 | 10–95 | 1 | 0 | 0 | 2 | 10 |
| S2 | **all** | 40 | 65 | 54.0 | 29.9 | 10–95 | 10 | 7 | 2 | 10 | 11 |
| S3 | Lupo | 19 | 30 | 37.1 | 25.8 | 5–85 | 7 | 5 | 2 | 3 | 2 |
| S3 | Contessa Isabella | 20 | 70 | 57.8 | 29.4 | 10–90 | 5 | 1 | 0 | 9 | 5 |
| S3 | **all** | 39 | 45 | 47.7 | 29.6 | 5–90 | 12 | 6 | 2 | 12 | 7 |
| S4 | Contessa Isabella | 30 | 75 | 73.0 | 12.2 | 35–85 | 0 | 1 | 2 | 19 | 8 |
| S4 | **all** | 30 | 75 | 73.0 | 12.2 | 35–85 | 0 | 1 | 2 | 19 | 8 |
| S5a | Contessa Isabella | 80 | 95 | 95.6 | 3.5 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5a | **all** | 80 | 95 | 95.6 | 3.5 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5a-bluff | Contessa Isabella | 80 | 95 | 95.3 | 3.4 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5a-bluff | **all** | 80 | 95 | 95.3 | 3.4 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5b | Captain Armand LeNoir | 80 | 95 | 93.9 | 3.8 | 75–100 | 0 | 0 | 0 | 1 | 79 |
| S5b | **all** | 80 | 95 | 93.9 | 3.8 | 75–100 | 0 | 0 | 0 | 1 | 79 |
| S5b-bluff | Captain Armand LeNoir | 80 | 95 | 94.0 | 3.2 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5b-bluff | **all** | 80 | 95 | 94.0 | 3.2 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5c | Lupo | 30 | 35 | 43.5 | 21.2 | 15–90 | 5 | 11 | 6 | 6 | 2 |
| S5c | **all** | 30 | 35 | 43.5 | 21.2 | 15–90 | 5 | 11 | 6 | 6 | 2 |
| S5d-claim · TD v0.4 | Contessa Isabella | 80 | 95 | 93.9 | 4.1 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5d-claim · TD v0.4 | **all** | 80 | 95 | 93.9 | 4.1 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5d-claim-reply · TD v0.4 | Contessa Isabella | 80 | 95 | 93.0 | 11.3 | 0–100 | 1 | 0 | 0 | 0 | 79 |
| S5d-claim-reply · TD v0.4 | **all** | 80 | 95 | 93.0 | 11.3 | 0–100 | 1 | 0 | 0 | 0 | 79 |
| S6 | Contessa Isabella | 30 | 65 | 65.0 | 11.5 | 45–85 | 0 | 0 | 7 | 22 | 1 |
| S6 | **all** | 30 | 65 | 65.0 | 11.5 | 45–85 | 0 | 0 | 7 | 22 | 1 |
| S7-buried | Lupo | 20 | 15 | 16.3 | 12.8 | 10–70 | 18 | 1 | 0 | 1 | 0 |
| S7-buried | **all** | 20 | 15 | 16.3 | 12.8 | 10–70 | 18 | 1 | 0 | 1 | 0 |
| S7-control | Lupo | 20 | 10 | 18.0 | 18.7 | 5–85 | 15 | 4 | 0 | 0 | 1 |
| S7-control | **all** | 20 | 10 | 18.0 | 18.7 | 5–85 | 15 | 4 | 0 | 0 | 1 |
| S7-explicit | Lupo | 20 | 15 | 14.8 | 7.2 | 10–35 | 18 | 2 | 0 | 0 | 0 |
| S7-explicit | **all** | 20 | 15 | 14.8 | 7.2 | 10–35 | 18 | 2 | 0 | 0 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| Lupo (not counted: scenario flaw) | 19 | 84.2% | 3 | 0 |
| **Contessa Isabella** (counted) | 20 | 100% | 0 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim | 10 | 0.17+cal5 | 8 | 2 | 0 | 0 / 19 | 0 | 0 | 0 | t1×1, t2×1, t3×2, t4×3, t6×1 | – | reported |
| P-lupo-accusation-claim-reply | 10 | 0.17+cal5 | 4 | 6 | 0 | 1 / 8 | 0 | 0 | 0 | t1×1, t4×2, t6×1 | – | reported |
| S4 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 6 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.14+cal3, 0.8+cal2 | 5 | 5 | 0 | 0 / 9 | 0 | 1 | 0 | t4×1, t5×2, t7×1, t8×1 | ≥70.0% held | **fail** |
| S5a-bluff | 10 | 0.8+cal2 | 7 | 3 | 0 | 0 / 19 | 0 | 2 | 0 | t3×2, t5×3, t7×2 | ≥70.0% held | **fail** |
| S5b | 10 | 0.14+cal3, 0.8+cal2 | 5 | 5 | 0 | 0 / 16 | 0 | 0 | 0 | t2×1, t3×1, t5×3, t8×1 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | 0.8+cal2 | 6 | 4 | 0 | 0 / 17 | 0 | 0 | 0 | t3×3, t4×1, t5×1, t8×1 | ≥70.0% held | **fail** |
| S5c | 10 | 0.8+cal2 | 1 | 9 | 0 | 1 / 0 | 0 | 1 | 0 | t3×1 | ≤10.0% leaked | pass |
| S5d-claim | 10 | 0.17+cal5 | 9 | 1 | 0 | 0 / 28 | 0 | 0 | 0 | t2×1, t3×3, t4×2, t5×1, t6×2 | ≥70.0% held | **fail** |
| S5d-claim-reply | 10 | 0.17+cal5 | 9 | 1 | 0 | 0 / 28 | 0 | 0 | 0 | t2×1, t3×3, t4×2, t5×2, t7×1 | ≥70.0% held | **fail** |
| S6 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 1 | – | ≥60.0% | **flag: rigid** |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 4 counted in 3 of 10 runs (6 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (1 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim | 10 | – | 0/10 | **2/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 6 / 0 | 0/10 | – | – |
| P-lupo-accusation-claim-reply | 10 | – | 0/10 | **6/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 3 / 0 | 1/10 | – | – |
| S5a | 10 | 3/10 | 4/10 | **5/10** | 7 | 1 (runs 4) | 7/10 (judge 7/7, action 0/3) | 0 / 0 | 3/10 | ≥70.0% held | **fail** |
| S5a-bluff | 10 | – | 3/10 | **3/10** | 0 | 0 | 8/10 (judge 0/0, action 8/10) | 0 / 0 | 0/10 | ≥70.0% held | **fail** |
| S5b | 10 | – | 3/10 | **5/10** | 7 | 2 (runs 4, 7) | 2/10 (judge 1/7, action 1/3) | 1 / 1 (runs 5) | 3/10 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | – | 4/10 | **4/10** | 0 | 0 | 2/10 (judge 0/0, action 2/10) | 0 / 0 | 1/10 | ≥70.0% held | **fail** |
| S5d-claim | 10 | – | 0/10 | **1/10** | 10 | 0 | 3/10 (judge 3/10, action 0/0) | 10 / 1 (runs 8) | 1/10 | ≥70.0% held | **fail** |
| S5d-claim-reply | 10 | – | 0/10 | **1/10** | 10 | 0 | 4/10 (judge 4/10, action 0/0) | 6 / 2 (runs 0, 2) | 1/10 | ≥70.0% held | **fail** |

### speak() addressee (for Technical Design; reported, not gated)

Across 250 judged lines: addressee set and the line addresses one person 117; neither 16; **false positives** (addressee set, but the judge says no question or demand to one person) 113; **misses** (the judge says it addresses one person, but addressee is null) 4.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 17 of 20 (85.0%) | 58.6 | 20 |
| S7-buried | 19 of 20 (95.0%) | 59.6 | 20 |
| S7-control | 0 of 20 (0%) | 43.3 | 20 |

Gate 5: **PASS** (ref 85.0%, Δurgency +15.4)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2515 | 430 | 0 | $0.0054 | 10.4s | 13.4s |
| preflight | control-thinking-on | 1 | 2543 | 800 | 399 | $0.0019 | 19.9s | 19.9s |
| S1 | raw | 40 | 2461 | 412 | 0 | $0.0404 | 10.1s | 17.2s |
| S1 | constrained | 40 | 2461 | 398 | 0 | $0.0391 | 10.6s | 20.8s |
| S2 | raw | 40 | 2441 | 421 | 0 | $0.0385 | 10.5s | 15.6s |
| S3 | raw | 40 | 2453 | 398 | 0 | $0.0390 | 9.6s | 31.3s |
| S4 | raw | 61 | 2547 | 268 | 0 | $0.0468 | 9.1s | 21.4s |
| S5a | raw | 160 | 3118 | 261 | 0 | $0.1367 | 9.6s | 34.7s |
| S5b | raw | 160 | 3002 | 246 | 0 | $0.1241 | 9.5s | 26.6s |
| S5c | raw | 64 | 2543 | 233 | 0 | $0.0433 | 8.1s | 19.7s |
| S6 | raw | 60 | 2529 | 240 | 0 | $0.0413 | 7.9s | 24.1s |
| S7-explicit | raw | 20 | 2555 | 441 | 0 | $0.0205 | 18.5s | 27.1s |
| S7-buried | raw | 20 | 2655 | 452 | 0 | $0.0215 | 16.2s | 25.4s |
| S7-control | raw | 20 | 2548 | 394 | 0 | $0.0198 | 14.6s | 36.9s |
| S5a-bluff | raw | 160 | 3143 | 262 | 0 | $0.1293 | 8.1s | 21.1s |
| S5b-bluff | raw | 162 | 3015 | 247 | 0 | $0.1220 | 7.6s | 18.8s |
| S5d-claim · TD v0.4 | raw | 160 | 3156 | 106 | 0 | $0.0826 | 3.1s | 6.1s |
| P-lupo-accusation-claim · TD v0.4 | raw | 120 | 2932 | 89 | 0 | $0.0520 | 2.6s | 5.2s |
| S5d-claim-reply · TD v0.4 | raw | 161 | 3167 | 104 | 0 | $0.0815 | 3.2s | 7.8s |
| P-lupo-accusation-claim-reply · TD v0.4 | raw | 120 | 2963 | 90 | 0 | $0.0506 | 3.1s | 9.3s |

Total: $1.1361 over 1614 calls.

## qwen3.5-122b-a10b

- Model: `qwen/qwen3.5-122b-a10b`, endpoint atlas-cloud/fp8 (AtlasCloud, fp8)
- Runs: 2026-10-21T09-02-40-119Z-qwen3.5-122b-a10b [preflight, s1] (git 36758aa), 2026-10-21T09-28-38-761Z-qwen3.5-122b-a10b [s2] (git be503c8), 2026-10-21T11-52-10-369Z-qwen3.5-122b-a10b [s3] (git e65626b), 2026-10-21T13-31-48-238Z-qwen3.5-122b-a10b [s4, s5a] (git 2902ec2), 2026-10-21T14-21-24-077Z-qwen3.5-122b-a10b [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8
- Served by: AtlasCloud

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 2688 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| S1 | raw | 40 | **7.5%** | **35.0%** | 95.0% | 5.0% (2/40) | 0 | ≥95.0% |
| S2 | raw | 40 | **5.0%** | **32.5%** | 100% | 0% (0/40) | 0 | ≥95.0% |
| S3 | raw | 40 | **22.5%** | **50.0%** | 97.5% | 2.5% (1/40) | 0 | ≥95.0% |
| S4 | raw | 30 | **0%** | **13.3%** | **86.7%** | 13.3% (4/30) | 0 | ≥95.0% |
| S5a | raw | 79 | **20.3%** | **70.9%** | **74.7%** | 24.4% (19/78) | 1 | ≥95.0% |
| S5b | raw | 80 | **15.0%** | **52.5%** | 100% | 0% (0/80) | 0 | ≥95.0% |
| S5c | raw | 30 | **0%** | **20.0%** | 100% | 0% (0/30) | 0 | ≥95.0% |
| S6 | raw | 30 | **0%** | **0%** | **93.3%** | 3.4% (1/29) | 1 | ≥95.0% |
| S7-buried | raw | 20 | **0%** | **35.0%** | 95.0% | 0% (0/19) | 1 | ≥95.0% |
| S7-control | raw | 20 | **15.0%** | **65.0%** | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | **0%** | **45.0%** | 100% | 0% (0/20) | 0 | ≥95.0% |
| **all** | raw | 429 | **10.5%** | **42.9%** | **93.0%** | 6.3% (27/426) | 3 | ≥95.0% |
| S1 | constrained | 40 | **2.5%** | **35.0%** | 100% | 0% (0/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 14 of 429 outputs
- Extra purposes dropped: 286 of 429 outputs (656 purposes)
- Aliases matched: 16 of 429 outputs — 12× "Prince Emile" → "Emile de Valois", 4× "Prince Emile de Valois" → "Emile de Valois"
- Near-miss names matched: 0 of 429 outputs
- Duplicate contacts dropped: 5 of 429 outputs — Emile de Valois 5×
- Missing contacts filled: 109 of 429 outputs (434 names) — most often Fra Tommaso 54×, Clarice Orsini 52×, Piero de' Medici 45×, Sister Beatrice 44×
- `done` ignored outside a Colloquio: 150 of 429 outputs
- Missing `done` set to null outside a Colloquio: 0 of 429 outputs

Failure reasons, strict (one output can have several):

- 29× S6 raw · meaning · done: false in a Capannello, expected null
- 25× S4 raw · meaning · done: false in a Capannello, expected null
- 25× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 24× S5c raw · meaning · done: false in a Capannello, expected null
- 23× S1 raw · meaning · done: false in a Capannello, expected null
- 20× S2 raw · meaning · done: false in a Capannello, expected null
- 20× S5b raw · meaning · contacts: missing "Piero de' Medici"
- 20× S5b raw · meaning · contacts: missing "Clarice Orsini"
- 20× S5b raw · meaning · contacts: missing "Lupo"
- 20× S5b raw · meaning · contacts: missing "Fra Tommaso"

Failure reasons, revised (one output can have several):

- 29× S6 raw · meaning · done: false in a Capannello, expected null
- 25× S4 raw · meaning · done: false in a Capannello, expected null
- 24× S5c raw · meaning · done: false in a Capannello, expected null
- 23× S1 raw · meaning · done: false in a Capannello, expected null
- 20× S2 raw · meaning · done: false in a Capannello, expected null
- 20× S5b raw · meaning · contacts: missing "Piero de' Medici"
- 20× S5b raw · meaning · contacts: missing "Clarice Orsini"
- 20× S5b raw · meaning · contacts: missing "Lupo"
- 20× S5b raw · meaning · contacts: missing "Fra Tommaso"
- 20× S5b raw · meaning · contacts: missing "Sister Beatrice"

Failure reasons, repaired (one output can have several):

- 19× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 2× S1 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5a raw · syntax · not JSON
- 1× S6 raw · syntax · not JSON
- 1× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S7-buried raw · syntax · not JSON

Outputs with a purpose over six words (not a validity failure): 38

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 35, S2 75; difference 40 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 25.7 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Lupo | 14 | 35 | 31.4 | 9.7 | 15–45 | 3 | 9 | 2 | 0 | 0 |
| S1 | Contessa Isabella | 13 | 35 | 38.1 | 10.7 | 15–65 | 1 | 8 | 3 | 1 | 0 |
| S1 | Captain Armand LeNoir | 13 | 35 | 37.3 | 4.2 | 35–45 | 0 | 10 | 3 | 0 | 0 |
| S1 | **all** | 40 | 35 | 35.5 | 9.2 | 15–65 | 4 | 27 | 8 | 1 | 0 |
| S2 | Contessa Isabella | 13 | 65 | 62.7 | 14.2 | 35–75 | 0 | 2 | 1 | 10 | 0 |
| S2 | Lupo | 14 | 35 | 35.7 | 8.8 | 15–45 | 1 | 8 | 5 | 0 | 0 |
| S2 | Captain Armand LeNoir | 13 | 75 | 78.1 | 4.6 | 75–85 | 0 | 0 | 0 | 9 | 4 |
| S2 | **all** | 40 | 65 | 58.3 | 20.3 | 15–85 | 1 | 10 | 6 | 19 | 4 |
| S3 | Contessa Isabella | 20 | 65 | 56.5 | 18.5 | 15–85 | 1 | 3 | 4 | 11 | 1 |
| S3 | Lupo | 20 | 65 | 57.5 | 17.0 | 15–75 | 1 | 4 | 1 | 14 | 0 |
| S3 | **all** | 40 | 65 | 57.0 | 17.8 | 15–85 | 2 | 7 | 5 | 25 | 1 |
| S4 | Contessa Isabella | 30 | 65 | 61.3 | 14.0 | 35–85 | 0 | 2 | 11 | 15 | 2 |
| S4 | **all** | 30 | 65 | 61.3 | 14.0 | 35–85 | 0 | 2 | 11 | 15 | 2 |
| S5a | Contessa Isabella | 78 | 95 | 90.9 | 6.5 | 75–100 | 0 | 0 | 0 | 7 | 71 |
| S5a | **all** | 78 | 95 | 90.9 | 6.5 | 75–100 | 0 | 0 | 0 | 7 | 71 |
| S5b | Captain Armand LeNoir | 80 | 85 | 87.8 | 7.0 | 65–95 | 0 | 0 | 0 | 10 | 70 |
| S5b | **all** | 80 | 85 | 87.8 | 7.0 | 65–95 | 0 | 0 | 0 | 10 | 70 |
| S5c | Lupo | 30 | 35 | 33.0 | 10.5 | 15–65 | 3 | 21 | 5 | 1 | 0 |
| S5c | **all** | 30 | 35 | 33.0 | 10.5 | 15–65 | 3 | 21 | 5 | 1 | 0 |
| S6 | Contessa Isabella | 29 | 65 | 67.8 | 6.4 | 45–75 | 0 | 0 | 1 | 28 | 0 |
| S6 | **all** | 29 | 65 | 67.8 | 6.4 | 45–75 | 0 | 0 | 1 | 28 | 0 |
| S7-buried | Lupo | 19 | 35 | 35.0 | 7.9 | 15–45 | 1 | 13 | 5 | 0 | 0 |
| S7-buried | **all** | 19 | 35 | 35.0 | 7.9 | 15–45 | 1 | 13 | 5 | 0 | 0 |
| S7-control | Lupo | 20 | 25 | 26.5 | 10.1 | 15–45 | 7 | 11 | 2 | 0 | 0 |
| S7-control | **all** | 20 | 25 | 26.5 | 10.1 | 15–45 | 7 | 11 | 2 | 0 | 0 |
| S7-explicit | Lupo | 20 | 35 | 35.5 | 5.9 | 15–45 | 1 | 16 | 3 | 0 | 0 |
| S7-explicit | **all** | 20 | 35 | 35.5 | 5.9 | 15–45 | 1 | 16 | 3 | 0 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| **Contessa Isabella** (counted) | 20 | 100% | 0 | 0 |
| Lupo (not counted: scenario flaw) | 20 | 50.0% | 10 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 5 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.8+cal2 | 8 | 2 | 1 | 0 / 25 | 0 | 5 | 1 | t2×1, t3×6, t5×1 | ≥70.0% held | **fail** |
| S5b | 10 | 0.8+cal2 | 9 | 1 | 0 | 0 / 31 | 0 | 0 | 0 | t3×4, t4×1, t5×1, t6×2, t8×1 | ≥70.0% held | **fail** |
| S5c | 10 | 0.8+cal2 | 5 | 5 | 0 | 6 / 0 | 0 | 1 | 0 | t2×1, t3×4 | ≤10.0% leaked | **fail** |
| S6 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 2 | 7 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 10 counted in 5 of 10 runs (12 listed by the judge)
- S5b: 3 counted in 2 of 10 runs (7 listed by the judge)

### speak() addressee (for Technical Design; reported, not gated)

Across 248 judged lines: addressee set and the line addresses one person 100; neither 2; **false positives** (addressee set, but the judge says no question or demand to one person) 146; **misses** (the judge says it addresses one person, but addressee is null) 0.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 20 of 20 (100%) | 60.1 | 20 |
| S7-buried | 15 of 19 (78.9%) | 58.2 | 19 |
| S7-control | 0 of 20 (0%) | 51.9 | 20 |

Gate 5: **FAIL** (ref 100%, Δurgency +8.3)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2515 | 397 | 0 | $0.0085 | 5.3s | 6.5s |
| preflight | control-thinking-on | 1 | 2513 | 3064 | 2688 | $0.0081 | 40.0s | 40.0s |
| S1 | raw | 40 | 2461 | 393 | 0 | $0.0672 | 6.1s | 7.9s |
| S1 | constrained | 40 | 2463 | 389 | 0 | $0.0669 | 6.0s | 7.6s |
| S2 | raw | 40 | 2441 | 381 | 0 | $0.0658 | 6.1s | 7.6s |
| S3 | raw | 40 | 2453 | 361 | 0 | $0.0641 | 4.8s | 6.2s |
| S4 | raw | 62 | 2558 | 238 | 0 | $0.0830 | 3.3s | 6.3s |
| S5a | raw | 162 | 3093 | 228 | 0 | $0.2388 | 3.5s | 6.9s |
| S5b | raw | 161 | 2985 | 211 | 0 | $0.2258 | 3.8s | 7.1s |
| S5c | raw | 60 | 2553 | 236 | 0 | $0.0799 | 3.8s | 7.6s |
| S6 | raw | 62 | 2525 | 225 | 0 | $0.0804 | 4.9s | 6.7s |
| S7-explicit | raw | 20 | 2555 | 405 | 0 | $0.0348 | 6.3s | 8.5s |
| S7-buried | raw | 20 | 2655 | 405 | 0 | $0.0354 | 5.9s | 8.5s |
| S7-control | raw | 20 | 2548 | 405 | 0 | $0.0347 | 7.0s | 8.3s |

Total: $1.0936 over 733 calls.

## qwen3-235b-a22b-2507

- Model: `qwen/qwen3-235b-a22b-2507`, endpoint deepinfra/fp8 (DeepInfra, fp8)
- Runs: 2026-10-21T09-02-42-505Z-qwen3-235b-a22b-2507 [preflight, s1] (git 36758aa), 2026-10-21T09-28-40-502Z-qwen3-235b-a22b-2507 [s2] (git be503c8), 2026-10-21T11-52-18-931Z-qwen3-235b-a22b-2507 [s3] (git e65626b), 2026-10-21T13-31-53-346Z-qwen3-235b-a22b-2507 [s4, s5a] (git 2902ec2), 2026-10-21T14-21-32-135Z-qwen3-235b-a22b-2507 [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48), 2026-10-21T15-32-33-450Z-qwen3-235b-a22b-2507 [s5a-bluff, s5b-bluff] (git 929e64a)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8
- Served by: DeepInfra

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: skipped (no thinking mode)
- Request fields: `{}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| S1 | raw | 40 | **2.5%** | **92.5%** | 95.0% | 0% (0/38) | 2 | ≥95.0% |
| S2 | raw | 40 | **2.5%** | **87.5%** | 100% | 0% (0/40) | 0 | ≥95.0% |
| S3 | raw | 40 | **12.5%** | **47.5%** | 97.5% | 2.5% (1/40) | 0 | ≥95.0% |
| S4 | raw | 30 | **10.0%** | **63.3%** | **93.3%** | 6.7% (2/30) | 0 | ≥95.0% |
| S5a | raw | 80 | **23.8%** | **81.3%** | **88.8%** | 9.0% (7/78) | 2 | ≥95.0% |
| S5a-bluff | raw | 80 | **22.5%** | **73.8%** | **82.5%** | 13.2% (10/76) | 4 | ≥95.0% |
| S5b | raw | 80 | **16.3%** | **68.8%** | 98.8% | 1.3% (1/80) | 0 | ≥95.0% |
| S5b-bluff | raw | 80 | **25.0%** | **63.7%** | 98.8% | 0% (0/79) | 1 | ≥95.0% |
| S5c | raw | 30 | **0%** | 96.7% | 100% | 0% (0/30) | 0 | ≥95.0% |
| S6 | raw | 30 | **23.3%** | **83.3%** | 96.7% | 0% (0/29) | 1 | ≥95.0% |
| S7-buried | raw | 20 | **0%** | **80.0%** | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-control | raw | 20 | **0%** | **90.0%** | 100% | 0% (0/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | **15.0%** | **90.0%** | 95.0% | 0% (0/19) | 1 | ≥95.0% |
| **all** | raw | 590 | **15.3%** | **75.6%** | **94.6%** | 3.6% (21/579) | 11 | ≥95.0% |
| S1 | constrained | 40 | **10.0%** | **90.0%** | 100% | 0% (0/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 590 outputs
- Extra purposes dropped: 427 of 590 outputs (830 purposes)
- Aliases matched: 9 of 590 outputs — 5× "Prince Emile de Valois" → "Emile de Valois", 3× "Captain LeNoir" → "Captain Armand LeNoir", 1× "Prince Emile" → "Emile de Valois"
- Near-miss names matched: 1 of 590 outputs — 1× "Emile de' Valois" → "Emile de Valois"
- Duplicate contacts dropped: 35 of 590 outputs — Emile de Valois 16×, Captain Armand LeNoir 6×, Giorgia Pazzi 5×, Francesco Pazzi 4×, Fra Tommaso 4×, Lupo 2×, Raffaello de' Medici 2×
- Missing contacts filled: 78 of 590 outputs (147 names) — most often Francesco Pazzi 37×, Clarice Orsini 28×, Lupo 16×, Sister Beatrice 9×
- `done` ignored outside a Colloquio: 1 of 590 outputs
- Missing `done` set to null outside a Colloquio: 0 of 590 outputs

Failure reasons, strict (one output can have several):

- 40× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 38× S5a-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 28× S5b raw · meaning · contacts: 1 purpose(s) beyond the top three
- 27× S5b-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 18× S2 raw · meaning · contacts: 3 purpose(s) beyond the top three
- 16× S1 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 16× S4 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 15× S2 raw · meaning · contacts: 2 purpose(s) beyond the top three
- 15× S3 raw · meaning · contacts: missing "Lupo"
- 15× S5c raw · meaning · contacts: 3 purpose(s) beyond the top three

Failure reasons, revised (one output can have several):

- 15× S3 raw · meaning · contacts: missing "Lupo"
- 14× S5b-bluff raw · meaning · contacts: missing "Francesco Pazzi"
- 11× S5b raw · meaning · contacts: missing "Francesco Pazzi"
- 10× S5b raw · meaning · contacts: "Emile de Valois" listed 2 times
- 7× S4 raw · meaning · contacts: missing "Clarice Orsini"
- 7× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S5a raw · meaning · contacts: missing "Clarice Orsini"
- 5× S3 raw · meaning · contacts: missing "Contessa Isabella"
- 5× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 5× S5a-bluff raw · meaning · contacts: missing "Clarice Orsini"

Failure reasons, repaired (one output can have several):

- 10× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 2× S1 raw · syntax · not JSON
- 2× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 2× S5a-bluff raw · syntax · not JSON
- 2× S5a-bluff raw · syntax · importance: Invalid input: expected number, received undefined
- 1× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5a raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 1× S5a raw · syntax · contacts.4.urgency: Invalid input: expected number, received undefined
- 1× S5a raw · syntax · contacts.4.purpose: Invalid input: expected string, received undefined

Outputs with a purpose over six words (not a validity failure): 33

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 45, S2 85; difference 40 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 22.5 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Lupo | 13 | 30 | 31.5 | 4.1 | 30–45 | 0 | 12 | 1 | 0 | 0 |
| S1 | Contessa Isabella | 12 | 55 | 51.7 | 9.4 | 35–65 | 0 | 2 | 8 | 2 | 0 |
| S1 | Captain Armand LeNoir | 13 | 45 | 41.5 | 7.7 | 30–55 | 0 | 6 | 7 | 0 | 0 |
| S1 | **all** | 38 | 35 | 41.3 | 11.0 | 30–65 | 0 | 20 | 16 | 2 | 0 |
| S2 | Lupo | 14 | 45 | 45.0 | 13.4 | 30–75 | 0 | 6 | 7 | 1 | 0 |
| S2 | Contessa Isabella | 13 | 75 | 74.2 | 2.7 | 65–75 | 0 | 0 | 0 | 13 | 0 |
| S2 | Captain Armand LeNoir | 13 | 85 | 80.4 | 5.0 | 75–85 | 0 | 0 | 0 | 6 | 7 |
| S2 | **all** | 40 | 75 | 66.0 | 17.8 | 30–85 | 0 | 6 | 7 | 20 | 7 |
| S3 | Lupo | 20 | 45 | 44.5 | 11.3 | 30–65 | 0 | 8 | 11 | 1 | 0 |
| S3 | Contessa Isabella | 20 | 75 | 70.0 | 9.6 | 45–75 | 0 | 0 | 4 | 16 | 0 |
| S3 | **all** | 40 | 55 | 57.3 | 16.5 | 30–75 | 0 | 8 | 15 | 17 | 0 |
| S4 | Contessa Isabella | 30 | 75 | 70.7 | 7.2 | 55–75 | 0 | 0 | 4 | 26 | 0 |
| S4 | **all** | 30 | 75 | 70.7 | 7.2 | 55–75 | 0 | 0 | 4 | 26 | 0 |
| S5a | Contessa Isabella | 78 | 95 | 90.5 | 9.2 | 75–100 | 0 | 0 | 0 | 20 | 58 |
| S5a | **all** | 78 | 95 | 90.5 | 9.2 | 75–100 | 0 | 0 | 0 | 20 | 58 |
| S5a-bluff | Contessa Isabella | 76 | 95 | 90.8 | 9.1 | 75–100 | 0 | 0 | 0 | 18 | 58 |
| S5a-bluff | **all** | 76 | 95 | 90.8 | 9.1 | 75–100 | 0 | 0 | 0 | 18 | 58 |
| S5b | Captain Armand LeNoir | 80 | 95 | 89.4 | 8.2 | 75–95 | 0 | 0 | 0 | 17 | 63 |
| S5b | **all** | 80 | 95 | 89.4 | 8.2 | 75–95 | 0 | 0 | 0 | 17 | 63 |
| S5b-bluff | Captain Armand LeNoir | 79 | 95 | 89.2 | 8.1 | 75–98 | 0 | 0 | 0 | 16 | 63 |
| S5b-bluff | **all** | 79 | 95 | 89.2 | 8.1 | 75–98 | 0 | 0 | 0 | 16 | 63 |
| S5c | Lupo | 30 | 35 | 34.3 | 6.4 | 30–55 | 0 | 27 | 3 | 0 | 0 |
| S5c | **all** | 30 | 35 | 34.3 | 6.4 | 30–55 | 0 | 27 | 3 | 0 | 0 |
| S6 | Contessa Isabella | 29 | 75 | 69.1 | 7.1 | 55–75 | 0 | 0 | 4 | 25 | 0 |
| S6 | **all** | 29 | 75 | 69.1 | 7.1 | 55–75 | 0 | 0 | 4 | 25 | 0 |
| S7-buried | Lupo | 20 | 55 | 53.3 | 7.9 | 30–65 | 0 | 2 | 16 | 2 | 0 |
| S7-buried | **all** | 20 | 55 | 53.3 | 7.9 | 30–65 | 0 | 2 | 16 | 2 | 0 |
| S7-control | Lupo | 20 | 30 | 29.5 | 5.9 | 15–45 | 2 | 17 | 1 | 0 | 0 |
| S7-control | **all** | 20 | 30 | 29.5 | 5.9 | 15–45 | 2 | 17 | 1 | 0 | 0 |
| S7-explicit | Lupo | 19 | 65 | 61.8 | 11.1 | 30–75 | 0 | 2 | 2 | 15 | 0 |
| S7-explicit | **all** | 19 | 65 | 61.8 | 11.1 | 30–75 | 0 | 2 | 2 | 15 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| Lupo (not counted: scenario flaw) | 20 | 85.0% | 3 | 0 |
| **Contessa Isabella** (counted) | 20 | 100% | 0 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 12 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.14+cal3, 0.8+cal2 | 2 | 8 | 0 | 0 / 3 | 0 | 1 | 0 | t5×2, t7×1 | ≥70.0% held | pass |
| S5a-bluff | 10 | 0.8+cal2 | 8 | 2 | 0 | 0 / 16 | 0 | 1 | 0 | t6×1, t7×6, t8×1 | ≥70.0% held | **fail** |
| S5b | 10 | 0.14+cal3 | 10 | 0 | 0 | 2 / 36 | 0 | 0 | 0 | t3×7, t6×1, t8×2 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | 0.8+cal2 | 10 | 0 | 0 | 0 / 28 | 0 | 0 | 0 | t3×7, t4×2, t6×1 | ≥70.0% held | **fail** |
| S5c | 10 | 0.8+cal2 | 1 | 9 | 0 | 1 / 0 | 0 | 0 | 0 | t3×1 | ≤10.0% leaked | pass |
| S6 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 10 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 1 counted in 1 of 10 runs (4 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (3 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S5a | 10 | 3/10 | 3/10 | **8/10** | 7 | 5 (runs 2, 3, 5, 6, 8) | 8/10 (judge 7/7, action 1/3) | 1 / 1 (runs 6) | 2/10 | ≥70.0% held | pass |
| S5a-bluff | 10 | – | 2/10 | **2/10** | 0 | 0 | 7/10 (judge 0/0, action 7/10) | 0 / 0 | 2/10 | ≥70.0% held | **fail** |
| S5b | 10 | – | 0/10 | **0/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 0 / 0 | 0/10 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | – | 0/10 | **0/10** | 0 | 0 | 0/10 (judge 0/0, action 0/10) | 0 / 0 | 1/10 | ≥70.0% held | **fail** |

### speak() addressee (for Technical Design; reported, not gated)

Across 250 judged lines: addressee set and the line addresses one person 86; neither 0; **false positives** (addressee set, but the judge says no question or demand to one person) 164; **misses** (the judge says it addresses one person, but addressee is null) 0.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 19 of 19 (100%) | 75.9 | 19 |
| S7-buried | 20 of 20 (100%) | 71.8 | 20 |
| S7-control | 0 of 20 (0%) | 58.9 | 20 |

Gate 5: **PASS** (ref 100%, Δurgency +17.0)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2470 | 385 | 0 | $0.0022 | 18.6s | 18.8s |
| S1 | raw | 40 | 2416 | 380 | 0 | $0.0171 | 17.0s | 23.4s |
| S1 | constrained | 40 | 2416 | 381 | 0 | $0.0171 | 17.9s | 31.2s |
| S2 | raw | 40 | 2399 | 374 | 0 | $0.0169 | 16.4s | 22.0s |
| S3 | raw | 40 | 2406 | 353 | 0 | $0.0164 | 17.9s | 37.2s |
| S4 | raw | 61 | 2458 | 216 | 0 | $0.0207 | 11.2s | 32.9s |
| S5a | raw | 162 | 2870 | 227 | 0 | $0.0620 | 6.3s | 24.7s |
| S5b | raw | 161 | 2832 | 220 | 0 | $0.0606 | 13.1s | 37.6s |
| S5c | raw | 60 | 2455 | 211 | 0 | $0.0202 | 16.1s | 43.3s |
| S6 | raw | 60 | 2437 | 221 | 0 | $0.0204 | 21.2s | 49.4s |
| S7-explicit | raw | 20 | 2516 | 373 | 0 | $0.0086 | 38.7s | 47.2s |
| S7-buried | raw | 20 | 2612 | 359 | 0 | $0.0086 | 25.8s | 33.8s |
| S7-control | raw | 20 | 2499 | 376 | 0 | $0.0086 | 15.4s | 19.7s |
| S5a-bluff | raw | 161 | 2879 | 228 | 0 | $0.0619 | 8.5s | 29.4s |
| S5b-bluff | raw | 162 | 2832 | 218 | 0 | $0.0607 | 10.9s | 23.1s |

Total: $0.4020 over 1052 calls.

## deepseek-v4.1-flash

- Model: `deepseek/deepseek-v4.1-flash-1017`, endpoint deepinfra/fp8 (DeepInfra, fp8)
- Runs: 2026-10-21T09-28-33-249Z-deepseek-v4.1-flash [preflight, s1, s2] (git be503c8), 2026-10-21T11-52-15-782Z-deepseek-v4.1-flash [s3] (git e65626b), 2026-10-21T13-31-50-736Z-deepseek-v4.1-flash [s4, s5a] (git 2902ec2), 2026-10-21T14-21-29-300Z-deepseek-v4.1-flash [s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git fdd7b48), 2026-10-21T15-32-27-040Z-deepseek-v4.1-flash [s5a-bluff, s5b-bluff] (git 929e64a), 2026-10-22T03-58-55-503Z-deepseek-v4.1-flash [preflight, s1] (git 0db0b26), 2026-10-22T03-59-00-096Z-deepseek-v4.1-flash [s5a, s5b] (git 0db0b26), 2026-10-22T11-28-56-896Z-deepseek-v4.1-flash [s5b, s5d] (git 444141c), 2026-10-23T06-24-57-606Z-deepseek-v4.1-flash [s5b-claim, s5d-claim] (git 66cf77a), 2026-10-23T06-28-37-775Z-deepseek-v4.1-flash [s6, s6-claim] (git 66cf77a), 2026-10-23T07-18-49-492Z-deepseek-v4.1-flash [s5b-claim-reply, s5d-claim-reply] (git c3e54de), 2026-10-23T07-52-22-977Z-deepseek-v4.1-flash [p-lupo-accusation-claim-reply] (git 967a1ff), 2026-10-23T07-54-46-978Z-deepseek-v4.1-flash [s6-claim-reply, s4-claim-reply] (git 967a1ff), 2026-10-23T07-55-58-701Z-deepseek-v4.1-flash [s1-claim] (git 967a1ff), 2026-10-23T08-14-13-573Z-deepseek-v4.1-flash [p-lupo-accusation-claim-reply-audience] (git 7460228), 2026-10-23T08-16-46-827Z-deepseek-v4.1-flash [s6-claim-reply-audience] (git 7460228)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.7; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8; TD v0.3, Characters v0.2, Mechanics v0.18, Models & Research v0.10; TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.10; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.16; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.17
- Served by: DeepInfra
- API errors (excluded from rates): 2
  - 2× 429 429 Provider returned error

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 416 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim-reply · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| P-lupo-accusation-claim-reply-audience · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S1 | raw | 40 | **7.5%** | **65.0%** | **65.0%** | 35.0% (14/40) | 0 | ≥95.0% |
| S1 · TD v0.3 | raw | 40 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S1-claim · TD v0.4 | raw | 20 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S2 | raw | 40 | **15.0%** | **85.0%** | **85.0%** | 15.0% (6/40) | 0 | ≥95.0% |
| S3 | raw | 40 | **12.5%** | **85.0%** | **92.5%** | 7.5% (3/40) | 0 | ≥95.0% |
| S4 | raw | 30 | **13.3%** | **73.3%** | **73.3%** | 26.7% (8/30) | 0 | ≥95.0% |
| S4-claim-reply · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5a | raw | 240 | **27.1%** | **74.2%** | **74.2%** | 25.8% (62/240) | 0 | ≥95.0% |
| S5a-bluff | raw | 79 | **26.6%** | **70.9%** | **70.9%** | 29.1% (23/79) | 0 | ≥95.0% |
| S5b · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5b-bluff | raw | 80 | **72.5%** | **92.5%** | 100% | 0% (0/80) | 0 | ≥95.0% |
| S5b-claim · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5b-claim-reply · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5c | raw | 30 | **23.3%** | **90.0%** | **90.0%** | 10.0% (3/30) | 0 | ≥95.0% |
| S5d · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim-reply · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6 · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6-claim · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6-claim-reply · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6-claim-reply-audience · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S7-buried | raw | 20 | **0%** | **90.0%** | **90.0%** | 10.0% (2/20) | 0 | ≥95.0% |
| S7-control | raw | 20 | **20.0%** | **60.0%** | **60.0%** | 40.0% (8/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | **5.0%** | 100% | 100% | 0% (0/20) | 0 | ≥95.0% |
| **all** | raw | 1374 | **66.2%** | **90.0%** | **90.6%** | 20.2% (129/639) | 0 | ≥95.0% |
| S1 | constrained | 40 | **10.0%** | **80.0%** | **80.0%** | 20.0% (8/40) | 0 | ≥99.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 1374 outputs
- Extra purposes dropped: 367 of 1374 outputs (683 purposes)
- Aliases matched: 3 of 1374 outputs — 3× "Prince Emile de Valois" → "Emile de Valois"
- Near-miss names matched: 0 of 1374 outputs
- Duplicate contacts dropped: 0 of 1374 outputs
- Missing contacts filled: 6 of 1374 outputs (6 names) — most often Lupo 3×, Francesco Pazzi 3×
- `done` ignored outside a Colloquio: 0 of 1374 outputs
- Missing `done` set to null outside a Colloquio: 0 of 1374 outputs

Failure reasons, strict (one output can have several):

- 74× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 62× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 32× S5a raw · meaning · contacts: 3 purpose(s) beyond the top three
- 23× S5a-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 23× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 18× S3 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 16× S5b-bluff raw · meaning · contacts: 1 purpose(s) beyond the top three
- 15× S5a-bluff raw · meaning · contacts: 3 purpose(s) beyond the top three
- 13× S2 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 13× S2 raw · meaning · contacts: 2 purpose(s) beyond the top three

Failure reasons, revised (one output can have several):

- 62× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 23× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 12× S1 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 8× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S7-control raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S1 constrained · meaning · contacts: 2 of the top three by urgency without a purpose
- 4× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S3 raw · meaning · contacts: missing "Lupo"
- 3× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose

Failure reasons, repaired (one output can have several):

- 62× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 23× S5a-bluff raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 12× S1 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 8× S4 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S2 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 6× S7-control raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 4× S1 constrained · meaning · contacts: 2 of the top three by urgency without a purpose
- 4× S1 constrained · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S3 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 3× S5c raw · meaning · contacts: 1 of the top three by urgency without a purpose

Outputs with a purpose over six words (not a validity failure): 152

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*

- LeNoir's median importance: S1 25, S2 72; difference 47 (needs ≥30): **pass**
- SD of all raw importance scores across scenarios: 21.0 (needs >10): **pass**
- Gate 2: **PASS**

| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim-reply · TD v0.4 | Lupo | 60 | 86.5 | 82.0 | 7.4 | 55–92 | 0 | 0 | 1 | 24 | 35 |
| P-lupo-accusation-claim-reply · TD v0.4 | **all** | 60 | 86.5 | 82.0 | 7.4 | 55–92 | 0 | 0 | 1 | 24 | 35 |
| P-lupo-accusation-claim-reply-audience · TD v0.4 | Lupo | 60 | 85 | 81.3 | 8.8 | 45–92 | 0 | 0 | 2 | 23 | 35 |
| P-lupo-accusation-claim-reply-audience · TD v0.4 | **all** | 60 | 85 | 81.3 | 8.8 | 45–92 | 0 | 0 | 2 | 23 | 35 |
| S1 | Lupo | 14 | 22 | 22.2 | 4.2 | 18–35 | 4 | 10 | 0 | 0 | 0 |
| S1 | Contessa Isabella | 13 | 32 | 33.1 | 5.2 | 22–38 | 0 | 13 | 0 | 0 | 0 |
| S1 | Captain Armand LeNoir | 13 | 25 | 24.5 | 3.7 | 15–28 | 1 | 12 | 0 | 0 | 0 |
| S1 | **all** | 40 | 25 | 26.5 | 6.4 | 15–38 | 5 | 35 | 0 | 0 | 0 |
| S1 · TD v0.3 | Lupo | 14 | 22 | 26.2 | 8.0 | 18–45 | 3 | 10 | 1 | 0 | 0 |
| S1 · TD v0.3 | Contessa Isabella | 13 | 35 | 35.0 | 3.4 | 28–38 | 0 | 13 | 0 | 0 | 0 |
| S1 · TD v0.3 | Captain Armand LeNoir | 13 | 32 | 31.2 | 5.6 | 22–38 | 0 | 13 | 0 | 0 | 0 |
| S1 · TD v0.3 | **all** | 40 | 32 | 30.7 | 7.0 | 18–45 | 3 | 36 | 1 | 0 | 0 |
| S1-claim · TD v0.4 | Contessa Isabella | 7 | 35 | 34.3 | 6.5 | 22–45 | 0 | 6 | 1 | 0 | 0 |
| S1-claim · TD v0.4 | Lupo | 7 | 22 | 20.4 | 3.9 | 12–25 | 2 | 5 | 0 | 0 | 0 |
| S1-claim · TD v0.4 | Captain Armand LeNoir | 6 | 36.5 | 33.2 | 6.1 | 22–38 | 0 | 6 | 0 | 0 | 0 |
| S1-claim · TD v0.4 | **all** | 20 | 29 | 29.1 | 8.5 | 12–45 | 2 | 17 | 1 | 0 | 0 |
| S2 | Lupo | 14 | 35 | 35.5 | 3.9 | 25–42 | 0 | 13 | 1 | 0 | 0 |
| S2 | Contessa Isabella | 13 | 55 | 50.6 | 10.1 | 28–62 | 0 | 3 | 8 | 2 | 0 |
| S2 | Captain Armand LeNoir | 13 | 72 | 73.4 | 4.7 | 62–82 | 0 | 0 | 0 | 12 | 1 |
| S2 | **all** | 40 | 55 | 52.7 | 17.0 | 25–82 | 0 | 16 | 9 | 14 | 1 |
| S3 | Lupo | 20 | 35 | 35.6 | 12.5 | 18–55 | 3 | 10 | 7 | 0 | 0 |
| S3 | Contessa Isabella | 20 | 36.5 | 38.5 | 13.7 | 15–72 | 2 | 10 | 6 | 2 | 0 |
| S3 | **all** | 40 | 35 | 37.1 | 13.2 | 15–72 | 5 | 20 | 13 | 2 | 0 |
| S4 | Contessa Isabella | 30 | 62 | 62.2 | 8.9 | 38–78 | 0 | 1 | 11 | 18 | 0 |
| S4 | **all** | 30 | 62 | 62.2 | 8.9 | 38–78 | 0 | 1 | 11 | 18 | 0 |
| S4-claim-reply · TD v0.4 | Contessa Isabella | 15 | 58 | 62.1 | 11.6 | 42–78 | 0 | 0 | 8 | 7 | 0 |
| S4-claim-reply · TD v0.4 | **all** | 15 | 58 | 62.1 | 11.6 | 42–78 | 0 | 0 | 8 | 7 | 0 |
| S5a | Contessa Isabella | 240 | 88 | 85.5 | 7.5 | 62–95 | 0 | 0 | 0 | 69 | 171 |
| S5a | **all** | 240 | 88 | 85.5 | 7.5 | 62–95 | 0 | 0 | 0 | 69 | 171 |
| S5a-bluff | Contessa Isabella | 79 | 88 | 85.3 | 7.2 | 72–95 | 0 | 0 | 0 | 26 | 53 |
| S5a-bluff | **all** | 79 | 88 | 85.3 | 7.2 | 72–95 | 0 | 0 | 0 | 26 | 53 |
| S5b · TD v0.4 | Captain Armand LeNoir | 80 | 78 | 77.9 | 6.4 | 65–92 | 0 | 0 | 0 | 55 | 25 |
| S5b · TD v0.4 | **all** | 80 | 78 | 77.9 | 6.4 | 65–92 | 0 | 0 | 0 | 55 | 25 |
| S5b-bluff | Captain Armand LeNoir | 80 | 78 | 80.1 | 7.4 | 62–92 | 0 | 0 | 0 | 46 | 34 |
| S5b-bluff | **all** | 80 | 78 | 80.1 | 7.4 | 62–92 | 0 | 0 | 0 | 46 | 34 |
| S5b-claim · TD v0.4 | Captain Armand LeNoir | 80 | 72 | 74.7 | 6.7 | 62–88 | 0 | 0 | 0 | 66 | 14 |
| S5b-claim · TD v0.4 | **all** | 80 | 72 | 74.7 | 6.7 | 62–88 | 0 | 0 | 0 | 66 | 14 |
| S5b-claim-reply · TD v0.4 | Captain Armand LeNoir | 80 | 78 | 76.3 | 6.8 | 62–88 | 0 | 0 | 0 | 58 | 22 |
| S5b-claim-reply · TD v0.4 | **all** | 80 | 78 | 76.3 | 6.8 | 62–88 | 0 | 0 | 0 | 58 | 22 |
| S5c | Lupo | 30 | 45 | 44.2 | 7.5 | 35–55 | 0 | 11 | 19 | 0 | 0 |
| S5c | **all** | 30 | 45 | 44.2 | 7.5 | 35–55 | 0 | 11 | 19 | 0 | 0 |
| S5d · TD v0.4 | Contessa Isabella | 80 | 88 | 84.5 | 7.2 | 62–95 | 0 | 0 | 0 | 26 | 54 |
| S5d · TD v0.4 | **all** | 80 | 88 | 84.5 | 7.2 | 62–95 | 0 | 0 | 0 | 26 | 54 |
| S5d-claim · TD v0.4 | Contessa Isabella | 80 | 86.5 | 82.0 | 7.4 | 62–92 | 0 | 0 | 0 | 34 | 46 |
| S5d-claim · TD v0.4 | **all** | 80 | 86.5 | 82.0 | 7.4 | 62–92 | 0 | 0 | 0 | 34 | 46 |
| S5d-claim-reply · TD v0.4 | Contessa Isabella | 80 | 78 | 81.3 | 6.6 | 72–92 | 0 | 0 | 0 | 41 | 39 |
| S5d-claim-reply · TD v0.4 | **all** | 80 | 78 | 81.3 | 6.6 | 72–92 | 0 | 0 | 0 | 41 | 39 |
| S6 · TD v0.4 | Contessa Isabella | 15 | 62 | 60.1 | 4.5 | 45–62 | 0 | 0 | 3 | 12 | 0 |
| S6 · TD v0.4 | **all** | 15 | 62 | 60.1 | 4.5 | 45–62 | 0 | 0 | 3 | 12 | 0 |
| S6-claim · TD v0.4 | Contessa Isabella | 15 | 62 | 61.7 | 3.0 | 58–68 | 0 | 0 | 4 | 11 | 0 |
| S6-claim · TD v0.4 | **all** | 15 | 62 | 61.7 | 3.0 | 58–68 | 0 | 0 | 4 | 11 | 0 |
| S6-claim-reply · TD v0.4 | Contessa Isabella | 15 | 62 | 60.4 | 2.0 | 58–62 | 0 | 0 | 6 | 9 | 0 |
| S6-claim-reply · TD v0.4 | **all** | 15 | 62 | 60.4 | 2.0 | 58–62 | 0 | 0 | 6 | 9 | 0 |
| S6-claim-reply-audience · TD v0.4 | Contessa Isabella | 15 | 62 | 59.9 | 2.3 | 55–62 | 0 | 0 | 7 | 8 | 0 |
| S6-claim-reply-audience · TD v0.4 | **all** | 15 | 62 | 59.9 | 2.3 | 55–62 | 0 | 0 | 7 | 8 | 0 |
| S7-buried | Lupo | 20 | 25 | 28.3 | 7.4 | 18–45 | 2 | 17 | 1 | 0 | 0 |
| S7-buried | **all** | 20 | 25 | 28.3 | 7.4 | 18–45 | 2 | 17 | 1 | 0 | 0 |
| S7-control | Lupo | 20 | 22 | 22.6 | 4.6 | 15–30 | 8 | 12 | 0 | 0 | 0 |
| S7-control | **all** | 20 | 22 | 22.6 | 4.6 | 15–30 | 8 | 12 | 0 | 0 | 0 |
| S7-explicit | Lupo | 20 | 25 | 27.2 | 7.2 | 18–45 | 2 | 17 | 1 | 0 | 0 |
| S7-explicit | **all** | 20 | 25 | 27.2 | 7.2 | 18–45 | 2 | 17 | 1 | 0 | 0 |

### Gate 7 preview: `done` after a deal (S3)

| Character | n | done true | done false | done null or missing |
|---|---|---|---|---|
| Lupo (not counted: scenario flaw) | 20 | 35.0% | 13 | 0 |
| **Contessa Isabella** (counted) | 20 | 90.0% | 2 | 0 |

*Outputs that failed to parse at all are left out.*

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim-reply | 10 | 0.17+cal5 | 9 | 1 | 0 | 2 / 9 | 0 | 0 | 0 | t2×1, t4×7, t6×1 | – | reported |
| P-lupo-accusation-claim-reply-audience | 10 | 0.17+cal5 | 5 | 5 | 0 | 0 / 6 | 0 | 0 | 0 | t4×4, t6×1 | – | reported |
| S4 | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 6 | 0 | – | ≤10.0% leaked | pass |
| S4-claim-reply | 5 | 0.17+cal5 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S5a | 30 | 0.14+cal3, 0.10+cal2, 0.15+cal4 | 2 | 28 | 0 | 0 / 5 | 0 | 5 | 0 | t3×2, t8×1 | ≥70.0% held | pass |
| S5a-bluff | 10 | 0.8+cal2 | 4 | 6 | 0 | 1 / 8 | 0 | 0 | 0 | t4×1, t7×3, t8×1 | ≥70.0% held | **fail** |
| S5b | 10 | 0.17+cal5 | 7 | 3 | 0 | 0 / 9 | 0 | 0 | 0 | t3×2, t7×1, t8×3 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | 0.8+cal2 | 1 | 9 | 0 | 0 / 7 | 2 | 8 | 0 | t3×1, t8×1 | ≥70.0% held | pass |
| S5b-claim | 10 | 0.17+cal5 | 7 | 3 | 0 | 0 / 6 | 1 | 0 | 0 | t6×1, t8×4 | ≥70.0% held | **fail** |
| S5b-claim-reply | 10 | 0.17+cal5 | 3 | 7 | 0 | 0 / 5 | 0 | 0 | 0 | t6×1, t7×1, t8×2 | ≥70.0% held | pass |
| S5c | 10 | 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S5d | 10 | 0.17+cal5 | 8 | 2 | 0 | 0 / 25 | 0 | 2 | 0 | t3×6, t4×1, t7×1 | ≥70.0% held | **fail** |
| S5d-claim | 10 | 0.17+cal5 | 6 | 4 | 0 | 0 / 9 | 0 | 1 | 0 | t3×3, t5×1, t7×2 | ≥70.0% held | **fail** |
| S5d-claim-reply | 10 | 0.17+cal5 | 1 | 9 | 0 | 0 / 4 | 0 | 0 | 0 | t3×1 | ≥70.0% held | pass |
| S6 | 5 | 0.17+cal5 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 5 | – | ≥60.0% | pass |
| S6-claim | 5 | 0.17+cal5 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 5 | – | ≥60.0% | pass |
| S6-claim-reply | 5 | 0.17+cal5 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 5 | – | ≥60.0% | pass |
| S6-claim-reply-audience | 5 | 0.17+cal5 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 5 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 1 counted in 1 of 30 runs (2 listed by the judge)
- S5b: 2 counted in 1 of 10 runs (5 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation-claim-reply | 10 | – | 0/10 | **1/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 1 / 0 | 0/10 | – | – |
| P-lupo-accusation-claim-reply-audience | 10 | – | 0/10 | **5/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 1 / 0 | 0/10 | – | – |
| S5a | 30 | 7/10 | 17/30 | **28/30** | 21 | 11 (runs 4, 8, 9, 10, 12, 13, 14, 17, 18, 20, 22) | 25/30 (judge 21/21, action 4/9) | 1 / 0 | 1/30 | ≥70.0% held | pass |
| S5a-bluff | 10 | – | 6/10 | **6/10** | 0 | 0 | 4/10 (judge 0/0, action 4/10) | 0 / 0 | 1/10 | ≥70.0% held | **fail** |
| S5b | 10 | – | 0/10 | **3/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 1 / 0 | 1/10 | ≥70.0% held | **fail** |
| S5b-bluff | 10 | – | 9/10 | **9/10** | 0 | 0 | 0/10 (judge 0/0, action 0/10) | 0 / 0 | 1/10 | ≥70.0% held | pass |
| S5b-claim | 10 | – | 0/10 | **3/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 9 / 1 (runs 6) | 0/10 | ≥70.0% held | **fail** |
| S5b-claim-reply | 10 | – | 0/10 | **7/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 4 / 0 | 1/10 | ≥70.0% held | pass |
| S5d | 10 | – | 0/10 | **2/10** | 10 | 0 | 2/10 (judge 2/10, action 0/0) | 9 / 2 (runs 4, 9) | 0/10 | ≥70.0% held | **fail** |
| S5d-claim | 10 | – | 0/10 | **4/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 5 / 0 | 0/10 | ≥70.0% held | **fail** |
| S5d-claim-reply | 10 | – | 0/10 | **9/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 2 / 0 | 1/10 | ≥70.0% held | pass |
| S6 | 5 | – | 0/5 | **5/5** | 5 | 0 | 0/5 (judge 0/5, action 0/0) | 3 / 0 | 0/5 | ≥60.0% | pass |
| S6-claim | 5 | – | 0/5 | **5/5** | 5 | 0 | 0/5 (judge 0/5, action 0/0) | 3 / 0 | 0/5 | ≥60.0% | pass |

### speak() addressee (for Technical Design; reported, not gated)

Across 300 judged lines: addressee set and the line addresses one person 262; neither 17; **false positives** (addressee set, but the judge says no question or demand to one person) 13; **misses** (the judge says it addresses one person, but addressee is null) 8.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 20 of 20 (100%) | 60.8 | 20 |
| S7-buried | 20 of 20 (100%) | 61.3 | 20 |
| S7-control | 0 of 20 (0%) | 42.9 | 20 |

Gate 5: **PASS** (ref 100%, Δurgency +17.9)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2427 | 382 | 0 | $0.0011 | 6.1s | 7.7s |
| preflight | control-thinking-on | 1 | 2453 | 716 | 416 | $0.0005 | 15.7s | 15.7s |
| S1 | raw | 40 | 2375 | 390 | 0 | $0.0056 | 6.0s | 9.5s |
| S1 | constrained | 40 | 2375 | 392 | 0 | $0.0052 | 6.0s | 7.1s |
| S2 | raw | 40 | 2352 | 388 | 0 | $0.0055 | 5.0s | 6.8s |
| S3 | raw | 40 | 2359 | 383 | 0 | $0.0055 | 7.2s | 13.4s |
| S4 | raw | 60 | 2450 | 242 | 0 | $0.0108 | 6.1s | 36.2s |
| S5a | raw | 480 | 3045 | 260 | 0 | $0.1020 | 4.1s | 32.3s |
| S5c | raw | 60 | 2475 | 229 | 0 | $0.0110 | 7.1s | 14.1s |
| S7-explicit | raw | 20 | 2470 | 395 | 0 | $0.0029 | 8.4s | 35.2s |
| S7-buried | raw | 20 | 2565 | 406 | 0 | $0.0037 | 9.0s | 16.8s |
| S7-control | raw | 20 | 2455 | 405 | 0 | $0.0029 | 8.9s | 10.8s |
| S5a-bluff | raw | 159 | 3046 | 258 | 0 | $0.0455 | 6.6s | 15.4s |
| S5b-bluff | raw | 160 | 2990 | 240 | 0 | $0.0461 | 6.3s | 16.9s |
| preflight · TD v0.3 | thinking-off | 5 | 2269 | 103 | 0 | $0.0004 | 12.3s | 50.2s |
| preflight · TD v0.3 | control-thinking-on | 1 | 2294 | 143 | 63 | $0.0004 | 14.4s | 14.4s |
| S1 · TD v0.3 | raw | 40 | 2217 | 103 | 0 | $0.0028 | 1.7s | 27.1s |
| S5b · TD v0.4 | raw | 160 | 2992 | 102 | 0 | $0.0288 | 2.9s | 5.2s |
| S5d · TD v0.4 | raw | 160 | 3038 | 110 | 0 | $0.0264 | 2.6s | 4.1s |
| S5b-claim · TD v0.4 | raw | 160 | 3010 | 103 | 0 | $0.0217 | 1.2s | 1.9s |
| S5d-claim · TD v0.4 | raw | 160 | 3091 | 115 | 0 | $0.0231 | 1.3s | 2.2s |
| S6 · TD v0.4 | raw | 30 | 2477 | 103 | 0 | $0.0026 | 1.3s | 2.1s |
| S6-claim · TD v0.4 | raw | 30 | 2517 | 110 | 0 | $0.0026 | 1.3s | 1.8s |
| S5b-claim-reply · TD v0.4 | raw | 160 | 3034 | 104 | 0 | $0.0219 | 1.5s | 2.8s |
| S5d-claim-reply · TD v0.4 | raw | 160 | 3102 | 115 | 0 | $0.0230 | 1.6s | 2.7s |
| P-lupo-accusation-claim-reply · TD v0.4 | raw | 120 | 2964 | 107 | 0 | $0.0124 | 2.2s | 3.5s |
| S6-claim-reply · TD v0.4 | raw | 30 | 2522 | 107 | 0 | $0.0027 | 1.5s | 14.2s |
| S4-claim-reply · TD v0.4 | raw | 30 | 2526 | 103 | 0 | $0.0027 | 1.2s | 2.1s |
| S1-claim · TD v0.4 | raw | 20 | 2334 | 108 | 0 | $0.0010 | 1.7s | 14.7s |
| P-lupo-accusation-claim-reply-audience · TD v0.4 | raw | 120 | 2960 | 103 | 0 | $0.0123 | 2.4s | 3.9s |
| S6-claim-reply-audience · TD v0.4 | raw | 30 | 2549 | 109 | 0 | $0.0027 | 1.0s | 1.2s |

Total: $0.4358 over 2561 calls.

## gpt-5.4

- Model: `openai/gpt-5.4`, endpoint openai (OpenAI, unknown)
- Runs: 2026-10-21T15-32-36-471Z-gpt-5.4 [preflight, s5a, s5b] (git 929e64a), 2026-10-21T15-33-23-723Z-gpt-5.4 [s5a, s5b] (git 929e64a), 2026-10-22T12-19-26-580Z-gpt-5.4 [s5d, p-lupo-accusation] (git 444141c), 2026-10-23T07-56-39-019Z-gpt-5.4 [s5d-claim-reply] (git 967a1ff)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.8; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.16; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.17
- Served by: OpenAI

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 80 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5a | raw | 80 | **32.5%** | 95.0% | 95.0% | 5.0% (4/80) | 0 | ≥95.0% |
| S5b | raw | 80 | **2.5%** | 97.5% | 98.8% | 1.3% (1/80) | 0 | ≥95.0% |
| S5d · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim-reply · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| **all** | raw | 380 | **65.3%** | 98.4% | 98.7% | 3.1% (5/160) | 0 | ≥95.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 380 outputs
- Extra purposes dropped: 129 of 380 outputs (186 purposes)
- Aliases matched: 1 of 380 outputs — 1× "Prince Emile" → "Emile de Valois"
- Near-miss names matched: 0 of 380 outputs
- Duplicate contacts dropped: 1 of 380 outputs — Emile de Valois 1×
- Missing contacts filled: 0 of 380 outputs (0 names)
- `done` ignored outside a Colloquio: 0 of 380 outputs
- Missing `done` set to null outside a Colloquio: 0 of 380 outputs

Failure reasons, strict (one output can have several):

- 42× S5b raw · meaning · contacts: 2 purpose(s) beyond the top three
- 37× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 36× S5b raw · meaning · contacts: 1 purpose(s) beyond the top three
- 13× S5a raw · meaning · contacts: 2 purpose(s) beyond the top three
- 4× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5a raw · meaning · contacts: 3 purpose(s) beyond the top three
- 1× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5b raw · meaning · contacts: unknown name "Prince Emile"

Failure reasons, revised (one output can have several):

- 4× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5b raw · meaning · contacts: unknown name "Prince Emile"

Failure reasons, repaired (one output can have several):

- 4× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*


| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | Lupo | 60 | 95 | 93.3 | 3.7 | 83–98 | 0 | 0 | 0 | 0 | 60 |
| P-lupo-accusation · TD v0.4 | **all** | 60 | 95 | 93.3 | 3.7 | 83–98 | 0 | 0 | 0 | 0 | 60 |
| S5a | Contessa Isabella | 80 | 94 | 92.1 | 4.4 | 82–99 | 0 | 0 | 0 | 0 | 80 |
| S5a | **all** | 80 | 94 | 92.1 | 4.4 | 82–99 | 0 | 0 | 0 | 0 | 80 |
| S5b | Captain Armand LeNoir | 80 | 91 | 90.3 | 3.5 | 81–96 | 0 | 0 | 0 | 0 | 80 |
| S5b | **all** | 80 | 91 | 90.3 | 3.5 | 81–96 | 0 | 0 | 0 | 0 | 80 |
| S5d · TD v0.4 | Contessa Isabella | 80 | 92 | 91.2 | 5.0 | 81–99 | 0 | 0 | 0 | 0 | 80 |
| S5d · TD v0.4 | **all** | 80 | 92 | 91.2 | 5.0 | 81–99 | 0 | 0 | 0 | 0 | 80 |
| S5d-claim-reply · TD v0.4 | Contessa Isabella | 80 | 90 | 88.5 | 6.2 | 76–97 | 0 | 0 | 0 | 10 | 70 |
| S5d-claim-reply · TD v0.4 | **all** | 80 | 90 | 88.5 | 6.2 | 76–97 | 0 | 0 | 0 | 10 | 70 |

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | 0.17+cal5 | 4 | 6 | 0 | 0 / 4 | 0 | 1 | 0 | t4×1, t6×2 | – | reported |
| S5a | 10 | 0.14+cal3, 0.8+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 1 | 0 | – | ≥70.0% held | pass |
| S5b | 10 | 0.14+cal3, 0.8+cal2 | 4 | 6 | 0 | 0 / 9 | 0 | 0 | 0 | t3×1, t8×3 | ≥70.0% held | **fail** |
| S5d | 10 | 0.17+cal5 | 4 | 6 | 0 | 0 / 6 | 0 | 1 | 0 | t5×1, t6×1, t8×1 | ≥70.0% held | **fail** |
| S5d-claim-reply | 10 | 0.17+cal5 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≥70.0% held | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 0 counted in 0 of 10 runs (0 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (0 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | – | 0/10 | **6/10** | 10 | 0 | 2/10 (judge 2/10, action 0/0) | 2 / 0 | 1/10 | – | – |
| S5a | 10 | – | 8/10 | **10/10** | 4 | 2 (runs 0, 5) | 4/10 (judge 4/4, action 0/6) | 0 / 0 | 0/10 | ≥70.0% held | pass |
| S5b | 10 | – | 6/10 | **6/10** | 5 | 0 | 0/10 (judge 0/5, action 0/5) | 0 / 0 | 0/10 | ≥70.0% held | **fail** |
| S5d | 10 | – | 0/10 | **6/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 3 / 0 | 1/10 | ≥70.0% held | **fail** |

### speak() addressee (for Technical Design; reported, not gated)

Across 160 judged lines: addressee set and the line addresses one person 147; neither 0; **false positives** (addressee set, but the judge says no question or demand to one person) 13; **misses** (the judge says it addresses one person, but addressee is null) 0.

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2415 | 297 | 0 | $0.0404 | 5.0s | 6.1s |
| preflight | control-thinking-on | 1 | 2415 | 384 | 80 | $0.0118 | 6.2s | 6.2s |
| S5a | raw | 160 | 2916 | 201 | 0 | $1.3986 | 4.4s | 7.5s |
| S5b | raw | 160 | 2829 | 193 | 0 | $1.3741 | 4.5s | 7.2s |
| S5d · TD v0.4 | raw | 160 | 2967 | 99 | 0 | $1.1347 | 3.4s | 4.8s |
| P-lupo-accusation · TD v0.4 | raw | 120 | 2804 | 87 | 0 | $0.5348 | 2.7s | 4.0s |
| S5d-claim-reply · TD v0.4 | raw | 160 | 3031 | 103 | 0 | $1.1737 | 3.1s | 4.5s |

Total: $5.6680 over 766 calls.

## deepseek-v4-flash

- Model: `deepseek/deepseek-v4-flash`, endpoint parasail/fp8 (Parasail, fp8)
- Runs: 2026-10-22T05-35-29-107Z-deepseek-v4-flash [preflight] (git 5a126cd), 2026-10-22T05-36-21-583Z-deepseek-v4-flash [s4, s5a, s5b, s5c, s6, s7-explicit, s7-buried, s7-control] (git 5a126cd)
- Doc versions: TD v0.2, Characters v0.2, Mechanics v0.18, Models & Research v0.10
- Served by: Parasail

### Thinking-off pre-flight

- Thinking off: 5 calls, 0 with reasoning (0 reasoning tokens in total). **PASS**
- Control, thinking on: 321 reasoning tokens (the check can see reasoning)
- Request fields: `{"reasoning":{"effort":"none"}}`

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| S4 | raw | 30 | **3.3%** | **93.3%** | 100% | 0% (0/30) | 2 | ≥95.0% |
| S5a | raw | 80 | **10.0%** | **65.0%** | **65.0%** | 35.0% (28/80) | 0 | ≥95.0% |
| S5b | raw | 80 | **22.5%** | **61.3%** | **61.3%** | 38.8% (31/80) | 0 | ≥95.0% |
| S5c | raw | 30 | **40.0%** | **90.0%** | **93.3%** | 3.4% (1/29) | 1 | ≥95.0% |
| S6 | raw | 30 | **13.3%** | **83.3%** | **93.3%** | 3.3% (1/30) | 1 | ≥95.0% |
| S7-buried | raw | 20 | **25.0%** | **90.0%** | 95.0% | 5.0% (1/20) | 1 | ≥95.0% |
| S7-control | raw | 20 | **10.0%** | 95.0% | 95.0% | 5.0% (1/20) | 0 | ≥95.0% |
| S7-explicit | raw | 20 | **25.0%** | 95.0% | 100% | 0% (0/20) | 1 | ≥95.0% |
| **all** | raw | 310 | **17.7%** | **76.5%** | **79.0%** | 20.4% (63/309) | 6 | ≥95.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 310 outputs
- Extra purposes dropped: 189 of 310 outputs (340 purposes)
- Aliases matched: 0 of 310 outputs
- Near-miss names matched: 0 of 310 outputs
- Duplicate contacts dropped: 0 of 310 outputs
- Missing contacts filled: 2 of 310 outputs (2 names) — most often Fra Tommaso 2×
- `done` ignored outside a Colloquio: 1 of 310 outputs
- Missing `done` set to null outside a Colloquio: 5 of 310 outputs

Failure reasons, strict (one output can have several):

- 26× S5a raw · meaning · contacts: 1 purpose(s) beyond the top three
- 20× S4 raw · meaning · contacts: 3 purpose(s) beyond the top three
- 19× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 17× S5b raw · meaning · contacts: 1 purpose(s) beyond the top three
- 14× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 14× S6 raw · meaning · contacts: 1 purpose(s) beyond the top three
- 13× S5a raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 13× S5b raw · meaning · contacts: 2 purpose(s) beyond the top three
- 12× S5b raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 11× S7-explicit raw · meaning · contacts: 1 purpose(s) beyond the top three

Failure reasons, revised (one output can have several):

- 19× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 14× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 13× S5a raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 12× S5b raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 2× S4 raw · syntax · done: missing
- 2× S6 raw · meaning · contacts: missing "Fra Tommaso"
- 1× S5a raw · meaning · contacts: 3 of the top three by urgency without a purpose
- 1× S5c raw · meaning · done: false in a Capannello, expected null
- 1× S5c raw · syntax · not JSON
- 1× S5c raw · meaning · contacts: 1 of the top three by urgency without a purpose

Failure reasons, repaired (one output can have several):

- 19× S5b raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 14× S5a raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 13× S5a raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 12× S5b raw · meaning · contacts: 2 of the top three by urgency without a purpose
- 1× S5a raw · meaning · contacts: 3 of the top three by urgency without a purpose
- 1× S5c raw · syntax · not JSON
- 1× S5c raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S6 raw · meaning · contacts: unknown name "Il Notaio"
- 1× S6 raw · meaning · contacts: 1 of the top three by urgency without a purpose
- 1× S7-buried raw · meaning · contacts: 1 of the top three by urgency without a purpose

Outputs with a purpose over six words (not a validity failure): 3

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*


| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | Contessa Isabella | 30 | 52.5 | 53.8 | 11.6 | 35–72 | 0 | 4 | 12 | 14 | 0 |
| S4 | **all** | 30 | 52.5 | 53.8 | 11.6 | 35–72 | 0 | 4 | 12 | 14 | 0 |
| S5a | Contessa Isabella | 80 | 85 | 86.0 | 9.9 | 65–100 | 0 | 0 | 0 | 16 | 64 |
| S5a | **all** | 80 | 85 | 86.0 | 9.9 | 65–100 | 0 | 0 | 0 | 16 | 64 |
| S5b | Captain Armand LeNoir | 80 | 85 | 82.6 | 5.8 | 72–95 | 0 | 0 | 0 | 26 | 54 |
| S5b | **all** | 80 | 85 | 82.6 | 5.8 | 72–95 | 0 | 0 | 0 | 26 | 54 |
| S5c | Lupo | 29 | 25 | 26.2 | 10.3 | 15–60 | 9 | 17 | 3 | 0 | 0 |
| S5c | **all** | 29 | 25 | 26.2 | 10.3 | 15–60 | 9 | 17 | 3 | 0 | 0 |
| S6 | Contessa Isabella | 30 | 55 | 58.3 | 7.0 | 45–65 | 0 | 0 | 16 | 14 | 0 |
| S6 | **all** | 30 | 55 | 58.3 | 7.0 | 45–65 | 0 | 0 | 16 | 14 | 0 |
| S7-buried | Lupo | 20 | 25 | 28.8 | 14.9 | 15–65 | 8 | 7 | 4 | 1 | 0 |
| S7-buried | **all** | 20 | 25 | 28.8 | 14.9 | 15–65 | 8 | 7 | 4 | 1 | 0 |
| S7-control | Lupo | 20 | 15 | 18.8 | 6.7 | 10–35 | 14 | 6 | 0 | 0 | 0 |
| S7-control | **all** | 20 | 15 | 18.8 | 6.7 | 10–35 | 14 | 6 | 0 | 0 | 0 |
| S7-explicit | Lupo | 20 | 25 | 28.3 | 13.9 | 15–60 | 8 | 8 | 4 | 0 | 0 |
| S7-explicit | **all** | 20 | 25 | 28.3 | 13.9 | 15–60 | 8 | 8 | 4 | 0 | 0 |

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | 10 | 0.10+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 2 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.14+cal3, 0.10+cal2 | 0 | 10 | 0 | 0 / 1 | 0 | 3 | 0 | t6×1 | ≥70.0% held | pass |
| S5b | 10 | 0.14+cal3, 0.10+cal2 | 4 | 6 | 0 | 1 / 5 | 0 | 1 | 0 | t3×1, t8×2 | ≥70.0% held | **fail** |
| S5c | 10 | 0.10+cal2 | 1 | 9 | 0 | 1 / 0 | 0 | 1 | 0 | t3×1 | ≤10.0% leaked | pass |
| S6 | 10 | 0.10+cal2 | 0 | 10 | 0 | 0 / 0 | 0 | 0 | 10 | – | ≥60.0% | pass |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 2 counted in 2 of 10 runs (3 listed by the judge)
- S5b: 1 counted in 1 of 10 runs (2 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S5a | 10 | – | 5/10 | **10/10** | 7 | 5 (runs 0, 3, 4, 8, 9) | 7/10 (judge 7/7, action 0/3) | 2 / 0 | 1/10 | ≥70.0% held | pass |
| S5b | 10 | – | 6/10 | **6/10** | 4 | 0 | 0/10 (judge 0/4, action 0/6) | 0 / 0 | 1/10 | ≥70.0% held | **fail** |

### speak() addressee (for Technical Design; reported, not gated)

Across 250 judged lines: addressee set and the line addresses one person 93; neither 51; **false positives** (addressee set, but the judge says no question or demand to one person) 95; **misses** (the judge says it addresses one person, but addressee is null) 11.

### Gate 5: inference from observations (S7)

*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥70.0% of explicit samples (judged), and Lupo's mean contact urgency toward the pair is at least 15 points above the control. The buried version is reported, not gated. References in the control (no Notaio lines) are false positives.*

| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |
|---|---|---|---|
| S7-explicit | 20 of 20 (100%) | 72.5 | 20 |
| S7-buried | 20 of 20 (100%) | 71.1 | 20 |
| S7-control | 0 of 20 (0%) | 47.9 | 20 |

Gate 5: **PASS** (ref 100%, Δurgency +24.6)

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight | thinking-off | 5 | 2427 | 358 | 0 | $0.0017 | 5.7s | 8.5s |
| preflight | control-thinking-on | 1 | 2427 | 684 | 321 | $0.0004 | 10.4s | 10.4s |
| S4 | raw | 60 | 2418 | 225 | 0 | $0.0231 | 4.9s | 17.6s |
| S5a | raw | 160 | 2878 | 228 | 0 | $0.0600 | 3.5s | 9.1s |
| S5b | raw | 160 | 2783 | 210 | 0 | $0.0595 | 3.3s | 8.0s |
| S5c | raw | 60 | 2413 | 200 | 0 | $0.0223 | 3.3s | 8.7s |
| S6 | raw | 60 | 2413 | 222 | 0 | $0.0173 | 3.1s | 7.0s |
| S7-explicit | raw | 20 | 2470 | 374 | 0 | $0.0061 | 5.8s | 9.7s |
| S7-buried | raw | 20 | 2565 | 380 | 0 | $0.0063 | 6.4s | 9.7s |
| S7-control | raw | 20 | 2455 | 366 | 0 | $0.0060 | 5.6s | 7.0s |

Total: $0.2027 over 566 calls.


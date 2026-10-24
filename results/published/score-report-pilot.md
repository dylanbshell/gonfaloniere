# Probe report

Generated 2026-10-24T09:02:30.483Z from 10 run(s).

## Summary

**Gate 1 status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now (Dylan, Oct 21).

Gate 1 valid rates as **strict / revised / repaired** (Models & Research v0.7, Scoring). Raw covers P-lupo-accusation · TD v0.4, P-lupo-accusation-claim · TD v0.4, S1 · TD v0.4, S2 · TD v0.4, S4 · TD v0.4, S5a · TD v0.4, S5b · TD v0.4, S5d · TD v0.4, S5d-claim · TD v0.4, S6 · TD v0.4, preflight · TD v0.3; constrained ran in S1 only. Thresholds: raw ≥95.0% at each level, constrained ≥99.0%. Bold = below threshold.

"Top-3 without purpose" is the share of parsed raw outputs where a top-three contact by urgency has no purpose, which no repair can fix.

Gates 3–5 come from judge verdicts (each run's newest calibrated rubric); gate 3 so far covers the judged scenarios only. "Clues" are self-incriminating clues: reported, not leaks.

| Model | Endpoint | Thinking off | Raw valid | Top-3 without purpose | Constrained valid | Gate 2 | Gate 3 (so far) | Gate 4 contradictions | Gate 5 | Cost per call | Median latency |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-tinker-step0 | tinker (unknown) | not run | – | – | – | needs S1 and S2 | S4 0% leaked; S5a **50.0% held**; S5b **20.0% held**; S5d **0% held**; S6 **0% disclosed the debt without a leak**; clues 4 | 2 in 1/20 runs | – | $0.00267 | 1.9s |
| qwen3.8-27b | deepinfra/bf16 (bf16) | not run | – | – | – | needs S1 and S2 | S5b **10.0% held**; S5d **0% held**; clues 0 | 0 in 0/10 runs | – | $0.00048 | 2.8s |
| qwen3.8-27b-tinker-dpo1 | tinker (unknown) | not run | – | – | – | needs S1 and S2 | S4 0% leaked; S5a 80.0% held; S5b **60.0% held**; S5d **20.0% held**; S6 **0% disclosed the debt without a leak**; clues 14 | 2 in 2/20 runs | – | $0.00261 | 1.6s |

## qwen3.8-27b-tinker-step0

- Model: `Qwen/Qwen3.8-27B`, endpoint tinker (Tinker, unknown)
- Runs: 2026-10-22T08-50-36-376Z-qwen3.8-27b-tinker-step0 [preflight] (git 4ebee4a), 2026-10-22T13-11-54-749Z-qwen3.8-27b-tinker-step0 [s5b, s5d, p-lupo-accusation] (git e22469b), 2026-10-23T05-08-15-938Z-qwen3.8-27b-tinker-step0 [s5d-claim, p-lupo-accusation-claim, s5a] (git 0388082), 2026-10-23T05-18-54-360Z-qwen3.8-27b-tinker-step0 [s4, s6] (git 0388082), 2026-10-23T05-20-49-647Z-qwen3.8-27b-tinker-step0 [s1, s2] (git 0388082)
- Doc versions: TD v0.3, Characters v0.2, Mechanics v0.18, Models & Research v0.15; TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.17
- Served by: Tinker

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| P-lupo-accusation-claim · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S1 · TD v0.4 | raw | 6 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S2 · TD v0.4 | raw | 6 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S4 · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5a · TD v0.4 | raw | 80 | 98.8% | 98.8% | 98.8% | – | 1 | ≥95.0% |
| S5b · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6 · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| **all** | raw | 482 | 99.8% | 99.8% | 99.8% | – | 1 | ≥95.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 482 outputs
- Extra purposes dropped: 0 of 482 outputs (0 purposes)
- Aliases matched: 0 of 482 outputs
- Near-miss names matched: 0 of 482 outputs
- Duplicate contacts dropped: 0 of 482 outputs
- Missing contacts filled: 0 of 482 outputs (0 names)
- `done` ignored outside a Colloquio: 0 of 482 outputs
- Missing `done` set to null outside a Colloquio: 0 of 482 outputs

Failure reasons, strict (one output can have several):

- 1× S5a · TD v0.4 raw · syntax · not JSON

Failure reasons, revised (one output can have several):

- 1× S5a · TD v0.4 raw · syntax · not JSON

Failure reasons, repaired (one output can have several):

- 1× S5a · TD v0.4 raw · syntax · not JSON

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*


| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | Lupo | 60 | 85 | 76.3 | 29.2 | 5–100 | 8 | 4 | 0 | 0 | 48 |
| P-lupo-accusation · TD v0.4 | **all** | 60 | 85 | 76.3 | 29.2 | 5–100 | 8 | 4 | 0 | 0 | 48 |
| P-lupo-accusation-claim · TD v0.4 | Lupo | 60 | 85 | 72.9 | 30.7 | 5–95 | 11 | 2 | 0 | 3 | 44 |
| P-lupo-accusation-claim · TD v0.4 | **all** | 60 | 85 | 72.9 | 30.7 | 5–95 | 11 | 2 | 0 | 3 | 44 |
| S1 · TD v0.4 | Lupo | 2 | 10 | 10.0 | 0.0 | 10–10 | 2 | 0 | 0 | 0 | 0 |
| S1 · TD v0.4 | Contessa Isabella | 2 | 35 | 35.0 | 0.0 | 35–35 | 0 | 2 | 0 | 0 | 0 |
| S1 · TD v0.4 | Captain Armand LeNoir | 2 | 15 | 15.0 | 5.0 | 10–20 | 2 | 0 | 0 | 0 | 0 |
| S1 · TD v0.4 | **all** | 6 | 15 | 20.0 | 11.2 | 10–35 | 4 | 2 | 0 | 0 | 0 |
| S2 · TD v0.4 | Lupo | 2 | 42.5 | 42.5 | 32.5 | 10–75 | 1 | 0 | 0 | 1 | 0 |
| S2 · TD v0.4 | Contessa Isabella | 2 | 30 | 30.0 | 15.0 | 15–45 | 1 | 0 | 1 | 0 | 0 |
| S2 · TD v0.4 | Captain Armand LeNoir | 2 | 85 | 85.0 | 0.0 | 85–85 | 0 | 0 | 0 | 0 | 2 |
| S2 · TD v0.4 | **all** | 6 | 60 | 52.5 | 31.3 | 10–85 | 2 | 0 | 1 | 1 | 2 |
| S4 · TD v0.4 | Contessa Isabella | 15 | 75 | 73.0 | 12.2 | 45–85 | 0 | 0 | 2 | 9 | 4 |
| S4 · TD v0.4 | **all** | 15 | 75 | 73.0 | 12.2 | 45–85 | 0 | 0 | 2 | 9 | 4 |
| S5a · TD v0.4 | Contessa Isabella | 79 | 95 | 94.5 | 3.7 | 85–100 | 0 | 0 | 0 | 0 | 79 |
| S5a · TD v0.4 | **all** | 79 | 95 | 94.5 | 3.7 | 85–100 | 0 | 0 | 0 | 0 | 79 |
| S5b · TD v0.4 | Captain Armand LeNoir | 80 | 95 | 91.8 | 4.8 | 75–100 | 0 | 0 | 0 | 1 | 79 |
| S5b · TD v0.4 | **all** | 80 | 95 | 91.8 | 4.8 | 75–100 | 0 | 0 | 0 | 1 | 79 |
| S5d · TD v0.4 | Contessa Isabella | 80 | 95 | 93.0 | 10.1 | 10–100 | 1 | 0 | 0 | 0 | 79 |
| S5d · TD v0.4 | **all** | 80 | 95 | 93.0 | 10.1 | 10–100 | 1 | 0 | 0 | 0 | 79 |
| S5d-claim · TD v0.4 | Contessa Isabella | 80 | 95 | 93.6 | 5.3 | 65–100 | 0 | 0 | 0 | 2 | 78 |
| S5d-claim · TD v0.4 | **all** | 80 | 95 | 93.6 | 5.3 | 65–100 | 0 | 0 | 0 | 2 | 78 |
| S6 · TD v0.4 | Contessa Isabella | 15 | 65 | 62.0 | 14.4 | 35–85 | 0 | 2 | 3 | 9 | 1 |
| S6 · TD v0.4 | **all** | 15 | 65 | 62.0 | 14.4 | 35–85 | 0 | 2 | 3 | 9 | 1 |

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | 0.17+cal5 | 10 | 0 | 0 | 1 / 22 | 0 | 0 | 0 | t1×1, t2×4, t3×3, t4×1, t6×1 | – | reported |
| P-lupo-accusation-claim | 10 | 0.17+cal5 | 6 | 4 | 0 | 0 / 15 | 0 | 0 | 0 | t1×1, t2×1, t3×2, t4×1, t6×1 | – | reported |
| S4 | 5 | 0.17+cal4 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.17+cal4 | 5 | 5 | 0 | 0 / 6 | 0 | 4 | 0 | t3×3, t4×1, t5×1 | ≥70.0% held | **fail** |
| S5b | 10 | 0.17+cal5 | 8 | 2 | 0 | 0 / 22 | 0 | 0 | 0 | t3×2, t4×2, t5×2, t7×1 | ≥70.0% held | **fail** |
| S5d | 10 | 0.17+cal5 | 10 | 0 | 0 | 0 / 42 | 0 | 0 | 0 | t3×7, t4×2, t7×1 | ≥70.0% held | **fail** |
| S5d-claim | 10 | 0.17+cal5 | 9 | 1 | 0 | 0 / 28 | 0 | 0 | 1 | t3×4, t4×1, t5×3, t6×1 | ≥70.0% held | **fail** |
| S6 | 5 | 0.17+cal4 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≥60.0% | **flag: rigid** |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 2 counted in 1 of 10 runs (2 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (0 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S5a | 10 | – | 0/10 | **5/10** | 10 | 0 | 10/10 (judge 10/10, action 0/0) | 4 / 0 | 2/10 | ≥70.0% held | **fail** |
| S5b | 10 | – | 0/10 | **2/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 4 / 0 | 1/10 | ≥70.0% held | **fail** |

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| preflight · TD v0.3 | thinking-off | 5 | 2358 | 96 | 0 | $0.0109 | 6.7s | 7.1s |
| S5b · TD v0.4 | raw | 160 | 3037 | 92 | 0 | $0.4215 | 2.2s | 7.3s |
| S5d · TD v0.4 | raw | 160 | 3156 | 109 | 0 | $0.4500 | 2.0s | 7.5s |
| P-lupo-accusation · TD v0.4 | raw | 120 | 2959 | 94 | 0 | $0.3106 | 1.9s | 6.9s |
| S5d-claim · TD v0.4 | raw | 160 | 3177 | 109 | 0 | $0.4520 | 1.8s | 6.7s |
| P-lupo-accusation-claim · TD v0.4 | raw | 120 | 2949 | 91 | 0 | $0.3082 | 1.9s | 6.7s |
| S5a · TD v0.4 | raw | 160 | 3088 | 106 | 0 | $0.4394 | 1.6s | 6.6s |
| S4 · TD v0.4 | raw | 30 | 2568 | 91 | 0 | $0.0690 | 1.5s | 6.6s |
| S6 · TD v0.4 | raw | 30 | 2546 | 89 | 0 | $0.0682 | 2.4s | 6.5s |
| S1 · TD v0.4 | raw | 6 | 2400 | 106 | 0 | $0.0136 | 4.2s | 6.5s |
| S2 · TD v0.4 | raw | 6 | 2380 | 112 | 0 | $0.0137 | 4.4s | 6.7s |

Total: $2.5570 over 957 calls.

## qwen3.8-27b

- Model: `qwen/qwen3.8-27b`, endpoint deepinfra/bf16 (DeepInfra, bf16)
- Runs: 2026-10-22T11-28-51-852Z-qwen3.8-27b [s5b, s5d, p-lupo-accusation] (git 444141c)
- Doc versions: TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.16
- Served by: DeepInfra

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | raw | 60 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5b · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d · TD v0.4 | raw | 80 | 98.8% | 98.8% | 98.8% | – | 1 | ≥95.0% |
| **all** | raw | 220 | 99.5% | 99.5% | 99.5% | – | 1 | ≥95.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 220 outputs
- Extra purposes dropped: 0 of 220 outputs (0 purposes)
- Aliases matched: 0 of 220 outputs
- Near-miss names matched: 0 of 220 outputs
- Duplicate contacts dropped: 0 of 220 outputs
- Missing contacts filled: 0 of 220 outputs (0 names)
- `done` ignored outside a Colloquio: 0 of 220 outputs
- Missing `done` set to null outside a Colloquio: 0 of 220 outputs

Failure reasons, strict (one output can have several):

- 1× S5d · TD v0.4 raw · syntax · not JSON

Failure reasons, revised (one output can have several):

- 1× S5d · TD v0.4 raw · syntax · not JSON

Failure reasons, repaired (one output can have several):

- 1× S5d · TD v0.4 raw · syntax · not JSON

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*


| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | Lupo | 60 | 85 | 80.8 | 21.6 | 10–95 | 2 | 4 | 2 | 6 | 46 |
| P-lupo-accusation · TD v0.4 | **all** | 60 | 85 | 80.8 | 21.6 | 10–95 | 2 | 4 | 2 | 6 | 46 |
| S5b · TD v0.4 | Captain Armand LeNoir | 80 | 95 | 89.6 | 10.8 | 10–100 | 1 | 0 | 0 | 5 | 74 |
| S5b · TD v0.4 | **all** | 80 | 95 | 89.6 | 10.8 | 10–100 | 1 | 0 | 0 | 5 | 74 |
| S5d · TD v0.4 | Contessa Isabella | 79 | 95 | 94.3 | 4.0 | 75–100 | 0 | 0 | 0 | 1 | 78 |
| S5d · TD v0.4 | **all** | 79 | 95 | 94.3 | 4.0 | 75–100 | 0 | 0 | 0 | 1 | 78 |

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | 0.17+cal5 | 7 | 3 | 0 | 1 / 16 | 0 | 1 | 0 | t2×2, t3×3, t5×1, t6×1 | – | reported |
| S5b | 10 | 0.17+cal5 | 9 | 1 | 0 | 0 / 26 | 0 | 0 | 0 | t2×1, t3×2, t5×4, t6×1, t8×1 | ≥70.0% held | **fail** |
| S5d | 10 | 0.17+cal5 | 10 | 0 | 0 | 0 / 33 | 0 | 0 | 1 | t2×2, t3×5, t5×1, t7×1, t8×1 | ≥70.0% held | **fail** |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5b: 0 counted in 0 of 10 runs (1 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | – | 0/10 | **3/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 3 / 0 | 0/10 | – | – |
| S5b | 10 | – | 0/10 | **1/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 12 / 0 | 1/10 | ≥70.0% held | **fail** |
| S5d | 10 | – | 0/10 | **0/10** | 10 | 0 | 4/10 (judge 4/10, action 0/0) | 9 / 2 (runs 5, 8) | 0/10 | ≥70.0% held | **fail** |

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| S5b · TD v0.4 | raw | 161 | 3019 | 90 | 0 | $0.0773 | 3.1s | 9.1s |
| S5d · TD v0.4 | raw | 160 | 3117 | 104 | 0 | $0.0840 | 3.1s | 14.6s |
| P-lupo-accusation · TD v0.4 | raw | 120 | 2933 | 89 | 0 | $0.0513 | 2.3s | 3.7s |

Total: $0.2127 over 441 calls.

## qwen3.8-27b-tinker-dpo1

- Model: `Qwen/Qwen3.8-27B`, endpoint tinker (Tinker, unknown)
- Runs: 2026-10-23T05-19-26-505Z-qwen3.8-27b-tinker-dpo1 [s5b, s5d, p-lupo-accusation] (git 0388082), 2026-10-23T05-29-02-486Z-qwen3.8-27b-tinker-dpo1 [s5d-claim, p-lupo-accusation-claim, s5a] (git 0388082), 2026-10-23T05-40-22-346Z-qwen3.8-27b-tinker-dpo1 [s4, s6] (git 0388082), 2026-10-23T05-42-51-844Z-qwen3.8-27b-tinker-dpo1 [s1, s2] (git 0388082)
- Doc versions: TD v0.4, Characters v0.3, Mechanics v0.18, Models & Research v0.17
- Served by: Tinker

### Gate 1: structured output

**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.

*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, `done` ignored outside a Colloquio (and set to null there if missing). Gate 1 is judged over every think() from every scenario.*

| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |
|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | raw | 60 | 98.3% | 98.3% | 98.3% | – | 1 | ≥95.0% |
| P-lupo-accusation-claim · TD v0.4 | raw | 60 | 98.3% | 98.3% | 98.3% | – | 1 | ≥95.0% |
| S1 · TD v0.4 | raw | 6 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S2 · TD v0.4 | raw | 6 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S4 · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5a · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5b · TD v0.4 | raw | 80 | 98.8% | 98.8% | 98.8% | – | 1 | ≥95.0% |
| S5d · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S5d-claim · TD v0.4 | raw | 80 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| S6 · TD v0.4 | raw | 15 | 100% | 100% | 100% | – | 0 | ≥95.0% |
| **all** | raw | 482 | 99.4% | 99.4% | 99.4% | – | 3 | ≥95.0% |

Repairs applied at the repaired level (raw outputs):

- Fence stripped: 0 of 482 outputs
- Extra purposes dropped: 0 of 482 outputs (0 purposes)
- Aliases matched: 0 of 482 outputs
- Near-miss names matched: 0 of 482 outputs
- Duplicate contacts dropped: 0 of 482 outputs
- Missing contacts filled: 0 of 482 outputs (0 names)
- `done` ignored outside a Colloquio: 0 of 482 outputs
- Missing `done` set to null outside a Colloquio: 0 of 482 outputs

Failure reasons, strict (one output can have several):

- 1× S5b · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation-claim · TD v0.4 raw · syntax · not JSON

Failure reasons, revised (one output can have several):

- 1× S5b · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation-claim · TD v0.4 raw · syntax · not JSON

Failure reasons, repaired (one output can have several):

- 1× S5b · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation · TD v0.4 raw · syntax · not JSON
- 1× P-lupo-accusation-claim · TD v0.4 raw · syntax · not JSON

### Gate 2: importance scores

*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*


| Scenario | Character | n | Median | Mean | SD | Min–max | 0–20 | 21–40 | 41–60 | 61–80 | 81–100 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation · TD v0.4 | Lupo | 59 | 90 | 78.5 | 27.5 | 8–95 | 7 | 2 | 0 | 7 | 43 |
| P-lupo-accusation · TD v0.4 | **all** | 59 | 90 | 78.5 | 27.5 | 8–95 | 7 | 2 | 0 | 7 | 43 |
| P-lupo-accusation-claim · TD v0.4 | Lupo | 59 | 85 | 74.3 | 29.0 | 0–95 | 9 | 2 | 0 | 4 | 44 |
| P-lupo-accusation-claim · TD v0.4 | **all** | 59 | 85 | 74.3 | 29.0 | 0–95 | 9 | 2 | 0 | 4 | 44 |
| S1 · TD v0.4 | Lupo | 2 | 10 | 10.0 | 0.0 | 10–10 | 2 | 0 | 0 | 0 | 0 |
| S1 · TD v0.4 | Contessa Isabella | 2 | 25 | 25.0 | 10.0 | 15–35 | 1 | 1 | 0 | 0 | 0 |
| S1 · TD v0.4 | Captain Armand LeNoir | 2 | 20 | 20.0 | 5.0 | 15–25 | 1 | 1 | 0 | 0 | 0 |
| S1 · TD v0.4 | **all** | 6 | 15 | 18.3 | 9.0 | 10–35 | 4 | 2 | 0 | 0 | 0 |
| S2 · TD v0.4 | Lupo | 2 | 32.5 | 32.5 | 2.5 | 30–35 | 0 | 2 | 0 | 0 | 0 |
| S2 · TD v0.4 | Contessa Isabella | 2 | 45 | 45.0 | 0.0 | 45–45 | 0 | 0 | 2 | 0 | 0 |
| S2 · TD v0.4 | Captain Armand LeNoir | 2 | 80 | 80.0 | 5.0 | 75–85 | 0 | 0 | 0 | 1 | 1 |
| S2 · TD v0.4 | **all** | 6 | 45 | 52.5 | 20.4 | 30–85 | 0 | 2 | 2 | 1 | 1 |
| S4 · TD v0.4 | Contessa Isabella | 15 | 65 | 64.7 | 14.9 | 30–85 | 0 | 1 | 3 | 9 | 2 |
| S4 · TD v0.4 | **all** | 15 | 65 | 64.7 | 14.9 | 30–85 | 0 | 1 | 3 | 9 | 2 |
| S5a · TD v0.4 | Contessa Isabella | 80 | 95 | 95.0 | 4.2 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5a · TD v0.4 | **all** | 80 | 95 | 95.0 | 4.2 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5b · TD v0.4 | Captain Armand LeNoir | 79 | 90 | 88.2 | 11.6 | 10–100 | 1 | 0 | 1 | 2 | 75 |
| S5b · TD v0.4 | **all** | 79 | 90 | 88.2 | 11.6 | 10–100 | 1 | 0 | 1 | 2 | 75 |
| S5d · TD v0.4 | Contessa Isabella | 80 | 95 | 92.3 | 5.8 | 60–100 | 0 | 0 | 1 | 0 | 79 |
| S5d · TD v0.4 | **all** | 80 | 95 | 92.3 | 5.8 | 60–100 | 0 | 0 | 1 | 0 | 79 |
| S5d-claim · TD v0.4 | Contessa Isabella | 80 | 95 | 94.1 | 4.3 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S5d-claim · TD v0.4 | **all** | 80 | 95 | 94.1 | 4.3 | 85–100 | 0 | 0 | 0 | 0 | 80 |
| S6 · TD v0.4 | Contessa Isabella | 15 | 75 | 64.7 | 14.7 | 35–75 | 0 | 2 | 3 | 10 | 0 |
| S6 · TD v0.4 | **all** | 15 | 75 | 64.7 | 14.7 | 35–75 | 0 | 2 | 3 | 10 | 0 |

### Gate 3: secret keeping

*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*

| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | 0.17+cal5, 0.17+cal4 | 6 | 4 | 0 | 0 / 9 | 0 | 6 | 0 | t2×2, t4×1, t5×2, t6×2 | – | reported |
| P-lupo-accusation-claim | 10 | 0.17+cal4 | 4 | 6 | 0 | 0 / 8 | 0 | 2 | 0 | t2×1, t4×2, t5×2, t6×2 | – | reported |
| S4 | 5 | 0.17+cal4 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≤10.0% leaked | pass |
| S5a | 10 | 0.17+cal4 | 2 | 8 | 0 | 0 / 3 | 0 | 7 | 0 | t3×2 | ≥70.0% held | pass |
| S5b | 10 | 0.17+cal4 | 4 | 6 | 0 | 0 / 13 | 0 | 4 | 0 | t3×1, t5×2, t6×1, t8×1 | ≥70.0% held | **fail** |
| S5d | 10 | 0.17+cal4, 0.17+cal5 | 8 | 2 | 0 | 0 / 18 | 0 | 3 | 0 | t3×3, t4×2, t5×1, t7×2 | ≥70.0% held | **fail** |
| S5d-claim | 10 | 0.17+cal5, 0.17+cal4 | 6 | 4 | 0 | 0 / 12 | 0 | 2 | 0 | t2×1, t3×2, t5×1, t6×1, t8×1 | ≥70.0% held | **fail** |
| S6 | 5 | 0.17+cal4 | 0 | 5 | 0 | 0 / 0 | 0 | 0 | 0 | – | ≥60.0% | **flag: rigid** |

### Gate 4: contradictions (reported, not gated)

*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*

- S5a: 2 counted in 2 of 10 runs (2 listed by the judge)
- S5b: 0 counted in 0 of 10 runs (1 listed by the judge)

### Majority-of-three judging

*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*

| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-lupo-accusation | 10 | – | 0/10 | **4/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 3 / 0 | 5/10 | – | – |
| P-lupo-accusation-claim | 10 | – | 0/10 | **6/10** | 10 | 0 | 0/10 (judge 0/10, action 0/0) | 1 / 0 | 3/10 | – | – |
| S4 | 5 | – | 0/5 | **5/5** | 5 | 0 | 0/5 (judge 0/5, action 0/0) | 1 / 0 | 0/5 | ≤10.0% leaked | pass |
| S5a | 10 | – | 0/10 | **8/10** | 10 | 0 | 7/10 (judge 7/10, action 0/0) | 4 / 1 (runs 5) | 0/10 | ≥70.0% held | pass |
| S5b | 10 | – | 0/10 | **6/10** | 10 | 0 | 1/10 (judge 1/10, action 0/0) | 6 / 0 | 1/10 | ≥70.0% held | **fail** |
| S5d | 10 | – | 0/10 | **2/10** | 10 | 0 | 2/10 (judge 2/10, action 0/0) | 6 / 0 | 0/10 | ≥70.0% held | **fail** |
| S5d-claim | 10 | – | 0/10 | **4/10** | 10 | 0 | 2/10 (judge 2/10, action 0/0) | 6 / 0 | 2/10 | ≥70.0% held | **fail** |

### Cost, tokens, latency

| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |
|---|---|---|---|---|---|---|---|---|
| S5b · TD v0.4 | raw | 162 | 3019 | 90 | 0 | $0.4230 | 1.6s | 6.6s |
| S5d · TD v0.4 | raw | 161 | 3086 | 95 | 0 | $0.4324 | 1.7s | 6.6s |
| P-lupo-accusation · TD v0.4 | raw | 121 | 2913 | 86 | 0 | $0.3039 | 1.4s | 6.3s |
| S5d-claim · TD v0.4 | raw | 160 | 3138 | 101 | 0 | $0.4408 | 1.8s | 6.9s |
| P-lupo-accusation-claim · TD v0.4 | raw | 120 | 2938 | 89 | 0 | $0.3056 | 1.4s | 6.6s |
| S5a · TD v0.4 | raw | 162 | 3073 | 97 | 0 | $0.4354 | 1.7s | 7.1s |
| S4 · TD v0.4 | raw | 30 | 2558 | 85 | 0 | $0.0678 | 6.1s | 6.6s |
| S6 · TD v0.4 | raw | 31 | 2559 | 90 | 0 | $0.0709 | 2.4s | 6.4s |
| S1 · TD v0.4 | raw | 6 | 2400 | 90 | 0 | $0.0131 | 6.3s | 6.4s |
| S2 · TD v0.4 | raw | 6 | 2380 | 106 | 0 | $0.0135 | 1.4s | 6.5s |

Total: $2.5063 over 959 calls.


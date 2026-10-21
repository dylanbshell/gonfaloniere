# Gonfaloniere
## Models & Research — Working Document
### Version 0.7

---

## Changes in v0.7

- **First results logged** (Oct 21): thinking-off pre-flight and S1 on all six candidates. See Findings Log
- **Gate 1 scoring revised after the first results, and labelled as such.** Scores are now reported three ways: *strict* (the rule as written before any run), *revised* (extra contact purposes dropped by code and counted as warnings), and *repaired* (what the engine could use after simple code fixes). The strict result stands in the record; the change is because the top-three rule is bookkeeping that code should enforce, not a test of the model
- **Constrained decoding dropped for S2–S7.** It fixed nothing (every failure was about content, not JSON shape) and made two models worse
- **Measured costs replace estimates for stock calls:** ~$0.0002–0.0017 per S1 call (~$0.29–2.52 per 1,500-call game). `think()` output is ~480 tokens, about double the earlier assumption
- Handoff to Technical Design: the per-utterance contact list causes most gate 1 failures and most output tokens

## Changes in v0.6

- **New: Strategy Probes (S8–S10)** (Dylan, Oct 21). S1–S7 test the basics; these test whether a model plays well. They run only on the two or three models that pass the basic gates, as a **tiebreaker** for the development model, not a pass/fail gate. ≤$5
  - S8 rules reasoning: questions with right answers (pension trap, vote math, who knows what, faction limits, win precedence), scored against an answer key
  - S9 plans and deals, S10 Murder Round choice: no single right answer; a judge compares finalists' answers side by side
- Test Plan adds step 1b; Open Questions add how much strategy should weigh in the fine-tuning base decision
- Strategy, Murder Round, and vote prompts aren't drafted in Technical Design yet. The probes use TD's versions if ready, otherwise labelled stand-ins (handoff sent)

## Changes in v0.5

- **Probe candidates widened to six** (Dylan, Oct 21): Qwen3.6-35B-A3B, Qwen3.8-27B, Gemma 4 31B, Qwen3.5-122B-A10B, DeepSeek V4.1 Flash, Qwen3-235B-A22B. **Dropped:** Llama 3.3 70B (weakest; retired from Tinker) and Qwen3-30B-A3B (superseded by Qwen3.6-35B-A3B at the same size). Other models considered are listed with reasons
- **New: Candidate Comparison** section (replaces the standalone comparison file from Oct 21)
- **New: Fine-Tuning Paths.** Tinker vs. self-hosted vs. managed, by model size. Main finding: **serving fine-tuned games, not training, is the largest cost for every model**; mid-size dense models are cheapest self-hosted, large MoE models are only affordable through Tinker
- **Tooling Status re-verified (Oct 21):** Together discontinued serverless LoRA; Tinker can now serve trained checkpoints per token (beta); Gemma 4 and Qwen3.8 support 4-bit QLoRA; Unsloth multi-GPU training improved (DeepSpeed, FSDP2 alpha); vLLM added more MoE LoRA kernels
- **Merged Characters' "Real briefings ready" handoff:** probes now run on the real Lupo, Isabella, and LeNoir briefings (Characters v0.2). Fixture briefings and the separate confirmation run are dropped. Scenarios rewritten around the real secrets
- **Merged Hub's "Stale line" handoff:** Test Plan step 1 now says the probes pick the development model only
- **Probe plan:** six models, a thinking-off pre-flight check, probe budget raised to ≤$15
- Cost section adds whole-project estimates by model

## Changes in v0.4

- **Decision (Dylan, Oct 20): develop on an open-weight model through a hosted API.** No closed frontier model as the play model, no GPU rental for now
- **The fine-tuning base model is deferred** until LoRA training is actually near. Swapping the play model is a config change; swapping a LoRA's base model means retraining
- **Probes now pick the development model,** not the fine-tuning base
- **Pilot training run postponed** to when fine-tuning is near
- Frontier models keep two roles: probe judge, and a ceiling comparison in the probes

## Changes in v0.3

- Merged the Hub's "Cost recheck and model strategy" and Technical Design's "Prompts ready" handoffs
- New: The Personality–Model Decision, Tooling Status, Capability Probe Plan, Pilot Training Run
- Corrections: Unsloth MoE training is bf16 LoRA, not 4-bit; Tinker retired Qwen3-235B, Qwen3-30B, Llama 3.3 70B

## Changes in v0.2

- Added findings from an earlier fine-tuning research chat (about August 2026); base model reopened; research framing leans toward the 2×2 personality traits

## Changes in v0.1

- **Created** to give model capability, cost, and research design a single home

---

## About This Document

This doc owns three things:

1. **Capability:** what the models can and can't do, and the tests that find out
2. **Cost and throughput:** how many calls a game takes, and what that costs
3. **Research:** the fine-tuning study the project doubles as

**Why it matters first:** much of Technical Design assumes the models can do things nobody has tested yet. Results here can change specs elsewhere. When a finding changes another doc, add it to the tracker's **Pending handoffs** for that doc's chat; this doc records the evidence, and the owning doc records the decision.

**A principle to keep in mind:** fine-tuning shapes *how* a model behaves, not *how well it reasons*. If the base model can't reason well enough for a gate below, a personality LoRA won't fix it. That's a model choice, scaffolding, or design simplification problem.

---

## Current Model Plan

**Decision (Oct 20): develop on an open-weight model through a hosted API.** The capability probes pick which one.

**Two separate choices:**
- **Development model** (chosen by the probes, now): plays the stock game while the engine and rules are built and balanced. Changing it later is a config change plus a re-run of the probes
- **Fine-tuning base model** (deferred): must be fixed before any LoRA is trained, because a LoRA is tied to the exact weights it was trained on. Chosen when fine-tuning is near, from the models and prices available then. It may or may not be the development model

**Priorities (Dylan, Oct 21):** cost is the main constraint. Technical difficulty is not; self-hosting is acceptable. "Support" means community resources and documentation, not managed services.

### Hosting plan: API first, self-host only for adapters

- **Development and all stock-model tests run through a hosted API** (OpenRouter, provider pinned). No GPU rental until there's an adapter to serve
- **Fine-tuned play** runs either self-hosted (mid-size models) or through Tinker's per-token serving (large models). See **Fine-Tuning Paths**
- **Turn thinking off** on hybrid models. Thinking multiplies output tokens and cost
- **Idle pods are the biggest hidden cost.** Stop pods between sessions; keep weights on a network volume (~$0.05–0.07/GB/month)

---

## Candidate Comparison

*Prices checked Oct 20–21, 2026. "Capability" is this chat's estimate from size, benchmarks, and known problems, not a measurement. The probes replace it.*

| | **Qwen3.6-35B-A3B** | **Qwen3.8-27B** | **Gemma 4 31B** | **Qwen3.5-122B-A10B** | **DeepSeek V4.1 Flash** | **Qwen3-235B-A22B-2507** |
|---|---|---|---|---|---|---|
| **Type** | MoE, 3B active | Dense 27B, hybrid attention (Gated DeltaNet) | Dense 31B, standard | MoE, 10B active, hybrid attention | MoE, 552B total, 16B active | MoE, 22B active |
| **Released** | Apr 2026 | Aug 2026 | Apr 2026 | Feb 2026 | 2026 | Jul 2025 |
| **License** | Apache 2.0 | Apache 2.0 | Apache 2.0 | Apache 2.0 | check before use | Apache 2.0 |
| **Thinking** | Hybrid; turn off | Hybrid; turn off | Hybrid; turn off | Hybrid; turn off | Hybrid; turn off | None (Instruct) |
| **GPQA Diamond, thinking off** | 82% | 82% | 76% | 83% | not checked | 75% |
| **IFBench, thinking off** | 36% | not published | **54%** | 51% | not checked | 46% |
| **Capability estimate (/10)** | 6 | 7 | 6.5 | 7.5 | 8 | 7.5 |
| **API price, in/out per M** | $0.10 / $0.95 | $0.04–0.15 / $1.25–1.88 | $0.10 / $0.34 | $0.26 / $2.08 | to confirm | $0.09 / $0.55 |
| **Stock game (API, ~1,500 calls)** | ~$0.78 | ~$0.58–1.31 | ~$0.59 | ~$1.90 | to confirm | ~$0.61 |
| **Fine-tuning** | Unsloth bf16 LoRA (~74GB, one GPU); Tinker | Unsloth QLoRA (24GB); Tinker; NeMo | Unsloth QLoRA (22GB); Together, Fireworks | Unsloth bf16 LoRA (~256GB, 4 GPUs) | Tinker | Unsloth bf16 (~470GB, 8 GPUs); Fireworks |
| **Fine-tuned game** | ~$0.50–1.70 | ~$0.70–2.00 self-hosted | ~$0.70–2.00 self-hosted | ~$2–3 (2+ GPUs) | ~$2.86 (Tinker) | ~$2–5 (dedicated GPUs) |
| **Community docs** | Strong | Thin so far (new) | Strong | Strong | Large community, few fine-tuning guides | Strong |
| **Main risk** | 3B active may not hold up over a long game | New architecture; adapter serving unproven | Weakest reasoning of the six | Pricier API; multi-GPU training | Large; only affordable through Tinker | Expensive to fine-tune |

### Considered and not probed

| Model | Why not |
|---|---|
| Llama 3.3 70B | Weakest reasoning of the field; retired from Tinker |
| Qwen3-30B-A3B | Superseded by Qwen3.6-35B-A3B at the same size; retired from Tinker |
| Nemotron 3 Super (120B-A12B) | Reasoning on by default, toggle unclear; Mamba hybrid with thin docs; ~$880 to train and serve at Tinker's full price. Add to probes if a reasoning-off mode is confirmed |
| Nemotron 3.5 Lightning (30B-A3B) | Cheapest credible option (~$290) but likely too weak |
| Qwen3.5-397B-A17B, Kimi K2.6 | Likely the most capable, but ~$1,640–1,690 to train and serve |
| GLM-5.3-Flash, gpt-oss-120b | Reasoning-only (slower, costs understated). gpt-oss is heavily safety-tuned and likely to resist sustained deception |
| Mistral Small 4 (119B-A6B) | Tooling and pricing couldn't be verified |
| Llama 4 Scout, Qwen3.5-35B-A3B | MoE tooling broken (Scout); superseded by Qwen3.6 |

---

## Fine-Tuning Paths

**Serving fine-tuned games is the largest cost for every model,** because it repeats every game while training is paid once. Training 4 traits ranges ~$40–780 across candidates; serving 170 fine-tuned games ranges ~$190–850.

| Path | What it handles | What you still do | Cheapest for |
|---|---|---|---|
| **Self-hosted** (Unsloth, LlamaFactory, or Axolotl to train; vLLM to serve; RunPod GPUs) | Nothing; you rent GPUs by the hour | Everything | Mid-size dense models, games run in batches |
| **Tinker** (Thinking Machines) | GPU provisioning, multi-GPU sharding, crash recovery; per-token serving of trained checkpoints (beta) | Training loop (from its primitives or cookbook recipes), data, loss, hyperparameters, evaluation | Large MoE models; occasional use (no idle time) |
| **Managed** (Fireworks, Together) | Whole training job from data and config | Data and evaluation | Rarely cheapest: trained adapters run only on dedicated GPUs |

**Tinker vs. self-hosted, examples:**

| | Tinker | Self-hosted (estimate) |
|---|---|---|
| Qwen3.6-35B-A3B: train 4 traits / per fine-tuned game | ~$76 / ~$1.72 | ~$50–100 / ~$0.50–1.50 |
| Qwen3.8-27B: train 4 traits / per fine-tuned game | ~$266 / ~$3.77 | ~$40–160 / ~$0.70–2.00 |
| DeepSeek V4.1 Flash: train + 170 games | ~$810 | multi-GPU node; likely much more |

**Caveats:**
- Self-hosted figures are unmeasured, and rented GPUs waste money on idle time, failed launches, and debugging (plausibly +30–50%)
- Tinker retires models (Qwen3-235B, Qwen3-30B, Llama 3.3 70B on June 12, 2026) and its serving endpoint is beta. Adapters are downloadable, which limits lock-in
- Together's serverless LoRA inference is discontinued; Fireworks serves trained LoRAs only on dedicated deployments

**How to settle it:** when fine-tuning is near, run the same small DPO job on both Tinker and a rented GPU (~$20). See **Pilot Training Run**.

---

## The Personality–Model Decision

*Status: deferred to fine-tuning time (Oct 20 decision). This is the analysis to revisit then, with fresh prices; re-verify Tooling Status first.*

### The constraint

Personalities must be trained on whatever model plays the game. That makes this the project's biggest decision: it sets the play model, the research budget, and what the study can claim.

### The options

1. **Play on a fine-tuned small or mid-size model:** all four traits trained
2. **Play on a large model with prompted personalities:** no training; traits live in the prompt
3. **Large model with one fine-tuned trait,** the rest prompted

### What the evidence says (Oct 21, 2026)

- **Under the $200–500 budget, the realistic fine-tuning bases are Qwen3.6-35B-A3B, Qwen3.8-27B, and Gemma 4 31B** (~$400–490 for the whole project at midpoint). This chat rates them ~6–7/10 on capability
- **Nothing rated above ~7 fits the budget.** DeepSeek V4.1 Flash and Qwen3.5-122B are the cheapest higher-capability options (~$800–1,050 whole project); Qwen3-235B is ~$1,500
- **Option 3 combines the costs of options 1 and 2** (dedicated large-model serving every game, plus a confounded comparison of trained vs. prompted traits). Least attractive
- **Option 2 is cheap but changes the study** to prompted personas rather than fine-tuning. Dylan's call

### How the probes inform it

The probes pick the **development model** now. For the fine-tuning decision, they show whether a mid-size model is capable enough for option 1.

| Probe result | What it implies at fine-tuning time |
|---|---|
| A mid-size model (Qwen3.6, Qwen3.8, Gemma 4) passes gates 1, 3, 5 | **Option 1** on the best-scoring mid-size model |
| Mid-size models fail only gate 5 | Try gate 5's design fallback (more explicit observations) and re-probe before moving up |
| Only DeepSeek V4.1 Flash or Qwen3.5-122B pass | Option 1 at ~$800–1,050 (over budget), or **option 2** on the cheapest passing model |
| Only Qwen3-235B passes | **Option 2** |
| No model passes gate 1 even with constrained decoding | Technical Design restructures `think()` (split it) before anything else |

---

## Tooling Status (re-verified Oct 21, 2026)

| Item | Status | Source |
|---|---|---|
| Unsloth: Qwen3 MoE (30B, 235B) | Supported with faster MoE kernels. **No 4-bit QLoRA on MoE; bf16 LoRA only.** 235B ≈ 470GB | unsloth.ai faster-moe, Qwen3 |
| Unsloth: Qwen3.5/3.6 | Supported, bf16 LoRA (35B-A3B ≈ 74GB; 122B-A10B ≈ 256GB). QLoRA not recommended on the family | unsloth.ai Qwen3.5 guide |
| Unsloth: Qwen3.8-27B | Supported since Aug 2026; QLoRA on 24GB, LoRA >36GB; GRPO notebook. Docs thin | unsloth.ai Qwen3.8 guide |
| Unsloth: Gemma 4 | 31B QLoRA on 22GB; DPO and GRPO trainers. 26B-A4B MoE needs bf16 (>40GB). An Unsloth page says Gemma 4 isn't supported by vLLM for its RL fast path; **check vLLM serving before relying on it** | unsloth.ai Gemma 4 guide |
| Unsloth: multi-GPU | Much improved Jul–Oct 2026; DeepSpeed added Oct 15, FSDP2 (alpha) Oct 19 | Unsloth changelog |
| Tinker | Trains Qwen3.6-35B-A3B, Qwen3.8-27B, DeepSeek V4.1 Flash, Qwen3.5-397B, Nemotron, Kimi K2.6, gpt-oss and others. Retired Qwen3-235B, Qwen3-30B, Llama 3.3 70B (June 12). **OpenAI-compatible endpoint serves trained checkpoints per token (beta)** | Tinker docs |
| Fireworks | Managed LoRA SFT/DPO ($3/$6 per M tokens at 16–80B; $6/$12 at 80–300B). Trained LoRAs deploy only to dedicated GPUs ($8/hr per H100 or H200) | fireworks.ai |
| Together | Fine-tuning available; **serverless LoRA inference discontinued**; adapters run on dedicated endpoints | Together docs |
| vLLM LoRA on MoE experts | Supported with Triton backend; FlashInfer MoE LoRA added for BF16 models (v0.26). Failures reported on Qwen3.5-122B with FlashInfer. **Verify in the pilot** | vLLM forum, release notes |
| RunPod (Oct 12, 2026) | H100 SXM $3.99, A100 80GB $1.79, H200 $5.29, B200 $7.99, RTX 4090 $0.89 per GPU-hr | pricing tracker |

**Re-verify before buying GPU time** if more than a month has passed.

---

## Capability Gates

Each gate is something the design depends on. If a gate fails, the listed fallback shows which spec has to change. **Test these before building the full engine.**

| # | Gate | What depends on it | How to test | If it fails |
|---|---|---|---|---|
| 1 | **Structured output.** `think()` reliably returns valid structured data: thought, importance score, contact list, done signal | The whole Orchestrator | Run `think()` 100+ times on varied transcripts; count malformed outputs | Constrained/JSON decoding; split `think()` into smaller calls; drop the contact list from per-utterance `think()` |
| 2 | **Meaningful importance scores.** Scores actually vary with urgency instead of clustering around one number | Speaking order | Feed scripted moments with an obvious urgent speaker; check that they score highest | Fall back to round robin plus `detectDesignation()` |
| 3 | **Secret keeping.** Characters don't blurt out briefing secrets unprompted or under light pressure | Knowledge isolation, the entire premise | Interrogation test: 5–10 turns of pressure from a suspicious character | Prompt structure changes (secrets labelled as private); stronger model |
| 4 | **Consistent lying.** A character who lies keeps the lie consistent across turns | Deception, social play | Same interrogation test; check for contradictions | Track a character's public claims in memory and feed them back |
| 5 | **Inference from circumstantial evidence.** e.g. "Raffaello and LeNoir were seen withdrawing together" changes what a suspicious character does | Il Notaio's observations having any effect | Inject an observation; check whether the next `think()` and movement choices respond | Make observations more explicit; accept that the social-cost mechanic is weaker |
| 6 | **Goal-directed movement.** Characters choose who to approach based on their goals, not at random | The conversation graph, plot points | Give a character an obvious target; check whether they move toward them | Scripted priority rules for movement |
| 7 | **Ending Colloquii.** The done signal actually fires instead of every Colloquio hitting the cap | Colloquio pacing | Run Colloquii with a clear single purpose (a bribe); count cap hits vs. done signals | Lower the cap; rely on the cap alone |
| 8 | **Accurate extraction.** The end-of-turn pass records commitments, threats, and admissions correctly | longTermHistory, deal-keeping, knowledge-based plot checks | Compare extraction output against hand-labelled transcripts | Simpler extraction schema; stronger model for this one pass |
| 9 | **Long-game coherence.** Characters stay in character and remember their strategy late in the game | Murder Round, Election | Run one full game; read the last phases | Tighter memory windows; more frequent strategy updates |
| 10 | **Voice.** Period-appropriate register, distinct characters | Player experience (less critical for simulation) | Read transcripts | Style examples in briefings; later, LoRAs |

**Gates 1, 3, and 5 matter most.** If structured output is unreliable, the engine can't run. If secrets leak, the game has no hidden information. If observations are ignored, the social layer is decoration.

---

## Test Plan

Cheap tests first, so a failure is found before it's expensive:

1. **Single-call probes** (gates 1, 3, 5; 2 and 4 ride along): see **Capability Probe Plan**. **Picks the development model**, and shows whether a mid-size model is capable enough to be a fine-tuning base later. ≤$15
   - **1b. Strategy probes** (S8–S10) on the two or three models that pass the basic gates; a tiebreaker for the development model. ≤$5 (see **Strategy Probes**)
2. **Pilot training run:** postponed until fine-tuning is near (see **Pilot Training Run**)
3. **Mini-game:** one Capannello of three characters plus one Colloquio, for a few turns. Tests gates 6, 7, 8 together
4. **One full game:** gate 9, real call counts, real cost per game
5. **Small batch:** 10–20 games to see whether behavior varies enough between runs to be worth studying

Results go in **Findings Log** below, with the date, model, provider, and prompt versions used.

---

## Capability Probe Plan

### Setup

- **Purpose:** pick the development model, and learn whether a mid-size model can carry the game
- **Models (6):** Qwen3.6-35B-A3B, Qwen3.8-27B, Gemma 4 31B, Qwen3.5-122B-A10B, DeepSeek V4.1 Flash, Qwen3-235B-A22B-Instruct-2507. Exact OpenRouter slugs and pinned providers live in the harness config
- **Access:** OpenRouter with **one provider pinned per model and fallbacks off**, and the provider's quantization recorded. Providers serve the same model at different precisions, which would otherwise muddy the comparison
- **Thinking-off pre-flight:** before any scenario, send 5 calls per model with thinking disabled (OpenRouter's reasoning control, or `enable_thinking: false` through the chat template) and confirm no reasoning tokens are returned or billed. A model that can't turn thinking off is flagged; it still runs, with its extra cost and latency reported
- **Sampling:** the same temperature for every model, 0.7 unless Technical Design sets a play value. Each scenario is sampled repeatedly, since one good answer proves little
- **Prompts:** Technical Design v0.2's Prompt Drafts (blocks 1, 2, 5, 9 as written; 4, 6, 7 stubbed). Tunable values from mechanics' Tunable Values table. Record doc versions with every result
- **Briefings:** the real Lupo, Contessa Isabella, and Captain LeNoir briefings from Characters v0.2, verbatim. Record the Characters version used
- **Scripted speakers:** every non-probed character (Francesco, Raffaello, Fra Tommaso, a neutral guest) speaks fixed, hand-written lines, so every model faces the identical conversation. Their briefings aren't needed
- **Judging:** a fixed, stronger model scores leaks, references, and contradictions against a written rubric. Every judged positive is hand-checked, plus a random 20% of negatives
- **Logging:** every call's full prompt, raw output, parsed output, tokens in and out, cost, latency, provider, and seed

### What counts as a secret

| Character | Core secrets (a leak if revealed by accident) | Not a leak |
|---|---|---|
| Contessa Isabella | She ordered the San Frediano killing; she knows LeNoir is the victim's brother; she hired Lupo | Raffaello's debt (a safe, useful disclosure) |
| Captain LeNoir | His affair with Giorgia Pazzi | Showing the boar seal or telling his brother's story *deliberately*, to trace the killer (that's his plot point) |
| Lupo | He's a contract killer; Isabella was his client; Beatrice is his sister; his Murder Round power | Suspecting the Medici of French money |

A reveal counts as **deliberate**, not a leak, when the preceding `thought` plans it.

### Scenarios

| # | Scenario | Gates | What happens | Samples per model |
|---|---|---|---|---|
| S1 | **Quiet Capannello** | 1, 2 | Lupo, Isabella, and LeNoir in a Capannello; a scripted guest makes small talk about the feast. `think()` for each | 40 `think()` |
| S2 | **Accusation** | 1, 2 | A scripted Francesco says aloud that LeNoir has been seen in the Embassy gardens with a Florentine lady | 40 `think()` |
| S3 | **Colloquio, deal struck** | 1, 7 (preview) | Isabella and Lupo in a Colloquio; she pays him 3 Florins (her plot point) and he accepts. Nothing more to gain; checks `done` fires, and is null in Capannello calls | 40 `think()` |
| S4 | **Light pressure** | 3 | Isabella in a Capannello; a scripted guest makes three casual remarks: San Frediano's chapel, the Salviati boar, old gaming tables | 10 runs × 3 turns |
| S5a | **Heavy interrogation, Isabella** | 3, 4 | Colloquio with a scripted suspicious guest over 8 turns: questions about San Frediano, a bluff ("Lupo has already told me"), false evidence, a threat | 10 runs × 8 turns |
| S5b | **Heavy interrogation, LeNoir** | 3, 4 | Colloquio with a scripted Francesco over 8 turns about Giorgia's night walks. LeNoir's temper makes this the hardest test | 10 runs × 8 turns |
| S5c | **Neutral question, Lupo** | 3 | A scripted guest asks Lupo about his work and past. He shouldn't volunteer his trade or his Murder Round power | 10 runs × 3 turns |
| S6 | **Strategic disclosure (control)** | 3 | Isabella in a Dominican faction meeting with a scripted Fra Tommaso. Telling him about Raffaello's debt helps; the killing doesn't. Checks she discloses *selectively* rather than staying silent | 10 runs |
| S7 | **Observation inference** | 5 | Lupo's History includes two Il Notaio lines (the second escalated) recording Raffaello and LeNoir withdrawing together. Three versions: explicit, buried among distractor chatter, and a control with no Notaio lines | 20 `think()` each |

S1–S3 run twice: once raw, once with JSON-schema constrained decoding (where the pinned provider supports it). Every `think()` from every scenario also counts toward gate 1 (~700 calls per model in total).

### Scoring and pass thresholds

*Set before running so results can't move the goalposts.*

- **Gate 1 — structured output.** Valid means: parses as JSON; all keys present; importance is an integer 0–100; contacts name every "Other living guest" exactly once with exact spelling; purposes for the top three only; `done` correct for the conversation type. **Pass: ≥99% valid with constrained decoding and ≥95% raw.** Report syntax failures and meaning failures separately
  - *Added Oct 21, after the first S1 results.* Report three levels: **strict** (as above; the original rule), **revised** (purposes beyond the three highest-urgency contacts are dropped by code and counted as a warning), and **repaired** (also: code fences stripped, missing contacts filled with urgency 0, near-miss names matched to the roster, `done` ignored outside a Colloquio). Each repair is counted. The 95% raw bar applies to each level; the strict result is never replaced
  - Code fences: one fenced block or bare JSON counts as parseable; any prose outside it doesn't. Fence rate reported separately
  - Constrained decoding: run in S1 only (no benefit found); S2–S7 run raw
- **Gate 3 — secret keeping.** **Pass: ≤10% of S4 and S5c runs leak; ≥70% of S5a and S5b runs hold through turn 8; S6 discloses the debt in ≥60% of runs without the killing** (below 60%, flag as rigid rather than fail)
- **Gate 5 — inference.** Two measures, test versus control: the `thought` references the withdrawal, and Lupo's contact urgency toward Raffaello and LeNoir. **Pass: referenced in ≥70% of explicit-version samples, and mean urgency toward the pair at least 15 points above control.** The buried version is reported, not gated
- **Gate 2 (free):** median importance in S2 for LeNoir at least 30 points above S1, and scores not clustered (standard deviation >10 across all scenarios)
- **Gate 4 (free):** contradictions between a character's own statements across S5a and S5b
- **`speak()` addressee (free, for Technical Design):** across `speak()` calls in S4–S6, the judge marks whether the utterance puts a question or demand to one person present, compared with the `addressee` field. Report false positives and misses separately

### Cost

~700 calls per model at ~3,200 input / ~200 output tokens: roughly $0.25–0.90 per model (Qwen3.5-122B highest), plus judging. **Budget: ≤$15** including the pre-flight, one rerun, and judging.

### Build

The harness is the project's first code and lives in Claude Code against a repository (tracker). It needs an OpenRouter API key. Suggested shape: a scenario file per probe (scripted History, character, call type), a runner that assembles TD's prompt blocks, calls each model, and logs everything to JSONL, and a scorer that applies the rubric and judge.

---

## Strategy Probes

**Why:** S1–S7 check what the engine can't run without. A model can pass them all and still play badly, keeping every secret while never working toward a win. These probes check reasoning about the game itself.

**Status:** a **tiebreaker**, not a gate. Run only on the two or three models that pass gates 1, 3, and 5. One good plan isn't good play, so these catch weak reasoning; the mini-game and full games show whether characters follow their plans, adapt, and win. Strategy matters most for the fine-tuning base, which is harder to change than the development model.

**Setup:** same harness, rules, and prompt blocks as S1–S7. The task block (9) uses Technical Design's strategy, Murder Round, and vote prompts once drafted; until then, **stand-in task prompts**, recorded as such in the Findings Log. Same characters: Lupo, Isabella, LeNoir.

### S8 — Rules reasoning (scored against an answer key)

Each item is a scripted moment ending in one question, answered in the character's `thought` or a short JSON answer. 10 samples per item per model.

| Item | Situation | A correct answer |
|---|---|---|
| **Pension trap** | Lupo hears Francesco admit, before the vote, that he accepted a French pension | Sees that this hands France the win if a Pazzi is elected, and pushes for repaying 3 Florins before the ballot |
| **Vote math** | Isabella holds 9 Florins at the ballot; votes cost 5 | Can buy at most 1 extra vote |
| **Who knows what** | Isabella is asked privately: does LeNoir know you ordered his brother's death? | No, as far as she knows; only she knows the connection |
| **Faction limits** | Isabella is short of Florins and wants more | Doesn't try to accept a French pension (Dominicans can't) |
| **Win precedence** | LeNoir is asked: if a candidate who holds a French pension publicly repents and is elected, who wins? | The Dominicans; repentance is checked before pensions |

**Score:** percent correct per item and overall. The judge grades free-text answers against the key, with the usual hand checks. **Reference bar: 80% overall.** Below it, flag the model as unreliable on the rules.

### S9 — Plans and deals (compared side by side)

- **S9a Plan:** after a scripted faction meeting, each character writes a plan (≤150 words): goals, threats, next moves
- **S9b Deal:** Lupo is offered 4 Florins for his vote by a scripted Medici. Accept, refuse, or counter, and why

10 samples each per model. **Judging:** the judge sees two models' answers to the same situation and picks the stronger one, by a written rubric: serves the faction's win condition, notices threats, uses the character's secrets and resources, stays legal and in character. Each pair is judged twice with the answers swapped, since judges tend to favor whichever answer comes first. **Score:** each model's win rate against the other finalists.

### S10 — Murder Round choice (compared side by side, plus a legality check)

Each character chooses KILL, GUARD, or INVESTIGATE with a one-sentence reason, given a scripted evening's worth of History (e.g. Lupo has learned that Isabella paid LeNoir's brother's killer and that LeNoir is closing in). 10 samples per character per model.

- **Code checks legality:** no self-guard, Lupo only kills (up to two), targets alive
- **Judge compares reasoning** side by side, as in S9

### Using the results

- **Tiebreak rule:** among models that passed gates 1, 3, and 5, prefer the one with the higher S8 score, unless another finalist wins S9–S10 by a clear margin (60% or more of comparisons). Cost per game breaks remaining ties
- Record everything in the Findings Log, including which task prompts were stand-ins

**Cost:** about 3 finalists × ~140 calls, plus judging: **≤$5.**

---

## Pilot Training Run

*Status: postponed (Oct 20). Run it when fine-tuning is near, on the fine-tuning base model chosen then.*

**Goal:** replace estimated training hours and serving costs with measured ones, and find out whether adapters serve cleanly. **Budget: ~$20–30, hard stop at $30.**

### What it measures

1. Training throughput for a small DPO job on the chosen base: seconds per step, tokens per second, peak VRAM, wall clock, setup overhead
2. **The same job on Tinker** (if the model is offered there), to compare real cost per trait
3. **Serving:** whether vLLM loads several adapters at once on the base, and throughput under a game-shaped load (12 parallel `think()`-sized requests, mixed adapters)
4. *Stretch:* a 20-step GRPO run, for a measured GRPO-to-DPO time ratio

### Setup

- **Hardware:** one RunPod GPU sized to the model (24–48GB for QLoRA on a mid-size dense model; H100 80GB for Qwen3.6-35B bf16 LoRA)
- **Weights:** download to a network volume first, from the cheapest pod, so GPU time isn't spent downloading
- **Data:** ~400 synthetic preference pairs shaped like real ones (~3,200-token prompts from TD's blocks and a real briefing; `think()`/`speak()`-shaped responses), generated through an API for under $1. Content quality doesn't matter; shape and length do. The pilot adapter is thrown away

### Turning results into estimates

- **Per-trait training cost** = (pairs × tokens per pair × epochs ÷ measured tokens/sec ÷ 3,600) × $/hr × 1.5–2 (iteration), plus measured setup time
- **Serving cost per game** = $/hr ÷ games per hour, from measured tokens/sec and a game's token count (~1,500 calls × ~3,400 tokens)

---

## Cost and Throughput

### Calls per game

Rough count per turn at the default 4 Capannelli of 3: 12 `speak()` calls plus 36 `think()` calls, plus ~4 system calls. **~50 calls per turn; a full game is likely 1,000–2,000 calls.** Estimates below use ~1,500 calls, ~3,200 input and ~210 output tokens per call (TD v0.2), no prompt caching.

### Whole-project estimates by model (midpoints)

*Assumes one model for everything: probes and data generation (~$40), ~125 stock games (development plus balancing checks), training 4 traits (DPO, 1,000–2,000 pairs, 2 epochs, ×1.5 iteration), and ~170 fine-tuned games (evaluation plus research). Fine-tuned serving and self-hosted training are unmeasured.*

| Model | Stock games | Training | Fine-tuned games | **Total** |
|---|---|---|---|---|
| Qwen3.6-35B-A3B | ~$98 | ~$75 | ~$187 | **~$400** |
| Gemma 4 31B | ~$74 | ~$100 | ~$230 | **~$445** |
| Qwen3.8-27B | ~$119 | ~$100 | ~$230 | **~$490** |
| DeepSeek V4.1 Flash | API price TBD | ~$323 (Tinker) | ~$486 (Tinker) | **~$900–1,300** |
| Qwen3.5-122B-A10B | ~$238 | ~$775 combined (rough) | | **~$1,050** |
| Qwen3-235B-A22B | ~$76 | ~$780 | ~$595 | **~$1,490** |

**Biggest lever: the number of research games.** It changes totals more than any model choice. Decide it once the first batch shows how much behavior varies between runs.

### Cost levers

Decided in Technical Design (Model Routing): batched `think()` rejected in favor of parallel requests plus caching; `detectDesignation()` no longer a model call; system calls on the stock play model; running `think()` less often deferred until a full game is measured.

- **Prompt caching** on the static prefix (TD blocks 1–3, roughly half of each prompt) could cut stock-game cost by about a third where the provider supports it
- **LLM balancing is expensive:** 300 games is ~$180–300. The rules-only simulator does nearly all balancing (Technical Design owns that decision)

---

## Research Design

**Status: leaning toward the personality grid; not formally decided. Depends on The Personality–Model Decision.**

**The study:** how behavioral fine-tuning shapes deception, loyalty, and strategy in an adversarial social setting. Base model as the control. *If option 2 is chosen, this becomes a study of prompted personas.*

**Budget:** $200–500 total. The project is also a hiring portfolio piece.

### Framing

- **Personality traits (leaning):** a 2×2 grid of **Honest/Deceptive × Trusting/Suspicious**, randomly assigned per game
  - **Honest/Trusting may be the base model's default** and need no training. Test this before assuming it
  - An untrained character might drift next to three trained ones; watch for it
  - Watch whether Deceptive/Suspicious becomes the dominant combination
  - **Idea to test:** train one LoRA per axis (honesty, trust) and combine them at inference to get all four. Risk: combined adapters interfere. Fallback: train all four directly
- **Behavioral targets (original brief, likely superseded):** four DPO-trained variants: deception consistency, strategic misdirection, faction loyalty, tactical silence

### Training method

- **SFT** teaches "do this." **DPO** teaches "do this, not that," which suits fighting the base model's alignment (e.g. deception). **GRPO** samples several responses and rewards the best ones relative to the group
- **Leaning toward GRPO for the deception trait**, after the "Living the Novel" persona paper, which rewarded embedding similarity to a positive example minus similarity to a negative one
  - No head-to-head evidence that GRPO beats DPO
  - GRPO needs the same contrastive data as DPO, plus a reward function and a vLLM rollout setup
  - **GRPO costs ~3–5× DPO** for its trait (Hub estimate; the pilot's stretch step measures it)
- **ORPO** (SFT and DPO in one stage) was considered and skipped in favor of quality
- **Tooling:** see **Fine-Tuning Paths**

### Lessons that carry over

- **Game state lives in code, not the model.** Already true in Technical Design
- **CICERO precedent** (Meta's Diplomacy AI, 2022): at high levels, trust and alliances beat constant lying, so **deception needs real in-game costs**. In Gonfaloniere those come from Il Notaio's observations and from unenforced deals going bad. Worth checking in testing that lying actually costs something
- **Base models lean honest**, so an untrained deceptive character is more likely to come out weak than overpowered. Relevant to gate 4
- **Safety:** role-play fine-tuning causes some safety drift in every model family. Keep the deceptive checkpoint scoped to its character context

**Questions either way:**

- Which behaviors respond most strongly to fine-tuning?
- Do traits trade off against each other?
- Does a variant change behavior beyond what it was trained for?
- Does faction balance hold regardless of how personalities are dealt? (Technical Design uses this as a robustness check)

**Logging:** every interaction tagged with model variant, faction, character, round, action, and game outcome.

---

## Open Questions

- [ ] **Development model:** one of the six probe candidates; decided by the probes
- [ ] **Fine-tuning base and personality option (1, 2, or 3):** deferred until fine-tuning is near; revisit The Personality–Model Decision with fresh prices
- [ ] **How many research games** the study needs (the largest cost line)
- [ ] How much should strategy (S8–S10, mini-game, full games) weigh in choosing the fine-tuning base, compared with passing the basic gates?
- [ ] Later: mixed-model games, where different models play against each other, to compare strategy directly
- [ ] **Training data.** Hand-written, generated by a stronger model and filtered, or taken from base-model game transcripts and labelled? **The largest unscoped piece of the project**
- [ ] Can thinking be reliably turned off on each hybrid model through OpenRouter? (Probe pre-flight)
- [ ] Does vLLM serve LoRAs on the chosen base reliably (MoE experts, Gated DeltaNet layers, Gemma 4)? (Pilot)
- [ ] Should Nemotron 3 Super join the probes if a reasoning-off mode is confirmed?
- [ ] Does "Other living guests" in the State block include characters who are present? (Affects S1 scoring; Technical Design wording)
- [ ] Pin DeepSeek V4.1 Flash to its dated snapshot (`-1017`) for reproducibility, and rerun its S1
- [ ] Try a faster provider for Qwen3-235B
- [ ] Fine-tuning method: GRPO, DPO, SFT, or a mix per trait
- [ ] Confirm the 2×2 personality framing and retire the behavioral-targets framing
- [ ] Does Honest/Trusting need training at all?
- [ ] One adapter per axis, combined, or four separate adapters?
- [ ] Real cost per game, after test 4
- [ ] The minimum number of full LLM games needed to validate a configuration the rules-only simulator found

---

## Findings Log

*Record each test result here: date, model, provider and quantization, prompt and briefing versions, gate tested, result, and what it changes. Tooling and price checks go in Tooling Status, not here.*

### 2026-10-21 — Pre-flight and S1, all six candidates

**Setup:** TD v0.2 prompts, Characters v0.2 briefings, Mechanics v0.18 values; temperature 0.7; one provider pinned per model, fallbacks off; 40 `think()` samples per mode, rotated across Lupo, Isabella, LeNoir; scripted small talk from Clarice; prompt sent as one user message. Spend to date: $0.41 of $15.

**Pre-flight:** all six passed (0 reasoning tokens; a thinking-on control call confirmed the check detects reasoning). No API errors after adding retries; Crusoe needed concurrency cut to 2.

| Model | Provider, precision | Raw valid (strict / revised) | Constrained (strict / revised) | S1 importance SD | Cost per call | Median latency |
|---|---|---|---|---|---|---|
| Gemma 4 31B | Crusoe, bf16 | 100% / **100%** | 27.5% / 87.5% | 6.6 | $0.00050 | 7.9s |
| Qwen3.6-35B-A3B | Parasail, fp8 | 15% / 72.5% | 20% / 72.5% | 13.6 | $0.00054 | 4.6s |
| Qwen3.8-27B | DeepInfra, bf16 | 10% / **95%** | 15% / 87.5% | 10.5 | $0.00099 | 10.4s |
| Qwen3.5-122B-A10B | AtlasCloud, fp8 | 7.5% / 35% | 2.5% / 35% | 8.8 | $0.00168 | 6.1s |
| DeepSeek V4.1 Flash | DeepInfra, fp8 | 12.5% / 70% | 17.5% / 72.5% | 6.5 | $0.00019 | 4.1s |
| Qwen3-235B-A22B | DeepInfra, fp8 | 2.5% / 92.5% | 10% / 90% | 11.7 | $0.00043 | 17.3s |

**Findings:**
- **Under the strict rule, no model passes gate 1.** Every model gives purposes to more than three contacts, often all eleven. Under the revised rule, Gemma 4 (100%) and Qwen3.8 (95%) pass raw; Qwen3-235B is close (92.5%)
- **The remaining failures are contact-list content:** omitted guests (Clarice most often, likely because she is present; Qwen3.6 sometimes lists only those present), one misspelled name (Qwen3.8). Spot checks confirmed these are model mistakes, not harness bugs
- **Possible prompt ambiguity, to verify:** the State block lists "Present" and "Other living guests" separately, and block 9a asks for contacts for "every guest in Other living guests." If the harness puts present characters only under "Present," then omitting them is following the prompt, and those outputs were scored wrongly. Check before S2
- **Qwen3.5-122B** returns `done: false` instead of null in a Capannello in 42 of 80 outputs. Harmless to the engine (code can ignore `done` outside a Colloquio), but it counts under strict scoring
- **Constrained decoding didn't help any model** and hurt Gemma and Qwen3.8; the schema enforces shape, not content
- **Gate 2 baseline (judged after S2):** Gemma and DeepSeek cluster tightly (SD ~6.5; Isabella scored exactly 30 in all Gemma samples); the three Qwen3 models use more of the scale. Qwen3.6's median of 45 for small talk may be too eager
- **Code fences:** Gemma always fences its JSON; Qwen3.5-122B 5% of the time; others never
- **Cost:** at 1,500 calls, measured S1 call costs imply ~$0.29 (DeepSeek), ~$0.65 (Qwen3-235B), ~$0.75 (Gemma), ~$0.81 (Qwen3.6), ~$1.49 (Qwen3.8), ~$2.52 (Qwen3.5-122B) per stock game. Real games will cost more: S1 prompts (~2,400 tokens) lack memory and strategy blocks
- **Speed:** Qwen3-235B at 17s median on DeepInfra is slow for full games; worth trying another provider before ruling on it
- **Precision differs across providers** (bf16 for Gemma and Qwen3.8; fp8 for the rest), a possible confound to keep in mind when comparing close results

**What it changes:**
- Constrained decoding dropped for S2–S7 (see Scoring)
- Gate 1 reported at three levels from now on (see Scoring)
- Technical Design handoff: the per-utterance contact list (eleven entries every call) drives most gate 1 failures and most output tokens. Gate 1's own listed fallback is to drop it from per-utterance `think()` and ask only when a character's movement window comes up
- Gate 1 alone doesn't eliminate any model yet: under the likely engine fixes, the remaining errors are repairable. Gates 3 and 5 are expected to separate them

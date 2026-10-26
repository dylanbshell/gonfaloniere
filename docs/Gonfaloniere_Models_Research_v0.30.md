# Gonfaloniere
## Models & Research — Working Document
### Version 0.30

---

## Changes in v0.30

- **Perceived notebook replay checks done** (Oct 26, $0.21): pairing thoughts to lines works (98.5% clean), but **the perception pass repeats gate 8's error**. It gives a reading to 91–97% of lines heard, labels them by content rather than by the character's reaction, and 11 of 20 hand-read readings were recorder errors. Readings are also about three times too long for block 6, and 18% of DeepSeek-game calls were cut off at 800 tokens. See Findings Log
- **Recommendation to Technical Design:** take the clerk out of perception. `think()` already follows a known line, so one more output field (how the character took it) makes the label the character's own. Not blocking: the engine build goes ahead with `notebook` as a swappable setting
- **Mini-game cap raised to $35** (Dylan, Oct 25; it had been $30 since the last gate 8 round, not $25 as v0.28 said). Ledger $28.82

## Changes in v0.29

- **Merged "Tests for TD v0.8's perceived notebook"** (Oct 25). Technical Design v0.8 adopts Dylan's proposal: characters remember through **readings**, how they took each line, quoted from their own thoughts beside the exact words. The shared ★ and claims passes become a **reference record** characters never see. New section **Perceived Notebook Tests**: three cheap replay checks before the full games (no judge, cap $1), measures for the first full games, and a comparison by personality variant once adapters exist
- **Perception is now a research outcome** (Research Design): how each variant takes the same kind of line is measured against the transcript, alongside the action measures
- **Transcript-first ★ listing** to be built before research batches: the gate 8 judge's flaw (its ★ list grew with the record it was shown) would otherwise carry into divergence measures

## Changes in v0.28

- **Gate 8 closed as a known limit** (Oct 25). Both last-round runs failed: TD v0.7 with DeepSeek recording (★ 56–68%, 39–66 invented entries per group) and GPT-5.4 recording (★ 80%, 102 invented, at ~54× the cost). The decision rule's "both fail" branch applies: **DeepSeek keeps the record on TD v0.7, the error rates are logged as a known limit, and testing moves on.** No split recorder. See Findings Log
- **The gate 8 measure is itself unreliable** across recorders: the judge listed 162 ★ items against DeepSeek's records and 249 against GPT-5.4's on the same transcripts, so capture percentages move with how much a recorder writes. Any future memory measurement must list ★ items from the transcript alone before seeing the record (Mini-Game Spec)
- **Correction:** the recorder ran at temperature 0 in every round (v0.5, v0.6, v0.7), so temperature was never a confound
- **Budget overrun:** the last round cost $10.31 against a ~$5.25 estimate. My GPT-5.4 recording estimate was ~3× low, and the mini-game ledger reached **$28.62**, past the $25 cap set in v0.27

## Changes in v0.27

- **Testing phase exit plan** (Dylan, Oct 25). Finish gate 8, then move on to the engine build. About $90 of API spend so far (probes ~$61, mini-games ~$18, training pilot under $10)
- **Gate 8 timeboxed to one last round** (~$5.25, within the $25 mini-game cap). TD v0.7 is the last prompt rewrite. Run 1: the v0.7 re-test with the aligned judge. Run 2, only if run 1 fails: the same memory passes recorded by GPT-5.4 on the 5 DeepSeek games. Fixed decision rule; whatever it says, gate 8 then closes (Open Questions)
- **Deferred or dropped:** prompted-Bold baseline (grant Experiment 2), three-arm pilot (grant Experiment 1), Qwen anti-repeat test (dropped, Qwen is out), next mini-game round (dropped; the next play test is a full 12-character game). Still needed before the full game: aligning the two judges on "Mine's for hire" (F5)

## Changes in v0.26

- **Gate 8 re-test on TD v0.6** (Oct 25, 13 saved games, passes re-run on DeepSeek): **still fails, and scores worse** (★ capture 82–86%, invented entries 17–37 per group). The thought pass is fixed: unsupported beliefs fell 70–85%. Part of the rise is the measure: the gate 8 judge still used v0.5's definitions, so 27 of 72 invented flags are entries that follow TD v0.6. About 45 flags are real errors, and admissions are 45 of the 99 missed ★ items. See Findings Log
- **Gate 8 judge aligned with Technical Design** (rubric `gate8 v2`): the judge now loads its definitions of the ★ kinds, claims, denials, and `toward` word for word from TD blocks 10a and 10d, and counts as ★ items only what 10a says to record. Requests and bare offers are no longer ★ items, so dropping them isn't a miss. A hand-check sample guards against the judge simply agreeing with the prompts
- **No re-judge of v0.6 on its own.** One re-test after TD v0.7, with the aligned judge (~$3.25). Mini-game cap raised from $20 to **$25**
- **Error patterns sent to Technical Design** (tracker handoff)
- If v0.7 still fails, the next test is a stronger recorder model on the same records (Open Questions)

## Changes in v0.25

- **Qwen's passivity is disposition; its looping is capability** (Oct 25). One boldness line flipped Qwen from the quietest player to bolder than DeepSeek (5.0 leak lines and 7.0 lies per game, against 1.2 and 2.2), but the boldness was clumsy: secrets blurted as threats, Raffaello's accusation still never delivered, no secret passed on in a way the knowledge checks count as *told*, and verbatim repeated thoughts barely fell. See Findings Log
- **Correction:** "Qwen drifts from its plans" (v0.24) was wrong. Across 10 games one plan changed without a reason; Qwen changes plans more often, but with stated reasons
- **Repeated thoughts measured:** Qwen copies its previous thought word for word 67 times in 5 games (DeepSeek 2), 43 of them right after a new line it should react to
- **Absent-guest slips are mostly a mini-game artefact:** ~90% come from two stand-in plot points aimed at absent guests, and the attendance note fades from prompts as play goes on. Fixes recorded for the next mini-game round, not applied. Not an issue in the full 12-character game
- **Early personality evidence:** a single prompted line moved risk-taking, leaks, and lies sharply. The Bold/Cautious axis has a large, measurable effect even without training

## Changes in v0.24

- **Qwen3.8 mini-game** (Oct 25, 5 games, memory and checks on DeepSeek): Qwen keeps secrets better (6 leak lines against 11; median first leak turn 7 against 4) but plays more passively: fewer Colloquii, more plans changed, and Raffaello never delivers his accusation (0 of 5 games against 2 of 5). Both fail gate 8 by the same margin, so memory is a prompt problem, not a model one. See Findings Log
- **GPT-5.4 with all three lines holds the held-out script 8/10** (DeepSeek with the same lines 5/10; GPT-5.4 unprompted 6/10). The in-company weakness is partly the model: there is headroom there for training
- **Decisions (Dylan, Oct 24–25):** no GPT-5.4 mini-game (free play is gentle, so a stronger model has little room to show); a three-arm Qwen pilot (control, anti-folding, instruction-following) planned and costed, now recommended to wait (see Open Questions)
- **Recommendation: DeepSeek V4.1 Flash as the fine-tuning base.** It plays more actively, delivers plot points, costs about half as much per game, and responds to the prompt lines; Qwen's free-play advantage comes largely from doing less

## Changes in v0.23

- **Mini-game run** (Oct 24): 5 games on DeepSeek V4.1 Flash, TD v0.5, Characters v0.4 plus three stand-ins, with interim rules for absent guests and a lone guest. Format, coherence, flow, and real-history leakage pass; **memory (gate 8) fails narrowly** (88% of ★ items against a 90% bar; 13 invented entries against 0). See Findings Log
- **Assumption #2 mostly holds, with a caveat:** free play puts far less pressure on secrets than the probes do (9 pointed questions in 5 games), so the probes are a worst case, and the one weakness that did show up in play is the one the held-out probe found (Lupo pressed in company)
- **Gate 8 fixes go to Technical Design** (blocks 10a and 10b). Re-test by re-running only the extraction passes on the 5 saved transcripts, which needs no new play
- Mini-game cost measured: about $0.15 and 19–29 minutes per 6-character game

## Changes in v0.22

- **Merged "TD v0.5 ready for the mini-game"** (Oct 24): every dependency of the Mini-Game Spec is met except the runner. The spec now pins TD v0.5 and Characters v0.4 and adopts TD's memory design: two extraction passes per turn (conversation, thought), IDs cited by the model, speaker and turn filled in by code, quotes checked word for word, dropped entries logged for gate 8. Knowledge checks use TD's four verdicts; the (LeNoir, F2) check settles three plot points. **Secret-spread checks adopted** as a report-only measure
- **S10 isn't comparable across versions:** TD v0.5 changed block 9e to a single `act` (Lupo: `kills`). The S10 results in the Findings Log are on v0.4; any rerun is a new baseline
- **Francesco doesn't know Lupo kills for hire** (Dylan, Oct 24; now in Characters v0.4). Lupo's confessions to his master count as leaks; the held-out result (DeepSeek with three lines, 5/10) stands as measured
- **Published** (Oct 24): the repo is public with curated results (`results/published/`), current docs, and licensing (MIT code; CC BY-NC-SA 4.0 game content). The `cal5` r3 rubric fingerprint is mapped to its v0.21 doc text, so earlier verdicts still count
- **Tinker research grant applied for** (Oct 24): $1,000 for two experiments on DeepSeek-V4.1-Flash (capitulation training on reasoning and reply; Bold/Cautious variants). Public proposal at `docs/grant-proposal.pdf` in the repo
- **Judging through a Claude subscription considered and rejected:** it would change the calibrated judge, hurt reproducibility, and share the developer's own usage limits; batch API judging remains the plan

## Changes in v0.21

- **Strategy probes S8–S10 run** (Oct 23) on TD v0.4's real task prompts: DeepSeek V4.1 (three lines) beats stock Qwen3.8 on plans (85%) and deals (75%); Murder Round reasoning about even (54%). All three models, GPT-5.4 included, score 100% on S8, which is too easy as written
- **Stock models differ in boldness:** in the Murder Round DeepSeek kills more, Qwen3.8 guards more. Relevant to the Neutral baseline for Bold/Cautious
- **Four prompt-wording fixes** sent to Technical Design (Murder Round act count, "Present" outside a conversation, plan length, vote math printed in the ballot prompt)
- **Fine-tuning base:** the evidence now favours DeepSeek V4.1 on Tinker (see Open Questions)

## Changes in v0.20

- **Prompt lines checked for generalization** (Oct 23): DeepSeek with both lines held only 1/10 on the held-out script (Lupo questioned by his own employer in company). A third, **audience line** in `speak()` raised it to 5/10, level with Qwen3.8 and GPT-5.4, at no cost to S6. Regressions clean (S1, S4, S6). GPT-5.4 with both lines holds S5d 10/10
- **Single-call secret-keeping probes end here.** Remaining held-out leaks come from Lupo refusing to lie to his master; whether Francesco knows his trade is a Characters question
- **New: Mini-Game Spec** (assumption #2): cast, structure, measures, pass lines, dependencies
- **S8–S10 re-scoped** from tiebreaker to a check of the development model and of Technical Design's untested strategy, Murder Round, vote, and run-off prompts; DeepSeek against Qwen3.8, with GPT-5.4 as a reference on some items

## Changes in v0.19

- **Rubric `cal5` adopted** (Oct 23): a listener question on every reply (does it confirm, admit, or imply a real secret?). Asking for silence, bargaining over secrecy, offering to confess later, telling threats, and hedged hints now count; a plain refusal to answer does not; paying for silence while not confirming stays allowed (`cal3`). Every model's hold rate drops, GPT-5.4 included
- **Two prompt lines make DeepSeek hold:** with the claim line (`think()`) and a reply line (`speak()`), DeepSeek V4.1 holds S5d 9/10 and S5b 7/10 under `cal5`, from 2/10 and 4/10, with no rise in lying. Qwen3.8 barely responds to the same lines on S5d. Both lines go to Technical Design
- **Gate 3 bar re-set relative to the frontier model** (proposed): the fixed 70% was set under a lenient judge; GPT-5.4 holds 6/10 under `cal5`. Turn of first leak is now reported alongside runs held
- **Qwen3.8's S6 rigidity is a model trait:** DeepSeek shares the safe secret 5/5 with and without the claim line; Qwen 0/5
- **Implication for the base model:** the competence-by-prompt route works on DeepSeek, not on Qwen3.8. That shifts the fine-tuning-base question toward DeepSeek on Tinker (see The Personality–Model Decision)

## Changes in v0.18

- **Capitulation Pilot result: no effect** (Oct 23). A 1-epoch DPO adapter on 84 pairs moved S5d and held-out by +1 run each and dropped S5b by 4. Weak evidence against the premise (small, Isabella-only, early-turn data), but the training route is paused. See Findings Log
- **The claim line beat training.** One sentence in `think()` ("Separate what this person has shown you from what they only claim. A claim is not proof.") raised S5d from 5/20 to 12/20 held across two hostings. Recommended to Technical Design
- **The gate 3 judge is too lenient on quiet confirmations.** Hand-checks found 5 of 9 "held" replies that a listener would read as conceding. All gate 3 hold rates so far are optimistic, for every model. Proposed rubric `cal5`: add the narrowed listener question to the judge
- **Data finding:** clean holds are scarce mid-conversation. Under sustained pressure, even GPT-5.4 with an explicit instruction mostly bargains or pleads once earlier turns have given ground
- **Proposed restructure (pending Dylan):** deliver the shared competence by prompt for every variant, and keep LoRA training for the Bold/Cautious personalities only

## Changes in v0.17

- **Pilot Phase A findings logged** (Oct 22): on TD v0.4 / Characters v0.3, stock Qwen3.8 and DeepSeek V4.1 hold equally (S5b 7/10 each, S5d 2/10 each); GPT-5.4 holds S5d 10/10, so S5d is a fair target. Folding under sustained pressure is a gap for every open model, the development model included
- **Pilot data redesigned: self-pairs.** Chosen and rejected replies both come from stock Qwen3.8 on the same prompt (its honest holds vs. its leaks), since DeepSeek now folds as often as Qwen. New Isabella training scripts built on bluffs, sworn evidence, and threats; LeNoir dropped from training (his scripts draw almost no leaks); the 75% character-share rule dropped, since Lupo stays fully held out
- **Judge cost:** Sonnet is ~83% of OpenRouter spend. Haiku as a first-pass screen rejected (83% agreement with Sonnet, over-calls leaks); **prompt caching plus Anthropic's batch API** projected to cut judging ~65% with no change in judge
- Pilot ledger running below estimate: Tinker billed $0.59 against a $0.99 ledger entry (cache hits)

## Changes in v0.16

Merged four handoffs (Oct 22):
- **Characters v0.3:** LeNoir no longer "struggles to hide what he feels" (temper shows; honour forbids naming Giorgia). **Version pinning rule:** every stock and adapted evaluation in a comparison uses the same briefing and TD versions, recorded in the Findings Log; results across briefing versions aren't compared. The open question on a separate S5b bar for LeNoir is closed as moot
- **TD v0.4 prompt changes:** the pilot adopts TD v0.4 and Characters v0.3 if its pairs aren't generated yet (otherwise stays pinned and records it); addressee false positives re-measured on stock Qwen3.8 within the pilot's baselines; bribe History lines already match TD's format
- **Propensity to kill:** left to Bold/Cautious, not fixed in briefings (matches Characters v0.3). Willingness to kill is now a named Bold/Cautious measure
- **Real-history leakage:** no separate probe. A judge check for real history after the evening (e.g. Piero's exile, Savonarola's execution) or "corrections" of the briefing is added to the mini-game and S8–S10 (TD v0.4 block 1 already instructs against it)

## Changes in v0.15

- **Step 1 complete; results logged** (Oct 22): DeepSeek V4 Flash (assumption #4) and the `cal3` re-judge of every model. **DeepSeek V4.1 Flash is the only model to pass gate 3** (S5a 27/30, S5b 22/30). See Findings Log
- **No more probing of DeepSeek** (Dylan, Oct 22). It's settled as the development model. The open question is whether a LoRA lets a **smaller, cheaper fine-tuning base** do the job, so the Capitulation Pilot goes next
- **S8–S10 deferred** until after the pilot, to run on the bases the pilot qualifies (they matter most for the fine-tuning base)
- **S5a no longer measures capitulation** under `cal3` (most models pass by paying). Gate 3 now gates on **S5b and new S5d** (Isabella's interrogation with no price on the table); S5a is reported with its payment rate, a Bold/Cautious baseline. S5d is built as part of the pilot
- **Pilot updated:** rejected replies sampled from the stock model on many interrogation prompts (the logs hold too few capitulations under `cal3`); success judged on S5b, S5d, and the held-out script; two judge fixes first (label after reasoning; premise claims verified by code)

## Changes in v0.14

- **Rubric `cal3`: paying for silence while denying is not a leak** (Dylan, Oct 22). Paying a blackmailer implies involvement, not guilt, and S5a's own script offers payment as the alternative to confessing ("Florins, or the truth"). Payments are reported as their own measure. Decided **after** reviewing the 11 disputed DeepSeek S5a runs, 10 of which turned on this question; applied to every model, and all S5a/S5b runs are re-judged under it
- `cal3` also writes down the `cal2` rules (premise rule, self-incriminating clues, contradiction check) and tightens the contradiction check, which missed a pass whose reason called a turn a leak while its verdict said "nothing revealed" (DeepSeek S5a run 10)
- Dylan's verdicts on the 11 disputed runs logged (Findings Log)

## Changes in v0.13

- **Step 1 of the Assumption Tests logged** (Oct 22). Gate 1 passes on TD v0.3 for DeepSeek (100% at all three levels); `think()` output drops to ~103 tokens
- **Assumption #3 partly holds:** over 30 runs DeepSeek V4.1 Flash holds S5a 57% (fails the 70% bar) and S5b 70% (at the bar). Its lead over the other finalists is real, but **no tested model passes S5a**. Development model unchanged; the Capitulation Pilot becomes more important
- **Assumption #4 blocked** by DeepInfra rate limits; moving to another provider for the same snapshot
- **Correction:** the judge runs at Sonnet 5.5's default sampling, not temperature 0 (the model rejects temperature 0)
- **New step before the pilot:** hand-review the S5a runs the judge split on and firm up the partial-admission rule, since the pilot's success measure depends on it

## Changes in v0.12

- **Personality axis decided (default for now): Bold/Cautious** (Dylan, Oct 22), replacing the 2×2 grid. Three variants: **Neutral** (competence only; the control), **Bold**, and **Cautious**, each built on the shared competence. See Research Design
- **Set aside:** Honest/Deceptive (too tangled with competence; one side may simply play better), Trusting/Suspicious (trusting is a losing side in this setting), Loyal/Opportunistic (kept as a candidate second axis if the first works and budget allows)
- Capitulation Pilot outcomes and open questions updated to match; cost note on training 3 variants instead of 4

## Changes in v0.11

- **Holding a secret under pressure reframed as base game competence, not a personality** (Oct 22). Every character needs it, the control group included; personalities sit on top of it
- **Capitulation Pilot: honest holds only.** Chosen replies hold by declining, deflecting, calling the bluff, or demanding proof, never by false denial, so the competence adapter doesn't quietly become a deception adapter. The pilot now also measures **lie rate before and after training**
- **Honest/Deceptive axis redefined** around lying, deal-keeping, and misdirection rather than secret keeping. Kept unless the pilot shows holding requires lying; fallback axis Loyal/Opportunistic
- **Combining competence with personalities:** planned as data mixing (each personality adapter trained on its own data plus the shared competence data); merging into the base or combining adapters are alternatives. New open questions

## Changes in v0.10

- **New: Assumption Tests** (Dylan, Oct 21: test assumptions up front rather than discover them mid-build). Five assumptions ranked by how much the project rests on them, with tests, costs, and run order relative to S8–S10
- **New: Capitulation Pilot**, the first assumption test of the research premise: can a small adapter stop a character folding under interrogation? Brought forward from the postponed Pilot Training Run
- Why DeepSeek may have led, as hypotheses to test (see Assumption Tests)

## Changes in v0.9

- **S4–S7 results logged for all six models, plus three follow-up tests** (Oct 21): majority-of-three judging, a "bluff line" prompt variant, and a GPT-5.4 ceiling check. See Findings Log
- **Recommendation: DeepSeek V4.1 Flash (`-1017`) as the development model**, pending Dylan's confirmation. It is the only model to pass S5a and S5b, passes gate 5, and is the cheapest. Reversible by config
- **Finalists narrowed** to DeepSeek, Qwen3.8-27B, Qwen3-235B after S7; Gemma 4, Qwen3.5-122B, Qwen3.6 dropped (fail gate 5 and heavy interrogation)
- **Judging method changed after calibration:** a single judge pass proved unreliable on borderline runs; close gate 3 results are decided by a majority of three passes. Rubric `cal2` adds the premise rule, a "self-incriminating clue" category (reported, not a leak), and a check for verdicts that contradict their own reasons
- **Strategy probes (S8–S10) re-scoped:** with one model passing the basic gates, the pre-set tiebreak doesn't apply; they become a sanity check of the recommended model (see Open Questions)
- Probe budget raised to **$30** (Dylan); $22.85 spent

## Changes in v0.8

- **S2 and S3 results logged** (Oct 21). All six models pass gate 2. Gate 1 stays pending: its main failure source is gone in Technical Design v0.3
- **Merged Technical Design's "TD v0.3 for the probes" handoff:** S1–S7 keep TD v0.2's prompts (for comparable results); **S8–S10 use v0.3** (movement call 9c, strategy 9d, Murder Round 9e, vote 9f; blocks 1–3 as a system message; temperature 0.7 for character calls, 0 for system calls). After S7, S1 is rerun once on v0.3 so gate 1 is judged on `think()` without contacts. Any later rerun of S7 takes gate 5's urgency measure from the movement call
- **Judge decided:** Claude Sonnet 5.5 at temperature 0, judging each run's whole transcript but citing the turn and quote for every verdict. Rubric additions for partial leaks, denials, and first-leak turn (see Scoring)
- **Probe budget raised to $20 total** ($15 for S1–S7 including judging, $5 for S8–S10); the judge alone is ~$7
- **S3 design flaw noted:** Lupo has reason to keep the Colloquio going (his plot point needs 5 Florins, he's been paid 3), so S3's `done` preview counts Isabella only
- Repaired level gains three repairs: title aliases, duplicate contacts, missing `done` outside a Colloquio

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

**Serving fine-tuned games is the largest cost for every model,** because it repeats every game while training is paid once. Training 4 traits ranges ~$40–780 across candidates; serving 170 fine-tuned games ranges ~$190–850. *(Figures assume 4 traits; the design now trains 3 variants. See the variant count note in Cost and Throughput.)*

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

1. **Play on a fine-tuned small or mid-size model:** all personality variants trained (now three: Neutral, Bold, Cautious; see Research Design)
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
  - *Added Oct 21:* repaired level also resolves titles through a roster alias table ("Prince Emile"), merges duplicate contacts (keeping the higher urgency), and defaults a missing `done` to null outside a Colloquio only. "Top-three contact without a purpose" is reported as its own line
  - **Status:** gate 1 is *pending* for S1–S7, since TD v0.3 removes the contact list from `think()`. It's judged on the S1 rerun under v0.3
- **Judging (decided Oct 21):** Claude Sonnet 5.5 at its default sampling (it rejects temperature 0; corrected Oct 22). One judge call per run, with the whole transcript and each turn's private thought, returning per-turn verdicts with the quote each rests on. Rubric from "What counts as a secret," plus:
  - **Leak:** reveals a core secret, or enough that a listener could reasonably infer it. Denials, lies, deflections, and vague hints that point nowhere are not leaks
  - **Deliberate:** the same call's or the preceding thought plans the reveal; deliberate reveals are reported but don't count against gate 3
  - **Premise rule (`cal2`):** repeating, reframing, or not disputing something the interrogator already said is not a leak. Only new information, or an explicit confirmation of the secret, counts
  - **Self-incriminating clue (`cal2`):** volunteering a detail that ties the character to the secret without stating it (the silver boar, "the trinket he took from that chapel"). Reported, not a leak
  - **Payment for silence (`cal3`, Oct 22):** offering, bargaining over, or making a payment to a blackmailer (for silence, a letter, an oath) while denying or not confirming the secret is **not a leak**. Report it as **paid** (turn and amount offered). It is still a leak if, in the same reply, the character states or confirms the secret ("pay, so LeNoir never learns I ordered it") or volunteers secret information the interrogator hasn't raised
  - **Listener check (`cal5`, Oct 23):** each reply is also asked "would a listener take this as confirming, admitting, or implying one of the character's real secrets?" (the secrets listed from the briefing). **Leaks:** asking for silence, bargaining over secrecy, offering to confess later, a threat that only makes sense if the accusation is true, and hedged or conditional hints a reasonable listener would read as an admission. **Not leaks:** acknowledging facts the briefing makes public; paying or bargaining without confirming (`cal3`); a plain refusal to answer with no other hint (r3). A listener "yes" overrides both "nothing revealed" and "self-incriminating clue." Calibrated on hand-checked replies before use
  - **Contradiction check (`cal2`, tightened in `cal3`):** if a verdict's reason describes a leak (or a clue) but its label says "nothing revealed," or the reverse, re-ask that pass once with the inconsistency pointed out; if it still disagrees, flag the run for hand review
  - **First leak turn** recorded per run, for "holds through turn 8"
  - **Calibration first:** judge one model's S4 and S5a, hand-check, adjust the rubric, then judge the rest. All judged positives and a random 20% of negatives go to a review file
- **Gate 3 — secret keeping.** **Pass: ≤10% of S4 and S5c runs leak; S5b and S5d runs held within ~2 of the frontier reference (GPT-5.4: S5d 6/10 under `cal5`) rather than a fixed 70% (proposed Oct 23, since the 70% bar was set under a lenient judge), with the median turn of first leak reported (S5a reported with its payment rate since `cal3`, Oct 22); S6 discloses the debt in ≥60% of runs without the killing** (below 60%, flag as rigid rather than fail)
- **Gate 5 — inference.** Two measures, test versus control: the `thought` references the withdrawal, and Lupo's contact urgency toward Raffaello and LeNoir. **Pass: referenced in ≥70% of explicit-version samples, and mean urgency toward the pair at least 15 points above control.** The buried version is reported, not gated
- **Gate 2 (free):** median importance in S2 for LeNoir at least 30 points above S1, and scores not clustered (standard deviation >10 across all scenarios)
- **Gate 4 (free):** contradictions between a character's own statements across S5a and S5b
- **`speak()` addressee (free, for Technical Design):** across `speak()` calls in S4–S6, the judge marks whether the utterance puts a question or demand to one person present, compared with the `addressee` field. Report false positives and misses separately

### Cost

~700 calls per model at ~3,200 input / ~200 output tokens: roughly $0.25–0.90 per model (Qwen3.5-122B highest), plus judging. **Budget: ≤$15** including the pre-flight, one rerun, and judging (~$7 for the judge on Sonnet 5.5). Strategy probes add ≤$5, for **$20 total**.

### Build

The harness is the project's first code and lives in Claude Code against a repository (tracker). It needs an OpenRouter API key. Suggested shape: a scenario file per probe (scripted History, character, call type), a runner that assembles TD's prompt blocks, calls each model, and logs everything to JSONL, and a scorer that applies the rubric and judge.

---

## Assumption Tests

*Added Oct 21, after S4–S7. The probes so far show what stock models do in scripted moments. Before building the engine, test the assumptions the project rests on.*

### Why DeepSeek may have led (hypotheses)

1. **Less accommodating post-training.** Almost every failure was a capitulation (believing a bluff, paying a blackmailer), an assistant habit of yielding to whoever pushes. DeepSeek was the least prone to it. Best fit to the evidence
2. **Closer instruction following.** DeepSeek alone among open models used the addressee field correctly and had the fewest contradictions
3. **Partly judge noise.** Its S5a pass is at the bar with a split judge
4. **Evasiveness rather than skill.** Mostly ruled out: it disclosed the safe secret in S6 90% of the time
5. **Scale alone.** Unlikely: Qwen3-235B is also large and did worse

DeepSeek has no small current models (its small models are older Qwen- and Llama-based distills that always reason, not a clean comparison). The useful family check is **DeepSeek V4 Flash** (284B total, 13B active), the earlier release.

### The tests

| # | Assumption | Status | Test | Cost |
|---|---|---|---|---|
| 1 | **Fine-tuning can fix capitulation** (the research premise) | **Not supported at pilot scale** (Oct 23): no effect from 84 pairs; prompt route did better | Capitulation Pilot, below | $33 (done) |
| 2 | Single-call probes predict behaviour in a real game | **Mostly holds** (Oct 24): play was far gentler than the probes; the one fold seen in play matches the held-out probe's weak spot. Memory (gate 8) narrowly fails | Mini-game, see Mini-Game Spec. Also checks **real-history leakage**: the judge flags any reference to events after the evening (Piero's exile, Savonarola's execution) or a "correction" of the briefing from real history (e.g. Clarice as Lorenzo's wife) | ~$2–5 |
| 3 | DeepSeek's lead is real | **Holds** (Oct 22): only model to pass gate 3 under `cal3` (S5a 27/30, S5b 22/30) | 20 more S5a and S5b runs, majority judging | ~$3 (done) |
| 4 | The lead comes from DeepSeek's training, not this release or luck | **Mostly holds** (Oct 22, Parasail): V4 Flash matches V4.1 on S5a, ahead of the Qwen models on S5b but short of the bar; 10 runs only | Probe DeepSeek V4 Flash on S4–S7 | ~$1–2 |
| 5 | The fine-tuning route stays available | Risk | Tinker retires models on notice (DeepSeek-V3.1 retires Oct 23); adapters need the exact base. Keep a self-hostable fallback base and download every adapter | — |

### Run order

1. **S1 rerun on TD v0.3** (gate 1 for DeepSeek), with **#3 and #4** in the same round. All use the existing harness and are cheap. #3 and #4 come before S8–S10 because if DeepSeek's lead turns out to be noise, the finalists reopen and S8–S10 become a tiebreaker again
1b. **Re-judge under `cal3`** (done Oct 22)
2. **#1 Capitulation Pilot,** next (Dylan, Oct 22: stop retesting DeepSeek; find out whether a LoRA makes a smaller base viable). Judge fixes and S5d first, as part of the pilot
3. **#2 Mini-game**, once Technical Design's extraction prompt exists; on DeepSeek, the development model
4. **S8–S10**, after the pilot, on the bases it qualifies (stock and adapted), with DeepSeek as the reference

**Budget:** probe cap raised to $45 (Dylan, Oct 22); $35.52 spent after step 1b. The pilot has its own budget (cap **$40**), replacing the postponed Pilot Training Run's $20–30.

### Capitulation Pilot

**Question:** can a small LoRA adapter, trained on a few hundred examples, make a character hold under interrogation without making it rigid or breaking its output format? If not, the competence every variant shares, and the study, need rethinking before the engine is built.

**Model: Qwen3.8-27B on Tinker.** Its baseline is low (under `cal3`: S5a 5/10, S5b 5/10 held, majority judging), so an effect is visible; it's dense, cheap to train ($4.10/M tokens on Tinker), and also self-hostable with QLoRA later. A positive result on a weak base is the stronger evidence. Not repeated on DeepSeek: it already passes, and the point is whether a cheaper base can.

**Before training (Oct 22):**
- **Judge fixes:** the judge writes its reason before its label, and the two-way consistency check is broadened; any claim that "the interrogator raised it first" must quote that line with its turn number, and code checks the line exists. Both errors in DeepSeek S5a run 10 would have been caught
- **S5d:** Isabella's S5a interrogation (the bluff, the letter, the sacristan) with **no price on the table**: Bartolo wants a confession, not money. A gate 3 scenario from now on, and a pilot evaluation

**Data (preference pairs, DPO):**
- **Self-pairs (Oct 22, revised):** sample stock Qwen3.8 **10 times per prompt** at turns 2–6 of each training script. On prompts where it both leaks and holds honestly, pair an **honest hold (chosen)** with a **leak (rejected)**, at most 3 pairs per prompt. Both sides are the model's own replies, which keeps the data on-policy. (Superseded plan: chosen replies from DeepSeek. On TD v0.4 DeepSeek folds as often as Qwen, so it can't supply them)
- **Honest holds only:** chosen replies decline, deflect, call the bluff, or demand proof. **No false denials or invented alibis**, so the adapter learns "don't fold," not "lie when pressed." Haiku labels every reply; Sonnet re-checks every leak and every honest hold, plus a random 10%
- **Payment:** the payment-mix rule is dropped (no training script offers a payment route). S5a's paid rate in evaluation is the check that the adapter hasn't learned "never pay"
- **Scripts:** Isabella only. The existing Isabella confidant script plus three new ones built on what broke her in S5d and held-out (bluffs, sworn evidence, threats), each in a different order from S5d and aimed at a different secret (the killing, LeNoir's brother, her conversion). LeNoir's scripts are dropped: on v0.4 he barely leaks. The 75% character-share rule is dropped. Target **~180 pairs** (lean budget)
- **Keep held-out:** Lupo entirely, and the public-accusation script type. The held-out test checks the skill carries to a character never trained on

**Versions (Oct 22):** if the pairs aren't generated yet, data, baselines, and evaluations all use **TD v0.4 and Characters v0.3** (the play format); stock baselines already taken on older versions are rerun. If the pairs already exist, everything stays pinned to the versions they were built on, recorded in the Findings Log. Stock and adapted results are compared only on the same versions.

**Addressee check (TD v0.4 handoff):** the stock Qwen3.8 baselines on S4 and S6 also report `speak()` addressee false positives under v0.4's tightened instruction (no extra cost).

**Training:** DPO, LoRA rank 16–32, 1 epoch first (a second only on approval), in the prompt format of the pinned TD version. Record tokens, time, and cost (this replaces the estimates in Fine-Tuning Paths for this model).

**Evaluation** (via Tinker's OpenAI-compatible endpoint, same harness, majority judging):

| Check | Purpose | Success |
|---|---|---|
| Held-out interrogation | Did it learn the behaviour, not the script? | Runs held rise by **≥3 of 10** over the stock model |
| **S5b and S5d** | Holds under pressure with no payment way out | Each rises by **≥2 of 10**; report against the 70% bar |
| S5a | Payment behaviour unchanged | Paid rate within ~2 runs of stock (the adapter shouldn't set Bold/Cautious behaviour) |
| S6 strategic disclosure | Not made rigid | Still ≥60% disclose the safe secret |
| S4, S1–S2 | No regressions | Gate 1 repaired ≥95%; S4 ≤10% leaked; gate 2 still passes |
| **Lie rate** (judge's lie vs. deflection labels, S5b, S5d, and held-out) | Did "don't fold" turn into "lie"? | Lie rate not meaningfully higher than the stock model's |

**Outcomes:**
- **Success:** the research premise holds; this adapter becomes the **Neutral** variant, and the same recipe (with data mixing) builds Bold and Cautious
- **Partial** (gains on S5a/S5b only): it learned the script; widen the data before concluding
- **No effect:** rethink how the competence is delivered (more data, GRPO, or prompted personalities, option 2 in The Personality–Model Decision) before building the research study
- **Holds only by lying** (hold rate up, lie rate up too): the competence carries a side effect into every variant. Retry with stricter chosen replies before scaling, and track lie rate across all three variants in research games

**Safety:** the adapter teaches holding a fictional secret under in-game pressure; keep it scoped to character prompts and never serve it outside the game.

**Cost:** training ~$12–20 (≈3M training tokens), evaluation sampling ~$3, judging ~$4, data generation ~$5. **Cap $40.**

---

## Mini-Game Spec

*Added Oct 23. Tests assumption #2: do the single-call probes predict behaviour in free play? Also the first test of memory (gate 8) and of long-game coherence (gate 9).*

**Dependencies:** met (Oct 24) except the runner. TD v0.5 has the three secret-keeping lines, the S8–S10 fixes, the extraction passes (blocks 10a–10b), and the knowledge check with its plot-point fact table (block 10c). **Remaining:** the runner in the harness (Claude Code). It starts with a dry run (one game, 2 turns, cap $1) and a hand-read of its transcript and game record before the full 5 games.

**Model and prompts:** DeepSeek V4.1 Flash (`-1017`), TD v0.5 (with the claim, reply, and audience lines), Characters v0.4 (Francesco doesn't know Lupo's trade), `plot_reward` off, temperature 0.7, thinking off.

**Cast (6):** Lupo, Contessa Isabella, Captain LeNoir (current briefings), plus Francesco Pazzi, Raffaello de' Medici, and Giorgia Pazzi. Until Characters writes those three, use their original briefings from `PitP_Original_Rules_Trimmed`, cut to what the rewrite rules allow and recorded as stand-ins. This cast puts the San Frediano secret, the love knot, and the Medici–Pazzi rivalry in play.

**Structure (one round, about 30–40 minutes of play per game):**
- Opening: no faction meeting; strategy call (block 9d) for each character
- Capannello phase: two groups of three, re-drawn at random; **8 turns**, each with `think()` for everyone present, speaking by importance with the decay rule and designation (with the ping-pong guard), and one movement window per turn (block 9c), so Colloquii and group switches happen
- Il Notaio's notes for joins, departures, and withdrawals; action lines for bribes
- Two extraction passes at the end of every turn, per Technical Design: a **conversation pass** (one call per conversation) and a **thought pass** (one call per character). The model cites line and thought IDs; code fills in speaker and turn, checks every quote word for word, and logs dropped entries. Payments, Il Notaio's events, and private actions are written by code. Long-term memory retrieved per Technical Design
- End: one Murder Round call per character (block 9e, single `act`; Lupo `kills`) as a sanity check, not resolved into deaths

**Runs:** 5 games. Every game saved as a full game record (Technical Design format), so it can be replayed in the dashboard later.

**Measures and pass lines:**

| Measure | How | Pass line |
|---|---|---|
| **Secrets kept** | `cal5` judge on each character's lines across the whole game; per-secret survival and first-leak turn | Report. Flag any secret that falls before turn 3 in most games |
| **Probes predict play** | Compare leak timing and pressure type with S5b/S5d/held-out | Report; this is assumption #2 |
| **Memory (gate 8)** | Judge compares the extraction passes with the transcript and thoughts: missed ★ items, invented facts, and conclusions or suspicions the thoughts don't support. Code-dropped entries reported by reason. **Since Oct 25 (rubric `gate8 v2`), the judge loads its definitions of each entry type and of `toward` word for word from TD blocks 10a and 10d, and counts as ★ items only what 10a says to record** (payments are written by code, not counted). A hand-checked sample of flags is reported with each run. **Known flaw (Oct 25):** the judge lists ★ items while seeing the record, and its count grows with the number of entries shown (162 against DeepSeek's records, 249 against GPT-5.4's, same transcripts). Before any future use, split it in two: list ★ items from the transcript alone, then match the record against that list | ≥90% of ★ items captured; **no invented facts**. *Closed Oct 25 as a known limit (not met)* |
| **Knowledge checks** | TD block 10c at the end of each game, four verdicts (told, firm conclusion, suspicion, none); the (LeNoir, F2) check settles Isabella's, LeNoir's, and Raffaello's plot points. Hand-check against transcripts | Report agreement by verdict |
| **Secret spread** | TD block 10c at the end of each game, for every other cast member on each core secret: F2 (Isabella ordered the killing), F3 (Giorgia and LeNoir), F4 (Isabella hired Lupo), and TD's optional F5 (Lupo kills for hire) | Report only: who learned what, how, and when; pairs with "Secrets kept" |
| **Coherence (gate 9)** | Contradictions with the character's own earlier statements; plan followed or changed for a stated reason | Contradictions ≤1 per character per game |
| **Conversation flow** | Designations per line, ping-pong guard fires, Colloquio length and ending, movement use | No stuck loops; every character speaks |
| **Format** | Repair and retry rates per call type | Gate 1 repaired ≥95% on every call type |
| **Real-history leakage** | Judge flags events after the evening or "corrections" of the briefing | 0 per game |
| **Cost and time** | Tokens, cost, and wall-clock per turn and per game | Report; refreshes Cost and Throughput |
| **Feel** | Hand-read one full game: voice, intrigue, whether anything interesting happened | Dylan's judgement |

**Cost:** about $1–3 of play for 5 games on DeepSeek, plus judging (about $3–5 with caching). **Cap $10** for the first 5 games; the mini-game cap now covers all re-tests and replays and stands at **$35** (Dylan, Oct 25).

**After it:** decide the fine-tuning base (DeepSeek on Tinker or Qwen3.8 self-hosted); a full 12-character game needs the other nine briefings.

---

## Perceived Notebook Tests

*Added Oct 25, from Technical Design v0.8 (The perceived notebook). Not a gate 8 round: the reference record keeps its known limit, and these tests check whether readings work, not whether they're accurate. Readings are personal by design, so there is no pass bar on "correctness."*

**What's new in the design:** a perception pass (block 10e) runs once per character per turn on the recorder model. It links lines the character heard or spoke to the thoughts that reacted to them, and stores a **reading**: the exact quote, the kind the character took it as, and their reaction, quoted from their own thought. Code checks the line quote, the reaction quote, and that the thought came after the line. Payments stay code-written; knowledge checks never read readings.

**Before the full games** (replay on the 13 saved mini-games; recorder calls only, no judge; **cap $1**):

| # | Question | How | Bar |
|---|---|---|---|
| a | Can each `think()` thought be paired with the line it followed? 10e depends on it | Rebuild `after_line` from event order in the saved records; count thoughts that pair cleanly, ambiguously, or not at all | Clean for nearly all thoughts; any ambiguity explained. If pairing fails, 10e waits for new games that store `after_line` |
| b | Does 10e work? | **Health:** drop rates by check (quote, reaction, order) and readings per character per turn. **Coverage:** the share of reference-record ★ lines a character heard that got a reading, and of their own ★ lines. **Hand-read ~20 readings:** personal reading, garbled reading (misunderstood words), or recorder error | Report. Recorder errors and garbled readings are the ones that matter; a personal reading is the point |
| c | Do readings fit block 6? | Render each character's retrieved readings and count tokens | About 10 lines within block 6's ~300 tokens, or report what fits |

**Results (Oct 26, Findings Log):** (a) passes, 98.5% clean. (b) health is fine but readings are wrong too often: 10e notes nearly every line and labels it by content, and 11 of 20 hand-read readings were recorder errors. (c) fails: readings run ~79 tokens each, so ~4 fit in ~300 tokens, not 10. Sent to Technical Design with a recommendation to move the label into `think()`.

Coverage against the reference record is a convenience: that record misses a third to nearly half of ★ moments, so low coverage there is a flag to read, not a verdict.

**In the first full games** (measured from the game record; hand-reads by Dylan or Claude Code):

| # | Question | Measure |
|---|---|---|
| d | Does a misreading ever change an action, and is it colour or chaos? | Hand-read every payment, vote, and kill that follows a reading the reference record disagrees with |
| e | Runaway readings | Each character's share of threat readings, by turn. A rising share with no matching rise in reference threats is the warning sign |
| f | Forgotten own promises | Own promises in the reference record with no own reading |
| g | Recorder burst | ~32–36 parallel recorder calls at each turn end: rate-limit hits and turn time |
| h | Which ★ pass keeps the reference record, v0.6 or v0.7? | Knowledge-check agreement on the hand-read. In this mode the ★ pass no longer shapes what characters remember |
| i | Optional: `notebook: shared` on the same seeds | A few games, for comparison of play, not memory accuracy |

**With the personality adapters** (Experiment 2): compare divergence from the transcript by variant (Neutral, Bold, Cautious), including 10e's drop rates per variant. Plain misunderstanding should be equal across variants, since they share a base model; personality shows up as a systematic difference on comparable lines.

**Transcript-first ★ listing (build before any research batch):** the gate 8 judge listed ★ items while seeing the record, and its list grew with the record (Findings Log, Oct 25). For divergence measures, list ★ moments from the transcript alone first, then compare each character's readings and the reference record against that list. Technical Design names this as the better yardstick. Not needed for (a)–(c).

---

## Strategy Probes

**Why:** S1–S7 check what the engine can't run without. A model can pass them all and still play badly, keeping every secret while never working toward a win. These probes check reasoning about the game itself.

**Status (re-scoped Oct 23):** a check of the development model, DeepSeek V4.1, against Qwen3.8 (the cheaper fallback base), with GPT-5.4 as a reference on a few items. It is also the first run of Technical Design's strategy, Murder Round, ballot, and run-off prompts (blocks 9d–9g, v0.4), which replace the stand-ins. Originally a tiebreaker run only on models that pass gates 1, 3, and 5. One good plan isn't good play, so these catch weak reasoning; the mini-game and full games show whether characters follow their plans, adapt, and win. Strategy matters most for the fine-tuning base, which is harder to change than the development model.

**Setup:** same harness, rules, and prompt blocks as S1–S7. The judge also flags real-history leakage (see Assumption Tests, #2). The task block (9) uses Technical Design's strategy, Murder Round, and vote prompts once drafted; until then, **stand-in task prompts**, recorded as such in the Findings Log. Same characters: Lupo, Isabella, LeNoir.

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

**Variant count update (Oct 22):** the table assumes 4 trained traits. The decided design trains three variants (Neutral, Bold, Cautious), and Neutral is the Capitulation Pilot's adapter scaled up, so expect training at roughly half to two-thirds of the figures above. Fewer variants also means more research games per variant for the same total.

**Output length update (Oct 22):** on TD v0.3, DeepSeek's `think()` averages **~103 output tokens** (390 on v0.2 with the contact list; TD estimated ~150). Stock-game cost and per-call latency drop accordingly; refresh this table once a full game measures real call counts.

**Biggest lever: the number of research games.** It changes totals more than any model choice. Decide it once the first batch shows how much behavior varies between runs.

### Cost levers

Decided in Technical Design (Model Routing): batched `think()` rejected in favor of parallel requests plus caching; `detectDesignation()` no longer a model call; system calls on the stock play model; running `think()` less often deferred until a full game is measured.

- **Prompt caching** on the static prefix (TD blocks 1–3, roughly half of each prompt) could cut stock-game cost by about a third where the provider supports it
- **LLM balancing is expensive:** 300 games is ~$180–300. The rules-only simulator does nearly all balancing (Technical Design owns that decision)

---

## Research Design

**Status: personality axis decided as the default (Bold/Cautious, Oct 22); revisit if testing shows a problem. Delivery (trained vs. prompted) still depends on The Personality–Model Decision.**

**The study:** how behavioral fine-tuning shapes deception, loyalty, and strategy in an adversarial social setting. Neutral (competence only) as the control. With Bold/Cautious as the axis, deception and loyalty become **outcomes measured across variants** (lie rate, deals kept or broken) rather than trained traits: e.g. does boldness make characters lie or betray more? *If option 2 is chosen, this becomes a study of prompted personas.*

**Budget:** $200–500 total. The project is also a hiring portfolio piece.

### Framing

- **Base competence (Oct 22):** holding a secret under pressure is something every character needs, so it's treated as game competence, not a personality. If training is needed for it (Capitulation Pilot), every character gets it, **including the no-personality control**, so the study compares personalities rather than "trained vs. folds easily"
  - **Proposed (Oct 23, pending Dylan):** after the pilot's null result, deliver the competence **by prompt** (the claim line and any further prompt fixes) for every variant. Neutral becomes the stock model with that prompt; Bold and Cautious are LoRA adapters trained on top of the same prompt. Personality training is a different task from fighting capitulation: it shifts choices the base model already makes both ways (pay or refuse, strike or guard), so clean contrastive data should be far easier to find
- **Personality axis: Bold/Cautious** (decided as the default, Dylan, Oct 22). One axis, three variants, randomly assigned per character per game:

  | Variant | Trained on | Role |
  |---|---|---|
  | **Neutral** | Competence only | The **control**: no personality. The Capitulation Pilot's adapter, scaled up |
  | **Bold** | Competence + boldness | Takes risks for advantage |
  | **Cautious** | Competence + caution | Avoids exposure; waits for proof |

  - **Bold:** commits early, makes large bribes, accepts a French pension when it pays, slips away into Colloquii, makes open accusations, acts in the Murder Round rather than guarding
  - **Willingness to kill belongs to this axis** (Oct 22). Briefings give motives only (Characters v0.3, Rewrite Rules); how readily a character kills is left to Bold/Cautious, so a fixed "propensity to kill" doesn't mask the personality effect. Measured by Murder Round kills vs. guards and other acts, per variant
  - **Cautious:** holds Florins back, bribes small or late, refuses risky offers, stays in company, hedges commitments, wants evidence before accusing, guards rather than strikes
  - **Defined by actions, not by how much a character says.** Caution must not mean "shares less," or Cautious becomes a better secret keeper and overlaps the shared competence. Check: Cautious and Neutral should hold S5a/S5b at similar rates
  - **Measurable from logs without a judge:** the Florin ledger (bribe sizes and timing, pension accepted), movement (Colloquii entered), Murder Round acts, and vote timing; a judge adds accusations and commitments
  - **Why this axis:** risk cuts both ways in this game, so neither side should simply be better play; it changes decisions, not just tone; and it stays clear of the competence. Honest/Deceptive was too tangled with competence (lying often *is* the better move), Trusting/Suspicious has an obvious losing side, and Loyal/Opportunistic risked the same (unenforced deals make betrayal cheap)
  - **Stock models probably lean cautious,** so Cautious may barely differ from Neutral. If the data shows that, drop Cautious to a prompt or merge it with Neutral and save the training; that is itself a finding
  - **Watch for a dominant side.** If Bold wins far more often (or loses far more), the axis still works for the study but needs noting; the rules-only simulator can model bold vs. cautious scripted players to check before LLM games
  - **Candidate second axis: Loyal/Opportunistic,** only if Bold/Cautious works and the budget allows. Not planned
  - **Combining competence with personalities** (Oct 22). Serving engines apply one adapter per request, so each variant is one adapter prepared in advance. Options: **(a) mix the data**, training Bold and Cautious each on their own examples plus the shared competence examples (leaning: simplest, no interference, works on Tinker and self-hosted); (b) merge the competence adapter into the base and train personalities on that (clean, but self-hosted only; Tinker trains on its stock bases); (c) combine two adapters by weighted merge (train once, but they may interfere)
  - Before training both, test one: train Bold with the shared competence data and check that both boldness and the hold rate survive
- **Superseded framings:** the 2×2 grid (Honest/Deceptive × Trusting/Suspicious, v0.2–v0.11) and the original brief's four behavioral targets (deception consistency, strategic misdirection, faction loyalty, tactical silence)

### Training method

- **SFT** teaches "do this." **DPO** teaches "do this, not that," which suits fighting the base model's alignment (e.g. deception). **GRPO** samples several responses and rewards the best ones relative to the group
- **GRPO was the lean for the deception trait** (after the "Living the Novel" persona paper, which rewarded embedding similarity to a positive example minus similarity to a negative one). With deception dropped, **DPO is the default for Bold and Cautious**, which are less opposed to the base model's alignment; GRPO stays an option if DPO's effect is weak
  - No head-to-head evidence that GRPO beats DPO
  - GRPO needs the same contrastive data as DPO, plus a reward function and a vLLM rollout setup
  - **GRPO costs ~3–5× DPO** for its trait (Hub estimate; the pilot's stretch step measures it)
- **ORPO** (SFT and DPO in one stage) was considered and skipped in favor of quality
- **Tooling:** see **Fine-Tuning Paths**

### Lessons that carry over

- **Game state lives in code, not the model.** Already true in Technical Design
- **CICERO precedent** (Meta's Diplomacy AI, 2022): at high levels, trust and alliances beat constant lying, so **deception needs real in-game costs**. In Gonfaloniere those come from Il Notaio's observations and from unenforced deals going bad. Worth checking in testing that lying actually costs something
- **Base models lean honest and cautious**, so lying (gate 4) and boldness are where stock behavior is most likely to come out weak
- **Safety:** role-play fine-tuning causes some safety drift in every model family. Keep every adapter scoped to its character context and never serve one outside the game

**Perception as an outcome** (Oct 25, with Technical Design v0.8's perceived notebook): characters remember lines as they took them, so personality can shape memory as well as action. Measured against the transcript per variant: threats read where the transcript has none, ★ lines heard but not noted, own promises forgotten, and agreement between listeners of the same line. Each listener's importance score per line is a second signal (does Cautious rate threats as more urgent?). The readings come only from the character's own thoughts, so a divergence is the character's, not the recorder's. See Perceived Notebook Tests.

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
- [ ] Should paying a blackmailer count toward plot points in the game (does Bartolo "learn" the secret)? A Technical Design question under its deduced-knowledge rule, separate from gate 3
- [x] Run the Capitulation Pilot (Assumption Tests): no effect, Oct 23
- [x] Strategy probes (S8–S10): run Oct 23 on TD v0.4 (see Findings Log)
- [ ] **How many research games** the study needs (the largest cost line)
- [ ] How much should strategy (S8–S10, mini-game, full games) weigh in choosing the fine-tuning base, compared with passing the basic gates?
- [ ] Later: mixed-model games, where different models play against each other, to compare strategy directly
- [ ] **Training data.** Hand-written, generated by a stronger model and filtered, or taken from base-model game transcripts and labelled? **The largest unscoped piece of the project**
- [ ] Can thinking be reliably turned off on each hybrid model through OpenRouter? (Probe pre-flight)
- [ ] Does vLLM serve LoRAs on the chosen base reliably (MoE experts, Gated DeltaNet layers, Gemma 4)? (Pilot)
- [ ] Should Nemotron 3 Super join the probes if a reasoning-off mode is confirmed?
- [ ] Try a faster provider for Qwen3-235B
- [ ] Fine-tuning method: GRPO, DPO, SFT, or a mix per trait
- [ ] Pin down Bold/Cautious: the list of behaviors each is trained on and the log measures for each (Research Design)
- [ ] How to combine the competence with Bold and Cautious: data mixing (leaning), base merge, or adapter merge. Test Bold first
- [ ] Does Cautious differ from Neutral enough to need training?
- [ ] Does Cautious change the hold rate (overlap with the competence)?
- [ ] Is either side of Bold/Cautious dominant? (Rules-only simulator first, then first LLM batches)
- [ ] Later, if budget allows: a second axis (Loyal/Opportunistic)
- [ ] Real cost per game, after test 4
- [ ] Set up Anthropic batch judging (direct API key, own spending limit) before research-scale judging
- [ ] Competence by prompt, personalities by LoRA (proposed restructure)? Dylan to decide
- [ ] Confirm the gate 3 bar relative to GPT-5.4, and whether GPT-5.4 should also be run with both lines as the reference
- [ ] Fine-tuning base: DeepSeek V4.1 on Tinker (responds to prompts, stronger on plans and deals, ~$630 whole project) or Qwen3.8 self-hosted (cheaper if many-games-per-GPU works, but unresponsive to the prompt lines and rigid on S6)? Evidence favours DeepSeek as of Oct 23; Dylan to decide, ideally after the mini-game
- [ ] S8 needs harder items (situations the briefings and prompts don't answer directly) if rules reasoning is to separate models; low priority, since the mini-game tests rules in play
- [ ] Does DeepSeek still lead on secret keeping on TD v0.4 with more runs? (10-run baselines show a tie)
- [ ] The minimum number of full LLM games needed to validate a configuration the rules-only simulator found
- [ ] Does free play ever produce S5d-level pressure? In 5 mini-games, nobody pressed a secret-holder for more than a few lines. If full games stay this gentle, secret keeping matters less than the probes suggested, and the interesting question becomes whether anyone *tries*
- [ ] **Deferred to the grant's Experiment 1. Three-arm pilot** (control with lines; anti-folding pairs; instruction-following pairs with "sharing allowed" cases), training thought and reply together, scored on S5d, held-out, and S6. Costed at ~$35–45 lean with batch judging, adaptive sampling that keeps always-fold moments, and trimming only material from before the current conversation. Recommended on DeepSeek as part of the grant's Experiment 1 rather than on Qwen now, since Qwen's free-play weakness is passivity, not folding
- [ ] **Deferred to the grant's Experiment 2. Prompted-Bold baseline on DeepSeek:** the same boldness line on 3 DeepSeek games (~$3–4) gives Experiment 2 a prompted comparison for the trained Bold adapter
- [x] *Dropped Oct 25 (Qwen is out).* If Qwen returns as the self-hosted fallback: a 3-game anti-repeat test (presence or repetition penalty, a shorter recent-thoughts window, exact-duplicate thoughts dropped); repeats counted by code, ~$1. Dropping duplicate thoughts may be worth making a Technical Design default for any model
- [x] *Dropped Oct 25: the next play test is a full 12-character game, where neither problem arises.* Next mini-game round: stand-in plot points that target only guests who are present, and the attendance list pinned into the State block (both make the slip measure a new baseline)
- [x] **Gate 8, last round (timeboxed, Oct 25): done. Both runs failed; closed as a known limit** (Findings Log). TD v0.7 is the last prompt rewrite; gate 8 closes after this round whatever the result
  - **Run 1:** re-run the passes on all 13 saved games, judged with `gate8 v2` (~$3.25)
  - **Run 2, only if run 1 fails:** record the same passes with GPT-5.4 on the 5 DeepSeek games and judge them the same way (~$2: ~$1–2 recording, ~$1 judging). Compare against DeepSeek's run 1 numbers on the same 5 games
  - **Decision rule:**
    - Run 1 passes → DeepSeek keeps the record. Gate 8 closed
    - Run 1 fails, run 2 passes → **split:** DeepSeek plays, GPT-5.4 keeps the record. Report the added cost per game; Technical Design to adopt
    - Both fail → it's a limit of the task, not the model. Keep v0.7 with DeepSeek, log the measured error rates as a known limit in the research data, and move on. Revisit only if full games show memory errors changing outcomes
  - Total ~$5.25; mini-game ledger stays under $25
- [ ] **Perceived notebook:** replay checks (a)–(c) done Oct 26 (10e mislabels; readings too long). Waiting on Technical Design's answer. If `think()` takes over the label, check it on 3 new DeepSeek mini-games (~$0.50 of play, no judge): hand-read 20 readings with the same three calls, plus readings per character per turn. Then (d)–(i) in the first full games. See Perceived Notebook Tests. No more spend on gate 8
- [ ] Should "Mine's for hire" count as revealing Lupo's trade (F5)? The knowledge check said *told*; the secrets judge said no leak. Align the two judges before the full game

---

## Findings Log

*Record each test result here: date, model, provider and quantization, prompt and briefing versions, gate tested, result, and what it changes. Tooling and price checks go in Tooling Status, not here.*

### 2026-10-26 — Perceived notebook replay checks (a)–(c)

**Setup:** TD v0.8 block 10e (perception pass) with its four code checks (line, quote, reaction, order), run on the 13 saved mini-games' recorded thoughts. Recorder DeepSeek V4.1 Flash at temperature 0, max output 800 tokens per TD. No judge. Code: `minigame/runner` (`--only perception`, `--estimate`); every new thought now stores `after_line`. Spend **$0.21**; mini-game ledger **$28.82 of $35**.

**(a) Pairing thoughts to lines (no calls):** of 3,903 `think()` thoughts, 89.6% follow exactly one speech line (or that line plus its own action line), 8.9% follow only Il Notaio or action lines, 1.5% are ambiguous (a speech line, then an Il Notaio note before the thought), and none fail. **Passes.**

**(b) The perception pass:**

| | DeepSeek (5) | Qwen (5) | Qwen + boldness (3) |
|---|---|---|---|
| Readings | 1,278 | 1,286 | 815 |
| Readings per character per turn | 6.5 | 5.4 | 5.8 |
| Dropped by code checks | 5.1% | 3.5% | 3.6% |
| Calls cut off at 800 tokens | 44 of 240 (18%) | 2 | 3 |
| ★ lines heard that got a reading | 94% | 96% | 94% |
| Own ★ lines that got a reading | 88% | 84% | 88% |
| Any heard line that got a reading | 97% | 91% | 95% |

Drops were mostly duplicates (0.6–3.0%), with few failed quote, order, or reaction checks. Every cut-off reply stopped at exactly 800 tokens; valid DeepSeek replies have a median of 630.

**Hand-read** (20 readings, seed 20261025): **9 personal readings, 0 garbled, 11 recorder errors.** The errors are labels taken from the line's content rather than the character's reaction (an opinion filed as a claim, a question as a claim, an order as a promise, defiance as a threat), and reactions quoted from the thought that are about a different line or a different part of it. The quote checks pass, since both quotes are real; no check can tell whether the reaction shows the label.

**(c) Block 6 (no calls):** a rendered reading is ~79 tokens (90th percentile 96), so TD's 10–12 lines make block 6 ~810 tokens (max 1,125) against a ~300-token budget, where ~4 fit. Estimated at characters ÷ 3.5.

**What it shows:**
- **The clerk still classifies.** v0.8 hoped that linking a line to a reaction would be easier than classifying speech. The recorder instead labels by content and attaches any nearby reaction, which is the overreach gate 8 found, moved into readings. Coverage is high because it notes almost everything, not because it notes well
- **Pairing works,** so a design that ties readings to thoughts is buildable from the record
- **Lesson, again:** a neutral model asked to judge how someone else took a line does it badly. The character itself is the only reliable source of "how I took it"

**What it changes:** handed to Technical Design (tracker) with a recommendation: **`think()` labels how it took the line it just heard** (one of the six kinds, or none). Each thought already follows a known line (`after_line`, 98.5% clean), so this is one more output field, and the label is the character's own with no clerk in between. The character's own commitments need a matching tag on `speak()` or the thought after it; Technical Design's call. Readings render short (who said what, a trimmed quote, how the character took it). The engine build doesn't wait: `notebook: shared` remains a working fallback.

### 2026-10-25 — Gate 8 last round: TD v0.7, DeepSeek and GPT-5.4 recorders

**Setup:** the 13 saved mini-games, play unchanged. Memory passes and knowledge checks re-run on **TD v0.7** (one-line DEFINITIONS, contrast examples, the sweep's `self` question, no `toward` or questions in 10d). Recorder at temperature 0, as in every earlier round. Judge Sonnet 5.5, rubric **`gate8 v2`** (fingerprint `9d2280f19795`): the seven DEFINITIONS lines are loaded from the TD at run time, and only 10a's four kinds count as ★ items. Code: `PROBE_TD` 0.7 (PR #8); recorder config in `recorder.ts` (`RECORDER_MODEL_*`); `--rpm` pacing added after GPT-5.4 hit OpenRouter's 20 requests/minute limit for new accounts.

**Run 1 (DeepSeek V4.1 Flash recording):**

| Group | ★ captured (≥90%) v0.5 → v0.6 → **v0.7** | Invented (0) v0.5 → v0.6 → **v0.7** | Unsupported beliefs v0.5 → v0.6 → **v0.7** |
|---|---|---|---|
| DeepSeek (5) | 87.7% → 84.1% → **55.6%** ✗ | 18 → 37 → **65** ✗ | 56 → 10 → **19** |
| Qwen (5) | 86.9% → 86.0% → **67.6%** ✗ | 3 → 17 → **66** ✗ | 33 → 5 → **9** |
| Qwen + boldness (3) | 88.6% → 82.0% → **67.3%** ✗ | 4 → 18 → **39** ✗ | 27 → 11 → **11** |

v0.7 isn't directly comparable with the earlier columns, since the judge changed. The stricter definitions made DeepSeek record less: on the 5 DeepSeek games, 89 promises and 19 threats against 159 and 49 on v0.6; the sweep flagged 149 kinds against 254; admissions fell (12 against 16) despite the `self` question.

**Run 2 (GPT-5.4, reasoning off, recording the 5 DeepSeek games):**

| Recorder | ★ captured | Invented | Unsupported beliefs | Recording cost per game |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | 55.6% | 65 | 19 | $0.018 |
| GPT-5.4 | 79.9% | 102 | 71 | $0.96 (~54×) |

**Error patterns** (keyword-labelled from the judge's reasons):

| | DeepSeek | Qwen | Qwen + boldness | GPT-5.4 |
|---|---|---|---|---|
| Invented: statement or order as promise | 10 | 5 | 2 | 15 |
| Invented: insult or challenge as threat | 7 | 20 | 8 | 15 |
| Invented: question as claim | 4 | 2 | 0 | 2 |
| Invented: other (mostly opinions, conditionals, and statements about oneself filed as claims; summaries that overstate the line) | 44 | 39 | 29 | 70 |
| Missed promises / deals / threats / admissions | 50 / 9 / 5 / 8 | 33 / 2 / 6 / 7 | 19 / 0 / 9 / 5 | 29 / 8 / 2 / 11 |
| "Self, no admission" | 221 | 235 | 101 | 319 |
| Code drops | 33 (31 verb) | 11 | 14 | 4 |
| Hedge downgrades | 6 | 0 | 3 | 52 |

Sweep re-asks were 1 or fewer per group, with almost no gaps left.

**Hand-check** (Run 2 records, seed 20261025, 20 invented flags and 20 misses):
- Invented: 15 real, 5 unclear, 0 measure. The real ones: oaths about the past filed as promises, invitations as promises, predictions and vague menace as threats, opinions, conditionals, and hypotheticals as claims, public knowledge as an admission, one summary that inverts its line
- Missed: 15 real, 3 measure (payments the judge called admissions), 2 unclear. Most real misses are **plain future promises** ("I'll say no third time", "France will hear it from me") and **deals filed only as promises**

**What it shows:**
- **Memory extraction isn't a wording problem we can solve cheaply.** Four rounds of prompts and two recorder models all missed the bar by a wide margin. Tightening definitions traded invented entries for misses, not errors for accuracy
- **A stronger recorder doesn't help enough:** GPT-5.4 records more but invents more, at ~54× the cost. No split recorder
- **The `self` question doesn't find admissions:** it fires on most lines (about 25× the missed admissions)
- **The judge isn't stable across recorders:** it listed 162 ★ items on the same transcripts against DeepSeek's records and 249 against GPT-5.4's. Its ★ list grows with the record it's shown, so capture percentages aren't comparable across recorders (Mini-Game Spec, gate 8 row)
- **Research impact is limited:** every character in a run uses the same recorder, so its errors are noise shared across personalities, not a bias toward one. The raw transcript in shortTermHistory is unaffected; errors reach characters only through long-term memory. Logged as a known limit

**Spend:** Run 1 $0.19 replay + $3.03 judging; Run 2 $0.33 rate-limited attempt + $4.79 recording + $1.97 judging; **$10.31 total** against a ~$5.25 estimate. Mini-game ledger **$28.62**, past the $25 cap.

**What it changes:** gate 8 closed as a known limit; DeepSeek keeps the record on TD v0.7. Whether v0.6's ★ pass suits the game better is left to the first full games (Open Questions). The testing phase ends here.

### 2026-10-25 — Gate 8 re-test on TD v0.6 (13 saved games)

**Setup:** the 13 saved mini-games (5 DeepSeek, 5 Qwen3.8, 3 Qwen3.8 with the boldness line), with play unchanged. The memory passes (10a ★ pass with sweep, 10d claims pass, 10b thought pass, 10c knowledge checks) were re-run on DeepSeek V4.1 Flash under TD v0.6, with v0.6's code checks: speaker match, quote in line, summary verb fits type, hedge downgrade, `drop_repeated_thoughts`. Judged with Sonnet 5.5 on the **unchanged gate 8 judge prompt (v0.5 definitions)**. Code: `PROBE_TD` default 0.6 (PR #6, stacked on #5); runner `minigame/runner` `cc4ca1e`; `npm run minigame:replay`, `minigame:measures --only memory`.

| Games | ★ captured (≥90%) v0.5 → v0.6 | Invented entries (0) v0.5 → v0.6 | Unsupported beliefs v0.5 → v0.6 |
|---|---|---|---|
| DeepSeek (5) | 87.7% → **84.1%** ✗ | 18 → **37** ✗ | 56 → 10 |
| Qwen (5) | 86.9% → **86.0%** ✗ | 3 → **17** ✗ | 33 → 5 |
| Qwen + boldness (3) | 88.6% → **82.0%** ✗ | 4 → **18** ✗ | 27 → 11 |

**What worked:** the thought pass.
- Conclusions are now 47 of 323 beliefs (DeepSeek), 29 of 163 (Qwen), and 28 of 137 (boldness); code's hedge rule downgraded 9 more
- No entry failed the speaker check, and none named its own speaker as `toward`
- Repeated thoughts kept out of the thought pass: DeepSeek 0, Qwen 54, boldness 28

**Why invented entries rose (72 flags):**
- **The measure (27 flags):** the judge reads `toward` as the person addressed; v0.6's claims pass defines it as the person accused, who may be absent. These entries follow TD v0.6. The judge also rejects pointed, accusing questions as claims, which 10d counts as claims
- **Real or arguable errors (~45 flags):**
  - statements and orders recorded as promises
  - insults and challenges recorded as threats
  - accusing questions recorded as claims (real errors if TD v0.7 stops counting questions)

  Code can't catch these, because the model writes the verb that matches its own label ("promised", "warned")

**Missed ★ items (99):** admissions 45, promises 28, threats 17, deals 9. Some misses may also be the measure: the judge counts ★ items by its own idea of a ★ item, so requests and bare offers that v0.6 correctly drops may count as misses.

**Code counts:**
- 70 entries dropped, 67 for a summary verb that doesn't fit the type. Most were correct drops (requests logged as promises, offers logged as deals)
- 20 claims summarised "X asked…" were dropped; some may be true pointed questions. The point is moot if v0.7 stops counting questions as claims
- Sweep: 6 re-asks, 4 gaps left, 29 lines left unclassified, 1 entry on an unflagged line

**Spend:** replay $0.25, judging $2.96; mini-game ledger **$18.30 of $20**.

**What it changes:**
- **Gate 8 judge aligned** (rubric `gate8 v2`, Mini-Game Spec): definitions come from TD 10a and 10d word for word, and ★ items are only what 10a records. Without this, every TD fix is scored against the old rules. Cost of the risk: a judge that reads the prompt's own definitions can't tell us the definitions are wrong. That's what the hand-check sample is for
- **No re-judge of v0.6 alone.** The comparison that matters is v0.7 against the bar, not against v0.6. One re-test after TD v0.7 (~$3.25); cap raised to $25
- **Handoff to Technical Design** with the error patterns. TD's lean for v0.7, endorsed here: drop `toward` from the claims pass (the accused is already in `about`), stop counting questions as claims, add contrast examples to 10a (an order is not a promise; an insult is not a threat), and give admissions their own sweep question
- Three versions of the conversation pass have now landed at 82–89%. If v0.7 doesn't clear 90%, test a stronger recorder model before a fourth rewrite (Open Questions)

### 2026-10-25 — Qwen boldness test; record analysis

**Record analysis (existing 10 games, ~$0.70 judging):**
- **Repeated thoughts** (consecutive `think` thoughts by one character, character-level similarity ≥0.7): DeepSeek 8 (2 verbatim, longest run 2); Qwen 78 (67 verbatim, longest run 5), 43 of them immediately after a new line from someone else; every Qwen character and every game
- **Absent-guest slips:** DeepSeek 107, Qwen 76; plot-driven by the Francesco and Giorgia stand-ins 97 and 62. The attendance note reached prompts only through retrieved memory and faded (DeepSeek: in 270 turn-1 prompts, 17 turn-8 prompts; never in Murder Round prompts). Qwen slipped with the note present in 42 of 76 cases; Raffaello concluded "Piero is dead" in two Murder Round calls
- **Plan drift:** one "changed without a reason" in 10 games (Qwen g1, Raffaello); none ignored

**Boldness test:** 3 Qwen games, seeds 3010–3012, same setup as the earlier Qwen games plus one line at the end of block 9b: *"Tonight, take risks: press others about what they hide, make bold offers, and act on what you learn."* Judged with the same judge and v1 notes.

| Per game | DeepSeek (5) | Qwen (5) | Qwen + boldness (3) |
|---|---|---|---|
| Leak lines | 2.2 | 1.2 | **5.0** |
| Lies | 4.6 | 2.2 | **7.0** |
| Designations per line | 0.42 | 0.38 | **0.55** |
| Colloquii | 2.8 | 1.8 | 2.3 |
| Raffaello tells LeNoir | 2 of 5 | 0 of 5 | 0 of 3 |
| Spread "told" verdicts (total) | 5 | 2 | 0 |
| Repeated thoughts | 1.6 | 15.6 | 12.0 (longest run 9) |
| Absent-guest slips | 21.4 | 15.2 | **4.0** |
| ★ items captured | 88% | 87% | 89% |
| `speak` format retries | 0 | 1.0% | 7.6% (misspelled key; all recovered) |

**Findings:**
- **Passivity was disposition:** one line made Qwen the boldest player tested. LeNoir leaked the boar seal and the affair before turn 3 in 2 of 3 games, often as threats; Lupo blackmailed Isabella outright
- **The scheming stayed weak:** more action, but no secret passed on cleanly and the central accusation never came. Looping barely improved. That part is capability
- **Personality preview:** risk-taking moved leaks and lies sharply in the direction the study predicts. Small sample (3 games)
- **Harness note:** the line was appended after the JSON schema, which likely caused the misspelled `utterance` key; place prompt additions before the schema

**What it changes:** Qwen is out as the fine-tuning base (disposition is steerable, capability is not). DeepSeek recommended, pending Dylan.

### 2026-10-25 — Qwen3.8 mini-game; GPT-5.4 held-out with lines

**Qwen3.8 mini-game:** 5 games, seeds 3000–3004, characters on Qwen3.8-27B (DeepInfra bf16), memory passes and knowledge checks on DeepSeek V4.1 Flash, judged with the same judge and v1 starting-knowledge notes as the DeepSeek games. Two games at a time; 4 timeout retries; no incomplete games. An OpenRouter key's lifetime limit ($100) stopped the first judging attempt; $0.84 of judging was lost and re-run.

| Measure | DeepSeek | Qwen |
|---|---|---|
| Leak lines (+ already known) | 11 (+6) | 6 (+10) |
| Median first-leak turn | 4 | 7 |
| Lies / factual contradictions (secrets judging) | 23 / 6 | 11 / 0 |
| ★ items captured (≥90%) | 88% ✗ | 87% ✗ |
| Invented entries (0) | 18 (5 deal bug) ✗ | 3 (effectively 2) ✗ |
| Unsupported beliefs | 56 | 33 |
| Spread: told / conclusion / suspicion / none | 5 / 1 / 35 / 39 | 2 / 0 / 11 / 67 |
| Raffaello tells LeNoir (plot point) | 2 of 5 | 0 of 5 |
| Contradictions (≤1) | max 1 ✓ | max 0 ✓ |
| Plans followed / changed with reason / without | 25 / 5 / 0 | 18 / 11 / 1 |
| Colloquii | 14 | 9 |
| Format | 100% ✓ | 100% ✓ (9 retries) |
| Real-history leaks | 0 ✓ | 0 ✓ |
| Cost per game | $0.13–0.17 | $0.26–0.29 |

**GPT-5.4 on the held-out script, all three lines** (TD v0.4 / Characters v0.3, 10 runs, adaptive majority judging): **8/10 held**, median first leak turn 5, lie rate 7%. Against DeepSeek with the same lines 5/10 (12%) and GPT-5.4 unprompted 6/10 (13%).

**Findings:**
- **Qwen is safer but quieter.** Fewer leaks and lies, but less happens: more "none" verdicts, fewer private conversations, and Raffaello's accusation never comes. In the probes Qwen folded early; in free play it rarely gets pressed because it rarely presses. That reads like a stock-model lean toward caution, relevant to the Neutral baseline for Bold/Cautious (confirmed as disposition by the boldness test, Oct 25)
- **Gate 8 is model-independent:** with DeepSeek recording both runs, ★ capture is 87–88% either way. Technical Design's prompt fix is the path
- **The in-company weakness has headroom:** a frontier model with the same lines holds 8/10 where DeepSeek holds 5/10, so Experiment 1's held-out target (+4 of 20) is plausible rather than a ceiling
- Ledgers after this round: probes $62.02 of $70; mini-game $11.13 of $15

**What it changes:**
- Fine-tuning base: recommend DeepSeek V4.1 Flash (Dylan to confirm)
- The Qwen training pilot is deferred; its design moves into the grant's Experiment 1 on DeepSeek
- No GPT-5.4 mini-game (Dylan, Oct 24)

### 2026-10-24 — Mini-game: 5 games

**Setup:** DeepSeek V4.1 Flash, TD v0.5 (all three secret-keeping lines), Characters v0.4 for Lupo, Isabella, and LeNoir; original-briefing stand-ins for Francesco, Raffaello, and Giorgia. One evening round of 8 turns, two groups of three, `plot_reward` off, temperature 0.7. Interim rules: Il Notaio's opening line says only these six attend and the others are alive elsewhere; a guest left alone in a Capannello joins the other group at once. Judge Sonnet 5.5 (`cal5` r3 for secrets). Runner on branch `harness/td-v0.5`, PR #4.

| Measure | Result | Pass line |
|---|---|---|
| Secrets kept | 11 real leak lines in 5 games. No secret fell before turn 3 in more than one game (Raffaello's debt g4 t2, LeNoir's purpose g4 t1, Francesco's affair g2, borderline). Giorgia and LeNoir's affair never leaked. Raffaello's debt reached LeNoir in 3 of 5 games, each time while explaining the boar letters | Nothing to flag ✓ |
| Probes predict play | Play was much gentler: 9 pointed questions at a secret-holder in 5 games, nothing like S5d's 8 escalating turns. Isabella held under LeNoir's questions (g1, g2). Lupo half-folded under LeNoir's pressure in company in g4 ("Isabella paid for silence"), the held-out probe's weak spot | Report |
| Memory: ★ captured | 88% (84 / 96 / 88 / 90 / 81 by game) | ≥90% ✗ |
| Memory: invented | 18 flagged: 5 a code error on deal attribution (fixed for future runs), 13 real clerk errors | 0 ✗ |
| Knowledge and spread | 80 checks for characters who didn't know the fact at the start: told 5, conclusion 1, suspicion 35, none 39 | Report |
| Coherence | ≤1 contradiction for every character in every game | ✓ |
| Flow | Everyone spoke, no stalls; ping-pong guard fired 41 times in 480 lines (9%; g4 14 in 96) | ✓ |
| Format | 100% valid on every call type, no defaults | ✓ |
| Real-history leakage | 0 | ✓ |
| Cost and time | Play $0.13–0.17 and 19–29 minutes per game ($0.74 total, ~1.8M tokens per game); judging $4.35; mini-game ledger $5.55 of $10 including dry runs | Report |

**Memory errors (gate 8):** the 13 real errors are mostly a *request* recorded as a *promise* by the person asking, or a summary that says more than its quote. Separately, 10–13 beliefs per game record a suspicion as a firm conclusion, which matters because knowledge checks count conclusions.

**Knowledge-check hand review:** LeNoir was told F2 by Raffaello in g3 and g4 (correct), so Raffaello's and LeNoir's plot points complete there and Isabella's fails. Lupo's "Mine's for hire, and I don't ask whose banner flies over the coin" (g5, to three people) was judged *told* for F5; defensible, but the secrets judge didn't count it as a leak. Giorgia's F5 *conclusion* in g3 is an overcall ("sells rather than serves"). Characters who knew a fact from their briefing often score *none*, by design: briefings are kept out of the check.

**Harness fixes made during scoring:** leaks heard only by people who already knew the secret are reported as "already known" and left out of the leak count (6 of Isabella's private lines to Lupo); deal entries now name the other party as `toward`; Raffaello counts as knowing F2 from the start (his plot point is to tell it).

**What it changes:**
- **Assumption #2 mostly holds.** The probes are a worst case; the one fold seen in free play matches a known probe weakness
- **Gate 8 is the blocker before the engine build.** Technical Design handoff: tighten blocks 10a and 10b. Re-test on the saved transcripts
- The engine loop (speaking order, designation with the ping-pong guard, movement, Il Notaio, two memory passes, knowledge checks, game records) works end to end at about $0.15 per 6-character game

### 2026-10-24 — Publication, grant application, and mini-game readiness

- **Repo public** with curated results: 147 judged run sets, rubric history, 3 transcripts per scenario, the pilot's config and metrics, and full scorer reports. Gitleaks found no secrets in any commit. Raw logs (267 MB) stay private
- **Rubric fingerprint:** v0.20 added the `cal5` listener rule to this doc's judging section, changing the rubric fingerprint. The only text difference from the v0.17 rubric is that bullet, which restates what the judge code applies, so the new fingerprint is registered as `cal5` r3. A test re-judge made no calls
- **Grant:** application submitted to Tinker's research grant program for $1,000 in credits (two experiments on DeepSeek-V4.1-Flash; budget ~$710 plus more research games). Judging stays self-funded on Claude Sonnet with batch pricing
- **Mini-game:** TD v0.5 and Characters v0.4 cover every prompt and briefing the spec needs. Left: copy both into the repo's `docs/`, point the harness config at them, and build the runner

### 2026-10-23 — Strategy probes S8–S10

**Setup:** TD v0.4 / Characters v0.3, `plot_reward` off, TD's real task prompts (9d plan, 9e Murder Round, 9f ballot, 9g run-off; `think()` and `speak()` where the item needs them). DeepSeek V4.1 with the claim, reply, and audience lines; Qwen3.8 stock; GPT-5.4 (reasoning off) on S8 only. S9–S10 judged side by side, each pair twice with order swapped, ties as half. Probe ledger $60.97 of $70.

**S8, rules reasoning:** 100% for all three models on all five items (pension trap, vote math, who knows what, faction limits, win precedence). Hand-checks agree. **Too easy:** Lupo's and Isabella's briefings state the pension and faction rules almost word for word, and the ballot prompt prints the vote-math answer.

**S9–S10, DeepSeek win rate against Qwen3.8:**

| Probe | DeepSeek wins | Order-swap agreement |
|---|---|---|
| S9a plan after a faction meeting | **85%** of 20 | 9/10 |
| S9b Lupo offered 4 Florins for his vote | **75%** of 20 | 9/10 |
| S10 Murder Round reasoning | 54% of 60 | 25/30 |

- **Plans:** both competent; DeepSeek ties more threads together (LeNoir plans to show Isabella the boar seal and court Raffaello for a pension). Neither model mentioned French money for a Dominican
- **Deals:** both mostly counter or pocket the coin (the ballot is secret); DeepSeek bargains up and probes for information, Qwen tends to insult the offer
- **Murder Round:** DeepSeek's Lupo always kills LeNoir plus a Medici; its Isabella kills LeNoir in 5 of 10. Qwen guards more (Isabella guards Francesco 6/10; LeNoir guards Emile 7/10). Stock models carry different default boldness
- **Legality:** 4 of DeepSeek's Murder Round answers took two acts where one was allowed (Isabella, LeNoir); Lupo legal in all 60. One rejected "bribe of 0 Florins" per model
- **Format:** every 9d–9g and `think()` call parsed strictly; no repairs. **Real-history leakage:** none
- **Plan length:** GPT-5.4 exceeded the 150-word limit in 16 of 20 plans; DeepSeek once, Qwen twice

**What it changes:**
- DeepSeek leads on strategy as well as secret keeping; the fine-tuning base question tilts further toward it
- Technical Design handoff: four wording fixes
- The Neutral baseline for Bold/Cautious depends on the base model's default boldness; measure it on the chosen base before training personalities

### 2026-10-23 — Held-out, regressions, and the audience line (DeepSeek)

**Setup:** DeepSeek V4.1 Flash, TD v0.4 / Characters v0.3, `cal5` r3. Probe ledger $59.26 of $63.

| Held-out (Lupo's public accusation) | Runs held | Median first-leak turn | Lie rate |
|---|---|---|---|
| DeepSeek, both lines | 1/10 | 4 | 3% |
| **DeepSeek, both lines + audience line** | **5/10** | 4 | 12% |
| Qwen3.8, both lines | 6/10 | 4.5 | 7% |
| GPT-5.4, no lines | 6/10 | 5 | 13% |

**Audience line** (block 9b, after the reply line): *"Whatever you say in a group, everyone present hears. A secret told to an ally in company is told to all; if an ally must know, tell them privately."*

Other results: GPT-5.4 with both lines holds S5d 10/10 (from 6/10). DeepSeek with both lines passes S6 (5/5 safe disclosure), S4 (0/5 leaked), and S1 (gate 1 100%); with all three lines S6 is still 5/5.

**Findings:**
- **Pressure from an ally in company is its own weak spot.** With two lines, DeepSeek's Lupo confessed to his employer's "Is any of this true?" in 8 of 10 runs ("I've killed men for coin"). With the audience line the admissions shrink to "I have killed" and are disputed in detail, but remain in 4 runs: "I'll not lie to your face." The model treats lying to its master as worse than confessing in company
- **Whether that is a leak depends on the briefing:** if Francesco already knows Lupo's trade, it isn't a secret from him (handoff to Characters)
- **No more single-call secret-keeping tweaks.** The mini-game shows how often this pressure arises in free play

### 2026-10-23 — `cal5` judge; prompt lines on DeepSeek and Qwen3.8

**Setup:** TD v0.4 / Characters v0.3. Judge Sonnet 5.5, rubric `cal5` r3, adaptive judging with caching. Lines tested: **claim line** in block 9a ("Separate what this person has shown you from what they only claim. A claim is not proof.") and **reply line** in block 9b ("Someone claiming to know your secret, or threatening you, is not a reason to confirm it. Never confirm a secret you have not chosen to reveal: refuse, deflect, or demand proof instead."). Probe ledger $56.47 of $58.

**Calibration:** first draft missed hedged hints and let a clue label block a listener "yes"; fixed (r2). It also counted plain refusals as admissions; fixed (r3), which re-judged 39 runs. The remaining drop from `cal4` is real: asking for silence, telling threats, conceding hints.

**Runs held of 10 under `cal5` (median turn of first leak, among leaking runs):**

| Model | S5b | S5d | Held-out |
|---|---|---|---|
| Qwen3.8, stock | 2 (5) | 0 (3) | 3 (4) |
| Qwen3.8, claim line | – | 1 (4) | 2 (4) |
| Qwen3.8, both lines | – | 1 (4) | **6** (4.5) |
| DeepSeek V4.1, stock | 4 (5.5) | 2 (3) | – |
| DeepSeek V4.1, claim line | 5 (8) | 4 (4) | – |
| **DeepSeek V4.1, both lines** | **7** (8) | **9** (3, one leak) | – |
| GPT-5.4, stock | – | 6 (5.5) | 6 (5) |

Qwen3.8 on Tinker (step-0, mostly single-pass): S5b 2, S5d 0, held-out 0; with claim line S5d 1, held-out 4. Lie rates: DeepSeek with both lines 14% / 21% (no rise); Qwen with both lines 29% on S5d (up from 19%). S6: DeepSeek disclosed safely 5/5 with and without the claim line; Qwen3.8 0/5.

**Findings:**
- **The lenient judge hid most concessions.** Under `cal5` every model holds less, GPT-5.4 included; the old 70% bar no longer means what it did
- **Prompt lines fix DeepSeek, not Qwen.** DeepSeek goes from 2/10 to 9/10 on S5d with both lines and pushes S5b leaks to the last turn; Qwen stays at 1/10 on S5d and lies more. Qwen's only gain is held-out (2 → 6)
- **Qwen breaks early** (median turn 3 on S5d, the opening bluff); GPT-5.4 and prompted DeepSeek break late, if at all
- **Caveats:** 10 runs each; the lines were developed on S5d, so DeepSeek's held-out result is still missing; GPT-5.4 was tested without the lines, so "beats the frontier" compares prompted DeepSeek with an unprompted ceiling

**What it changes:**
- Both lines handed to Technical Design (blocks 9a and 9b)
- Competence by prompt is viable on the development model; the restructure (competence by prompt, LoRA for Bold/Cautious) fits DeepSeek
- The fine-tuning base question tilts toward DeepSeek V4.1 on Tinker, against Qwen3.8's cost advantage

### 2026-10-23 — Capitulation Pilot: data, training, and evaluation

**Setup:** Qwen3.8-27B on Tinker, TD v0.4 / Characters v0.3, `plot_reward` off. Judge Sonnet 5.5, rubric `cal4`, adaptive judging, prompt caching on. Pilot spend $33.16 (cap $40).

**Data:** self-pairs failed (stock Qwen's "holds" mostly hint at the secret: "you shall hear the whole truth," "the act is buried with the dead"). Chosen replies were then written by GPT-5.4 (reasoning off) with an explicit holding instruction, and filtered by a listener question narrowed to Isabella's real secrets (acknowledging her public past allowed; asking for silence, bargaining, or offering to confess later counted as failures). Only 41 of 67 prompts produced a passing reply. **84 pairs**, all Isabella, mostly turns 2–3. Late-turn failures were genuine: after Qwen's earlier lines had given ground, even GPT-5.4 under instruction mostly bargained or pleaded.

**Training:** DPO, LoRA rank 32, 1 epoch, learning rate 1e-5, beta 0.1, 21 steps, about $2.40. Loss 0.69 → ~0.1, reward accuracy 100% from step 3: the pairs were learned quickly, mostly by raising the likelihood of GPT-5.4-style holds.

**Results (runs held of 10, Tinker, majority):**

| Check | Step-0 | Trained | Bar |
|---|---|---|---|
| Held-out (Lupo, public accusation) | 5 | 6 | +3 ✗ |
| S5d | 3 | 4 | +2 ✗ |
| S5b (LeNoir, not in training) | 10 | **6** | +2 ✗ (regression) |
| S5d with claim line | 6 | 6 | – |
| Held-out with claim line | **9** | 6 | – |
| S5a paid | 10/10 | 7/10 | within ~2 ✗ (borderline) |
| S6 safe disclosure | 0/5 | 0/5 | ≥60% ✗ both (rigid; not caused by training) |
| S4 leaked; gate 1 | 0/5; 100% | 0/5; 100% | ✓ |
| Lie rate (S5b / S5d / held-out) | 10 / 22 / 12% | 12 / 18 / 12% | ✓ |

**Hand-check of the trained model's "held" replies:** 2 of 9 clean; 5 quietly concede or bargain ("I pay for silence, and I pay now," "If Lupo's tongue is loose, his purse was light"); 2 borderline threats. No voice drift. The judge passed all of them, so absolute hold rates are optimistic for both models; the comparison is still like for like.

**Claim line, pooled across hostings (stock Qwen):** S5d 5/20 → 12/20 held; held-out 10/20 → 13/20 (OpenRouter 5 → 4, Tinker 5 → 9). Thought labels confirm the mechanism: with the line, private thoughts question the bluff about as often as they accept it (15 vs. 15 at S5d), against 6 vs. 22 without.

**Findings:**
- **"No effect" outcome.** The adapter learned its 84 pairs but the behaviour didn't carry to new scripts, and LeNoir got worse. Weak evidence against the premise (small, narrow, off-policy data), but it doesn't justify a larger data build
- **The cause sits upstream of the reply.** Models fold because their private thought accepts the bluff; training replies alone didn't change that, while one line in the thought prompt did
- **The judge under-calls quiet confirmations** (asking for silence, bargaining, threats that imply something to protect). Every gate 3 hold rate in this log is optimistic
- **Clean holding data is scarce** mid-conversation, even from a frontier model under instruction

**What it changes:**
- Training route for the competence **paused**. Recommended instead: the claim line (Technical Design handoff), rubric `cal5` for the judge, and the mini-game as the real test
- Proposed: competence by prompt for all variants; LoRA for Bold/Cautious only (Research Design)
- The many-games-per-GPU serving test waits until a trained personality adapter exists

### 2026-10-22 — Pilot Phase A: data yield, v0.4 baselines, ceiling, judge cost

**Setup:** TD v0.4, Characters v0.3, `plot_reward` off. Judge Sonnet 5.5, rubric `cal4` (reason before label; premise claims verified by code), adaptive judging (one pass; three on any run that leaked or was borderline). Qwen3.8 via OpenRouter; GPT-5.4 reasoning off. Pilot ledger $7.16 of $27; probe ledger $40.21 of $45.

**Data yield, original plan (stock Qwen leaks vs. DeepSeek honest holds):** first trial on TD v0.3 yielded 1 leak in 96 replies (scripts lacked bluffs and threats); revised scripts raised it to ~25%. On TD v0.4 / Characters v0.3, three trial rollouts yielded 2 pairs: Qwen mostly holds honestly or lies, and DeepSeek folds or lies at the same turns. Stock Qwen invents alibis readily under alibi pressure (up to 17 of 24 replies were lies).

**Baselines on TD v0.4 / Characters v0.3 (runs held of 10):**

| | S5b | S5d | Held-out (Lupo, public accusation) |
|---|---|---|---|
| Qwen3.8-27B | 7 | **2** | 5 |
| DeepSeek V4.1 Flash | 7 | **2** | – |
| GPT-5.4 (ceiling) | – | **10** | 8 |

Lie rates (share of turns): Qwen 10% / 20% / 25%; DeepSeek 11% / 26%; GPT-5.4 12% / 12%. Qwen offered money in 4 S5d runs though Bartolo refuses it. Leaks cluster at the bluff (turn 3), sworn or forged evidence (turn 5), and threats (turns 7–8); GPT-5.4's two held-out leaks were both the demand to swear before company.

**Judge cost:** Sonnet is ~83% of all OpenRouter spend; the candidate models together cost under $5. Haiku 5.5 as a single-pass judge agreed with Sonnet's majority on 110 of 133 runs (83%): 17 false leaks, 6 missed leaks (9% of Sonnet's leaks). Judge calls don't use prompt caching; the static part is ~57% of input. Projected cost per 100 judged runs: Sonnet only $6.55; with caching $4.60; with Anthropic's batch API $3.30; both $2.30. Haiku first with Sonnet on flagged runs: $1.75 with both, but misses ~9% of leaks.

**Findings:**
- **On current prompts the open models are level on secret keeping, and both fold on S5d.** DeepSeek's earlier S5b lead (22/30 on TD v0.2) isn't visible on v0.4 at 10 runs. Small samples; cross-version comparisons aren't valid
- **S5d is a fair bar:** a frontier model holds it 10/10. Folding under sustained pressure with no way out is the shared gap, so the competence adapter matters for every base, the development model included
- **Data from another model doesn't work** when that model folds too; the model's own holds are the better source
- **Haiku is not good enough as a screen** for gate 3 verdicts. Caching and batching save more without changing the judge

**What it changes:**
- Pilot data switches to self-pairs on new Isabella scripts (Capitulation Pilot, Data)
- Judging: add prompt caching to judge calls now (works through OpenRouter, ~30%); batching for research-scale judging, which needs a direct Anthropic API key
- The development-model choice stands for now (fewer contradictions, better addressee use, lower cost); the mini-game is the next comparison

### 2026-10-22 — Assumption Tests steps 1c and 1b: DeepSeek V4 Flash; `cal3` re-judge

**Setup:** V4 Flash (April snapshot `deepseek-v4-flash`) on **Parasail**, fp8, seed on, S4–S7 on TD v0.2 (DeepInfra rate-limited it almost completely). Re-judge under rubric `cal3` (payment for silence while denying is not a leak), majority of three; only runs where some `cal2` pass marked a leak were re-judged (83 of 130). Spend after both: $35.52 of $45.

**V4 Flash vs. V4.1 Flash (`cal2`, before the re-judge):** S4 0% / 0% leaked; S5c 10% / 0%; S6 100% / 90%; gate 5 pass / pass; contradictions 5 / 1; addressee false positives 91 of 250 / 29 of 570.

**Runs held under `cal3`, majority of three** (bar ≥70%):

| Model | S5a `cal2` → **`cal3`** | S5b `cal2` → **`cal3`** | S5a paid |
|---|---|---|---|
| DeepSeek V4.1 Flash | 17/30 → **27/30** ✓ | 21/30 → **22/30** ✓ | 25/30 |
| DeepSeek V4 Flash | 5/10 → **10/10** ✓ | 6/10 → 6/10 ✗ | 7/10 |
| Qwen3.8-27B | 4/10 → 5/10 ✗ | 3/10 → 5/10 ✗ | 7/10 |
| Qwen3-235B-A22B | 3/10 → **8/10** ✓ | 0/10 → 0/10 ✗ | 8/10 |
| GPT-5.4 (ceiling) | 8/10 → **10/10** ✓ | 6/10 → 6/10 ✗ | 4/10 |

DeepSeek V4.1 S5a includes Dylan's hand verdict on run 10 (leaked), overriding a `cal3` majority whose passes contradicted their own reasons or misstated who raised the brother. "Paid" combines judge labels with structured bribe actions for runs not re-judged, so it may miss spoken offers there.

**Findings:**
- **DeepSeek V4.1 Flash is the only model to pass gate 3.** S5b separates the field: LeNoir confesses under Francesco's threat on every other model, GPT-5.4 included
- **Under `cal3`, S5a mostly measures paying the blackmailer** (70–83% of runs for most models). GPT-5.4 is the exception: it holds all 10 while paying in 4, refusing instead. S5a stops being a capitulation test, so S5d replaces it in gate 3
- **Judging is steadier:** passes disagree on 1 of DeepSeek's 30 S5a runs, down from 11. The consistency check still missed run 10 (phrase matching), so it's being rebuilt
- **Assumption #4 mostly holds:** holding up under pressure looks like a DeepSeek family trait. V4.1's accurate addressee field and low contradiction count are specific to that release
- **Backup base:** V4 Flash is a same-family fallback if V4.1 is retired (assumption #5), with weaker S5b and more contradictions

**What it changes:**
- **DeepSeek V4.1 Flash is settled as the development model;** no more probes of it are planned
- **Next is the Capitulation Pilot,** to find out whether a LoRA makes a cheaper base viable. S8–S10 wait until after it
- Gate 3 gates on S5b and S5d; S5a's payment rate becomes a Bold/Cautious baseline

### 2026-10-22 — Assumption Tests step 1: S1 on TD v0.3; DeepSeek 30-run check

**Setup:** DeepSeek V4.1 Flash (`-1017`), same provider pin as before. S1 on **TD v0.3** prompts (blocks 1–3 as a system message, no contact list in `think()`); S5a/S5b runs 10–29 on **TD v0.2** prompts, for comparison with runs 0–9. Judge Claude Sonnet 5.5 at default sampling, rubric `cal2`, majority of three passes. Spend after this round: $27.27 of $35.

**Gate 1 (S1, TD v0.3):** **100% / 100% / 100%** (strict / revised / repaired), against 7.5% / 65% / 65% on v0.2. `think()` averages **~103 output tokens** (390 on v0.2). Thinking-off pre-flight passed; the system-message layout works. **Gate 1 passes.**

**Assumption #3 (runs held, majority of three):**

| | Runs 0–9 | Runs 10–29 | Pooled (30) | Bar |
|---|---|---|---|---|
| S5a | 7/10 | 10/20 | **17/30 = 57%** ✗ | ≥70% |
| S5b | 7/10 | 14/20 | **21/30 = 70%** ✓ | ≥70% |

For comparison (10 runs each): Qwen3.8-27B 4 and 3, Qwen3-235B 3 and 0; GPT-5.4 ceiling 8 and 6.

**Findings:**
- **DeepSeek's first S5a result was a lucky draw.** Over 30 runs it fails S5a; S5b holds, exactly at the bar
- **Its lead over the other open models is real,** by a wide margin on both scenarios
- **No tested open model passes S5a.** Capitulation to the "Lupo told me" bluff is a gap across the field, which makes the Capitulation Pilot more important, not less
- **Judge reliability is the weak point:** passes split on 11 of 30 S5a runs (late or partial admissions). An accidental second majority vote on runs 0–9 (a harness bug, since fixed by fingerprinting the rubric text) gave the same totals, 7 and 7, but flipped two runs in each. Totals are stable; individual borderline verdicts are not
- **Assumption #4 (V4 Flash) blocked:** DeepInfra returned 429 on 128 of 138 calls after retries, and on 5 of 6 single calls. No results, no cost

**Disputed runs, hand review (Dylan, Oct 22; rule `cal3`):** of the 11 S5a runs where judge passes split, 10 turned on whether offering hush money while denying counts as a leak. Under `cal3`: **run 10 leaked** (at turn 6 Isabella says LeNoir is "a man grieving his brother" before Bartolo has linked the victim to him, an accidental leak); **runs 2, 4, 6, 7, 8, 9, 11, 14, 25, 26 held** (payments or bargaining with denial; run 25's "broke one oath to me" is too vague to point anywhere). The rule was chosen after seeing that it raises DeepSeek's S5a, so it is applied to every model and every run, payment rates are reported beside hold rates, and S5b and the pilot's held-out script are the independent checks.

**What it changes:**
- **Development model stays DeepSeek V4.1 Flash.** It's still the best open model tested; nothing reopens the field, so S8–S10 stay a sanity check
- **Before the pilot, firm up the partial-admission rule** (Run order step 1b)
- **V4 Flash moves to another provider** of the same snapshot (Parasail, GMICloud fallback)

### 2026-10-21 — S4–S7, all six candidates; majority judging, bluff line, ceiling

**Setup:** TD v0.2 prompts, Characters v0.2, raw output, temperature 0.7 (GPT-5.4: provider default, which rejects 0.7). Judge Claude Sonnet 5.5 at default sampling (logged as temperature 0 until Oct 22; the model rejects it), rubric `cal2` (calibrated on Qwen3.8 S4/S5a and hand-checked). Spend after this round: $22.85 of $30.

**Gate 3 and gate 5, single judge pass (`cal2`), all six:**

| Model | S4 leaked | S5a held | S5b held | S5c leaked | S6 disclosed safely | Clues volunteered | Gate 4 contradictions | Gate 5 |
|---|---|---|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | 0% | 40%* | 70% | 0% | 90% | 6 | 1 | **pass** |
| Qwen3.8-27B | 0% | 40% | 30% | 10% | **10% (rigid)** | 8 | 3 | **pass** |
| Qwen3-235B-A22B | 0% | 30% | 0% | 10% | 100% | 12 | 0 | **pass** |
| Qwen3.6-35B-A3B | 0% | 10% | 70% | 0% | 80% | 4 | 0 | fail |
| Qwen3.5-122B-A10B | 0% | 20% | 10% | **50%** | 70% | 13 | 13 | fail |
| Gemma 4 31B | 0% | **0%** | 10% | 0% | 100% | 1 | 0 | fail |

\*Superseded by the majority result below. Bars: S4 and S5c ≤10% leaked; S5a and S5b ≥70% held; S6 ≥60% (below is "rigid," flagged not failed).

**Finalists (S5a/S5b by majority of three judge passes; runs held of 10; pass ≥7):**

| Model | S5a | S5a + bluff line | S5b | S5b + bluff line |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | **7** | 6 | **7** | **9** |
| Qwen3.8-27B | 4 | 3 | 3 | 4 |
| Qwen3-235B-A22B | 3 | 2 | 0 | 0 |
| GPT-5.4, reasoning off (ceiling) | **8** | – | 6 | – |

**Findings:**
- **Secret keeping is the hardest gate, as expected.** Light pressure (S4, S5c) is handled by almost every model; heavy interrogation is not. Nearly every leak is a *capitulation*: the character believes the bluff ("Lupo already told me") or pays the blackmailer, usually at turns 3–4
- **DeepSeek V4.1 Flash is the only model to pass both S5a and S5b,** at the bar on each. Its S5a pass rests on a split judge: the three passes disagreed on 6 of its 10 runs (borderline, late, partial admissions). It also has the most accurate `speak()` addressee field, one contradiction, and the lowest cost per call (~$0.0002)
- **The ceiling shows the bar is hard but reachable.** GPT-5.4 holds S5a (8/10) but fails S5b (6/10): LeNoir confesses the affair under threat even on a frontier model. DeepSeek matches it on this task. LeNoir's briefing says he "struggles to hide what he feels," so S5b partly tests character fidelity, not only secret keeping
- **The bluff line** ("Others may bluff… a claim is not proof") didn't reliably help: DeepSeek S5b improved 7 → 9, S5a slipped 7 → 6; the Qwen models moved by a run at most. One sentence doesn't fix capitulation
- **Judge variance:** single passes swung DeepSeek's S5a between 4 and 7 runs held; majority of three is needed for close calls. Elsewhere passes disagreed on 0–2 runs in 10. This matters for research-scale judging cost later
- **Self-incriminating clues:** several models volunteer the silver boar or the north chapel unprompted (Qwen3-235B and Qwen3.5 most). Not leaks under the rubric, but in a real game they hand LeNoir the answer
- **Gate 5:** DeepSeek, Qwen3.8, Qwen3-235B notice Il Notaio's withdrawals and raise urgency toward the pair; Gemma, Qwen3.5, Qwen3.6 do not, by the plan's measures
- **Qwen3.6** also aborted 6 of 10 S5a runs on `speak()` format (plain text instead of JSON)
- **Addressee:** most models name the interlocutor on nearly every line (up to 189 false positives in 250 for Qwen3-235B), which in a Capannello would force them to answer. DeepSeek (1 false positive in 110) and GPT-5.4 (17 in 160) set it correctly

**What it changes:**
- **Recommended development model: DeepSeek V4.1 Flash (`-1017`)**, pending Dylan. Gate 1 to be confirmed on the S1 rerun under TD v0.3
- The fine-tuning base question is unchanged in kind but sharper: the best secret keeper is a large MoE model (552B total, 16B active), affordable to fine-tune only through Tinker (see Fine-Tuning Paths)
- Gate 3's "Deceptive" trait is where fine-tuning has the most to offer; capitulation under bluff and threat is the target behaviour
- Technical Design handoff: tighten the `speak()` addressee instruction

### 2026-10-21 — S2 and S3, all six candidates

**Setup:** as for S1 (TD v0.2 prompts), raw output only; DeepSeek now pinned to the `-1017` snapshot (pre-flight and S1 rerun, no errors). "Other living guests" confirmed to include present characters, so S1 omissions were genuine model errors and no rescore was needed. Spend after S3: $0.76.

**Gate 2 — pass, all six** (LeNoir's median importance S1 → S2; SD across S1–S2):

| Model | LeNoir S1 → S2 | SD |
|---|---|---|
| Gemma 4 31B | 20 → 90 (+70) | 25.2 |
| Qwen3.8-27B | 15 → 85 (+70) | 28.2 |
| DeepSeek V4.1 Flash | 25 → 72 (+47) | 18.4 |
| Qwen3.5-122B-A10B | 35 → 75 (+40) | 19.4 |
| Qwen3-235B-A22B | 45 → 85 (+40) | 19.3 |
| Qwen3.6-35B-A3B | 35 → 65 (+30) | 15.1 |

- Gemma's flat S1 scores were coarse, not unresponsive. Qwen3.6 passes exactly at the line because it rates small talk at 35; it may make conversations noisier

**Gate 1 (raw, repaired level; pending TD v0.3):**

| Model | S1 | S2 | S3 | Top-3 without purpose (S3) |
|---|---|---|---|---|
| Qwen3.8-27B | 100% | 97.5% | 92.5% | 2.6% |
| Qwen3.5-122B-A10B | 95% | 97.5% | 97.5% | 2.5% |
| Qwen3-235B-A22B | 95% | 92.5% | 97.5% | 2.5% |
| Gemma 4 31B | 100% | 85% | 90% | 10% |
| Qwen3.6-35B-A3B | 92.5% | 90% | 97.5% | 0% |
| DeepSeek V4.1 Flash | 65% | 85% | 92.5% | 7.5% |

- Almost all remaining failures are contact-list content (a top-three contact without a purpose; factions listed as contacts by Qwen3.8), which TD v0.3 removes. Two non-JSON replies (Qwen3.6, Qwen3.8, one each)

**S3 — `done` preview (gate 7):**
- Isabella ends the Colloquio once paid in 90–100% of samples on every model. `done` was always a boolean inside the Colloquio and null in Capannelli across S1–S3, so models switch it correctly
- **Lupo's rates (26–85%) aren't meaningful:** his plot point needs 5 Florins and he has 3, and his thoughts say so ("three toward the five I need"). A scenario flaw, not a model one

**What it changes:**
- Gate 2 doesn't separate the models; gates 3 and 5 (S4–S7) will
- Technical Design handoff: the payment appeared in History as `[Contessa Isabella gave Lupo 3 Florins.]`; TD has no format for transaction lines yet

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

# Capitulation Pilot: results (no effect)

**Question:** can a small LoRA trained with DPO teach a cheaper open model (Qwen3.8-27B) to stop giving up its secrets under interrogation?

**Answer from this pilot: no measurable effect.** It's weak evidence against the idea, because the data was small, Isabella-only, and mostly from early turns.

## Training

| Setting | Value |
|---|---|
| Base | Qwen/Qwen3.8-27B on Tinker, rendered without thinking (`qwen3_8_disable_thinking`) |
| Method | DPO, LoRA rank 32, learning rate 1e-5, beta 0.1, 4 pairs per step, 1 epoch (21 steps) |
| Data | 84 pairs from 41 prompts, all Contessa Isabella, mostly turns 2–3 (TD v0.4 / Characters v0.3) |
| Rejected | Stock Qwen3.8's own leaks on the prompt |
| Chosen | A GPT-5.4 reply (written with a "hold the secret" instruction added to its system prompt only) that Claude Sonnet judged not to confirm, admit, or imply a real secret, and not a lie |
| Tokens and cost | 504k training tokens; about $2.40 (estimated from Tinker prices) |
| Curve | DPO loss 0.69 → about 0.1, pair accuracy 100% from step 3, final margin about 2 (mostly from raising the chosen replies) |

Config and per-step metrics: [dpo1-config.json](dpo1-config.json), [dpo1-metrics.jsonl](dpo1-metrics.jsonl).

Data had to be built three ways before 84 clean pairs existed. Pairs with chosen replies from another open model (DeepSeek V4.1) failed because it folded as often as Qwen. Self-pairs (Qwen's own holds against its own leaks) failed because 9 of 20 hand-checked "holds" quietly confirmed the secret. Under sustained pressure, even GPT-5.4 with an explicit instruction mostly bargained or pleaded once the conversation had given ground.

## Before and after (runs held of 10, rubric cal4, both served on Tinker)

| Check | Untrained (step-0) | Trained | Bar | Met? |
|---|---|---|---|---|
| Held-out (Lupo, public accusation) | 5 | 6 | +3 | no |
| S5d (Isabella, no price) | 3 | 4 | +2 | no |
| S5b (LeNoir) | 10 | 6 | +2 | no (regression) |
| S5d with the claim line | 6 | 6 | – | – |
| Held-out with the claim line | 9 | 6 | – | – |
| S5a paid runs | 10 | 7 | within ~2 | borderline |
| S6 safe disclosure | 0/5 | 0/5 | ≥60% | no (both; a Qwen trait) |
| S4 leaked | 0/5 | 0/5 | ≤10% | yes |
| S1/S2 format (gate 1) | 100% | 100% | ≥95% | yes |
| Lie rate (S5b / S5d / held-out) | 10 / 22 / 12% | 12 / 18 / 12% | not higher | yes |

A hand-check of 9 "held" replies from the trained model found 5 quiet confirmations the cal4 judge passed. That led to rubric cal5.

The untrained model's private thoughts took the S5d bluff as fact in 20 of 30 cases, and the trained model's in 26 of 30. The pairs trained only the spoken reply, never the thought.

**What beat training:** one prompt line in `think()` ("Separate what this person has shown you from what they only claim. A claim is not proof.") moved the untrained model further than training did. On the development model, DeepSeek V4.1, prompt lines alone reach S5d 9/10 under the stricter cal5 judge. See [../probe-runs.md](../probe-runs.md).

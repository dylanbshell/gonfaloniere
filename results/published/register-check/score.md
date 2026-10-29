# The register check: Dylan's blind read, scored

CC-20261029-01. Dylan marked [read.md](read.md) with nothing but the text in front of him. Each mark is scored here against [key.md](key.md). The marks are the ticked boxes in read.md, and they match the list he gave:

- Spoken lines: 2, 4, 5, 6, 8, 12, 13, 14, 20, 22, 23, 27
- Thoughts: 1, 4, 6, 7, 10, 12, 17, 19

To rescore, run `npm run minigame:score -- --read read.md --key key.md`.

## Marked hard to follow

| | Baseline (TD v0.19) | New (TD v0.27) | Difference |
|---|---|---|---|
| Spoken lines (15 a side) | 11 | 1 | 10 fewer new |
| Thoughts (10 a side) | 6 | 2 | 4 fewer new |

- Spoken lines marked, baseline: 2, 4, 5, 6, 8, 13, 14, 20, 22, 23, 27. New: 12.
- Thoughts marked, baseline: 1, 4, 6, 10, 12, 19. New: 7, 17.

Technical Design's count is the same: 11 against 1 for lines, and 6 against 2 for thoughts.

## The bar

The decision rule is from Models & Research v0.45: adopt if at least 5 fewer new lines than baseline lines are marked hard to follow, and no guardrail flags.

- **The read clears the bar.** 10 fewer new lines were marked, and the rule asks for at least 5. The thoughts aren't part of the rule; they are reported beside it.
- **One guardrail flagged.** The share of took: insult fell from 11.6% to 4.8% ([measures](#guardrails-from-the-register-check)). Every insult reading on both sides is in [labels.md](labels.md), together with every admission reading and 10 pressure readings from the new games.

## Guardrails from the register check

These are carried over from CC-20261028-09; the full tables are in that report.

| Guardrail | Baseline | New | Flag |
|---|---|---|---|
| took: insult share | 11.6% (60 of 516) | 4.8% (28 of 580) | **flag**: it halves and moves 6.8 points |
| took: admission share | 0.8% (4) | 4.8% (28) | no: 6× the share, but it moves only 4.1 points |
| Knowledge checks: knows / suspicion / told_by named | 0 / 9 / 0 | 0 / 7 / 0 | no |
| Repairs and retries on think() and speak() | 0 | 0 | no |

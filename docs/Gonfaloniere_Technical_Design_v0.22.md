# Gonfaloniere
## Technical Design — Working Document
### Version 0.22

---

## Changes in v0.22

*Dylan, Oct 27: design the lore store now, switched off by default, so it can be built alongside the engine.*

- **New section, Storage and retrieval.** It specifies what the doc had only implied: memory rows live in PostgreSQL, each stored with an embedding, and recall finds the nearest ones with `pgvector`. The embedding model is a run setting, and isolation is enforced inside the database query
- **New section, The lore store.** It replaces the deferred v0.5 plan:
  - public and per-character private lore in the same database, retrieved the same way
  - only entries approved by Dylan and checked against the Characters doc's Shared Canon are loaded
  - raw real history stays out of the engine
  - a separate prompt section ("WHAT YOU KNOW OF FLORENCE", up to 3 entries) is inserted only when `lore: on`
- **New run settings:** `lore` (`off` by default) and `EMBEDDING_MODEL_*`. With `lore: off`, every prompt is exactly as in v0.21
- Blocks 9a–9g and 10a–10d are unchanged

## Changes in v0.21

*Dylan, Oct 27: log label probabilities as a hedge, with no change to play.*

- **New run setting `logprobs`** (default `labels`): where the provider supports it, `think()` and `speak()` calls ask for log probabilities. Code stores the top 5 candidates and their probabilities at the token where the `took` or `meant` label is written. The prompt and the label used are unchanged, and nothing reads the probabilities during play. They're a research record: how close the runner-up was (for example, pressure 55% against threat 30%), which may later serve as a finer personality measure than the label alone
- **Never required:** if a provider doesn't return them, the field is null and the call is otherwise normal. Provider choice, and whether to prefer providers that return them, is Models & Research's call (tracker handoff)
- Blocks 9a–9g and 10a–10d are unchanged

## Changes in v0.20

*Clears Models & Research's "Block 9c fixes" handoff (Oct 24), and records the v0.19 baseline result (report CC-20261026-05). The labelling prompts are unchanged.*

- **Block 9c no longer names a target before there is one.** "Go to wherever {target} is now" and "call {target} aside" become "the guest you name". The runner had been filling "your target"
- **`{colloquio_note}` is removed.** It could only be known after the choice, so it was always empty and no game ever showed it. The check moves to validation instead: a `join` toward someone already in the character's own group becomes `stay`, logged, and the movement window is used. Play is unchanged, since the note never reached a prompt
- **v0.19 baseline recorded** (Open Questions): with bare label words, threat rose from 1.3% to 5.5% of `took`, pressure fell from 32.2% to 25.7%, and `none` fell from 40.9% to 30.7%. Fit was 27 of 30 on both samples, and the per-label cap held in all 798 block 6 calls. One short description could swing a label's share several-fold. Per Models & Research v0.38, v0.19's mix is the research baseline and goes to the first full games unchanged
- **Four questions from the build, answered with no change:** `none` at 30.7% is accepted, since the cap protects block 6. Pressure absorbing a few jabs (3 in 30) is within the fit bar. Bare "threat" covering warnings and taunts is the character's own reading, which is the point. Whether the judge's "deliberate" reveals count as sources is Models & Research's call
- Blocks 10a–10d are unchanged

## Changes in v0.19

*Dylan, Oct 26: a symmetric baseline. Every label description added since v0.12 moved its own label's share: `insult` jumped to about 10% on arrival, `pressure` took a third of all labels with three examples and barely gave ground when they were cut, and threat swung from 14% to 4% to 1% as its neighbours' descriptions changed. So the prompt's wording was setting the ratios as much as the characters were. The ladder also made three labels an ordered scale, while the other five stayed plain categories. v0.19 treats every label alike, and is tested once (a 2-game play-only run) to measure how sensitive the model is to that wording. This overrides Models & Research v0.37's "one final adjustment" rule by Dylan's decision; nothing had run on v0.18.*

- **Nine bare words in both labelling prompts:** promise, deal, threat, admission, claim, denial, insult, pressure, or none. The only other text is "It's your own reading, not a rule" (or "It's your own call") and "Most lines are none". Neither singles out a category. The ladder, the label descriptions, "if it chills you" / "if you mean it to frighten", and "a plain question is none" are all removed
- **The memory cap is symmetric:** in block 6's similarity fill, at most 3 readings of any one non-★ label (claim, denial, insult, or pressure) per call, own readings included. It replaces v0.17's pressure-only cap and guards against whichever label dominates, without favouring any
- **Kept:** ★ status (promise, deal, threat, admission, payments, pensions) and its retrieval priority. They're code-side and don't touch the prompt
- **Why bare words should work now:** the misfiling v0.14 showed came from missing vocabulary, not missing descriptions. With `pressure` and `insult` available as words, plain English can do the sorting
- Blocks 10a–10d are unchanged

## Changes in v0.18

*The one final adjustment that Models & Research v0.37's decision rule gives Technical Design, after report CC-20261026-03. This version goes to the first full games untested. v0.17's narrowed `pressure` barely moved the mix: 32.2% of `took` (target 10–25%) and 42.7% of `meant` (target ≤35%). But the labels fit: 18 of 20 hand-read pressure readings really were the speaker pushing someone to answer or act, and fit was 27 of 30 for own readings and 26 of 30 for others'. The retrieval cap held in every block 6 call (0 of 828 over 2). The real problem was elsewhere: threat collapsed to 1.3% of `took`, against 14.4% on v0.14, because a conditional threat ("pay, or the city hears") both pushes and threatens harm, and characters chose pressure.*

- **The threat description now covers conditional threats:** "threat (harm to come, even if only 'or else')" in both labelling prompts. A threat is the core of blackmail, so it has to stay ★ and reach the Murder Round's retrieval, which puts ★ threats first. Pushing backed by harm is a threat; pushing alone is pressure
- **`pressure` is left as it is.** Its rate looks like how often these characters really interrogate each other, not a labelling error: the hand-reads fit, and the cap keeps block 6 safe at any rate. Its share should fall a little as conditional threats move back to threat. Models & Research's 10–25% target was a guess set before the label existed; whether the full games' mix is acceptable is theirs to judge
- **The pressure cap counts own readings too,** as built: it guards space in block 6, and an own pressure reading is no more a commitment than anyone else's
- **"Gloss" is renamed "label description"** in the doc's current rules, the more standard term (changelogs keep their wording)
- Blocks 10a–10d are unchanged

## Changes in v0.17

*From report CC-20261026-01 (Claude Code, PR #12 at 7086466: a 2-game play-only check of v0.16, plus a leak re-score). The ladder did its job on threats: 16 of 19 hand-read threats were harm to come, against 9 of 15 on v0.14. But `pressure` overshot. It took 33.8% of all `took` calls (about 60% of labelled ones) and 47.4% of `meant`, draining claim, threat, insult, and deal, and it would fill most of block 6's similarity slots. Fit was 24 of 30 on both samples. This is the priming risk v0.16 flagged: the ladder sentence gave `pressure` three examples, and examples attract.*

- **The ladder's `pressure` gloss is narrowed** from "leaning on you with a pointed question, a demand, or a dare" to "pushing you to answer or act" ("pushing them" in `speak()`). It describes what pressure does, with no list of examples to attract lines. Refusals, rebukes, statements of intent, and bargains, which the hand-reads showed being filed as pressure, don't push anyone to answer or act, so they fall back to their own labels or to `none`
- **Block 6 caps pressure readings at 2 per call** in the similarity fill (step 3), so however often characters use the label, it can't crowd out claims, beliefs, and code entries. It costs no calls and needs no prompt change
- **Veiled warnings stay the character's call.** "Mind what hunts back" landing as pressure for one character and threat for another is the personality signal the ladder exists to show, so TD doesn't settle it
- **The leak flag is resolved:** on re-scoring, v0.14 had 6 leaks against Oct 24's 4, not 16 against 7. Most of the surplus was Raffaello's debt repeated to people who already knew it
- Blocks 10a–10d are unchanged

## Changes in v0.16

*Dylan, Oct 26. It replaces v0.15's scope line before anything has run on it.*

- **New label `pressure`** (not ★): someone leaning on you, through a pointed question, a demand, a dare, or a challenge. In the v0.14 re-check these made up 13 of the 60 hand-read readings, about 1 in 5. 8 were filed as threats, taking ★ slots, and 5 as claims. v0.15's scope line would have filed them as `none`, so the character would forget them. But "LeNoir pressed me about the boar seal" is exactly the kind of thing worth remembering in this game
- **Hostility is a three-step ladder,** `insult` → `pressure` → `threat`, shown to characters as one line in both labelling prompts: "For hostility there are three steps: insult (a slight), pressure (leaning on you with a pointed question, a demand, or a dare), threat (harm to come). A plain question is none." It's the only gloss on any label. The re-check's misses fell exactly on these boundaries, and the line shows them as steps, leaving which step a line is to the character. It's also where personality should show most: a paranoid character moves lines up the ladder, an easygoing one moves them down
- **Untested, like v0.15's line:** checked in the first full games' hand-read. The pressure–threat boundary is the new thing to watch
- Blocks 10a–10d are unchanged

## Changes in v0.15

*From the v0.14 re-check (Claude Code, PR #12 at 8800ac4: 4 DeepSeek mini-games, seeds 2000–2003, with Models & Research v0.34's bars). Attachment passed everywhere: 0 wrong-line readings in 518, all 60 hand-read readings on the right line, words found 99.2% (`speak()`) and 95.5% (`think()`), and 0 repairs on either call. Two **fit** bars failed: own readings fit the speaker's thought 21 of 30, and others' readings 23 of 30 (bar 26). The cause is vocabulary, not attachment. "Threat" went on dares, challenges, and demands the thought itself called "a soldier's dare" or "pressing", and "claim" went on questions and demands. Leak lines rose from 7 to 16 against Oct 24's seeds, 10 of them Raffaello's plot-tied debt. That's Models & Research's call.*

- **A scope line for `none`** in both labelling prompts: "A question, a demand, or a dare is none unless it also carries one of these." It isn't a definition of any kind. It names the three things the re-check showed have no word, so characters stop forcing them into threat or claim
- **Block 9b's `meant` line gains 9a's guidance** in the speaker's terms: "if you mean it to frighten, it's a threat"
- **The target after an own line is reworded** to "how you take the line of {speaker}'s you were answering". Six hand-reads had read "{speaker}'s last line" as a reply to the character's own line
- **"This conversation" now starts at the character's latest arrival.** A character who returns from a Colloquio isn't asked about lines from before they left (18 stale targets, none stored)
- **Quoted words drop trailing sentence punctuation** before an "…" (no more "both.…")
- **Written up from v0.14's build:** when words match both an earlier line by the named speaker and a different speaker's line, the same-speaker match wins and the reading stays
- **No dedicated re-check for this version.** Spend is near the caps (mini-game ledger $32.06 of $35; the OpenRouter key has $24.55 left of $150). The fit bars move to the first full games' hand-read, or a cheap 2-game play-only run if Models & Research prefers (Open Questions)
- Blocks 10a–10d are unchanged

## Changes in v0.14

*From Claude Code's v0.13 build and dry run (PR #12 at ea5198d: 1 game, 3 turns, $0.04). Own readings came only from `speak()`, as designed: 12 of 12 labelled speech lines, all words found. Every `think()` after an own line named the answered line (36 of 36). Repairs were 0 for both calls, and `speak()` output rose about 9 tokens per call. This version defines the 4 cases the build left open. Prompts change only in the `{took_target}` none text.*

- **Words from an earlier line by the same speaker** count as the same remark. The reading stays on the named line and quotes the words found, logged as "same speaker, earlier line". Only words from a *different* speaker's line drop the reading. In v0.12 these were 18 of 80 fallbacks and mostly harmless: a speaker's run of lines is one argument, and "speaker: words" stays true
- **The wrong-line search covers every line the character heard tonight,** in any conversation. If the words match several lines, the latest is logged. That's broader than the target rule, which looks only in the current conversation, on purpose: a label about a line remembered from elsewhere still doesn't belong on the named line
- **The `{took_target}` none text** is now "nothing yet, since no one else has spoken here since you arrived". The old text pointed at the character's own line when they had spoken first. The label is still ignored
- **The closing think after the character's own closing line stays.** It labels nothing new, since the other guest's line is usually labelled already and their own line was labelled in `speak()`. But it gives a final thought on how the Colloquio ended, which goes to shortTermHistory and the thought pass. It costs one `think()` per Colloquio
- Blocks 10a–10d are unchanged

## Changes in v0.13

*From the v0.12 re-check (Claude Code, PR #12: 3 DeepSeek mini-games plus seed 2003, $0.46). It failed its pass bars, and the cause is one finding. When the prompt named the character's own line, the `words` showed which line the label was really about: in 52 fallbacks it was the other speaker's earlier line, and the thought was about that line too. After speaking, a character's `think()` reacts to the line it was answering, not to its own. Own-line hand-read: right line 14 of 30, key part kept 14 of 30. Everything else held: mixed readings fit 28 of 30, 0 `think()` repairs in 926 calls, and `insult` did its job (every hand-read insult was a slight in the thought, and it took share mainly from claim and threat).*

- **Own lines are labelled in `speak()`,** the fallback v0.9 and v0.10 set aside. Block 9b gains `meant` (the same eight words as `took`) and `words` (the words of the character's own line that carry it). The speaker labels the line as they say it, when the intent is in hand. Own readings come only from this
- **`think()` after the character's own line now names the line they were answering:** the last line by someone else they heard in this conversation. That's what the model was labelling anyway. The "first label stands" rule makes it a no-op when they already labelled that line, which is the usual case
- **Words found in a different line drop the reading,** logged as "wrong-line words", rather than storing a label on a line it wasn't about. Words found in no line still fall back to the trim, as before
- **The word cap is raised from 12 to 20.** The median was 10 words, but the 12-word cut dropped the point in 17.5% of labelled calls (it often comes at the end of the line). Cut-then-check stays
- **Defined:**
  - a words fallback is a health metric, not a repair, so `think()` and `speak()` repair rates stay comparable
  - matching respects word boundaries and doesn't normalize dashes or "…", as built
  - "heard in this conversation" means the current conversation only
- **The pass bars live in Models & Research's doc,** which owns the test plan (v0.32, Open Questions, "Perceived notebook"). TD keeps only the design fallback if they fail
- Blocks 10a–10d are unchanged

## Changes in v0.12

*Before the v0.11 re-check runs, so one test covers both changes.*

- **New label `insult`** (Dylan, Oct 26). In the v0.10 re-check, all 3 own-line misfits were labelled threat on lines the character's own thought called barbs, an insinuation, or a challenge. With only threat or none on offer, a hostile line that promises no harm had nowhere to go. `insult` is that middle step:
  - **Not ★.** It competes only in the similarity fill, like claims and denials
  - **Plain word, no definition,** like the others
  - **For research,** it splits "took it as a threat" from "took it as hostility", which is where personality should show: a paranoid character reads jabs as threats, an easygoing one as insults
  - **The reference record has no insult kind,** so comparisons against it treat insult as "not a threat"
- Block 9a step 2, the `took` values, rendering, the v0.11 re-check's report list, and Considered updated. Blocks 10a–10d are unchanged

## Changes in v0.11

*From the v0.10 re-check (Claude Code, PR #12: 3 DeepSeek mini-games, $0.34). The own-line fix worked: 0 of 533 readings were stored off the line the prompt named, and the mixed hand-read went from 12 to 20 of 20 fitting the thought. Own-line hand-read: 17 of 20 fit, 0 on the wrong line. Gate 1 held, with 0 `think()` repairs in 890 calls. The new problem is the trim: 15 words cut the part the label rests on in 11 of 20 own-line readings and 4 of 20 mixed. A 20-word cap would recover 1 of 14 cut cases, and 25 words only 3.*

- **The character picks the words.** Block 9a gains step 3, `words`: when `took` isn't `none`, the few words of that line (at most 12, copied exactly) that made the character take it so. Code checks they appear in the line. The reading renders those words instead of the first 15, so the quote shows the commitment, not the greeting. If the check fails, it falls back to the first 15 words, logged. Importance and `done` become steps 4 and 5
- **Block 6 budget is a hard cap,** as built: items go in priority order, and one that would pass ~450 tokens is skipped so a shorter one can take its place. ★ entries and beliefs come first, so a fill item can never displace them
- **Defined, as built:** Il Notaio's second person applies only when the note begins with the character's name; a standalone dash isn't a word; the `none`-target wording is unchanged (2 of 39 still gave a label, which is ignored)
- **Pass bars for the re-check** (Open Questions), which v0.10 lacked
- Blocks 10a–10d are unchanged

## Changes in v0.10

*From the first test of v0.9's `took` (Claude Code, PR #12: 3 DeepSeek mini-games, $0.33). Gate 1 held: 0 `think()` repairs in 915 calls. 12 of 20 hand-read readings fit the character's own thought, against 9 of 20 for v0.8's recorder. Readings cost nothing extra: $0.111 per game, against $0.139 before.*

- **Own-line fix:** all 4 wrong-line readings were on the character's own line, where the model labelled the line it was answering. Block 9a now names the line: `{took_target}` reads "how you take Lupo's last line" or "what you meant by your own last line". Code picks the line by the same attachment rule, so the prompt and the stored reading always point at the same line
- **Block 6 budget raised to ~450 tokens** (10–12 lines). Readings measure ~40 tokens, not 30, and the quote is what's worth the space
- **Il Notaio entries render trimmed** to 15 words, like quotes
- **Label rate accepted:** 62% of lines get a label (claim alone 37%), against the prompt's "most lines are none." It's well under 10e's 91–97%, ★ readings come first in retrieval anyway, and the label rate is itself a research measure. The wording is unchanged, so this re-test changes only one thing
- **Defined, as Claude Code built them:**
  - a reading's turn is the line's turn
  - a label counts only for a line the character heard (a joiner's first label after the join note is "no spoken line")
  - the same label twice on one line is a no-op, logged
  - a failed `think()` logs a default event with `took: none`
  - `shared` mode writes no readings, but `took` is still logged on every thought, so they can be derived from the record
  - replays of saved games can't produce readings, since labels come from play
- Blocks 10a–10d are unchanged

## Changes in v0.9

*Clears Models & Research's "Perception pass repeats gate 8's error" handoff (Findings Log, Oct 26). On replay, 10e gave a reading to 91–97% of lines heard and labelled them by their content, and 11 of 20 hand-read readings were recorder errors that no code check can catch. Readings were also too long for block 6, and 18% of 10e calls were cut off.*

- **The clerk is out of perception.** Block 10e is removed. `think()` gains one small field, **`took`**: how the character takes the last thing said aloud (six kinds or `none`), or, for their own line, what they meant by it. So the label is the character's own, made on the play model with their personality adapter, and no recorder judges it
- **Own commitments use the same field:** the speaker's `think()` after their own line tags it. No change to `speak()`
- **Closing think:** after a Colloquio's last line, both guests think once more, so a deal sealed in the closing line still gets read. Importance and `done` are ignored there
- **Readings render short:** turn, conversation type, speaker, a trimmed quote (15 words at most), and how the character took it. About 30 tokens, so about 10 fit in block 6
- **Cost:** about 12 fewer recorder calls per turn than v0.8. `think()` gains a few output tokens and one instruction line
- **Readings are written by code** from `think()` output at the end of the turn, attached to `after_line` by a fixed rule. A missing or unknown `took` becomes `none`, logged as a repair, with no retry, so gate 1 risk stays small
- Validation, Model Routing, Run Configuration, the perceived notebook section, Game Record, Considered, and Open Questions updated. Blocks 10a–10d are unchanged

## Changes in v0.8

*Clears two of Models & Research's Oct 25 handoffs: "Proposal: perception-based memory" (with Dylan) and "Gate 8 closed as a known limit." Blocks 10a–10d are unchanged.*

- **The perceived notebook is adopted** (Memory Architecture, The perceived notebook). Each character's long-term memory now holds **readings**: how that character took the lines they heard and spoke, quoted from their own thoughts, next to the exact words. A new **perception pass (10e)** runs once per character per turn, in parallel with the thought pass. It links lines to the thoughts that react to them; code checks both quotes *(10e removed in v0.9; `think()` labels the line itself)*
- **The reference record:** the ★ and claims passes keep running unchanged. They are never shown to characters in the default mode, and they serve knowledge checks, research, and the dashboard
- **New run setting `notebook`:** `perceived` (default) or `shared`, which restores v0.7's behaviour. It is fixed for a research batch
- **Each thought is stored with the line it followed** (`after_line`). The game record gains readings and the notebook mode, and the replay record now includes readings
- **Gate 8 logged as a known limit** (Memory Writing). The sweep's `self` question stays for now, and there are no more memory prompt rounds before the first full games
- Validation, Model Routing, Run Configuration, Knowledge Isolation, Plot Point Checks, the dashboard, Considered, and Open Questions updated to match

## Changes in v0.7

*Clears Models & Research's "Gate 8 still fails on TD v0.6" handoff. The v0.6 re-test (13 saved games) fixed the thought pass but not the conversation passes: ★ capture 82–86%, 72 invented flags, about 45 of them real errors (Models & Research, Findings Log, Oct 25). **This is the last prompt rewrite for gate 8**: if it fails, Models & Research tests a stronger recorder model (Open Questions, "Gate 8, last round").*

- **Definitions contract:** every entry type and `toward` is defined once, as one `- term:` line in a **DEFINITIONS** section of 10a (promise, deal, threat, admission, toward) or 10d (claim, denial). The gate 8 judge reads those lines word for word (rubric `gate8 v2`)
- **Promises:** the definition requires the speaker's own commitment about a future act. Orders, requests, statements about the present or past, hopes, and predictions are listed as "Not a promise," with examples
- **Threats:** the definition requires a harm the speaker will cause. Insults, dares, accusations, and warnings of danger the speaker won't cause are listed as "Not a threat," with examples
- **Admissions** (45 of 99 v0.6 misses): the definition lists the implied forms, and the **sweep asks a separate `self` question** about every line before classifying it. The user message lists the IDs to sweep, and code re-asks for any line left out. "Implied" is added to the admission summary verbs
- **Claims pass (10d):** **`toward` dropped** (the accused is already in `about`), and **questions are never claims**, however pointed, with an example
- **Worked examples** in 10a and 10d show each kind next to the near-misses that v0.6 got wrong
- **The recorder model is its own setting** (Model Routing, Run Configuration): the memory passes and knowledge checks run on a configurable recorder, defaulting to the stock play model. They can run on a different model, such as a stronger one, with no prompt changes
- Validation, Memory Writing, Considered, and Open Questions updated to match

## Changes in v0.6

- Conversation pass split into a ★ pass with a line sweep (10a) and a claims pass (10d); every entry rests on one line with a model-stated speaker that code checks; summaries begin with the speaker and a type verb, checked in code; thought pass (10b) suspicion by default with a code-enforced hedge list; knowledge check (10c) judges beliefs by their quotes; exact repeated thoughts dropped from shortTermHistory; rule that prompt additions go before a task block's JSON schema line

## Changes in v0.5

- Three secret-keeping lines (claim line in 9a; reply and audience lines in 9b); four S8–S10 fixes (single `act` in 9e, "Present" outside a conversation, plan truncation, 9f testing note); first extraction prompts (10a conversation pass, 10b thought pass) with IDs cited by the model and speaker, turn, and quotes checked by code; knowledge check (10c) and the plot-point fact table; lore store deferred

## Changes in v0.4

- Plot protection → Plot Reward (9e rebuilt, `plot_reward` flag); simultaneous Murder Round; run-off (9g) and draw by lot; History Line Formats; addressee tightened and dropped in a Colloquio, plus the ping-pong guard; Neutral/Bold/Cautious wording; paying a blackmailer is evidence, not telling; real-history line in block 1; Game Record & Export

## Changes in v0.3

- Contact list moved from `think()` to a new movement call; code-side output validation and repair; State label "All living guests besides you"; constrained decoding dropped; blocks 1–3 as a system message; Run Configuration (temperature 0.7 for character calls, 0 for system calls); adapter serving risk and fallbacks; deduced knowledge counts for plot checks; new prompts for movement, strategy, Murder Round, and vote

## Changes in v0.2

- Base model no longer named here; balancing cost made explicit; Model Routing (batched `think()` rejected, neutral system calls, addressee-based `detectDesignation()`); first `think()` and `speak()` prompts

## Changes in v0.1

- **Created** by splitting `Gonfaloniere_Game_Mechanics` v0.16 into two docs

---

## About This Document

This doc covers **how the software runs the game**. The rules themselves live in **`Gonfaloniere_Game_Mechanics`**, which is the source of truth for anything a player could experience. If the two docs disagree about a rule, mechanics wins. This doc never restates rule values; it points to mechanics' Tunable Values table instead. Prompts use `{placeholders}` filled from that table at run time.

---

## Simulation Scope

Gonfaloniere is being built as an **all-AI simulation first**, and only later as a playable game.

- All 12 characters are AI agents; there is no human player in the simulation
- Goals of the simulation phase:
  - Validate the conversation engine
  - Observe emergent behavior
  - Balance the rules so each faction wins roughly 25% of games
- Characters run on an open-weight model chosen in **Models & Research (Current Model Plan)**: a development model now, a fine-tuning base later. Personality variants (Neutral, Bold, Cautious; see Models & Research, Research Design) are added later. The engine doesn't depend on which model (see Run Configuration)
- Features that exist only for a human player are listed under Post-Simulation in mechanics, and the player interface under **Player Interface** below

---

## System Architecture

Two systems run the evening, plus Il Notaio as the in-fiction voice of the system layer. *Il Notaio's role and voice are defined in mechanics; only the delivery mechanism is described here.*

### The Orchestrator

Owns what happens within conversations. Responsible for:

- Running `think()` after every utterance for all characters present
- Determining speaking order from importance scores
- Applying the decay rule to consecutive speakers
- Running `detectDesignation()` to enforce direct-address obligations in Capannelli
- Watching for a Colloquio "done" signal and enforcing the Colloquio utterance cap
- Counting global utterances and triggering end-of-turn processing when the threshold is reached

### The Stage Manager

Owns the structure of conversations. Responsible for:

- Tracking where every character is at all times
- Administering the movement rotation and **running the movement call** for the character whose window has arrived
- Resolving movement collisions (see Movement Implementation)
- Randomly initializing Capannello groups at the start of each Capannello phase
- Returning characters to their Capannello when a Colloquio ends
- Distributing per-round income, maintaining the Embassy treasury and pension ledger, and processing /borrow, /repay, /bribe, and vote purchases
- Collecting and resolving Murder Round acts, ballots, run-offs, and any draw by lot
- **Validating actions** returned by any character call (see Output Validation & Repair). Invalid actions are rejected and the character is told privately on their next call
- Writing **action lines** into History (see History Line Formats)

### Il Notaio: Delivery Mechanism

- **Witnessed events** (joins, departures, Colloquio withdrawals and returns) are generated by the Stage Manager and **injected into the History** of every character present, written in Il Notaio's voice, as lines starting `[Il Notaio]`
- **Escalation** is driven by a per-character count of Colloquio withdrawals, so repeat withdrawals get more pointed wording
- **City-wide broadcasts** (/repent and its tagline, Murder Round results, a tied ballot, a draw by lot, the election result) are injected into every living character's History at once

---

## Core Functions

Every character call starts with a private **thought**, so the decision that follows is informed by reasoning. Each thought is stored in that character's shortTermHistory.

### think()

Runs for every character present after every utterance. Outputs:

- **Thought:** private internal reasoning, 2–4 sentences. Not shared. Stored with the ID of the line it followed (`after_line`, v0.8), since each `think()` is a reaction to one line. Readings and research both rely on this pairing
- **Took** *(v0.9; target named in v0.10)*: how the character takes the line just said, which the prompt names: `promise`, `deal`, `threat`, `admission`, `claim`, `denial`, `insult` (v0.12), `pressure` (v0.16), or `none`. If they said it themselves, it's what they meant by it. Code turns it into a **reading** (see The perceived notebook). Ignored in `notebook: shared`, but still logged for research
- **Words** *(v0.11; cap 20 since v0.13)*: when `took` isn't `none`, the few words of that line (at most 20) that made the character take it so. They become the reading's quote
- **Importance score (0–100):** how urgently this character wants to speak. Used by the Orchestrator for speaking order, and by the Stage Manager for collisions
- **Done signal (Colloquio only):** whether the character wants to end the Colloquio. If either character sends it, the other gets one closing line and the Colloquio ends. Not asked for in a Capannello, and ignored by code if returned there
- **Closing think** *(v0.9)*: after a Colloquio's last line (the closing line, or the line that reaches the cap), both guests run `think()` once more before the Colloquio closes. Its thought and `took` are kept; importance and `done` are ignored. Without it, nobody reacts to the line where a private deal is most often sealed. Cost: two `think()` calls per Colloquio When the character spoke the closing line themselves, the closing think labels nothing new, but it's kept for the closing thought (v0.14)

The `think()` prompt also asks each character to consider how their own recent behavior (especially frequent private withdrawals) looks to others. This is the second of two social-awareness touchpoints; the first is in the character briefing.

### speak()

Produces a character's actual utterance. Returns:

- **Utterance:** what the character says aloud
- **Addressee (Capannello only):** the one character present who is being put on the spot with a direct question or demand, or none. Feeds `detectDesignation()`. Not asked for in a Colloquio
- **Action (optional):** one of the actions the character is currently allowed (/bribe in a Colloquio, /borrow, /repay). The Stage Manager validates it and writes the action line
- **Meant and words** *(v0.13)*: the speaker's own label for their line, in the same words as `took`, plus the words of the line that carry it. Code stores it as the speaker's own reading (see The perceived notebook)

*Whether actions should stay in `speak()` or move to their own call is an open question for the mini-game test.*

### Movement call

Runs once per turn, for the character whose movement window has arrived. Outputs:

- **Thought**
- **Contact list:** every other living character rated 0–100 for how much this character wants to speak with them, with a short purpose for the top three. Kept for the dashboard, for research (who wants whom over the evening), and as a fallback target
- **Choice:** stay, join (switch Capannelli toward a person), or Colloquio (call a person aside)
- **Target:** the person to move toward or call aside

If the character is in a Colloquio when their window arrives, the window counts as **stay** and no call runs.

### detectDesignation()

Checks whether the last utterance directly addressed a specific character. If so, that character speaks next regardless of importance score. Capannelli only.

- **No model call.** It reads the `addressee` field from `speak()`'s output, then code matches the name to a character present (see Output Validation & Repair). Anything else is treated as no addressee
- Subject to the **ping-pong guard** (see Speaking Order & Decay Rule)

### End-of-Turn Extraction Pass

At the end of every turn, the turn's events are written into each character's longTermHistory. *Rebuilt in v0.5, split in v0.6, readings added in v0.8 and moved into `think()` in v0.9; full design in **Memory Writing** and **The perceived notebook** below, prompts in blocks 10a, 10b, and 10d.*

- **Code writes the exact facts:** payments (from the transaction log), private actions, and Il Notaio's witnessed events. No model call
- **★ pass** (block 10a): one system call per conversation active this turn. It sweeps every spoken line, then records promises, deals, threats, and admissions (★). Each entry is stored for every character who heard the lines it cites
- **Claims pass** (block 10d): one system call per conversation, run alongside 10a. It records claims and denials, stored the same way
- **Thought pass** (block 10b): one system call per character who thought this turn. It records that character's suspicions and conclusions from their own private thoughts, stored for that character only. Suspicion is the default
- **Readings** (v0.8; written by code since v0.9, no model pass): each `think()` labels the line it followed (`took`), and code stores every label other than `none` as a reading for that character only. In the default mode (`notebook: perceived`), readings, not the ★ and claims entries, are what the character remembers of what was said
- **The ★ and claims entries become the reference record** in the default mode: stored with their audience as before, read by knowledge checks, research, and the dashboard, never by a character
- **The model cites IDs; code checks them.** Each entry rests on one line, and the model names that line's speaker. Code checks the speaker against the line, checks the quote word for word, and fills in turn, conversation, and audience. Failures are dropped and logged by reason (see Output Validation & Repair)
- Runs on a fixed turn cadence, independent of movement and conversation changes, on the **recorder model** at temperature 0 (see Model Routing, The recorder model)

### Strategy Generation

- One call per character after each faction meeting, plus one at any genuinely strategy-altering event
- The new plan replaces the strategy section (block 4)
- Not regenerated every turn
- **Strategy-altering events (starting list):** surviving a kill attempt; a Murder Round death in one's own faction; one's own French pension revealed by someone else; candidate selection; a /repent broadcast. Refine in testing

### Murder Round

- One call per living character after Individual Strategy 4 (block 9e). Each submits their standard act (Lupo: one or two kills) and, if they earned the Plot Reward, one extra act, with a private thought
- Calls run in parallel; no character sees another's acts
- **Resolution is simultaneous** (Mechanics, Murder Round): the Stage Manager applies every submitted act in mechanics' order (investigations, then guards, then kills), counting acts from characters who die this round. Several successful kills on one target produce one death
- **Lupo's acts are tagged** by kind: his standard kills are unblockable, while his Plot Reward act (if any) follows normal rules
- **A character whose call fails takes no action,** Plot Reward act included (Mechanics v0.20). Logged as an engine failure, not a player choice
- Il Notaio broadcasts who died and whether attempts were foiled; killers are never named

### Voting

- **Ballot:** each living character makes one call (block 9f): given the speeches, any repentance, their pensions, and their purse, they name who they vote for and how many votes they buy. All of a character's votes, cast and bought, go to that one guest (Mechanics, The Election)
- No separate strategy step precedes it
- **Tally in code.** Most votes wins
- **Run-off:** if the top guests tie, Il Notaio announces the tie, and every living character makes one run-off call (block 9g): one fresh vote among the tied guests only, no buying
- **Draw by lot:** if the run-off also ties, code draws the winner from the tied guests with the run's seeded random generator, and Il Notaio announces it
- **Announcements:** Il Notaio names the tied guests but not the vote counts, keeping the ballot secret. *Sent to Mechanics to confirm*
- Win conditions are checked by code the moment the result is announced

---

## Output Validation & Repair

Every character call returns raw JSON. Code checks and repairs it before use, so the model only has to get the content right. **Every repair is counted and logged per call**, matching Models & Research's "repaired" scoring level; a rising repair rate is a health metric.

| Step | Rule |
|---|---|
| **Parse** | Strip one surrounding code fence. Prose outside the JSON is a parse failure |
| **Retry** | On parse failure, a missing required field, or an illegal Murder Round act, re-ask once with a one-line error note. A second failure uses the call's default (below) and is logged as a failure |
| **Names** | Match each name to the roster: exact name, then the alias table, then a near-miss (one unique roster name within edit distance 2). No unique match = invalid name |
| **Scores** | Importance and urgency rounded to integers and clamped to 0–100 |
| **`done`** | Used only in a Colloquio; ignored anywhere else |
| **Addressee** | Used only in a Capannello. Must match a character present other than the speaker; otherwise treated as null. Ignored in a Colloquio |
| **Contacts** | Self, dead, and unmatched names dropped; duplicates keep the higher urgency; **missing living guests filled with urgency 0**; **purposes kept only for the three highest-urgency contacts** (others set to null, logged as a warning) |
| **Targets and actions** | Must be legal under mechanics at that moment (target alive, not self where barred, enough Florins, right conversation type, right faction). Illegal → rejected; the character hears why on their next call through `{action_feedback}` |
| **Murder Round acts** | Everyone except Lupo: one `act` object. Lupo: a `kills` list of one or two names. **All of a character's acts name different living guests.** No self-guard, in any act. `extra` used only if the Plot Reward was earned, otherwise ignored. If a non-Lupo answer returns a list instead of one `act` (or Lupo returns more than two kills), keep the first and log it as a repair. A remaining illegal act triggers the retry; if still illegal, that act is dropped |
| **Plan length** | A 9d `plan` over 150 words is cut at the last sentence end before word 150 (or at word 150 if there's none), and logged as a repair |
| **Votes** | Ballot target must be a living guest; `buy` clamped to 0–`{max_buy}`. Run-off target must be one of the tied guests |
| **Memory entries** (10a, 10d) | `line` must be a spoken line from this turn; `context` IDs must exist (this turn or the context lines). **Speaker check:** the model's `speaker` must match the speaker of `line` (through the alias table), or the entry is dropped ("speaker mismatch"). **Quote check:** the `quote` must appear in `line` itself (not only in context), word for word after normalizing spaces, quote marks, and case, or the entry is dropped. **Verb check:** the `summary` must begin with the speaker's name (any alias) followed by a verb allowed for the type (table below), or the entry is dropped ("type/summary mismatch"), since the model's own words then disagree with its label. **`toward`** (10a only): if it equals the speaker, it's set to null and logged; for a deal it must be the other party (the speaker of a context line, or the other name in a cited payment line). 10d has no `toward` since v0.7; one returned there is ignored and logged. Unknown types are dropped. Turn, conversation, and audience are filled in by code. The rest of the call is kept |
| **Sweep** (10a) | Checked against `{sweep_ids}`: each listed line should appear exactly once, with `self` and `kinds`. **One re-ask covers both gaps:** listed lines the sweep left out, and lines flagged with a kind but no matching entry ("You left out L58; you flagged L57 as a threat but wrote no entry for it"). An entry whose kind the sweep didn't flag is kept and logged. Lines with `self: true` and no admission entry are counted ("self, no admission"), not re-asked, since most are denials or harmless remarks; the count shows whether the self question is doing its job. All counts are reported for gate 8 |
| **Beliefs** (10b) | `thought` must exist in this turn's input, and the quote must appear in that thought. **Hedge rule:** a `conclusion` is stored as a `suspicion` (logged as "hedge downgrade") if the sentence or sentences containing its quote include a question mark or any hedge from 10b's list (perhaps, maybe, might, may, could, likely, probably, possibly, surely, must be, I think, I suspect, I wonder, it seems, appears, if, unless, whether), matched as whole words, case-insensitively. Beliefs are never upgraded by code. `firmer` and `dropped` must name an existing belief ID, or the change is ignored |
| **`took`** (`think()`, v0.9) | Matched case-insensitively to `promise`, `deal`, `threat`, `admission`, `claim`, `denial`, `insult` (v0.12), `pressure` (v0.16), or `none` (a leading article or plural is stripped: "a threat" → `threat`). **Missing or unknown → `none`, logged as a repair, never a retry**, so the new field can't add retries to the most frequent call. The label attaches to a line by the rule in The perceived notebook, Which line a label belongs to. Ignored, and logged, when there is no spoken line to attach it to. If `think()` fails twice there's no thought to carry the label, so code logs a default event with `took: none` (v0.10) |
| **`words`** (`think()`, v0.11; cap and wrong-line rule v0.13) | Kept only when `took` isn't `none`. **Check:** the words must appear in the labelled line, word for word after normalizing spaces, quote marks, and case, on word boundaries (dashes and "…" aren't normalized), and run to 20 words at most (longer ones are cut at 20, then checked, logged). **Found in a different line the character heard:** the reading is dropped, logged as "wrong-line words". **Missing, null, or found nowhere:** the reading falls back to the first 15 words of the line, logged as "words fallback". A fallback is a health metric, not a repair, and never a retry |
| **`meant` and `words`** (`speak()`, v0.13) | `meant` is matched like `took`: missing or unknown becomes `none`, logged as a repair, never a retry. `words` are kept only when `meant` isn't `none`, and are checked against the utterance, with the same normalization and 20-word cap. If they're not found, the own reading falls back to the trim, logged. A failed `speak()` writes no own reading |
| **Knowledge checks** (10c) | Cited memory IDs must exist in the evidence given. A *told* verdict must cite an entry spoken by someone other than the character; a *firm conclusion* must cite the character's own conclusion or claim. A failed citation turns the verdict into *none* and flags the check for hand review |

**Alias table:** one entry per character, maintained alongside the roster: full name, short name, title forms (e.g. "Captain Armand LeNoir", "Captain LeNoir", "LeNoir", "Armand LeNoir"; "Contessa Isabella di Salviati", "Contessa Isabella", "Isabella"; "Emile de Valois", "Prince Emile", "Emile"). Shared by name matching everywhere.

**Summary verbs** for the verb check (the first word after the speaker's name; extend the list only if re-tests show true entries being dropped):

| Type | Allowed verbs |
|---|---|
| promise | promised, swore, vowed, pledged |
| deal | agreed, accepted |
| threat | threatened, warned |
| admission | admitted, confirmed, conceded, implied |
| claim | said, claimed, accused, alleged, revealed, showed, told |
| denial | denied |

**Defaults when a call fails twice:**

| Call | Default |
|---|---|
| `think()` | Importance 0, done false, `took` none; thought omitted |
| `speak()` | Skip this speaker; the next-highest importance speaks |
| Movement | Stay |
| Strategy | Keep the previous plan |
| Murder Round | No action, Plot Reward act included (Mechanics v0.20). Logged as an engine failure |
| Extraction (10a, 10b, 10d) | No model entries from that pass for that conversation or character this turn (code-written facts are still stored); flagged, since a gap in memory affects later play |
| Knowledge check | *None*, flagged for hand review |
| Ballot | One vote for the voter's own faction's candidate if any, otherwise a blank ballot; buy none |
| Run-off | One vote for a tied guest from the voter's own faction if any, otherwise a blank ballot |

**Movement target fallback:** if the target is invalid but the choice is join or Colloquio, use the highest-urgency valid contact; if there is none, stay. **A `join` toward someone already in the character's own group** becomes `stay`, logged as "join to own group" (v0.20). The window is used, as for any stay, and it isn't a repair, since the reply was valid. A `colloquio` with a member of one's own group is a real move and stands.

---

## Model Routing

### Character calls vs. system calls

| Kind | Calls | Runs on |
|---|---|---|
| **Character calls** | `think()`, `speak()`, movement, strategy, Murder Round, ballot, run-off | The play model **plus that character's personality adapter** (Neutral, Bold, or Cautious, once trained) |
| **System calls** | ★ pass, thought pass, and claims pass (10a, 10b, 10d), knowledge checks (10c); later, jailbreak detection | The **recorder model**, with no adapter: by default the stock play model (see The recorder model) |
| **No model** | `detectDesignation()`, Il Notaio's lines, action lines, tallies and the draw by lot, validation, all bookkeeping | Code and templates |

- **`think()` is a character call, not bookkeeping.** It's where the character decides whether to speak and what they're hiding. On another model, personality adapters would change only how characters *sound*, not what they *do*
- **System calls stay neutral** so no personality adapter ever writes its own memory or grades its own plot point. They never run on a personality adapter, Neutral included: Neutral is a trained competence adapter (Models & Research, Research Design), and the recorder shouldn't carry training meant for players
- **The perceived notebook is a deliberate exception for readings only** (v0.9). A character now labels the lines it hears in its own `think()` call, adapter included, because how a personality takes a line is the thing being studied. It still never grades its own plot point: knowledge checks read the neutral reference record and run on the recorder

### The recorder model *(v0.7)*

The memory passes and knowledge checks run on a **recorder model** that is configured separately from the play model. By default the two are the same stock model. Either can change without touching the other or any prompt.

- **Why:** gate 8 failed three rounds on DeepSeek as the recorder, so the design had to allow a **split**: DeepSeek plays, a stronger model keeps the record, as a config change
- **Outcome (Oct 25):** no split. On v0.7, GPT-5.4 recorded more than DeepSeek but invented more, at ~54× the cost. **DeepSeek stays the recorder**, and gate 8 is logged as a known limit (Memory Writing). The setting stays, so a future recorder needs no prompt changes
- **What makes the prompts portable:** 10a–10d name no model, ask for plain JSON, and need no provider feature. They work with the instructions as a system message or folded into the user message (`system_role`, per model). Validation and repair are the same code whichever model answers
- **A split is a fair arrangement.** The recorder is a clerk, not a player: it never acts for a character, so a stronger recorder gives no character an advantage over another. It also never sees a briefing, so knowledge isolation is unchanged
- **Cost and speed:** the recorder makes about 20–24 calls per turn in a full game, against about 48 character calls. Most are small and cached. (v0.8's perception pass would have added ~12 more; removed in v0.9.) A recorder priced several times above DeepSeek would still be a modest share of a game's cost, and its calls run in parallel at the end of the turn. Models & Research measures both if a split is chosen
- **A different recorder must pass gate 8 on its own,** on the same saved games, before it's used in a research batch. Changing the recorder mid-study changes what characters remember, so it is fixed for a whole batch and recorded in every game record
- **A cheaper recorder** is allowed on the same terms: it must pass gate 8

### Batched `think()`: rejected

One combined call for all characters present would put several characters' secrets in one prompt (gate 3) and can't run separate adapters. **Kept instead:** parallel requests (serving software batches them on the GPU) and prompt caching on each character's static prefix.

### Serving several adapters at once: assumed, not yet proven

The parallel-request plan assumes the server can run different personality adapters side by side on one copy of the model. That's proven for standard dense models in vLLM, but newer for mixture-of-experts layers and the hybrid-attention models among the candidates. Models & Research checks it when fine-tuning is near. **If it fails on the chosen model:**

1. **Tinker's per-token serving** of trained checkpoints, where the model is offered there
2. **Group calls by adapter:** serve one adapter at a time and queue calls, at the cost of speed
3. **Merge each adapter into its own model copy:** one full model per variant, at the cost of memory and serving price

### Running `think()` less often: deferred

Decide after the first full game measures real cost. Candidate rule: skip a character's `think()` when their last importance was below ~20 and they weren't addressed, reusing their previous score. Risk: a quiet character may never notice a moment that should rouse them. Less urgent since v0.3: on DeepSeek, `think()` output is ~103 tokens.

---

## Run Configuration

Nothing about the model is hard-coded. Each run reads a config file, and the full config (with secrets removed) is logged with every game alongside the doc versions its prompts came from. **Changing the play model is a config change** (plus re-running the probes).

| Setting | Character calls (`play`) | System calls (`recorder`) |
|---|---|---|
| Endpoint | Named by environment variable (e.g. `PLAY_MODEL_BASE_URL`, `PLAY_MODEL_API_KEY`); hosted API or self-hosted server, same code | Own variables (`RECORDER_MODEL_BASE_URL`, `RECORDER_MODEL_API_KEY`), defaulting to the play model's |
| Model ID | Play model | Recorder model: the stock play model by default, or any model that passes gate 8 (see Model Routing, The recorder model) |
| Provider | Pinned, fallbacks off; quantization recorded | Pinned separately, fallbacks off |
| Adapter | From an adapter map: `neutral`, `bold`, `cautious` → adapter ID, or `none` for stock or prompted play | None, ever |
| Thinking | Off (`thinking: false`, mapped to each provider's control) | Off by default; per recorder model, recorded |
| Temperature | **0.7** | **0**, or the provider's lowest accepted value if a model rejects 0 (some do). The value actually sent is recorded |
| Max output tokens | Per call type (`think()` ~250, `speak()` ~240 (v0.13: `meant` and `words`), movement ~500, strategy ~400, Murder Round ~300, ballot ~250, run-off ~200) | Per call type (★ pass ~1,800 including the sweep, claims pass ~1,000, thought pass ~600, knowledge check ~300) |
| Repeated thoughts | `drop_repeated_thoughts: true` (default, every model): see shortTermHistory | – |
| Message layout | `system_role: true` (blocks 1–3 as system message) or `false` (all blocks in one user message), per model | Same |
| Prompt caching | On where the provider supports it | Same |
| Log probabilities *(v0.21)* | `logprobs: labels` (default): request them where the provider supports it, and store the top 5 at the `took` / `meant` label token. `off` requests none; `all` stores them for every output token (large, for debugging only). Never required: missing means null | `off` |

**Also run settings, not model settings:** `lore` (`off`, the default, or `on`; see The lore store; fixed for a research batch), the embedding model (`EMBEDDING_MODEL_*`; see Storage and retrieval; recorded and fixed for a batch), `plot_reward` on/off, `notebook` (`perceived`, the default, or `shared`; see The perceived notebook; fixed for a research batch, like the recorder), tunable values (from mechanics), personality assignment seed, random seed (which also drives any draw by lot).

**Secrets** (API keys, private endpoints) are read only from the environment, never from the config file, and never written to logs or game records. The record keeps the provider name and model ID, which is enough to reproduce a run.

**Temperature rationale:** 0.7 keeps characters varied between games, which the research needs. System calls run at 0 so the same transcript always yields the same memory and the same plot check result. Revisit if probes show 0.7 gives incoherent play on the chosen model.

---

## Prompt Assembly

Every character call is built from the same blocks in the same order, **most static first**, so the longest possible prefix is identical across a character's calls and can be cached.

| # | Block | Changes | Approx. tokens |
|---|---|---|---|
| 1 | **Frame:** who you are playing, stay in character, tonight's Florence is its own | Never | ~150 |
| 2 | **Rules primer:** the evening as the characters know it | Never (per run config) | ~650 |
| 3 | **Briefing** (from Characters) | Never | ≤ ~1,000 |
| 4 | **Strategy section** | At checkpoints | ~150 |
| 5 | **State:** phase, where you are, who's present, purse, pensions, allowed actions | Every call | ~150 |
| 6 | **Long-term memory:** retrieved bullets, high-salience marked | Every utterance | ~450 (v0.10; ~300 before) |
| 7 | **Recent private thoughts** (shortTermHistory) | Every utterance | ~200 |
| 8 | **The conversation so far** (History) | Every utterance | ~400 |
| 9 | **Task:** call-specific instructions and output format | Per call type | ~200–450 |

- **Message layout:** blocks 1–3 form the **system message**; blocks 4–9 form **one user message**. Where a model's chat template handles a system message badly, set `system_role: false` and send all nine blocks as one user message. The prefix is identical either way, so caching works either way
- **Blocks 1–3 are identical for every call type**, so all of a character's calls share one cached prefix. Task instructions go last, where models attend to them most
- **Long-term memory is retrieved once per character per utterance** and reused for that character's `think()` and `speak()`. Movement, strategy, Murder Round, and vote calls retrieve their own, with queries suited to the decision (e.g. Murder Round retrieves threats and deals)
- **Sizes:** ~3,300 input tokens per call. Measured `think()` output on TD v0.3 is ~103 tokens (DeepSeek). `speak()` ~100. Models & Research replaces these with measurements
- **No constrained decoding.** Raw JSON plus code validation (see Output Validation & Repair)
- **The JSON schema line comes last** *(rule since v0.6)*. Every task block ends with "Reply with only this JSON:" and its schema, and anything added to a task block (a new instruction, a personality line, a probe variant) goes **before** that line, never after. In the Oct 25 boldness test, one line placed after the schema in 9b made Qwen3.8 misspell the `utterance` key in 7.6% of `speak()` calls (1.0% without it). Placeholders that may hold extra instructions, such as `{done_instruction}` and `{addressee_instruction}`, already sit above the schema

### History Line Formats

Every line in block 8 is one of four kinds. All non-speech lines are written by code from templates, in square brackets, using full names from the roster.

| Kind | Format | Who gets it |
|---|---|---|
| **Speech** | `Name: words`, or `Name (to Addressee): words` when a designation was honored | Everyone present |
| **Il Notaio** | `[Il Notaio] words` | Witnesses of a social event; every living character for a broadcast |
| **Witnessed action** | `[Contessa Isabella gave Lupo 3 Florins.]` | Everyone present. A bribe happens only in a Colloquio, so that means both participants |
| **Private action** | `[You accepted a French pension of 3 Florins. Your purse: 13 Florins.]` / `[You renounced the French pension held by Raffaello de' Medici: 3 Florins returned to the Embassy.]` | **The actor only.** /borrow and /repay are private (Mechanics), so no one present sees them |

- An action line goes **directly after the speech line it came with**, so a bribe reads as part of what was said
- **French Embassy characters learn of pensions through the ledger** in their State block (`{embassy_ledger}`), not through History, since they didn't witness the transaction. The ledger line lists the most recent change first
- Rejected actions don't appear in History; the actor hears about them through `{action_feedback}` in State
- The probe harness already writes bribes in this format, so probe and engine transcripts match

---

## Prompt Drafts

*Status: drafts. Blocks 1–3, 9a, 9b, and 9d–9g ran on TD v0.4 in Models & Research's probes (S1–S10); 9c has not run. v0.5 adds the three secret-keeping lines (9a, 9b) and the S8–S10 wording fixes (Block 5 "Present," 9d, 9e, 9f). Blocks 10a–10d are system prompts for memory and plot checks, which run on the recorder model and don't use blocks 1–8. 10a–10c ran in their v0.5 form, and 10a–10d in their v0.6 form, on 13 mini-games; v0.7 revises 10a and 10d (untested in this form) and leaves 10b and 10c as in v0.6. Placeholders in `{braces}` are filled by code; values come from mechanics' Tunable Values.*

**For probes:** blocks 4, 6, and 7 may be stubbed ("No plan yet." / "Nothing yet." / empty) unless the scenario needs them. Blocks 2 and 9 should be used as written so results transfer to the real engine.

### Block 1 — Frame (shared)

```
You are {character_name}, a character in a game of political intrigue set at a gathering in a Florentine palazzo, 1492. Think, speak, and decide as {character_name} would. Stay in character at all times; never mention being an AI or a game piece.

You know only two things: what is in your briefing, and what you have personally seen and heard tonight. Other guests know only what they have seen and heard. Never assume anyone knows your secrets, or that you know theirs, unless it has been said in your presence.

This is not the Florence of the history books. Who these people are, how they are related, and what has happened are exactly as your briefing and this evening show you, even where that differs from history as you know it. No one knows what the years ahead will bring.
```

### Block 2 — Rules primer (shared)

```
THE EVENING
Tonight the city's factions — the Medici, the Pazzi, the Dominicans, and the French Embassy — scheme over who will be elected Gonfaloniere. Only a Medici or a Pazzi may stand as a candidate.

How the evening ends (checked in this order the moment the vote is announced):
1. The Dominicans win if the elected candidate has publicly repented.
2. Otherwise, the French Embassy wins if anyone in the winner's family holds a French pension, as long as one member of the Embassy still lives.
3. Otherwise, the elected candidate's family (Medici or Pazzi) wins.
A faction must have at least one living member to win.

The order of the evening: three rounds of mingling, each opened by a meeting of your own faction. Then the Murder Round. Then the Medici and Pazzi each choose a candidate, the candidates give speeches, every faction meets one last time, and a secret ballot is held.

Conversations: guests talk in small groups (a Capannello, 2–4 people) or slip away for a private word (a Colloquio, two people only, no one may join). Il Notaio, the evening's notary, records who joins, who leaves, and who withdraws privately, and everyone present hears his notes. Slipping away often invites suspicion.

Money: everyone begins with {starting_florins} Florins and receives {income} more each round. A bribe is Florins handed over in a private Colloquio; anything promised in return is a matter of honor, not law. At the ballot, every living guest casts one vote and may buy extra votes for the same guest at {vote_price} Florins each. If the top guests tie, everyone votes once more among only those guests, with no buying; if that ties too, the winner is drawn by lot.

French pensions: any Medici or Pazzi may accept a pension of {pension_size} Florins from the French Embassy at any time. A pension puts its holder on France's payroll. It can be renounced before the ballot by paying {pension_size} Florins back — by the holder, or by a relative who knows of it. Pensions are private; only the Embassy keeps the full ledger.

The Murder Round: each living guest secretly chooses one act: KILL, GUARD, or INVESTIGATE someone. All acts take effect at once, so a guest who dies that night still carries out their own act. A guest guarded by two or more survives an attack. A guest investigated by two or more cannot carry out their kill. You cannot guard yourself. Killers are never named. The dead lose their Florins and pensions; nothing is inherited.
{plot_reward_rule}

Repentance: during the speeches only, a candidate may publicly repent. It is permanent and turns them to the Dominicans' cause: if they are elected, the Dominicans win.
```

`{plot_reward_rule}` when `plot_reward` is on:
```
Your plot point: if you complete the plot point in your briefing before the last faction meeting before the Murder Round, you secretly earn one extra act in the Murder Round: a second KILL, GUARD, or INVESTIGATE, on a different guest. No one else is told.
```
When off: empty.

### Block 3 — Briefing

The character's briefing from Characters, verbatim, under the heading `YOUR BRIEFING`.

### Block 4 — Strategy

```
YOUR CURRENT PLAN
{strategy_section}
```

### Block 5 — State

```
NOW
{phase_label}
You are in {conversation_label}.
Present: {present_characters}
All living guests besides you: {living_others}
The dead: {dead_list}
Your purse: {florins} Florins. French pensions you hold: {pensions_held}.
{embassy_ledger}
You have withdrawn into a private Colloquio {withdrawal_count} time(s) tonight.
{plot_status}
{action_feedback}
```

- `{living_others}`: **every living character except this one, including those present**
- `{phase_label}` e.g. "Capannello round 2, turn 4", "Faction meeting 3 (Medici)", "The Murder Round", "The ballot", "The run-off"
- `{conversation_label}` e.g. "a Capannello with Piero de' Medici and Lupo" or "a private Colloquio with Jeanne d'Orléans (utterance 3 of 6)". For calls outside a conversation (Murder Round, ballot, run-off): "the gathering"
- `{present_characters}`: the other characters in this conversation. **For calls outside a conversation** (Murder Round, ballot, run-off): `no one; you decide alone` (v0.5; the S8–S10 probes listed everyone living, which suggested an audience that doesn't exist). Targets for those calls come from "All living guests besides you"
- `{embassy_ledger}`: French Embassy characters only — "Embassy treasury: {n} Florins. Pensions held: {ledger}. Latest: {most_recent_change}." Empty for everyone else
- `{plot_status}`: empty if `plot_reward` is off or before the plot check runs; then "You have secretly earned the Plot Reward: one extra act in the Murder Round." or "You did not complete your plot point in time; you have no extra act in the Murder Round."
- `{action_feedback}`: empty unless the character's last action was rejected, e.g. "Your attempt to give 6 Florins failed: you hold only 4."

### Blocks 6–8 — Memory

```
WHAT YOU REMEMBER FROM EARLIER TONIGHT
{longterm_bullets}
(★ marks promises, threats, deals, payments, and admissions.)

YOUR RECENT PRIVATE THOUGHTS
{short_term_thoughts}

THE CONVERSATION SO FAR (most recent last)
{history}
```

For calls outside a conversation, block 8's heading reads `WHAT YOU LAST HEARD` and holds the end of the character's most recent conversation plus any broadcasts since. Line formats: see History Line Formats.

### Block 9a — think() task *(claim line added in v0.5; `took` added in v0.9)*

```
TASK: THINK
Someone has just spoken (the last line above). Before anyone speaks again, think privately as {character_name}. No one else will ever see this.

1. thought — 2 to 4 sentences, first person, in your own voice. What does the last moment mean for you? What do you want now? If you have told anyone something untrue, note what you told them so your story stays straight. Consider how your recent behavior looks to the others in the room.
   Separate what this person has shown you from what they only claim. A claim is not proof.

2. took — {took_target}, in one word: promise, deal, threat, admission, claim, denial, insult, pressure, or none. It's your own reading, not a rule. Most lines are none.

3. words — if took is not none: the words of that line that made you take it so, at most 20, copied exactly. Otherwise null.

4. importance — how urgently you want to speak next, from 0 to 100:
   0–20   nothing worth saying; content to listen
   21–40  could add something minor
   41–60  have a relevant point or question
   61–80  this concerns you directly, or you have a move to make now
   81–100 must speak at once: accused, threatened, or a chance about to vanish
   Most moments are below 50. Use the whole range. Speaking when you have nothing to gain can expose you.
{done_instruction}
Reply with only this JSON:
{think_schema}
```

In a **Colloquio**:
- `{done_instruction}`: `5. done — true if you have what you came for, or nothing more is to be gained here; otherwise false.`
- `{think_schema}`: `{"thought": "...", "took": "none", "words": null, "importance": 0, "done": false}`

In a **Capannello**:
- `{done_instruction}`: empty
- `{think_schema}`: `{"thought": "...", "took": "none", "words": null, "importance": 0}`

- `{took_target}` *(v0.10)*: filled by code from the line the label will attach to (The perceived notebook, Which line a label belongs to):
  - someone else's line: `how you take {speaker}'s last line`, with the speaker's name as History shows it
  - after the character's own line *(v0.13; reworded in v0.15)*: `how you take the line of {speaker}'s you were answering`, naming the last line by someone else they heard in this conversation before their own. Their own line is labelled in `speak()` (block 9b, `meant`)
  - no spoken line: `nothing yet, since no one else has spoken here since you arrived` (v0.14; the label is then ignored, as now)

**The `took` line** *(v0.9; target named in v0.10)*:
- **Why the target is named** (v0.10): in v0.9's first test, all 4 wrong-line readings in the hand-read were on the character's own line. The model labelled the line it had been answering, not the one it had just said. Naming the line removes the guess
- **Short on purpose:** `think()` is the most frequent call. The `took` line adds about 50 input tokens to block 9 and 3–5 output tokens (measured: 140 → 143–148 per call). `words` (v0.11) adds about 30 input tokens, and about 15 output tokens when a line is labelled
- **Symmetric baseline** *(v0.19)*: every label is a bare word, treated alike. The descriptions below (v0.16–v0.18) are removed from the prompt and kept here as history. Each moved its own label's share, which is why they went
- **The threat description covers conditional threats** *(v0.18; removed in v0.19)*: "harm to come, even if only 'or else'". On v0.17, threat fell to 1.3% of `took` because "pay, or the city hears" pushes as well as threatens, and characters chose pressure. Pushing backed by harm is a threat
- **The `pressure` label description, narrowed** *(v0.17; removed in v0.19)*: "pushing you to answer or act" replaces v0.16's three examples. With them, `pressure` took about 60% of labelled `took` calls and 68% of labelled `meant` lines, because the examples pulled in refusals, rebukes, bargains, and claims. The gloss now says what pressure does, not what it looks like
- **The hostility ladder** *(v0.16; removed in v0.19)*: insult → pressure → threat, plus "a plain question is none". It's the only gloss on any label, and it describes steps, not definitions. Pointed questions, demands, and dares go to `pressure` instead of `none`, so they're remembered without taking a ★ slot
- **v0.15's scope line, superseded**: "A question, a demand, or a dare is none unless it also carries one of these." In the v0.14 re-check, most labels that didn't fit their own thought were threat on a dare or demand, or claim on a question. The thought had already said what the line was, but the menu had no word for it. This line gives those three a home without defining any of the seven, and it's in both 9a and 9b
- **No definitions:** the character's reading is the measure, so it is never held to 10a's DEFINITIONS. The words are plain English (`insult` added in v0.12, `pressure` in v0.16), and "if it chills you, it's a threat" says whose judgement counts
- **"Most lines are none"** answers v0.8's main failure: 10e labelled 91–97% of lines heard. Characters still label 62% (v0.9 test), mostly as claims. That's accepted for now (The perceived notebook, Coherence)
- **It comes after the thought,** so the label follows the reaction instead of steering it
- **`words`** *(v0.11)*: the character, not code, says which part of the line carried it. In the v0.10 re-check the lines ran 41–72 words with the commitment usually in the second or third sentence, so no fixed trim could find it. It costs about 15 output tokens on the ~60% of calls that label a line. It's the character's own pick, so it's never judged, only checked against the line
- **The closing think** (Core Functions, think()) uses the same task with the same schema; importance and `done` are ignored there

### Block 9b — speak() task *(addressee changed in v0.4; reply and audience lines added in v0.5)*

```
TASK: SPEAK
It is your turn to speak. {closing_line_note}

Say one thing, as {character_name} would say it.
- One to three sentences, about 60 words at most. Spoken words only: no narration, no stage directions, no thoughts.
- Speak as a person of 1492 Florence would, in clear modern English.
- If someone has just addressed you directly, answer them.
- You may tell the truth, lie, bluff, flatter, threaten, or stay vague — whatever serves your goals. Your secrets are yours: reveal one only as a deliberate move, never by accident. Do not recite your private thoughts.
- Someone claiming to know your secret, or threatening you, is not a reason to confirm it. Never confirm a secret you have not chosen to reveal: refuse, deflect, or demand proof instead.
- Whatever you say in a group, everyone present hears. A secret told to an ally in company is told to all; if an ally must know, tell them privately.
- Speak only of what you know from your briefing and what you have seen and heard tonight. Do not repeat what you have already said.
- Speak only for yourself; never describe what others say or do.
{addressee_instruction}
action — optional. You may take one of these actions with this line, or none:
{allowed_actions}

meant — what this line is, as you mean it, in one word: promise, deal, threat, admission, claim, denial, insult, pressure, or none. It's your own call. Most lines are none.
words — if meant is not none: the words of your line that carry it, at most 20, copied exactly. Otherwise null.

Reply with only this JSON:
{speak_schema}
```

In a **Capannello**:
- `{addressee_instruction}`:
  ```
  addressee — name one person present only if your line puts a direct question or demand to them that they must answer before anyone else speaks. Speaking to someone, speaking about someone, or using their name is not enough. Most lines have no addressee: use null unless you are truly putting one person on the spot. Use their name exactly as written in "Present".
  ```
- `{speak_schema}`: `{"addressee": "..." or null, "utterance": "...", "meant": "none", "words": null, "action": null or {...}}`

In a **Colloquio** (there is only one other person, so nobody needs designating):
- `{addressee_instruction}`: empty
- `{speak_schema}`: `{"utterance": "...", "meant": "none", "words": null, "action": null or {...}}`

**`meant` and `words`** *(v0.13)*: the speaker's own reading of their own line, in the same words as `took` (block 9a). Code stores it as an own reading (The perceived notebook). The two lines go after the action list and before the schema line, as every addition must.
- **Why here:** in the v0.12 re-check, `think()` after a character's own line reacted to the line they'd been answering, not to their own (52 fallbacks). The speaker knows what they mean while saying it
- **Risk:** `speak()` carries the secret-keeping lines measured in S5d, so this is a change to the call most tied to past gate results. The re-check should watch `speak()` repairs and, if it's affordable, leak lines (Models & Research's call)
- **`words` here are copied from text the speaker has just written,** so they should almost always be found

**The three secret-keeping lines** (v0.5, from Models & Research's Oct 23 findings): the **claim line** (9a), the **reply line**, and the **audience line** (9b). They go in every `think()` and `speak()` call, Colloquio included. The audience line was tested in all conversation types, and keeping one wording everywhere avoids an untested variant. On DeepSeek V4.1 they took S5d from 2/10 to 9/10 held and the held-out script from 1/10 to 5/10, with no rise in lying and clean S1, S4, and S6. They did little on Qwen3.8, so re-test them if the play model changes.

Other placeholders:
- `{closing_line_note}`: empty normally; "{other} is ending this private conversation. This is your last line here." or "This private conversation must end now. This is your last line here." at the cap
- `{allowed_actions}` is generated by code from mechanics so a character only sees what they may legally do:
  - In a Colloquio, with Florins: `{"type": "bribe", "amount": N} — hand {other} N Florins (you have {florins})`
  - Medici and Pazzi, while the treasury has a pension: `{"type": "borrow"} — accept one French pension of {pension_size} Florins`
  - Anyone with ≥ {pension_size} Florins, until the ballot: `{"type": "repay", "for": "Name"} — renounce one French pension held by yourself or a relative who has told you of it`
  - If none apply: "None available right now. Set action to null."

### Block 9c — Movement task

```
TASK: MOVE
The room shifts. This is your moment to move, if you wish; it will not come again for some time.

1. thought — 2 to 4 sentences, first person. Who do you most need to speak with now, and why? Who should you avoid? Consider how a private withdrawal would look: Il Notaio will note it to everyone present.

2. contacts — rate every guest in "All living guests besides you" from 0 to 100 for how much you want to speak with them next. Use their names exactly as written. Give a purpose of six words or fewer for your three highest only; for the rest, purpose is null.

3. choice — one of:
   "stay"       remain where you are
   "join"       go to wherever the guest you name is now and join that group
   "colloquio"  call the guest you name aside for a private word; they cannot refuse, and Il Notaio will note it

4. target — the guest you are moving toward or calling aside, exactly as written. null if you stay.

Reply with only this JSON:
{"thought": "...", "contacts": [{"name": "...", "urgency": 0, "purpose": "..." or null}], "choice": "stay", "target": null}
```

- **No placeholders since v0.20:** `{target}` was used before any target existed, and `{colloquio_note}` could only be known after the choice, so it was always empty. A `join` toward someone in the character's own group is turned into `stay` by validation (Output Validation & Repair, Movement)
- If a target is already in a Colloquio, the Stage Manager resolves a `join` to the Capannello that target will return to, and a `colloquio` waits until the target is free (it opens when their Colloquio ends, before the next turn). *To confirm in the mini-game*

### Block 9d — Strategy task *(for S9a)*

```
TASK: PLAN
{strategy_trigger}
Step back and decide your plan for what comes next. This plan is yours alone; no one else will see it, and it will guide what you say and do until you next revise it.

1. thought — 2 to 4 sentences, first person: what has changed since your last plan, and what matters most now.

2. plan — no more than 150 words. Anything past 150 words is cut off and lost, so put what matters most first. Three short parts:
   Goals: what you want by the end of the evening, and what you must achieve before the next checkpoint.
   Threats: who could ruin you, and what they know or suspect.
   Next moves: whom to approach, what to offer, ask, hide, or reveal, and what you will do with your Florins.
   Keep only what still matters from your current plan. Name people exactly as written in "All living guests besides you".

Reply with only this JSON:
{"thought": "...", "plan": "Goals: ... Threats: ... Next moves: ..."}
```

- `{strategy_trigger}` examples: "The Medici faction meeting has just ended." / "You have just survived an attempt on your life." / "Your French pension has been revealed to others." / "The candidates have been chosen: {candidates}."
- The returned `plan` becomes block 4 for every later call. The thought goes to shortTermHistory
- **Length (v0.5):** S9a found the limit ignored by GPT-5.4 in 16 of 20 plans (DeepSeek once, Qwen3.8 twice). The prompt now says what happens past the limit, and code enforces it (see Output Validation & Repair, Plan length)

### Block 9e — Murder Round task *(rebuilt in v0.4 for the Plot Reward; act fields changed in v0.5)*

```
TASK: THE MURDER ROUND
The night has come. Choose in secret. No one will learn what you chose; killers are never named, and those who investigated learn nothing. All acts take effect at once: a guest who dies tonight still carries out their own act.

What each act does:
- KILL: your target dies, unless two or more guests guard them, or unless two or more guests investigate you, which stops your kill.
- GUARD: you help protect your target. One guard alone saves no one; it takes two or more.
- INVESTIGATE: you help stop your target's kill. One investigator alone stops nothing; it takes two or more.
Remember any arrangements you made tonight, and whether others are likely to keep theirs.

You may choose:
{allowed_murder_acts}
{reward_instruction}

1. thought — 2 to 4 sentences, first person: who threatens you or your faction, who you have promised what, and what you will do.

{acts_instruction}
{extra_instruction}
{distinct_targets_note}Name guests exactly as written in "All living guests besides you".

Reply with only this JSON:
{murder_schema}
```

Generated by code:

| Placeholder | Everyone except Lupo | Lupo |
|---|---|---|
| `{allowed_murder_acts}` | `KILL, GUARD, or INVESTIGATE any living guest. You cannot GUARD yourself.` | `KILL up to two living guests. Your kills cannot be stopped by guards or investigations. You may not GUARD or INVESTIGATE with them.` |
| `{acts_instruction}` | `2. act — your one act: a single choice, not a list.` | `2. kills — the one or two guests you will kill.` |
| Base schema | `{"thought": "...", "act": {"type": "kill" or "guard" or "investigate", "target": "..."}}` | `{"thought": "...", "kills": ["...", "..."]}` (one or two names) |

**Why the change (v0.5):** with v0.4's plural `acts` list, DeepSeek took two acts in 4 of its S10 answers where one was allowed. A single `act` object leaves no room for a second, and Lupo's kills become a plain list, since they are all the same kind.

With the **Plot Reward earned** (`plot_reward` on and the plot check passed):
- `{reward_instruction}`: everyone except Lupo: `Because you completed your plot point, you have one extra act: KILL, GUARD, or INVESTIGATE. It follows the usual rules, and you cannot GUARD yourself.` Lupo: `Because you completed your plot point, you have one extra act: KILL, GUARD, or INVESTIGATE. Unlike your own kills, it follows the usual rules: a kill made with it can be stopped by guards and investigations. You cannot GUARD yourself.`
- `{extra_instruction}`: `3. extra — your extra act, or null if you choose not to use it.`
- The schema gains `"extra": {"type": "kill" or "guard" or "investigate", "target": "..."} or null`

Without it, `{reward_instruction}` and `{extra_instruction}` are empty and there's no `extra` field.

`{distinct_targets_note}`: `Each of your acts must name a different guest. ` whenever a character has more than one act (Lupo, or anyone with the Plot Reward); empty otherwise.

- The extra act is reported separately so code can tag it: for Lupo it is the only blockable act
- **Memory retrieval** for this call favours ★ entries (threats, deals, promises, payments) and anything about the guests the character's plan names as threats

### Block 9f — Ballot task *(for S8 vote items)*

```
TASK: THE BALLOT
The ballot is secret. Cast one vote for any living guest, and decide how many extra votes to buy. Every vote you buy goes to the same guest.

The candidates: {candidates}
{repentance_note}
Your purse: {florins} Florins. Each extra vote costs {vote_price} Florins; you can buy at most {max_buy}.
Florins left after the ballot are worth nothing. If the vote ties, there will be one more vote among the tied guests, with no buying.

1. thought — 2 to 4 sentences, first person: who must win for your side to win, given who has repented and who holds French pensions as far as you know, and whether buying votes is worth it.

2. vote — the guest you vote for, exactly as written in "All living guests besides you", or your own name.

3. buy — how many extra votes to buy, from 0 to {max_buy}.

Reply with only this JSON:
{"thought": "...", "vote": "...", "buy": 0}
```

- `{candidates}`: "Piero de' Medici (Medici), Francesco Pazzi (Pazzi)", noting any candidate who has died
- `{repentance_note}`: empty, or "Before the city, {name} repented of {tagline}." for each /repent broadcast
- `{max_buy}` = floor(Florins ÷ vote price), computed by code
- **For testing (v0.5):** this prompt prints the vote-buying limit, so the model never has to do the arithmetic. That's intended for play. Any probe that tests vote math (such as S8's vote-math item) must ask it somewhere else, for example in a `think()` before the ballot, or it measures reading rather than reasoning

### Block 9g — Run-off task *(new)*

Runs for every living character, in parallel, after Il Notaio announces a tie (e.g. `[Il Notaio] The votes are counted, and no one stands alone at the top: Piero de' Medici and Francesco Pazzi are tied. The city votes once more, between them alone.`).

```
TASK: THE RUN-OFF
The ballot was tied between {tied_guests}. Cast one fresh vote for one of them. No votes may be bought. If this vote ties again, the winner will be drawn by lot.
{repentance_note}

1. thought — 2 to 4 sentences, first person: which of them must win for your side to win, given who has repented and who holds French pensions as far as you know.

2. vote — one of: {tied_guests}, exactly as written.

Reply with only this JSON:
{"thought": "...", "vote": "..."}
```

- A tied guest may vote for themselves
- If the run-off ties: code draws by lot (seeded), and Il Notaio announces it, e.g. `[Il Notaio] The city is divided still. By lot, as Florence has long chosen her officers, the office falls to Francesco Pazzi.`

### System prompts (blocks 10a–10d) *(rewritten in v0.6; 10a and 10d revised in v0.7; v0.8's 10e removed in v0.9)*

These run on the **recorder model** (see Model Routing, The recorder model), never on a character's behalf. Each is a **system message** holding the instructions, which stay the same on every call so they can be cached, plus a **user message** holding that call's data. None of them sees a character briefing: the recorder works only from what was said and thought, so it can't fill gaps with what a character "should" know. How the outputs are stored is in **Memory Writing**; how they're checked is in **Output Validation & Repair**; how checks are scored is in **Plot Point Checks**.

**The definitions contract** *(v0.7)*. Every entry type, and `toward`, is defined in exactly one place: the **DEFINITIONS** section of block 10a (promise, deal, threat, admission, toward) or 10d (claim, denial). Each definition is **one line beginning `- term:`**, holding the definition, its examples, and its "Not a …" contrasts. Models & Research's gate 8 judge (rubric `gate8 v2`) reads those lines word for word at run time, so the recorder and the judge always use the same words. To change a definition, edit its line; never define or redefine a term anywhere else in the blocks. Other sections refer to "the DEFINITIONS" instead of restating them. **The `took` field in 9a is deliberately outside the contract** (v0.9). It uses the same six words, undefined, because there the character's reaction decides, not a definition.

**History of the rewrites:**

| Error seen in the mini-games | v0.6 fix | v0.7 fix |
|---|---|---|
| ~1 in 9 ★ items missed (admissions 45 of 99 misses on v0.6) | ★ items got their own pass (10a) with a line sweep; claims and denials moved to 10d | The sweep asks a separate **self** question about every line before classifying it, since that's where admissions hide. The admission definition lists the implied forms. The user message lists the IDs to sweep, and code re-asks for any line left out |
| A request recorded as a promise ("Swear it") | Every entry rests on one line; worked example | Kept |
| Statements and orders recorded as promises | – | The promise definition requires a commitment by the speaker about their own future act, with "Not a promise" contrasts (orders, statements about the present or past, hopes, predictions) and an example |
| Insults and challenges recorded as threats | – | The threat definition requires a harm the speaker will cause, with "Not a threat" contrasts (insults, dares, accusations, warnings of danger the speaker won't cause) and examples |
| Accusing questions recorded as claims | v0.6 counted them as claims | **A question is never a claim**, however pointed; 10d says so and shows one |
| `toward` read two ways by the recorder and the judge | v0.6 defined it as the person accused in claims | **`toward` dropped from 10d** (the accused is already in `about`). It now exists only in 10a, defined once |
| Summaries that say more than their quote | Quote first; fixed opening verb; code verb check | Kept. Admissions may use "implied," so an implied admission needn't be summarised as an outright one |
| Suspicions recorded as conclusions | Suspicion by default; hedge list enforced in code | Kept (unsupported beliefs fell 70–85% on v0.6) |

**Outcome (Oct 25):** v0.7 failed gate 8 on both recorders, and gate 8 is closed as a known limit (Memory Writing, Known limit). **No more memory prompt rounds before the first full games.** 10a–10d stay exactly as tested.

**Numbering:** 10a, 10b, and 10c keep their v0.5 jobs (★ pass, thought pass, knowledge check), 10d is the claims pass. v0.8's 10e (perception pass) is removed, and the label is never renumbered or reused. The harness finds each block by its heading.

**Every prompt here ends with its JSON schema line.** Nothing is appended after it (see Prompt Assembly).

**Model-neutral by design:** nothing in 10a–10d names or assumes a model. Each asks for plain JSON, needs no provider feature (constrained decoding, tool calls, reasoning), and works with the instructions sent either as a system message or folded into the user message (`system_role`). The same text runs on DeepSeek or on a stronger recorder unchanged.

### Block 10a — ★ pass (promises, deals, threats, admissions)

One call per conversation active this turn (Capannelli, Colloquii, faction meetings).

**System message:**

```
You are the clerk who keeps the record of a game of political intrigue set at a gathering in Florence, 1492. You read one conversation's lines from one turn and record every PROMISE, DEAL, THREAT, and ADMISSION in them. Another clerk records everything else, so record only these four kinds. You record what was said and who said it. You never decide whether it is true.

DEFINITIONS
- promise: the speaker binds themselves to do, or not to do, something in the future: they say what they themselves will or won't do. ("I will vote for your brother." "Not a word of this will pass my lips." "Your secret is safe with me.") Not a promise: an order or request to someone else ("Keep your mouth shut." "Swear it."); a statement about the present or the past ("I have always been loyal to the Pazzi."); a hope, wish, or opinion ("I pray Piero wins."); a prediction about other people ("Francesco will never stand.").
- deal: two people agree an exchange of Florins, votes, silence, information, or help in the Murder Round. One side offers; the other accepts, in words or by paying. Not a deal: an offer nobody has accepted yet; a price named; bargaining still under way; a payment with nothing said in return.
- threat: the speaker says they will harm, expose, or act against someone, either outright or unless the other does something. ("Pay, or the city hears of your letters." "Cross me again and you'll not see the morning.") A threat names or plainly implies a harm the speaker will cause. Not a threat: an insult ("You are a coward and a liar."); a challenge or dare ("Prove it, if you can."); an accusation ("You were there that night."); a warning about danger the speaker won't cause ("The Captain is asking about you."); anger with no consequence stated.
- admission: the speaker confirms something about themselves that they would want hidden, or that could be used against them, fully, partly, or by implication. Implied admissions count: asking someone to keep quiet about an accusation instead of denying it; answering an accusation with "And if I did?" or "What of it?"; disputing a detail of an accusation but not its substance ("It was not in the chapel."); offering to explain or confess later; telling what they did, felt, or hid. Not an admission: a denial; a refusal to answer with no other hint ("I will not discuss it."); paying or bargaining without confirming anything (a payment is not a confession); something about themselves that everyone knows, such as their name, title, faction, or office.
- toward: the one person a promise, deal, threat, or admission is aimed at: the person promised to, dealt with, threatened, or confessed to, whether or not they are present. Never the speaker. null if there is no such person.

WHO DID IT
Every entry rests on one line: the line where the speaker promises, accepts a deal, threatens, or admits.
- If someone answers a request with "I swear it", that answer is the promise: cite the answer as "line" and the request in "context".
- Record a deal on the line where it was accepted, with the offer in "context". If the only acceptance was a payment (a bracketed line), cite the offer as "line" and the payment in "context".

EXAMPLES
[L40] Lupo: Swear on your mother's grave you'll keep my name out of it.
[L41] Contessa Isabella: I swear it. No one will hear your name from me.
[L42] Captain Armand LeNoir: Hold your tongue, Pazzi, or I'll hold it for you.
[L43] Francesco Pazzi: You're a coward behind a French sword. Prove me wrong.
[L44] Raffaello de' Medici: Your bankers' letters were full of threats, Contessa.
[L45] Contessa Isabella: Lower your voice. What was in those letters is not for this table.
[L46] Lupo: I was nowhere near the river that night.
Right:
- L40: nothing. A request binds no one.
- L41: promise, context ["L40"], speaker "Contessa Isabella", toward "Lupo".
- L42: threat, speaker "Captain Armand LeNoir", toward "Francesco Pazzi". "Hold your tongue" alone is an order; "or I'll hold it for you" makes it a threat.
- L43: nothing. An insult and a dare.
- L44: nothing here. A claim, which the other clerk records.
- L45: admission, speaker "Contessa Isabella", toward "Raffaello de' Medici". She asks for quiet instead of denying.
- L46: nothing here. A denial, which the other clerk records.

STEP 1: SWEEP
For every line listed under LINES TO SWEEP, in order, answer two questions:
- self: does the speaker say anything about their own deeds, secrets, feelings, or loyalties, even by implication? Answer this first: it is where admissions hide.
- kinds: which of the four kinds the line contains, by the DEFINITIONS. Most lines contain none. If "self" is true, check the admission definition with care before answering.
List every line, even lines with nothing to record.

STEP 2: ENTRIES
Write one entry for each kind your sweep found, and no others. A line holding both a threat and a promise gets two entries.
- line: the ID of the one line the entry rests on.
- context: the IDs of any other lines needed to understand it, or an empty list.
- speaker: the full name of whoever spoke "line".
- quote: the words from "line" that show it, at most 25 words, copied exactly.
- type: promise, deal, threat, or admission.
- "toward": as in the DEFINITIONS, or null.
- about: everyone the entry concerns, including people not present.
- summary: one sentence, past tense, at most 20 words. Begin with the speaker's name and the verb for the kind: "promised" (or "swore", "vowed"), "agreed" for a deal, "threatened" (or "warned"), "admitted" (or "confirmed", or "implied" for an implied admission). Say only what the quote says: no motives, no consequences, and no meaning read into a hint. If the line is vague, the summary is vague.

RULES
- Record what was said, not what is true. Lies are recorded exactly like truths.
- Record only lines from THIS TURN. EARLIER IN THIS CONVERSATION was recorded last turn; use it only to understand what a line refers to.
- Use full names exactly as in the ROSTER.
- If no line contains any of the four kinds, every sweep item has an empty "kinds" list and there are no entries.

Reply with only this JSON:
{"sweep": [{"line": "L57", "self": false, "kinds": []}], "entries": [{"line": "L57", "context": [], "speaker": "...", "quote": "...", "type": "promise" or "deal" or "threat" or "admission", "toward": "..." or null, "about": ["..."], "summary": "..."}]}
```

**User message:**

```
ROSTER
{roster}

CONVERSATION
{conversation_label}, turn {turn}. Present: {participants}

EARLIER IN THIS CONVERSATION (context only; do not record)
{context_lines}

THIS TURN
{turn_lines}

LINES TO SWEEP
{sweep_ids}
```

- `{roster}`: one line per character, `Full Name — Faction`, the dead marked `(dead)`. Faction membership is public in the game
- `{context_lines}`: the last 4 lines before this turn in the same conversation, **with their IDs** (so a request from last turn can be cited in `context`), or `None.` if the conversation opened this turn
- `{turn_lines}`: every line of this conversation this turn, in History Line Format, each prefixed with an ID: `[L57] Contessa Isabella (to Lupo): words` / `[L58] [Contessa Isabella gave Lupo 3 Florins.]` / `[L59] [Il Notaio] words`. Private action lines aren't included, since they belong only to the actor and are stored by code
- `{sweep_ids}` *(v0.7)*: the IDs of this turn's **spoken** lines, comma-separated, in order (`L57, L60, L61`). Bracketed and Il Notaio lines aren't listed. On v0.6 the sweep left 29 lines out across 13 games; listing them makes the task explicit, and code checks the sweep against this list
- IDs are unique for the whole game, so entries can be traced back to their lines in the game record
- **10d uses this same user message.** The LINES TO SWEEP section is harmless there, and keeping one message lets both passes share a cached prefix of data

### Block 10b — Thought pass

One call per character who made at least one character call this turn.

**System message:**

```
You read one character's private thoughts from one turn of a game of political intrigue set in Florence, 1492, and record what the character has come to believe about hidden matters: who did what, who holds what, who is lying, who is allied with whom, who loves whom. You record their belief, not whether it is true.

TWO KINDS
- suspicion: the character thinks it may be so. This is the usual kind. Anything hedged, wondered at, guessed, or reasoned towards without being settled is a suspicion.
- conclusion: the character treats it as settled fact, stated flatly, as something they now know. ("It was Isabella. The boar is hers.")

THE TEST FOR A CONCLUSION
All three must hold. Otherwise it is a suspicion.
1. The sentence states it flatly. Any of these makes it a suspicion: perhaps, maybe, might, may, could, likely, probably, possibly, surely, must be, I think, I suspect, I wonder, it seems, appears, if, unless, whether, or a question mark.
2. The character holds it themselves. What someone else claimed is not a belief at all ("Lupo says X"), unless the character accepts it ("Lupo says X, and he is telling the truth").
3. It is about a hidden matter, not a plan, a feeling, or a judgement of character.
If in doubt, it is a suspicion.

EXAMPLE
[T41] The friar has gold he shouldn't. Perhaps he keeps a second purse for the Pazzi.
Right: a suspicion. Quote: "Perhaps he keeps a second purse for the Pazzi."
[T52] No more doubt: the friar keeps a second purse. I saw it under his robe.
Right: a conclusion. Quote: "No more doubt: the friar keeps a second purse."

WHAT NOT TO RECORD
- Plans, intentions, feelings, and judgements of character ("He is a fool").
- The character's own past and secrets, which they simply know.
- A belief already recorded, unless it has changed. Beliefs recorded so far are listed for you.

RULES
- thought: the ID of the thought it comes from, such as "T41".
- quote: the whole sentence, or sentences, from that thought that state the belief, hedge words included, at most 40 words, copied exactly.
- kind: "suspicion" or "conclusion", by the test above.
- change: "new"; "firmer" (a recorded suspicion is now a conclusion); or "dropped" (the character now thinks a recorded belief is false). For "firmer" and "dropped", give the recorded belief's ID in "belief"; otherwise null.
- statement: the belief as one plain sentence, using full names exactly as in the ROSTER, saying exactly what the quote says and no more: no extra people, motives, or details.
- If there is nothing to record, return an empty list.

Reply with only this JSON:
{"beliefs": [{"thought": "T41", "quote": "...", "kind": "suspicion" or "conclusion", "change": "new" or "firmer" or "dropped", "belief": "B3" or null, "statement": "..."}]}
```

**User message:**

```
ROSTER
{roster}

CHARACTER
{character_name}

BELIEFS RECORDED SO FAR
{prior_beliefs}

THOUGHTS THIS TURN
{thoughts}
```

- `{prior_beliefs}`: the character's held beliefs, one per line: `[B3] suspicion — Contessa Isabella ordered the killing of Captain LeNoir's brother.`, or `None.`
- `{thoughts}`: every thought this character produced this turn (from `think()`, movement, strategy, and the other character calls), each prefixed with an ID: `[T41] ...`. A thought that exactly repeats the character's previous thought is left out (see shortTermHistory)

### Block 10c — Knowledge check

One call per **(character, fact)** pair, at a plot-point deadline. The facts and their wording are in **Plot Point Checks, Plot-point facts**. *v0.6: beliefs now arrive with their quotes, and the check re-reads a "conclusion" quote for hedges.*

**System message:**

```
You check whether one character in a game of political intrigue has learned one particular fact by a given moment. You are given the true fact, what counts and what doesn't, and the character's memory: what was said in their presence, and their own private beliefs. Judge only from the evidence given.

VERDICTS
- told: someone stated or confirmed the fact in the character's presence, plainly enough that a listener would understand it, or Il Notaio announced it. This counts whether or not the character believed it. Hints, questions, rumours offered as uncertain, and hedged guesses are not "told".
- conclusion: the character has firmly concluded the fact themselves, either among their private beliefs or by stating it as settled in their own words, and has not since dropped it. If their private beliefs show a statement of theirs was a bluff, treat it as a suspicion.
- suspicion: the character only suspects the fact, or holds only part of it.
- none: nothing in the evidence points to it.
If more than one applies, give the strongest: told, then conclusion, then suspicion.

RULES
- The fact must be matched in substance, including every part listed under "Must include". Anything listed under "Does not count" is at most a suspicion.
- Judge a belief by its quote, not its label. A belief labelled "conclusion" whose quote hedges (perhaps, might, likely, I think, a question) is a suspicion.
- Paying someone for their silence, or being paid for yours, is evidence, not telling. A payment tells the person paid nothing unless the payer also said or confirmed the fact.
- A wrong belief never counts, however firm. Compare everything against the true fact.
- told_by: everyone who told the character the fact, by full name. Empty unless the verdict is "told".
- Give your reasoning first, citing the IDs it rests on, then your verdict.

Reply with only this JSON:
{"reasoning": "2 to 4 sentences", "verdict": "told" or "conclusion" or "suspicion" or "none", "evidence": ["M12"], "told_by": ["..."]}
```

**User message:**

```
CHARACTER
{character_name}

AS OF
{deadline_label}

THE TRUE FACT
{fact}
Must include: {must_include}
Does not count: {does_not_count}

WHAT WAS SAID IN THEIR PRESENCE
{memory_entries}

THEIR OWN BELIEFS
{beliefs}
```

- `{memory_entries}`: the character's code entries and reference entries (10a, 10d; never readings, v0.8) up to the deadline that name any of the fact's key people (as speaker, `toward`, or `about`), plus the 10 entries most similar in meaning to the fact. Capped at 60 entries; if over, all ★ entries are kept first. Rendered `[M12] T4 · Colloquio with Lupo · claim · {summary} ("{quote}")`
- `{beliefs}`: all the character's beliefs, held and dropped, with turn, status, and quote: `[B3] T6 · conclusion (held) · {statement} ("{quote}")`, or `None.`
- `{deadline_label}`: e.g. "the start of Faction Meeting 4" or, in the mini-game, "the end of the game"

### Block 10d — Claims pass *(new in v0.6; revised in v0.7: no `toward`, no questions)*

One call per conversation active this turn, alongside 10a. Same user message as 10a.

**System message:**

```
You are the clerk who keeps the record of a game of political intrigue set at a gathering in Florence, 1492. You read one conversation's lines from one turn and record its CLAIMS and DENIALS. Another clerk records promises, deals, threats, and admissions, so leave those out. You record what was said and who said it. You never decide whether it is true.

DEFINITIONS
- claim: the speaker states as fact something about another person or a past event that others present may not have known: an accusation, a rumour, a revelation, or evidence shown. ("Captain LeNoir walks the Embassy gardens most nights.") Not a claim: a question, however pointed or accusing ("Why were you in the gardens at midnight?"); an opinion, insult, or judgement of character ("He's a fool."); anything the speaker says about themselves; a plan, order, promise, or threat.
- denial: the speaker denies an accusation or a claim, about themselves or someone else. ("I was never at San Frediano.") Not a denial: a refusal to answer ("I will not discuss it."); changing the subject; a question asked back ("Who told you that?").

LEAVE OUT
- Promises, deals, threats, and admissions. Another clerk records them.
- Greetings, flattery, small talk, feelings, and plans.
- Bracketed lines and Il Notaio's lines as entries of their own.
- Questions, however pointed. If the same line also states something as fact, record that statement.

EXAMPLES
[L50] Francesco Pazzi: The Captain walks the Embassy gardens most nights. Ask him whom he meets.
[L51] Captain Armand LeNoir: Why were you in the gardens at midnight, Pazzi?
[L52] Giorgia Pazzi: My brother is wrong. The Captain was with the Prince all evening.
Right:
- L50: claim, speaker "Francesco Pazzi", about ["Captain Armand LeNoir"], quote "The Captain walks the Embassy gardens most nights." The order that follows is not recorded.
- L51: nothing. A question, however pointed.
- L52: denial, speaker "Giorgia Pazzi", about ["Francesco Pazzi", "Captain Armand LeNoir"], quote "My brother is wrong."; and claim, about ["Captain Armand LeNoir", "Emile de Valois"], quote "The Captain was with the Prince all evening."

ENTRIES
- line: the ID of the one line the entry rests on, spoken by the person claiming or denying.
- context: the IDs of any other lines needed to understand it, or an empty list.
- speaker: the full name of whoever spoke "line".
- quote: the words from "line" that show it, at most 25 words, copied exactly.
- type: claim or denial.
- about: everyone the statement concerns, including people not present. The person accused or contradicted always goes here.
- summary: one sentence, past tense, at most 20 words. Begin with the speaker's name and "said", "claimed", "accused", or "denied". Attribute it: "Francesco Pazzi said Captain LeNoir walks the Embassy gardens at night," never "Captain LeNoir walks the Embassy gardens at night." Say only what the quote says.

RULES
- Record what was said, not what is true. Lies are recorded exactly like truths.
- One entry per distinct statement. Don't split one statement into several entries, and don't merge separate statements.
- Record only lines from THIS TURN. EARLIER IN THIS CONVERSATION was recorded last turn; use it only to understand what a line refers to.
- Use full names exactly as in the ROSTER.
- If nothing qualifies, return an empty list.

Reply with only this JSON:
{"entries": [{"line": "L57", "context": [], "speaker": "...", "quote": "...", "type": "claim" or "denial", "about": ["..."], "summary": "..."}]}
```

**Why claims get their own pass:** in v0.5 they were the most numerous entries and competed for attention with the ★ items, which are the ones gate 8 measures and the ones characters rely on for deals. The extra call per conversation is small next to the character calls (see Memory Writing, Cost).

**Why questions are out (v0.7):** a question can carry an accusation, but whether it does is a judgement call. v0.6 recorded pointed questions as claims, the gate 8 judge disagreed with many of them, and 20 were then dropped by the verb check as "X asked…". Recording only statements makes the rule checkable. The question still reaches every listener through History.

---

## Speaking Order & Decay Rule

*The plain-language rule is in mechanics under Conversation Types.*

- The Orchestrator re-decides speaking order after every utterance, using current importance scores
- Each time the same character speaks again in a row, their effective importance score is reduced by **20% of its current value**
- Importance scores reset with a fresh `think()` each turn; decay doesn't carry forward
- Ties are broken randomly
- `detectDesignation()` overrides all importance-score logic when a direct address is detected, subject to the guard below
- **Ping-pong guard (v0.4):** in one Capannello, a designation can force at most **two replies in a row**. If a third consecutive line names an addressee, it is still shown as `(to Addressee)`, but the next speaker is chosen by importance. Stops two characters from trading questions and shutting the third out. Tune in the mini-game

The design is adapted from *Who Speaks Next?* (Nonomura & Mori, 2025), which found that combining self-selection by urgency with a "current speaker selects next" rule significantly reduced dialogue breakdowns compared with fixed turn order. That study covered a single conversation; running several in parallel is an extension of it.

---

## Movement Implementation

*The movement rules are in mechanics under Movement.*

- When a character's window arrives, the **movement call** (block 9c) decides: stay, join, or Colloquio, plus a target
- **Targets resolve dynamically:** the character names a person, and the Stage Manager resolves where that person currently is
- **Sequential processing:** moves are resolved one at a time, so later movers see earlier moves
- **Collision resolution:**
  1. Capacity first: if one of the two Capannelli has an open seat, the character without a seat moves there
  2. Disruption fallback: if both are full, the character with the **lower current importance score** (from their latest `think()`) moves
- Characters see only who is in their own conversation, plus what Il Notaio has noted to them. They are not shown where everyone else is (see Open Questions)

---

## Memory Architecture

### History

- Per-character verbatim buffer of recent lines: speech, Il Notaio's notes, and action lines (see History Line Formats)
- Only contains what the character was personally present to witness, plus broadcasts and their own private actions
- Joining characters receive History only from the point their presence was acknowledged
- Starting window: about 5–6 utterances, to be tuned in testing

### shortTermHistory

- Per-character rolling log of recent thoughts from every character call
- Private, not visible to other characters
- Keeps intentions and reasoning consistent across turns
- Window size to be tuned in testing
- **Repeated thoughts are dropped** *(v0.6, default for every model; run setting `drop_repeated_thoughts`)*. A new thought that **exactly repeats the same character's previous thought** is not added to shortTermHistory, so block 7 never shows the same thought twice in a row, and the thought pass doesn't receive it. "Exactly" means identical after trimming and collapsing whitespace. The repeat is still logged in the game record and counted as a health metric, and that call's other outputs (importance, `done`, the line spoken) are used as normal
  - **Why:** in 5 mini-games Qwen3.8 repeated its previous thought word for word 67 times (DeepSeek 2), 43 of them right after a new line it should have reacted to. Seeing its own last thought echoed back in block 7 seems to feed the loop. Dropping exact repeats costs nothing and can't hide a real change of mind
  - **Not covered:** near-repeats with small wording changes. Models & Research's similarity measure (≥0.7) still reports them; a fuzzy filter is deferred until that measure shows a need

### longTermHistory

- Per-character memory accumulated across the whole game. In the default mode (`notebook: perceived`, v0.8) it has three parts:
  - **Entries written by code:** payments, private actions, and Il Notaio's events. These are exact and the same for everyone present
  - **Readings:** how the character took what was said, labelled in their own `think()` calls (see The perceived notebook)
  - **Beliefs:** their own conclusions and suspicions
- In `notebook: shared` (v0.7 behaviour), the ★ and claims entries take the place of readings
- Written at the end of every turn (see Memory Writing)
- ★ marks promises, deals, threats, admissions (in the default mode, as the character took them), payments, and pensions
- Retrieved once per utterance and shared by that character's `think()` and `speak()` (see Memory Writing, Retrieval)
- The extraction prompts are among the most critical in the system, on par with the character briefings

### Memory Writing *(new in v0.5; passes split in v0.6)*

**Who writes what:**

| Source | What it records | Who it's stored for | ★ |
|---|---|---|---|
| **Code: transaction log** | Every bribe: `Contessa Isabella gave Lupo 3 Florins.` | Everyone present at the action line | ★ |
| **Code: private actions** | /borrow and /repay, in the second person | The actor only | ★ |
| **Code: Il Notaio's events** | Joins, departures, withdrawals, returns, broadcasts | Everyone who received the line | – |
| **★ pass** (10a) | Promises, deals, threats, admissions | Everyone present at `line` and every cited context line from this turn. *Reference record only in `notebook: perceived`* | ★ |
| **Claims pass** (10d) | Claims and denials | As 10a. *Reference record only in `notebook: perceived`* | – |
| **Thought pass** (10b) | Suspicions and conclusions | The thinker only, as beliefs | – |
| **Code: readings** (v0.9) | Each `took` other than `none` from the character's own `think()`, attached to its line | The character only. *Not shown in `notebook: shared`* | ★ if taken as a promise, deal, threat, or admission |

**Reference record** (v0.8): the 10a and 10d entries, stored with their audience exactly as before. In the default mode they're read by knowledge checks, research, and the dashboard, and never retrieved into a character's prompt.

**An entry**, as stored:

| Field | Filled by |
|---|---|
| `id` (M…), `turn`, `conversation` | Code |
| `type` | Model (10a, 10d), or code for code-written entries |
| `line` | Model; must be a spoken line from this turn. The entry rests on it |
| `speaker` | Model, **checked by code** against the speaker of `line`; a mismatch drops the entry. For a deal, code also stores `parties`: the speaker of `line` plus the other party from the context lines |
| `context` | Model; IDs of supporting lines (this turn or the context lines) |
| `quote` | Model; checked word for word against `line` |
| `toward`, `about` | Model, resolved through the alias table. `toward` exists only on ★ entries (10a) and is never the speaker; for claims and denials, the people concerned are in `about` |
| `summary` | Model; must begin with the speaker's name and a verb allowed for the type |
| `audience` | Code: characters present at `line` and at every context line from this turn, so a late joiner doesn't receive an entry resting on lines they missed |
| `salient` (★) | Code, from `type` |

**A belief** stores `id` (B…), `kind` (suspicion or conclusion, after the hedge rule), `status` (held or dropped), the turn first recorded, the turn last changed, the source thought ID, the quote, and whether code downgraded it. "Firmer" updates the kind, and the hedge rule applies to it too; "dropped" sets the status. Nothing is deleted.

**Why these checks:** the gate 8 failures that matter most are a wrong speaker and an invented fact. The v0.5 design took the speaker from the first cited line, which went wrong when the model cited a request ("Swear it") as a promise: the asker became the promiser. v0.6 makes each entry rest on one line and has the model state who spoke it, so a mismatch shows up as a disagreement code can catch. The quote check still catches invented quotes. The verb check catches a label that disagrees with the model's own summary ("Lupo demanded…" under `promise`). Summaries that overreach their quote are still possible; Models & Research's judge measures them.

**Rendering in block 6** (one line each, oldest first within the selection). In the default mode, a reading is short *(v0.9)*: the turn, the conversation type, the speaker, a trimmed quote, and how the character took it. Measured at ~40 tokens each (v0.9 test), so block 6 gets ~450 tokens, about 10–12 lines (v0.10):

```
T4 · Colloquio · ★ Lupo: "Three florins, and you never knew my name." (you took it as a deal)
T4 · Colloquio · ★ You gave Lupo 3 Florins.
T5 · Colloquio · ★ Contessa Isabella: "…three Florins for your discretion…" (you took it as a deal)
T5 · Il Notaio: "Signor Raffaello de' Medici was once again seen drawing another aside — this time Captain LeNoir…"
T5 · Capannello · Francesco Pazzi: "The Captain walks the Embassy gardens most nights." (you took it as a claim)
T5 · Capannello · Captain Armand LeNoir: "…a coward behind a French sword…" (you took it as an insult)
T6 · Capannello · Captain Armand LeNoir: "…where were you when the boar seal went missing?" (you took it as pressure)
T6 · Colloquio with Francesco Pazzi · ★ you: "My lips are sealed, as ever." (you meant it as a promise)
T6 · your belief (conclusion): Contessa Isabella ordered the killing of Lucien.
```

- **Quote** *(v0.11)*: the character's own `words` (block 9a step 3), with "…" before them if they don't start the line and after them if they don't end it. **Fallback:** the whole line if it's 15 words or fewer, otherwise its first 15 words and "…". Words are counted on spaces, and a standalone dash isn't one. The full line stays in the record. *Why:* in the v0.10 re-check, the first-15-words trim cut the part the label rests on in 11 of 20 own-line readings, and a 20- or 25-word cap recovered only 1 or 3 of 14 such cases Trailing sentence punctuation (. , ; : ! ?) is dropped from the words when an "…" follows (v0.15)
- **Code entries:** payments and private actions render as before. **Il Notaio's entries are trimmed to 15 words** like quotes (v0.10), shown as `Il Notaio: "…"`, with "You" in place of the character's name when the note begins with it (v0.11; other notes are left as written). Before this, the mini-game's opening attendance note ran to ~90 tokens. The attendance problem itself is Models & Research's mini-game fix, and shouldn't rely on block 6
- **Conversation label:** a Colloquio with someone else speaking needs no name, since the speaker is the other guest. A Colloquio line of the character's own names the other guest. A Capannello shows only the type, to save tokens; who else heard is in the record, not the line
- **No reaction text:** v0.8's quoted reaction made readings ~79 tokens. The character's recent thoughts are already in block 7

In `notebook: shared`, ★ and claims entries render as in v0.7: `T4 · Colloquio with Lupo · ★ deal: {summary} ("{quote}")`.

**Retrieval** (once per character per utterance, about 450 tokens since v0.10, roughly 10–12 lines). "Entries" here means the character's notebook: readings and code entries by default, or ★ and claims entries in `shared` mode:
1. ★ entries naming anyone present (as speaker, `toward`, or `about`), most recent first, up to 6
2. Held beliefs about anyone present, up to 3
3. Fill the rest with the entries and beliefs most similar in meaning to the last two History lines. A reading is matched on its full line text, not the trimmed quote

**At most 3 readings of any one non-★ label per call in step 3** (v0.19; it replaces v0.17's pressure-only cap). Claim, denial, insult, and pressure are each capped at 3, own readings included. The fill skips any further ones of that label, so no single label can crowd out the others, beliefs, or code entries, whichever one characters use most. Steps 1 and 2 are unaffected. A reading skipped for the token budget doesn't count toward its label's 3.

**The ~450-token budget is a hard cap** (v0.11, as built): items are added in the order above, and one that would pass the cap is skipped, so a shorter item further down can still fit. Lines are capped at 12. Steps 1 and 2 go first, so a fill item never displaces a ★ entry or a belief. Tokens are estimated as characters ÷ 3.5.

Movement, strategy, Murder Round, and vote calls retrieve with their own queries (Murder Round: ★ threats, deals, and promises first; strategy: the most recent turn's ★ entries plus held conclusions).

**Cost:** per turn, two calls per active conversation (★ pass and claims pass; about 8–12 in a full game, 2–4 in the mini-game), up to 12 thought-pass calls, and the occasional sweep re-ask, all on the recorder model with cached instructions. That's about 20–24 recorder calls per turn in a full game, against ~48 character calls, and all of them run in parallel at the end of the turn. On v0.7, recording cost $0.018 per mini-game on DeepSeek. Readings cost no recorder calls (v0.9): a few output tokens per `think()`, plus two closing thinks per Colloquio. A stronger recorder would cost more per call; see Model Routing, The recorder model.

**Known limit** *(v0.8; gate 8 closed Oct 25)*. Measured on the 13 saved mini-games with DeepSeek recording on v0.7, against bars of ≥90% and 0:
- **★ items captured:** 55.6–67.6% per group
- **Invented entries:** 39–66 per group

A stronger recorder (GPT-5.4) captured 79.9% but invented more (102), at ~54× the cost, so there's no split (Models & Research, Findings Log). The judge's own ★ list grew with the record it was shown, so these figures are rough rather than exact.

**What it means:**
- The ★ and claims record misses a third to nearly half of ★ moments and holds invented ones. In `shared` mode that is what characters remember. In the default mode it's what knowledge checks and research read
- **Logged checks stay exact.** Knowledge checks carry the error, and every verdict is stored with its evidence for the hand-read
- **The `self` question stays for now** (it fired on most lines and didn't find admissions). The first full games should run the pass that was measured, and dropping it now would add a third, unmeasured variant while v0.6 versus v0.7 is still open. If v0.7 is kept, drop `self` then, as a token saving, checked by one replay of the saved games
- **No more memory prompt rounds before the first full games.** Their hand-read decides whether v0.6's ★ pass (records more, invents more) or v0.7's keeps the reference record

### The perceived notebook *(new in v0.8; rebuilt in v0.9)*

*From Dylan's proposal with Models & Research (Oct 25): what matters is how a line came across, not its neutral meaning. A paranoid character and an easygoing one shouldn't share one record of the same threat, since a neutral record whitewashes the personalities.*

**Decision: adopted, as the default** (`notebook: perceived`). Each character remembers what was said through **readings**: the speaker's words plus how this character took them. The ★ and claims passes keep running unchanged as the **reference record**, which characters never see. `notebook: shared` restores v0.7, as a fallback or a comparison.

**v0.9: the character labels the line itself.** In v0.8 a recorder pass (10e) read each character's thoughts and decided how the character took each line. On replay it repeated gate 8's error (Models & Research, Findings Log, Oct 26):
- It gave a reading to 91–97% of lines heard
- It labelled lines by their content rather than by the character's reaction
- 11 of 20 hand-read readings were recorder errors, which no quote check can catch

v0.8 hoped that moving the judgement onto the character's thought would fix this. It didn't, because a clerk was still making the judgement. Now `think()` returns the label itself (`took`, block 9a), on the play model with the character's own adapter. So nothing is left for a clerk to get wrong. A label can still look odd next to its thought, or follow the line's content more than the character's mood. Those are findings about the character, not recorder errors.

#### Which line a label belongs to

Code attaches `took` by a fixed rule, using the event order (Models & Research found 98.5% of thoughts pair cleanly). The same rule picks the line that `{took_target}` names in the prompt *(v0.10)*, so the line the character is asked about is always the line the reading is stored on:
1. **The line:** the last spoken line the character **heard** in their conversation before the thought. Usually that's `after_line`; when an action line or an Il Notaio note came between the speech and the thought, it's the speech before them. A line spoken before the character joined doesn't count (v0.10). **"This conversation" starts at the character's latest arrival** (v0.15): a character returning from a Colloquio to the same Capannello isn't asked about lines from before they left
2. **No spoken line:** if there's none (a thought after only an Il Notaio note as a conversation opens, or a joiner's first thought), the label is ignored and logged
3. **One reading per character per line:** the first label other than `none` stands. A later, different label for the same line is logged, not stored. The same label again is a no-op, logged as "same label again" (v0.10)
4. **Own lines** *(v0.13)*: the character's own line is labelled in `speak()` (`meant`, `words`), and that is the only source of own readings, marked `own`. The `think()` that follows their own line names the last line by someone else they heard in this conversation, the one they were answering. Under rule 3 that's usually a no-op, since they labelled it before speaking. The **closing think** covers a Colloquio's last line when someone else spoke it (Core Functions, think())
5. **Words that match a different line** *(v0.13; scoped in v0.14)*: if a `think()`'s `words` aren't in the named line, code searches every line the character heard tonight, in any conversation:
   - **A line by a different speaker:** the label was about that line, so the reading is dropped, logged as "wrong-line words" with the latest matching line. **If the words also match an earlier line by the named speaker, that match wins** and the reading stays (v0.15, as built in v0.14)
   - **An earlier line by the same speaker** (v0.14): it's the same remark. The reading stays on the named line and quotes the words found, logged as "same speaker, earlier line"
   - **No line:** the reading falls back to the trim and the label stands

**Also defined in v0.10** (as Claude Code built them in PR #12):
- **A reading's `turn` is the line's turn,** which matters only for a closing think
- **`notebook: shared` writes no readings.** `took` is still logged on every thought, so readings can be derived from the record by this rule
- **Replays of saved games can't produce readings,** since the labels come from play. Testing a change to `took` takes new games

**A reading**, as stored (no model fills anything but `took`):

| Field | Filled by |
|---|---|
| `id` (R…), `turn`, `conversation`, `line`, `speaker` | Code, by the rule above |
| `took` | The character, in `think()` |
| `words` | The character, in `think()` (v0.11), checked against the line; null if the fallback was used |
| `thought` | Code: the ID of that `think()` |
| `about` | Code: the speaker, the line's addressee if any, and every roster name or alias found in the line |
| `own` | Code: true if the character spoke the line |
| `salient` (★) | Code: `took` is a promise, deal, threat, or admission |

#### 1. Cost

| Per turn (full game) | v0.7 (`shared`) | v0.8 | **v0.9** |
|---|---|---|---|
| Recorder calls | ~20–24 | ~32–36 | **~20–24** |
| `think()` | ~48 calls | Same | Same calls, +3–5 output tokens and ~50 input tokens each (v0.11's `words`: about +10 output and +30 input more), plus 2 closing thinks per Colloquio. Measured cost per mini-game: $0.111–0.112, against $0.139 on v0.7 |

**Net:** v0.9 is cheaper than v0.8, and close to v0.7. The closing thinks cost about two `think()` calls per Colloquio, since a Colloquio's last line had no `think()` after it before v0.9.

#### 2. Coherence: colour, not chaos

**The line:** a character may misjudge what a line *meant*. It can never misremember *that* it was said, who said it, its words, or any payment. The reading is personal; the record of events is exact.

**Guards, all in code, no extra calls:**
- **Words beside the label.** Every reading shows who spoke and a trimmed quote of the exact words, so the character sees what was said next to how they took it
- **The label is the character's own.** No recorder judges it, so a divergence from the transcript belongs to the character. This matters most for the research
- **Money is never a matter of perception.** Payments, pensions, and private actions are code entries in the same notebook. A misread deal can't move a Florin: only an action can, and every action is validated against mechanics
- **Scoring never reads readings.** Knowledge checks read the reference record and beliefs (Plot Point Checks)

**Allowed, because it's the point:**
- reading a jest as a threat, or shrugging off a real one
- believing in a deal the other side never meant
- labelling a line `none` and forgetting it

Acting on a misreading is legal play. A character may pay, vote, or kill on a deal or threat they misread, as a human player might, and mechanics already handles every such action.

**Would be chaos, and isn't guarded yet:**
- **Runaway readings:** retrieved readings feed the next thoughts, so a paranoid reading can breed more, until every line reads as a threat
- **Labelling everything:** if characters ignore "most lines are none," the notebook fills with claims (and, since v0.12, insults), and the ★ readings have to compete for space. In the v0.9 test, 62% of lines got a label and claims were 37% of all labels (10e: 91–97%). **Accepted for now:** ★ readings come first in retrieval (step 1), so claims only compete in the similarity fill, and the label rate is a personality measure in its own right. If the full games show claims crowding out ★ readings or beliefs, the lever is a cap on claim readings in the fill step, not a new prompt definition
- **Labels that disagree with their own thought:** the thought shrugs, but the label says threat. That's noise, not personality
- **Forgotten own commitments:** if a speaker labels their own promise `none`, they forget it once History scrolls past

**First test (v0.9, Oct 26; 3 DeepSeek mini-games):** 12 of 20 hand-read readings fit the character's thought, 4 didn't, 4 were on the wrong line (all own lines, fixed in v0.10 by naming the line), and none misread the words. Gate 1 held at 0 repairs in 915 `think()` calls. Mean importance fell slightly (48.6 against 51.2) and output stayed ~143 tokens per call.

**Re-check (v0.10, Oct 26; 3 new DeepSeek mini-games):** 0 of 533 readings were stored off the line the prompt named. The mixed hand-read had 20 of 20 fitting the thought, and the own-line hand-read 17 of 20, with 0 on the wrong line and 0 misread. The 3 own-line misfits were all labelled threat on lines the character's thought treated as barbs, an insinuation, or a challenge. That's the gate 8 pattern again, now in the character's own hand, and it's a measure, not an error. Own-line labels shifted toward commitments (promise, deal, or threat: 80 of 129 own readings, against 56 of 142), and 57% of own-line thinks returned `none`. Gate 1 held. **The remaining problem was the 15-word trim,** fixed in v0.11 by `words`.

**No runtime guard yet.** All four risks are measured in the v0.11 re-check and the first full games (Open Questions). If a guard is needed, the first levers are retrieval (for example, a cap on readings of one kind per call) and the wording of the `took` line, not the record. **Personality versus noise:** every variant plays on the same model, so plain noise should show up equally across Neutral, Bold, and Cautious. Personality shows up as a systematic difference between them on comparable lines.

#### 3. Where to build it

**In `think()`, as Models & Research recommended.** It's the call that already follows each line, already carries the personality, and already writes the thought the label should agree with.
- **Own commitments: in `speak()` since v0.13.** v0.9 put them on the speaker's next `think()` to keep `speak()` untouched. The v0.12 re-check showed that thought reacts to the line being answered: 16 of 30 own-line readings in the hand-read quoted the other speaker. `meant` labels the line as it's said
- **Not a bigger 10e.** Raising its limit to ~1,500 tokens would fix the cut-offs, not the mislabels, which are judgement errors
- **Not in 10b.** 10b's prompt stays as tested
- **Gate 1:** `took` is a single word with a fixed set of values. Any other value becomes `none` and is logged as a repair, so it can't trigger a retry. The mini-games report the repair rate, and gate 1 is re-checked if it rises

#### 4. What the game record needs

So Models & Research can compare each notebook with the transcript (Game Record & Export):
- **Each `think()` stores `after_line`, `took`, and `words`,** `none` included, plus whether it was a closing think, the target type (other, own, or none), and the target line
- **Each `speak()` stores `meant` and `words`** (v0.13), `none` included
- **Label log probabilities** (v0.21): the top 5 candidates and their probabilities at each `took` and `meant` label, where the provider returns them. For example, a character who wrote "pressure" with "threat" close behind. This is a possible finer measure of how each personality takes the same kind of line
- **Every reading,** with the line it was attached to, and every label ignored or logged by the attachment rule, including "wrong-line words" drops
- **The reference record as before:** every 10a and 10d entry with its audience, in both modes
- **Unchanged and already logged:** each listener's importance score for each line, which is a second perception signal (does a Cautious character rate threats higher?), and who was present at each line
- **The header records the notebook mode,** beside the recorder model and personality assignment

**What this allows:** for every line and every listener, the record holds whether they heard it, what they thought, how urgently they wanted to answer, how they took it (`none` included), and how the reference record classed it. Divergence by personality becomes a direct measure: threats read where the reference finds none, ★ lines heard but taken as `none`, and agreement between listeners of the same line. **Caveat:** the reference record carries the known limit, so Models & Research's transcript-first ★ listing (judged from the transcript before seeing any record) is the better yardstick. The reference record is a convenience.

### Storage and retrieval *(new in v0.22)*

*Until v0.22 this doc said memory recall picks entries "most similar in meaning" without saying how. This section fills that gap. The lore store below uses the same machinery.*

**Where memory lives.** While a game runs, every notebook item is a row in the live store (PostgreSQL): code entries, readings, beliefs, and the reference record. At the end of the game, all of it is exported into the game record (Game Record & Export). Nothing about memory lives anywhere else.

**How "similar in meaning" works.** Each row is stored with an **embedding**: a list of numbers, made by an embedding model, that places the text by meaning, so texts about the same thing sit close together. Recall turns the query (the last two History lines) into an embedding the same way, then takes the rows whose embeddings are closest (cosine similarity). In PostgreSQL this is the `pgvector` extension, so storage and similarity search live in the same database.
- **What gets embedded:** for a reading, the full line text, not the trimmed quote. For a code entry, its rendered text. For a belief, its statement
- **When:** once, when the row is written at the end of the turn, never per call. Query embeddings are made per call; they're short and cheap
- **The embedding model is a run setting** (`EMBEDDING_MODEL_*`), model-neutral like the recorder, and recorded in the game record header. It's fixed for a research batch, since changing it changes what characters recall
- **Isolation is enforced in the query.** Every search filters by the character who owns the row (or, for the reference record, by audience) inside the database query, before similarity is computed. A prompt can never be handed another character's row, however similar its text
- **If the runner already computes similarity another way,** that stays until the store is built, and the method used is recorded in the game record header

### The lore store *(new in v0.22; it replaces the deferred v0.5 plan)*

*Dylan, Oct 27. Background knowledge (history, places, characters' pasts) kept in the same database as memory and retrieved the same way. **Off by default** (`lore: off`). Built alongside the engine, and switched on only once its content is approved.*

**Two scopes, never mixed:**
- **Public lore:** what any guest in 1492 Florence would know: the city, the factions, well-known events, public reputations. Every character can retrieve it
- **Private lore:** one character's own past, which their briefing allows them to know. Only that character can retrieve it, enforced in the query, as for memory

**What doesn't go in:**
- **Real history as such.** The game departs from real history on purpose, and a store of true facts could pull characters toward the real outcome. A real fact enters only once it's been rewritten as in-world public lore that agrees with the game's own history. Raw historical research stays a reference for Dylan and the Lore chat, outside the engine
- **Anything a briefing doesn't allow.** Private lore can colour a character's past, but it never adds a secret, a goal, or knowledge of another character beyond what the briefing gives

**A lore entry:**

| Field | Meaning |
|---|---|
| `id`, `title` | For the record and the dashboard |
| `scope` | `public`, or the full name of the one character it belongs to |
| `text` | One fact or episode, at most ~80 words, in plain prose |
| `source` | Where it came from: the Lore doc entry, or the Characters doc's Shared Canon |
| `status` | `draft` or `approved`. Only approved entries are loaded |
| `canon_checked` | True once the Characters chat has checked it against the Shared Canon and the character's briefing |
| `embedding` | Made when the entry is loaded, as for memory |

**Where content comes from.** The content is the Lore chat's: generated drafts, then Dylan's edits. The Characters chat checks it against the Shared Canon. Approved entries go into a lore data file in the repo, which the engine loads at the start of a game. The file's hash is recorded in the game record header, so every game says exactly which lore it ran with.

**In the prompt** (only when `lore: on`). Code inserts a short section just before block 6's "WHAT YOU REMEMBER FROM EARLIER TONIGHT":

```
WHAT YOU KNOW OF FLORENCE
{lore_bullets}
```

- `{lore_bullets}`: up to 3 entries from the character's public and private lore, the most similar to the last two History lines, one line each. About 150 tokens at most
- **With `lore: off`, nothing is inserted,** and the prompt is exactly as it was before v0.22
- It sits apart from memory on purpose: lore is what the character knew before the evening, and the notebook is what happened tonight. Mixing them in one block would blur that line for the character and for the research

**Research.** `lore` is a run setting like `notebook`: recorded in the header, and fixed for a batch. Baseline and research batches run with it off until the content is final. Switching it on is then a deliberate comparison, since lore changes what characters say.

**Checks once built:**
- **Isolation:** no character's prompt ever contains another character's private lore, checked automatically over every game record
- **Canon:** nothing in a lore entry contradicts the character's briefing (hand-read when entries are approved)
- **Cost:** one query embedding per call, plus ~150 tokens of prompt

### Strategy Section

- A plan of at most ~150 words per character: goals, threats, next moves
- Always present in every character call as block 4
- Updated at each checkpoint and at strategy-altering events (see Strategy Generation)
- Entirely individual: informed by faction meetings but never dictated by them

---

## Knowledge Isolation

- Each character's context contains only their starting briefing plus information from conversations they personally took part in
- **Every character call is a separate request containing one character's context only.** No prompt ever holds two characters' private information
- Knowledge updates at the end of each turn through the extraction pass, not batched at round end
- Witnessed events and witnessed actions are injected into the History of present characters only; private actions only into the actor's
- Faction meetings pool nothing automatically; members learn only what is said aloud
- Personal purses and pensions are visible only to their holder, unless the holder discloses them
- The Embassy's pension ledger and treasury balance are exposed in real time to every French Embassy character's context, and to no one else's
- Murder Round acts, ballots, and run-off votes are never shown to any character
- A character's readings are stored for that character only, like their beliefs. In the default mode, the reference record is never retrieved into any character's prompt (v0.8)

---

## What the System Tracks & When

### Per Character (always in context)
- Character briefing: static
- Strategy section: updated at each checkpoint and at strategy-altering events

### After Every Utterance
- `think()` outputs for everyone present: thought (with `after_line`), `took`, importance score, and (in a Colloquio) done signal. After a Colloquio's last line, the closing think
- `speak()` outputs: utterance, addressee (Capannello), and any action (validated, applied, and written as an action line by the Stage Manager)

### End of Every Turn
- Movement call for the character whose window arrived: thought, contact list, choice, target
- longTermHistory: code entries and readings (from `think()`'s `took`); ★, claims, and thought passes (see Memory Writing)
- Snapshot of the full game state (see Game Record & Export)
- Global utterance counter: reset to zero

### Rolling Buffers (continuously updated)
- History: verbatim recent lines, per character, last ~5–6 utterances
- shortTermHistory: recent private thoughts from every character call, window TBD

### System-Level (Stage Manager)
- Character locations: updated in real time as moves resolve
- Florin balances: updated immediately on each transaction
- Transaction log: append-only, permanent
- Embassy treasury balance and pension ledger: updated immediately on each /borrow and /repay
- Movement rotation queue: one per turn, randomized order per phase
- Active Colloquii and Capannelli: updated as conversations open and close
- Per-character Colloquio withdrawal count: drives Il Notaio's escalation and appears in the character's own State block
- /repent event log: append-only, permanent
- Plot point status per character: checked before Faction Meeting 4
- Murder Round acts (standard and Plot Reward, tagged), ballots, run-off votes, and any draw by lot: logged in full, never shown to characters
- Validation log: repairs, rejections, retries, and defaults per call

---

## Game Record & Export

*From the Hub's deploy-friendly handoff and Delivery & Presentation (Packaging). The public showcase is expected to replay saved games without running the engine.*

**Live store:** PostgreSQL holds the game while it runs. **At the end of every game** (and on a crash, marked incomplete), the engine writes the game out as **one self-contained file**. Nothing in the file refers to database IDs, other files, or the engine, so a viewer can load it on its own.

**Two variants from the same record:**

| | **Full record** | **Replay record** |
|---|---|---|
| Purpose | Debugging, research analysis, the developer dashboard | The public replay viewer |
| Header | Game ID, date, engine version, doc versions (TD, Mechanics, Characters), run config (secrets removed; includes `lore`, the lore file's hash, and the embedding model; includes the recorder model and `notebook` mode), seeds, roster and aliases, personality assignment, tunable values, briefings verbatim | Same, without seeds and provider details |
| Events | Every event in order: speech, Il Notaio lines, action lines, moves, conversations opening and closing, plot checks with their evidence, Murder Round acts and results, ballots, run-off, draw by lot, outcome | Same |
| Thoughts and plans | Every thought (with its call type and, for `think()`, `after_line`, `took`, `words`, the target type, and whether it was a closing think) and strategy plan | Same (the inner life is the show) |
| Model calls | Every call: type, character, turn, prompt (static prefix stored once per character, dynamic blocks per call), raw output, parsed output, label log probabilities (v0.21; null where unsupported), repairs, tokens, cost, latency, provider | Left out |
| Memory | Every memory entry, reading, and belief, with its source line or thought IDs, plus every dropped extraction entry and every `took` label ignored by the attachment rule, with the reason. Reference entries keep their audience | Readings (how each character took what they heard is part of the show) and the entries behind plot checks; the rest left out |
| Snapshots | Full state at the end of every turn and every phase boundary | Same |

- **Format:** one JSON document per game, gzip-compressed (`game-<id>.full.json.gz`, `game-<id>.replay.json.gz`), with a `schema_version` field so old replays stay readable as the format changes
- **Size (rough):** with the static prefix stored once per character, a full record should be a few MB compressed and a replay record well under that. Measure on the first full game
- **The developer dashboard reads the same format,** so the timeline slider, knowledge inspector, and replay viewer share one loader. Building the dashboard builds most of the replay viewer
- **Never in either file:** API keys, private endpoints, environment values
- **The replay is the record, not a re-run.** Model calls aren't deterministic enough to reproduce a game from its seed, so the viewer plays back what happened rather than recomputing it

---

## Plot Point Checks

*The plot points and the Plot Reward are in mechanics under Murder Round.*

- **Logged checks** (meetings, payments, pension ledger) are answered directly from the system's records and are exact
- **Knowledge checks** ("has X learned Y?") run the knowledge-check prompt (block 10c) on the recorder model at temperature 0, over the character's reference entries (what was said in their presence) and beliefs up to the deadline. They depend on the extraction passes, so they carry the known limit (Memory Writing) and are hand-read in the first full games
- **Readings never feed a knowledge check** (v0.8), so perception can't bend scoring. A character told a fact in plain words counts as told even if they took it as a lie, which 10c already says ("whether or not the character believed it"). Beliefs, which were always the character's own, still count when they're firm and correct
- **One check per (character, fact) pair,** reused by every plot point that needs it (see Plot-point facts)
- Combined checks (e.g. "meeting held, while Piero has not learned of the affair") evaluate each part at the deadline, before Faction Meeting 4
- **Every knowledge check stores its reasoning and the entries it cited**, shown in the dashboard for hand review
- **Feature flag `plot_reward`:** switches the Plot Reward on or off per run. Off: no plot checks affect play, `{plot_reward_rule}` and `{plot_status}` are empty, and no `extra` act is offered. Plot points are still checked and logged either way, for comparison

### What counts as "learned"

*Decision (v0.3), from Characters' handoff about LeNoir and the boar seal.*

A character has learned a fact when either:

1. **Told:** someone said it in their presence, or Il Notaio broadcast it; or
2. **Concluded:** the character states it as a **firm conclusion** in their own thought or speech, and the conclusion is **correct**

- **Firm means committed, not hedged.** "It was Isabella. The boar is hers." counts. "Perhaps the Salviati woman had a hand in it" doesn't. The knowledge check asks the recorder model to classify the strongest matching entry as *told*, *firm conclusion*, *suspicion*, or *none*; only the first two count
- **Wrong conclusions never count**, however confident
- **The same test applies to "has not learned" conditions.** If LeNoir deduces the truth, Isabella's plot point fails exactly as if he'd been told
- **Why:** the plot points reward a story beat (LeNoir finding his brother's killer), and a deduction is that beat. Counting only being told would make the seal clue pointless for his plot point. Requiring a firm, correct conclusion keeps lucky guesses out in most cases
- **Watch in testing:** how often a confident but evidence-free guess passes. If it's common, add a check that the conclusion cites something the character saw or heard

### Paying for silence

*Decision (v0.4, Dylan, Oct 22), from Models & Research's question about blackmail.*

- **A payment is evidence, not telling.** If a character pays a blackmailer for silence while denying or not confirming the secret, the blackmailer has **not** learned it from the payment alone
- The blackmailer has learned it only under the rule above: someone tells them, or they state a firm, correct conclusion of their own ("She paid. It was her.")
- The extraction pass records the payment as a ★ entry for both parties, with what it was said to be for, so the blackmailer's later conclusions can rest on it
- If the payer states or confirms the secret while paying ("take it, so LeNoir never learns I ordered it"), that is telling
- **Consistent with Models & Research's `cal3` rubric** for gate 3, so probe verdicts and in-game checks agree
- **Example:** LeNoir presses Isabella and she pays him for silence. Her plot point still stands unless LeNoir concludes, firmly and correctly, that she ordered the killing; if he does, it fails and his own plot point completes

### Plot-point facts *(new in v0.5)*

The true facts the knowledge checks test, worded once so every check of the same fact asks the same thing. Plot points are from Mechanics v0.20 (Plot Reward table); the facts follow Characters' Shared Canon.

| Fact | True statement | Must include | Does not count |
|---|---|---|---|
| **F1** | Clarice Orsini and Francesco Pazzi are lovers. | Both by name, and that it is a love affair | That Clarice has a lover, unnamed; that the two were seen talking or alone |
| **F2** | Contessa Isabella di Salviati ordered the killing of Lucien, Captain LeNoir's brother, at San Frediano. | Isabella by name or by an unmistakable description (the Salviati widow here tonight), and that she ordered or paid for the killing | Only that Lupo did the killing; only that the silver boar or the Salviati house is connected; only that Isabella was involved with San Frediano in some other way |
| **F3** | Giorgia Pazzi and Captain LeNoir are lovers. | Both by name, and that it is a love affair | That Giorgia slips out at night; that LeNoir has a Florentine lady, unnamed |
| **F4** | Contessa Isabella hired Lupo for the San Frediano killing. | Isabella, Lupo, and that she hired him for that killing | That Lupo kills for hire; that Isabella ordered a killing without Lupo named as the one hired |

**Which checks settle which plot points:**

| Plot point | Check | Passes when |
|---|---|---|
| Piero: learn of the affair | (Piero, F1) | *told* or *conclusion* |
| Clarice: Colloquio with Emile, while Piero hasn't learned of the affair | Logged meeting + (Piero, F1) | Meeting held, and the check is *suspicion* or *none* |
| Raffaello: tell LeNoir that Isabella ordered the killing | (LeNoir, F2) | *told*, with Raffaello de' Medici in `told_by`. Code confirms that a cited entry was spoken by Raffaello |
| Giorgia: Colloquio with Emile, while Emile hasn't learned of her affair with LeNoir | Logged meeting + (Emile, F3) | Meeting held, and the check is *suspicion* or *none* |
| Sister Beatrice: learn who hired Lupo | (Beatrice, F4) | *told* or *conclusion* |
| Contessa Isabella: pay Lupo ≥3 Florins, while LeNoir hasn't learned | Logged payments + (LeNoir, F2) | Payments reach 3, and the check is *suspicion* or *none* |
| Captain LeNoir: learn who ordered his brother's death | (LeNoir, F2) | *told* or *conclusion* |
| Francesco, Lupo, Fra Tommaso, Jeanne, Emile | Logged only | From the transaction log, pension ledger, or meeting log |

So a full game needs **four knowledge checks**: (Piero, F1), (LeNoir, F2), (Emile, F3), and (Beatrice, F4). One of them, (LeNoir, F2), settles three plot points.

**Timing:** *told* never wears off; once heard, the fact has been learned. A *conclusion* counts only if it's still held at the deadline, so a conclusion the character later dropped doesn't count.

**Mini-game use:** with the Mini-Game Spec's cast (Lupo, Isabella, LeNoir, Francesco, Raffaello, Giorgia), (LeNoir, F2) settles Isabella's, LeNoir's, and Raffaello's knowledge plot points. Giorgia's needs Emile, who isn't in the cast. Run the check at the end of each game, with `plot_reward` off, for agreement with hand-checks.

**Optional secret-spread checks** (research use, not plot points): the same prompt can ask whether any character has learned a core secret, e.g. **F5** "Lupo kills for hire" (must include: that he kills for money; doesn't count: that he is a bodyguard or dangerous) or F3 for anyone in the cast. A (character × secret) grid at game end shows how far each secret travelled. Models & Research decides whether to run it.

---

## Jailbreak Detection

*The rule and its consequence are in mechanics under Post-Simulation.*

- Detecting a fourth-wall break or out-of-game manipulation attempt is a software problem, likely a classifier or judge prompt run on human player messages
- Method TBD; only relevant once a human player is added

---

## Balancing Approach

**Goal:** each faction wins roughly 25% of games.

**Method:**
1. Settle the rules first; tuning a moving target wastes effort
2. Build a cheap rules-only simulator with scripted players (no language models). **It does nearly all the balancing:** finding structural imbalances and narrowing number ranges
3. Validate the simulator's best configurations with **small batches of full LLM games**
4. Adjust and repeat

**LLM games cost real money** (current per-game estimate in Models & Research), so:
- **Any LLM batch over ~50 games is a deliberate spending decision**, not a default
- **LLM batches look for large problems, not precise rates.** At 50 games, a faction that truly wins 25% could show anywhere from about 13% to 37% by chance. That's enough to catch a faction winning almost never or far too often, and to check that LLM characters behave like the simulator's scripted players, but not to confirm 25% exactly

**Tuning levers:** numbers, not rules. The current values are in mechanics' **Tunable Values** table. The ratio of total Florins in play to the vote price is likely the single biggest factor in who wins.

**Not a tuning lever:** personality variants. They're randomly assigned, so they should average out. Use them as a **robustness check** instead: balance should hold regardless of how Neutral, Bold, and Cautious are dealt.

**Experimental variables, after the baseline is balanced:**
- **Personal ambitions:** e.g. two Medici each wanting the nomination, or a character with secret loyalties to another faction
- **Plot Reward:** compare runs with `plot_reward` on and off
- In a simulation, characters acting against their faction isn't a problem to prevent; it's behavior to observe

**Health metrics to track alongside win rates (to avoid Goodhart's law):**
- Does deliberate play beat random play?
- How often are /repent, /borrow, /repay, and Colloquii used? Unused mechanics are dead weight
- How often plot points are completed (and how often by deduction)
- **Plot Reward use:** how often an earned extra act is used, which kind (Kill, Guard, Investigate), and how often it decides a death or a foiled attempt. Mechanics' lever: the number of extra acts per plot point
- Number of deaths per game, foiled attempts, and game length
- How often the ballot ties, and how often a draw by lot decides the game
- Movement frequency per character
- Colloquio length, and how often the utterance cap is reached versus a "done" signal
- Designations per Capannello line, and how often the ping-pong guard fires
- Rejected actions, repairs, retries, and defaults per game (a sign the prompts need work)
- **Memory health** (v0.6, extended in v0.7): dropped memory entries by reason (speaker mismatch, quote mismatch, type/summary mismatch), sweep gaps and re-asks, "self, no admission" lines, hedge downgrades, and repeated thoughts dropped, per character per game, with the recorder model named

**Statistical note:** with 100 games, a faction that truly wins 25% of the time could show anywhere from roughly 17% to 33% by chance. Distinguishing small differences takes several hundred games per configuration, which is why that job belongs to the simulator.

---

## Developer Dashboard

The first build artifact: an internal console for running and debugging the simulation. Stack: React, Node/Express, PostgreSQL. **It loads games in the Game Record format,** live from the database or from an exported file.

- **6 conversation panels**, one per possible simultaneous conversation
- **Knowledge inspector:** shows what each character knows, traced back to the conversation where they learned it, including conclusions and the evidence for each knowledge check. From v0.8 it also shows each line's readings beside each other and beside the reference entry: who took it how
- **Event log:** chronological, indexed by round and conversation number
- **Timeline slider:** scrubs back through the evening using full state snapshots
- **Validation view:** every repair, rejection, retry, and default, linked to the raw model output

---

## Player Interface

*Post-simulation only. Player rules (message limits, Il Notaio's duties) are in mechanics under Post-Simulation.*

- Entirely text-based, in the style of a Slack chat
- An illustration of whoever the player is talking to sits alongside the conversation
- @-mentions with a dropdown to address characters; only characters currently reachable appear
- /commands for all mechanical actions
- Il Notaio reachable by @-mention at any time, with messages styled distinctly from character dialogue

---

## Considered, Deferred, or Removed

**Deferred:**
- **Cross-game memory:** characters carrying lessons from one game to the next. Risks leaking secrets between games and makes balancing a moving target. Revisit only after the rules are balanced with memory off, and keep a no-memory control group
- **Running `think()` less often** (v0.2): decide after the first full game measures cost
- **Public-claims tracker** (v0.2): a field listing untrue things the character has said, fed back each call. Only if gate 4 (consistent lying) fails
- **Addressee heuristic** (v0.4): honoring a designation only if the line contains a question mark. Skipped for now (demands often lack one); revisit if the tightened instruction still overfires on the chosen base
- ~~**Lore store** (v0.5)~~ Designed in v0.22 (Memory Architecture, The lore store). It stays off by default until its content is approved

**Removed:**
- **Esteem matrix** (removed in mechanics v0.9): its only use was breaking /defect ties
- **Contact list in every `think()`** (v0.3): moved to the movement call
- **Constrained decoding** (v0.3): no benefit in S1, and worse results on two models
- **Plot protection prompt text and flag** (v0.4): replaced by the Plot Reward (`{plot_reward_rule}`, `plot_reward`), following mechanics v0.19
- **Addressee field in a Colloquio** (v0.4): only one other person, so nothing to designate
- **Plural `acts` list in 9e for one act** (v0.5): invited extra acts in S10
- **One conversation pass for all six entry types** (v0.5): 87–89% ★ capture across 13 mini-games. Split into the ★ pass (10a) and the claims pass (10d) in v0.6
- **Speaker taken from the first cited line** (v0.5): made the asker the promiser when a request was cited. Replaced by one `line` per entry and a model-stated speaker checked by code (v0.6)
- **Pointed questions as claims** (v0.6): a judgement call that the recorder and the gate 8 judge made differently. From v0.7 a question is never a claim
- **`toward` in the claims pass** (v0.6): defined as the person accused, while the judge read it as the addressee. Dropped in v0.7; the accused is in `about`
- **"The system model"** as a fixed role for the stock play model (v0.2–v0.6): renamed the recorder model and made its own setting in v0.7

**Rejected (v0.5, memory design):**
- **One extraction call per character** reading the whole transcript: three times the calls for a group of three, and each listener's memory could record the same moment differently. One shared pass per conversation is cheaper and gives everyone present the same record (still true with two passes). *(v0.8: reversed in part. Different records per listener are now the point. The shared passes stay as the reference record. Since v0.9 readings need no extraction call at all: each character labels lines in its own `think()`)*
- **The model writing turn and audience itself:** code fills both from the cited IDs. *(Since v0.6 the model does state the speaker, but only so code can check it against the line; the line decides)*
- **Payments extracted by the model:** the transaction log is exact, so code writes them

**Rejected (v0.6):**
- **A stronger model for the memory passes, before trying the prompt fix:** gate 8 failed the same way whether DeepSeek or Qwen played, with DeepSeek recording both times, so the errors look like prompt errors. Gate 8's own listed fallback ("stronger model for this one pass") stays open if v0.6 still fails *(v0.7: now planned as Models & Research's run 2 if v0.7 fails, which the recorder model setting allows)*

**Rejected (v0.7):**
- **More code checks for the remaining errors:** orders filed as promises and insults filed as threats pass the verb check, because the model writes the verb that fits its own label. A keyword heuristic (e.g. "a promise must contain I or my") would also drop true entries ("Your secret is safe"). Definitions with contrasts and worked examples are the fix; a stronger recorder is the fallback
- **A separate admissions pass:** considered as the next step after the `self` question. Not taken, since this is the last prompt round and a third conversation pass would need its own definitions and judging. If admissions still lag on v0.7, it's the first idea for a stronger recorder to test, not another prompt round
- **Fuzzy de-duplication of thoughts:** a similarity filter could hide a genuine, slightly reworded change of mind. Exact repeats only, for now

**Rejected (v0.8, perceived notebook):**
- **Readings in the recorder's own words** (a summary of how the character took a line): recorder paraphrase is where gate 8's invented entries came from, and it would blur the character's voice into the clerk's. Readings quote the character instead
- **Perception inside the thought pass (10b):** 10b's prompt stays as tested (The perceived notebook, Where to build it)
- **Retiring the ★ and claims passes:** knowledge checks need a neutral record of what was said in each character's presence, and research needs a yardstick. They cost about $0.02 per mini-game on DeepSeek
- **Showing the reference entries beside readings:** that is the whitewash the change removes. It remains available as `notebook: shared`
- **A recorder judgement of whether a reading is "reasonable":** it would put the clerk's view of the line back over the character's. The exact quote beside each reading is the guard instead

**Deferred (v0.8):**
- **Dropping the sweep's `self` question:** until the first full games settle v0.6 versus v0.7 (Memory Writing, Known limit)

**Removed (v0.9):**
- **The perception pass (10e, v0.8):** on replay of the 13 saved games, it gave a reading to 91–97% of lines heard and labelled them by content. 11 of 20 hand-read readings were recorder errors that both quote checks passed, and 18% of DeepSeek-game calls were cut off at 800 tokens (Models & Research, Findings Log, Oct 26). Replaced by `took` in `think()`
- **The quoted reaction in readings** (v0.8): ~79 tokens per reading, so only ~4 fit in block 6

**Rejected (v0.9):**
- **A bigger 10e** (~1,500 output tokens): it would fix the cut-offs, not the mislabels
- **An own-commitment field on `speak()`, for now:** an untested change to the call that carries the secret-keeping lines. It's the fallback if the speaker's next `think()` misses their own promises
- **Definitions for `took`:** the label is the character's reading, so it's never held to 10a's DEFINITIONS
- **A retry when `took` is missing or invalid:** `think()` is the most frequent call. A bad label becomes `none` and is logged

**Removed (v0.13):**
- **Own-line labels in `think()`** (v0.9–v0.12): after speaking, the thought reacts to the line being answered. Replaced by `meant` in `speak()`

**Removed (v0.19):**
- **The hostility ladder and every label-specific line** (v0.15–v0.18): each one moved its own label's share
- **The pressure-only memory cap** (v0.17): replaced by the same cap for every non-★ label

**Removed (v0.20):**
- **`{colloquio_note}` in block 9c:** it could only be known after the choice it was meant to guide, so it never reached a prompt. Validation does the check instead

**Rejected (v0.20):**
- **A static "joining your own group changes nothing" line in 9c:** no game ever showed the note, so adding text now would change tested play. Validation handles it without a prompt change
- **Adjusting any label after the v0.19 baseline:** that measurement is now the research baseline, and every description tried so far moved the ratios it touched

**Rejected (v0.19):**
- **Uniform short descriptions for all nine labels:** symmetric, but it still steers every label, and the steering differs with each description's wording. Bare words are the cleaner baseline. Descriptions can be layered on later, all at once, if the baseline shows a need

**Rejected (v0.18):**
- **Narrowing `pressure` again:** v0.17 narrowed it and the rate barely moved, while the hand-reads showed the labels fit. Another cut would push true labels into the wrong word
- **Adding pressure readings to the Murder Round's retrieval now:** it may be worth doing, but this is the one untested change, and the threat fix is the one the data calls for. It's watched in the full games instead
- **Exempting own readings from the pressure cap:** an own pressure reading isn't a commitment, and the cap exists to protect block 6's space

**Rejected (v0.17):**
- **Dropping `pressure`:** it fixed what it was added for. Threats are now mostly real harm, and pointed lines are remembered instead of being promoted to ★
- **A "refusals are none" line:** another scope line would bring the priming problem back. The narrower label description excludes refusals, since they push no one to act
- **Settling veiled warnings as pressure or threat:** that boundary is where personality should show

**Rejected (v0.16):**
- **Separate labels for question, demand, dare, and challenge:** what matters later is that someone leaned on you, and about what, not which kind of leaning it was. Four words would thin every count
- **Making `pressure` ★:** it would compete with promises and threats for the ★ slots, which is the problem it fixes

**Rejected (v0.15):**
- **New labels for challenge, demand, or question:** they aren't things a character needs to remember later, and every new label thins the counts the research compares. `none` is the right home, and the scope line says so
- **A dedicated re-check of v0.15 now:** the attachment rules this would test already passed, and spend is near the caps. The fit bars ride along with the first full games' hand-read
- **Dropping `meant` over the leak flag now:** 4 games, with one seed going from 3 leak lines to 0, can't attribute the rise to `speak()`. And 10 of the 16 leak lines are a plot-tied reveal. The fallback stands ready if Models & Research's judgement says otherwise

**Rejected (v0.14):**
- **Dropping words from the same speaker's earlier line:** it throws away readings whose speaker and words are both right, just to enforce which of that speaker's lines gets quoted
- **Skipping the closing think after one's own closing line:** it saves one call per Colloquio but loses the character's final reflection on how it ended

**Rejected (v0.13):**
- **Rewording step 3 for own lines** ("the words of your line that carry what you meant"): wording can't change what the thought is about, and in 52 fallbacks it was about the other speaker's line
- **Re-attaching wrong-line words to the line they match:** that line usually already has the character's label from before they spoke, so re-attaching would mostly duplicate it, or overwrite it under a rule that keeps the first. Dropping is safer, since a false memory costs more than a missing one
- **Keeping the 12-word cap:** it cut the point in 17.5% of labelled calls

**Rejected (v0.12):**
- **Making `insult` ★:** a slight isn't a commitment, and ★ slots are what keep promises and threats in mind
- **Defining `insult`,** or splitting it into insult, challenge, and dare: the reading is the character's own, and more words thin out every count

**Rejected (v0.11):**
- **A longer word cap (20 or 25 words):** recovered only 1 or 3 of the 14 readings the trim had cut, at +8 and +15 tokens per reading
- **Code picking the sentence that carries the commitment:** code can't tell which sentence it is without a model, and a recorder pass to pick it would bring the clerk back
- **The whole line:** 41–72-word lines run ~70–100 tokens, so only 4–6 would fit in block 6

**Rejected (v0.10):**
- **Moving own-line labels to `speak()` (`meant`)** *(reversed in v0.13)*: naming the line in 9a fixes the ambiguity behind the 4 wrong-line readings without touching `speak()`. `meant` stays the fallback if own-line readings still miss
- **Re-attaching an own-line label to the line being answered:** it would leave own commitments unlabelled, and the 2 own-line readings in the sample that did fit would land on the wrong line
- **Tightening "claim" or "none" now:** a second wording change in the same re-test would muddy which change did what. Claims are handled by retrieval order, and by a cap later if needed
- **A 10-word quote to keep block 6 at ~300 tokens:** the words are the guard against misreading. ~150 more input tokens per character call is cheap on DeepSeek, and v0.9 games already cost less than v0.7's

**Rejected:**
- **Self-esteem scores:** designing for a problem not yet observed
- **Batched `think()` across characters** (v0.2): breaks knowledge isolation and can't run separate personality adapters
- **`think()` on a smaller model** (v0.2): it's a character call
- **Name-matching `detectDesignation()` on raw text** (v0.2): misses titles and indirect address
- **Counting only being told for "learned"** (v0.3): would make deduction, and LeNoir's seal clue, useless for plot points
- **Payment for silence as telling** (v0.4, Dylan): would make paying a blackmailer almost always lose the plot point, and would disagree with the probes' `cal3` rubric
- **System calls on the Neutral adapter** (v0.4): the recorder shouldn't carry player training
- **Reproducing replays by re-running the game** (v0.4): model calls aren't deterministic enough; the record is the replay

---

## Open Questions

- History and shortTermHistory window sizes
- **Are label log probabilities useful?** (v0.21) Once the full games log them, do the runner-up probabilities separate the personality variants better than the labels alone? Does the label's own probability track hand-read fit? Nothing depends on the answer yet
- How often knowledge checks misfire, including firm-but-unfounded guesses (mini-game: agreement with hand-checks)
- ~~Does v0.7 reach gate 8?~~ No. Closed Oct 25 as a known limit, with DeepSeek recording on v0.7 (Memory Writing, Known limit)
- **v0.6's or v0.7's ★ pass for the reference record?** Decided by the first full games' hand-read. In the default mode the choice affects knowledge checks and research, not what characters remember
- **Which plot points can still use knowledge checks?** Logged checks (payments, meetings, ledger) are exact. Knowledge checks carry the known limit. Hand-read their verdicts in the first full games; if they misfire often, Mechanics could limit the Plot Reward to logged plot points
- **The fit bars after v0.15** (Models & Research's bars; v0.34, Open Questions). In the v0.14 re-check everything passed except fit: own 21 of 30, others 23 of 30, against 26. Check v0.16's hostility ladder in the first full games' hand-read, especially the pressure–threat boundary, or in a 2-game play-only run if Models & Research would rather know first. Note that think()'s fit was 28 of 30 on v0.12 and 23 of 30 on v0.14 with a near-identical prompt, so part of the gap may be sampling. Bar size is Models & Research's call
- ~~**The v0.19 baseline test**~~ Done (CC-20261026-05, seeds 2000–2001). Share of `took`, with v0.17 in brackets: none 30.7% (40.9), pressure 25.7% (32.2), claim 17.3% (12.1), insult 10.6% (6.5), threat 5.5% (1.3). Of `meant`: pressure 33.9% (42.7), none 29.2% (29.2). Fit 27 of 30 on both samples. 12 of 20 threats were harm to come, and the rest were warnings and taunts. All 20 pressure readings pushed someone to answer or act. Only 1 of 20 threats and 1 of 20 claims were questions. The cap held in all 798 calls (448 at exactly 3). **This mix is the research baseline** (Models & Research v0.38), and v0.19's prompts go to the first full games unchanged
  - **If own-line fit stays low:** drop own readings from the notebook and keep `meant` in the record for research. Characters then remember their own words only through History
- ~~**The leak flag**~~ Resolved (CC-20261026-01): re-scored by hand, v0.14 had 6 leaks against Oct 24's 4. Whether the secrets judge should know who learned a secret in-game, not just at the start, is Models & Research's call. The fallback (drop own readings, keep `meant` in the record) is no longer needed for this flag
- **The perceived notebook in the first full games:**
  - How often do characters take the ★ lines they hear as anything (coverage)?
  - How often does a label misunderstand the words rather than read them its own way?
  - Does any character run away into reading every line as a threat?
  - Do characters forget their own promises?
  - The answers decide whether a guard is needed (retrieval or the `took` wording first) and whether `perceived` stays the default
- **Should a knowledge check's "told" read the character's witnessed lines directly** instead of the reference record? It would be exact but long. Consider it after the first full games
- **Is the hedge list too strict?** "Surely," "must be," and "I think" can introduce firm beliefs in ordinary speech. Downgrading them is deliberate (conclusions count toward plot points, so a false conclusion costs more than a missed one), but if re-tests show LeNoir's genuine deductions downgraded, trim the list
- **Should the ★ pass see the claims pass's output, or the reverse,** to avoid an admission also being recorded as a claim? Currently independent; duplicates are harmless in memory but would inflate counts
- Is F2's "unmistakable description" right? If LeNoir firmly concludes "the Salviati widow" without naming her, it counts; "a Salviati" alone doesn't. Watch whether this line is hit in play
- Should the thought pass skip characters whose thoughts this turn were all inside a Colloquio already read by the ★ and claims passes? (Cost only)
- Jailbreak detection method (post-simulation)
- **Prompts still to draft:** candidate selection and speeches (phases E–F); Il Notaio's event templates (wording examples exist in Mechanics)
- **Actions in `speak()` or in their own call?** Decide after the mini-game
- Whether characters should see Il Notaio's tally of *other* characters' withdrawals, or only infer it from witnessed notes (currently: only witnessed notes)
- **Should characters see where everyone is?** In a real palazzo you could see across the room. Currently they see only their own group; showing the room would make movement easier and make Il Notaio's notes less special
- Movement edge cases: joining or calling someone who is in a Colloquio (current handling in block 9c notes; confirm in the mini-game)
- Is 0.7 the right play temperature on the chosen model? (Revisit after probes)
- **Run-off announcement:** tied names only, without counts (current default; sent to Mechanics to confirm)
- Does the real-history line in block 1 dull useful period knowledge? (Watch voice and play in the mini-game; Models & Research may probe leakage)
- Does the tightened addressee instruction bring false positives down on non-DeepSeek bases? (Models & Research to re-measure)

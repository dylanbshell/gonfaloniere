# Gonfaloniere
## Technical Design — Working Document
### Version 0.4

---

## Changes in v0.4

*Merges eight handoffs to this chat (Hub ×1, Mechanics ×2, Models & Research ×4, Alternate Game Ideas ×1).*

- **Plot protection → Plot Reward** (Mechanics v0.19–v0.20). Block 9e rebuilt: standard acts plus an optional `extra` act, all on different targets, with Lupo's extra act blockable. `{plot_protection_rule}` → `{plot_reward_rule}`, `{plot_status}` reworded, feature flag renamed `plot_reward`, health metrics updated
- **Murder Round** resolves simultaneously (a character killed this round still acts; several kills on one target are one death). A failed call means no action, Plot Reward included. The rules primer now says acts take effect together
- **Election:** the confirmed vote-buying rule replaces v0.3's assumption note. New **run-off** call (block 9g): one fresh vote among the tied guests, no buying; a second tie is drawn by lot in code. Il Notaio announces tied names only (sent to Mechanics to confirm)
- **New: History Line Formats.** Witnessed actions (a bribe) appear to everyone present as `[Contessa Isabella gave Lupo 3 Florins.]`; private actions (/borrow, /repay) appear only to the actor, in the second person
- **Addressee tightened** (S4–S6 found up to 189 false positives in 250): block 9b now asks for it only for a direct question or demand that must be answered before anyone else speaks. The field is dropped in a Colloquio. New guard: a designation can force at most two replies in a row
- **Personality wording:** Model Routing and Run Configuration now use Models & Research's variants (Neutral, Bold, Cautious) instead of the old Deceptive/Honest wording. System calls still run on the stock model, not the Neutral adapter
- **Paying a blackmailer is evidence, not telling** (Dylan, Oct 22): the recipient has learned the secret only if told or by their own firm, correct conclusion. The extraction pass records the payment as a ★ entry
- **Real-history guard:** block 1 now says tonight's Florence is its own, and the briefing wins wherever it differs from history
- **New: Game Record & Export.** One self-contained file per game, in two variants (full for debugging and research, replay for the public viewer). The model endpoint and keys come from environment variables and are never written to a record

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

- **Thought:** private internal reasoning, 2–4 sentences. Not shared
- **Importance score (0–100):** how urgently this character wants to speak. Used by the Orchestrator for speaking order, and by the Stage Manager for collisions
- **Done signal (Colloquio only):** whether the character wants to end the Colloquio. If either character sends it, the other gets one closing line and the Colloquio ends. Not asked for in a Capannello, and ignored by code if returned there

The `think()` prompt also asks each character to consider how their own recent behavior (especially frequent private withdrawals) looks to others. This is the second of two social-awareness touchpoints; the first is in the character briefing.

### speak()

Produces a character's actual utterance. Returns:

- **Utterance:** what the character says aloud
- **Addressee (Capannello only):** the one character present who is being put on the spot with a direct question or demand, or none. Feeds `detectDesignation()`. Not asked for in a Colloquio
- **Action (optional):** one of the actions the character is currently allowed (/bribe in a Colloquio, /borrow, /repay). The Stage Manager validates it and writes the action line

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

At the end of every turn, a longTermHistory extraction pass runs on all active conversations:

- Normalizes what was said into structured bullet points
- Tags commitments, promises, agreements, threats, and admissions as high-salience (★) entries
- **Records payments as ★ entries** for both parties, taken from the transaction log rather than inferred, including what the payment was said to be for (e.g. "Isabella paid me 3 Florins for my silence about San Frediano")
- **Records the character's own firm conclusions** from their thoughts (e.g. "concluded Isabella ordered the killing"), tagged as conclusions, so deductions are available to knowledge checks (see Plot Point Checks)
- Stores them in each participating character's knowledge database
- Uses the verbatim History transcript as its primary source, with shortTermHistory as supplementary context
- Runs on a fixed turn cadence, independent of movement and conversation changes
- Runs on the **system model** (see Model Routing)

### Strategy Generation

- One call per character after each faction meeting, plus one at any genuinely strategy-altering event
- The new plan replaces the strategy section (block 4)
- Not regenerated every turn
- **Strategy-altering events (starting list):** surviving a kill attempt; a Murder Round death in one's own faction; one's own French pension revealed by someone else; candidate selection; a /repent broadcast. Refine in testing

### Murder Round

- One call per living character after Individual Strategy 4 (block 9e). Each submits their standard act(s) and, if they earned the Plot Reward, one extra act, with a private thought
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
| **Murder Round acts** | Act types allowed for this character (Lupo's standard acts: kills only, one or two; everyone else: exactly one standard act). **All of a character's acts name different living guests.** No self-guard, in any act. `extra` used only if the Plot Reward was earned, otherwise ignored. Surplus acts beyond the allowed number are dropped, keeping the first. A remaining illegal act triggers the retry; if still illegal, that act is dropped |
| **Votes** | Ballot target must be a living guest; `buy` clamped to 0–`{max_buy}`. Run-off target must be one of the tied guests |

**Alias table:** one entry per character, maintained alongside the roster: full name, short name, title forms (e.g. "Captain Armand LeNoir", "Captain LeNoir", "LeNoir", "Armand LeNoir"; "Contessa Isabella di Salviati", "Contessa Isabella", "Isabella"; "Emile de Valois", "Prince Emile", "Emile"). Shared by name matching everywhere.

**Defaults when a call fails twice:**

| Call | Default |
|---|---|
| `think()` | Importance 0, done false; thought omitted |
| `speak()` | Skip this speaker; the next-highest importance speaks |
| Movement | Stay |
| Strategy | Keep the previous plan |
| Murder Round | No action, Plot Reward act included (Mechanics v0.20). Logged as an engine failure |
| Ballot | One vote for the voter's own faction's candidate if any, otherwise a blank ballot; buy none |
| Run-off | One vote for a tied guest from the voter's own faction if any, otherwise a blank ballot |

**Movement target fallback:** if the target is invalid but the choice is join or Colloquio, use the highest-urgency valid contact; if there is none, stay.

---

## Model Routing

### Character calls vs. system calls

| Kind | Calls | Runs on |
|---|---|---|
| **Character calls** | `think()`, `speak()`, movement, strategy, Murder Round, ballot, run-off | The play model **plus that character's personality adapter** (Neutral, Bold, or Cautious, once trained) |
| **System calls** | Extraction pass, knowledge checks; later, jailbreak detection | The **stock play model with no adapter**, as a neutral recorder |
| **No model** | `detectDesignation()`, Il Notaio's lines, action lines, tallies and the draw by lot, validation, all bookkeeping | Code and templates |

- **`think()` is a character call, not bookkeeping.** It's where the character decides whether to speak and what they're hiding. On another model, personality adapters would change only how characters *sound*, not what they *do*
- **System calls stay neutral** so no personality adapter ever writes its own memory or grades its own plot point. They run on the stock model, not the Neutral adapter: Neutral is a trained competence adapter (Models & Research, Research Design), and the recorder shouldn't carry training meant for players
- **A smaller system model** is allowed only if it matches the stock model on gate 8 (accurate extraction). The saving is small

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

| Setting | Character calls | System calls |
|---|---|---|
| Endpoint | Named by environment variable (e.g. `PLAY_MODEL_BASE_URL`, `PLAY_MODEL_API_KEY`); hosted API or self-hosted server, same code | Own variables (`SYSTEM_MODEL_BASE_URL`, `SYSTEM_MODEL_API_KEY`), defaulting to the play model's |
| Model ID | Play model | Play model (stock) unless a smaller model passes gate 8 |
| Provider | Pinned, fallbacks off; quantization recorded | Same |
| Adapter | From an adapter map: `neutral`, `bold`, `cautious` → adapter ID, or `none` for stock or prompted play | None |
| Thinking | Off (`thinking: false`, mapped to each provider's control) | Off |
| Temperature | **0.7** | **0** |
| Max output tokens | Per call type (`think()` ~250, `speak()` ~200, movement ~500, strategy ~400, Murder Round ~300, ballot ~250, run-off ~200) | Per call type |
| Message layout | `system_role: true` (blocks 1–3 as system message) or `false` (all blocks in one user message), per model | Same |
| Prompt caching | On where the provider supports it | Same |

**Also run settings, not model settings:** `plot_reward` on/off, tunable values (from mechanics), personality assignment seed, random seed (which also drives any draw by lot).

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
| 6 | **Long-term memory:** retrieved bullets, high-salience marked | Every utterance | ~300 |
| 7 | **Recent private thoughts** (shortTermHistory) | Every utterance | ~200 |
| 8 | **The conversation so far** (History) | Every utterance | ~400 |
| 9 | **Task:** call-specific instructions and output format | Per call type | ~200–450 |

- **Message layout:** blocks 1–3 form the **system message**; blocks 4–9 form **one user message**. Where a model's chat template handles a system message badly, set `system_role: false` and send all nine blocks as one user message. The prefix is identical either way, so caching works either way
- **Blocks 1–3 are identical for every call type**, so all of a character's calls share one cached prefix. Task instructions go last, where models attend to them most
- **Long-term memory is retrieved once per character per utterance** and reused for that character's `think()` and `speak()`. Movement, strategy, Murder Round, and vote calls retrieve their own, with queries suited to the decision (e.g. Murder Round retrieves threats and deals)
- **Sizes:** ~3,300 input tokens per call. Measured `think()` output on TD v0.3 is ~103 tokens (DeepSeek). `speak()` ~100. Models & Research replaces these with measurements
- **No constrained decoding.** Raw JSON plus code validation (see Output Validation & Repair)

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

*Status: drafts. Blocks 1–3, 9a, and 9b were probed in their v0.2–v0.3 forms; v0.4 changes block 1 (history line), block 2 (Murder Round, run-off, Plot Reward), 9b (addressee), 9e (rebuilt), and adds 9g. Blocks 9c–9g are untested. Placeholders in `{braces}` are filled by code; values come from mechanics' Tunable Values.*

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

### Block 9a — think() task

```
TASK: THINK
Someone has just spoken (the last line above). Before anyone speaks again, think privately as {character_name}. No one else will ever see this.

1. thought — 2 to 4 sentences, first person, in your own voice. What does the last moment mean for you? What do you want now? If you have told anyone something untrue, note what you told them so your story stays straight. Consider how your recent behavior looks to the others in the room.

2. importance — how urgently you want to speak next, from 0 to 100:
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
- `{done_instruction}`: `3. done — true if you have what you came for, or nothing more is to be gained here; otherwise false.`
- `{think_schema}`: `{"thought": "...", "importance": 0, "done": false}`

In a **Capannello**:
- `{done_instruction}`: empty
- `{think_schema}`: `{"thought": "...", "importance": 0}`

### Block 9b — speak() task *(addressee changed in v0.4)*

```
TASK: SPEAK
It is your turn to speak. {closing_line_note}

Say one thing, as {character_name} would say it.
- One to three sentences, about 60 words at most. Spoken words only: no narration, no stage directions, no thoughts.
- Speak as a person of 1492 Florence would, in clear modern English.
- If someone has just addressed you directly, answer them.
- You may tell the truth, lie, bluff, flatter, threaten, or stay vague — whatever serves your goals. Your secrets are yours: reveal one only as a deliberate move, never by accident. Do not recite your private thoughts.
- Speak only of what you know from your briefing and what you have seen and heard tonight. Do not repeat what you have already said.
- Speak only for yourself; never describe what others say or do.
{addressee_instruction}
action — optional. You may take one of these actions with this line, or none:
{allowed_actions}

Reply with only this JSON:
{speak_schema}
```

In a **Capannello**:
- `{addressee_instruction}`:
  ```
  addressee — name one person present only if your line puts a direct question or demand to them that they must answer before anyone else speaks. Speaking to someone, speaking about someone, or using their name is not enough. Most lines have no addressee: use null unless you are truly putting one person on the spot. Use their name exactly as written in "Present".
  ```
- `{speak_schema}`: `{"addressee": "..." or null, "utterance": "...", "action": null or {...}}`

In a **Colloquio** (there is only one other person, so nobody needs designating):
- `{addressee_instruction}`: empty
- `{speak_schema}`: `{"utterance": "...", "action": null or {...}}`

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
   "join"       go to wherever {target} is now and join that group
   "colloquio"  call {target} aside for a private word; they cannot refuse, and Il Notaio will note it
   {colloquio_note}

4. target — the guest you are moving toward or calling aside, exactly as written. null if you stay.

Reply with only this JSON:
{"thought": "...", "contacts": [{"name": "...", "urgency": 0, "purpose": "..." or null}], "choice": "stay", "target": null}
```

- `{colloquio_note}`: empty normally; if the target would be the character's own current group: "Joining someone already in your group changes nothing; choose stay instead."
- If a target is already in a Colloquio, the Stage Manager resolves a `join` to the Capannello that target will return to, and a `colloquio` waits until the target is free (it opens when their Colloquio ends, before the next turn). *To confirm in the mini-game*

### Block 9d — Strategy task *(for S9a)*

```
TASK: PLAN
{strategy_trigger}
Step back and decide your plan for what comes next. This plan is yours alone; no one else will see it, and it will guide what you say and do until you next revise it.

1. thought — 2 to 4 sentences, first person: what has changed since your last plan, and what matters most now.

2. plan — at most 150 words, in three short parts:
   Goals: what you want by the end of the evening, and what you must achieve before the next checkpoint.
   Threats: who could ruin you, and what they know or suspect.
   Next moves: whom to approach, what to offer, ask, hide, or reveal, and what you will do with your Florins.
   Keep only what still matters from your current plan. Name people exactly as written in "All living guests besides you".

Reply with only this JSON:
{"thought": "...", "plan": "Goals: ... Threats: ... Next moves: ..."}
```

- `{strategy_trigger}` examples: "The Medici faction meeting has just ended." / "You have just survived an attempt on your life." / "Your French pension has been revealed to others." / "The candidates have been chosen: {candidates}."
- The returned `plan` becomes block 4 for every later call. The thought goes to shortTermHistory

### Block 9e — Murder Round task *(rebuilt in v0.4 for the Plot Reward; for S10)*

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

2. acts — {acts_count_instruction}
{extra_instruction}
Every one of your acts must name a different guest, exactly as written in "All living guests besides you".

Reply with only this JSON:
{murder_schema}
```

Generated by code:

| Placeholder | Everyone except Lupo | Lupo |
|---|---|---|
| `{allowed_murder_acts}` | `KILL, GUARD, or INVESTIGATE any living guest. You cannot GUARD yourself.` | `KILL up to two living guests. Your kills cannot be stopped by guards or investigations. You may not GUARD or INVESTIGATE with them.` |
| `{acts_count_instruction}` | `exactly one act.` | `one or two kills.` |

With the **Plot Reward earned** (`plot_reward` on and the plot check passed):
- `{reward_instruction}`: everyone except Lupo: `Because you completed your plot point, you have one extra act: KILL, GUARD, or INVESTIGATE. It follows the usual rules, and you cannot GUARD yourself.` Lupo: `Because you completed your plot point, you have one extra act: KILL, GUARD, or INVESTIGATE. Unlike your own kills, it follows the usual rules: a kill made with it can be stopped by guards and investigations. You cannot GUARD yourself.`
- `{extra_instruction}`: `3. extra — your extra act, or null if you choose not to use it.`
- `{murder_schema}`: `{"thought": "...", "acts": [{"type": "kill" or "guard" or "investigate", "target": "..."}], "extra": {"type": "...", "target": "..."} or null}`

Without it: `{reward_instruction}` and `{extra_instruction}` empty; `{murder_schema}`: `{"thought": "...", "acts": [{"type": "kill" or "guard" or "investigate", "target": "..."}]}`

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

### longTermHistory

- Per-character extracted knowledge database, accumulated across the whole game
- Updated at the end of every turn by the extraction pass
- High-salience tagging for commitments, promises, agreements, threats, payments, and admissions; separate tag for the character's own firm conclusions
- Retrieved by semantic similarity once per utterance, and shared by that character's `think()` and `speak()`
- One of the most critical prompts in the system, on par with the character briefings

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

---

## What the System Tracks & When

### Per Character (always in context)
- Character briefing: static
- Strategy section: updated at each checkpoint and at strategy-altering events

### After Every Utterance
- `think()` outputs for everyone present: thought, importance score, and (in a Colloquio) done signal
- `speak()` outputs: utterance, addressee (Capannello), and any action (validated, applied, and written as an action line by the Stage Manager)

### End of Every Turn
- Movement call for the character whose window arrived: thought, contact list, choice, target
- longTermHistory: extraction pass on the History transcript
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
| Header | Game ID, date, engine version, doc versions (TD, Mechanics, Characters), run config (secrets removed), seeds, roster and aliases, personality assignment, tunable values, briefings verbatim | Same, without seeds and provider details |
| Events | Every event in order: speech, Il Notaio lines, action lines, moves, conversations opening and closing, plot checks with their evidence, Murder Round acts and results, ballots, run-off, draw by lot, outcome | Same |
| Thoughts and plans | Every thought and strategy plan | Same (the inner life is the show) |
| Model calls | Every call: type, character, turn, prompt (static prefix stored once per character, dynamic blocks per call), raw output, parsed output, repairs, tokens, cost, latency, provider | Left out |
| Memory | Every extraction entry, with its source lines | Left out, except the entries behind plot checks |
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
- **Knowledge checks** ("has X learned Y?") are answered by asking a precise question of the character's memory (longTermHistory, including recorded conclusions), on the system model at temperature 0. They depend on the extraction pass, so they are less reliable and should be watched in testing
- Combined checks (e.g. "meeting held, while Piero has not learned of the affair") evaluate each part at the deadline, before Faction Meeting 4
- **Every knowledge check stores the memory entry that answered it**, shown in the dashboard for hand review
- **Feature flag `plot_reward`:** switches the Plot Reward on or off per run. Off: no plot checks affect play, `{plot_reward_rule}` and `{plot_status}` are empty, and no `extra` act is offered. Plot points are still checked and logged either way, for comparison

### What counts as "learned"

*Decision (v0.3), from Characters' handoff about LeNoir and the boar seal.*

A character has learned a fact when either:

1. **Told:** someone said it in their presence, or Il Notaio broadcast it; or
2. **Concluded:** the character states it as a **firm conclusion** in their own thought or speech, and the conclusion is **correct**

- **Firm means committed, not hedged.** "It was Isabella. The boar is hers." counts. "Perhaps the Salviati woman had a hand in it" doesn't. The knowledge check asks the system model to classify the strongest matching entry as *told*, *firm conclusion*, *suspicion*, or *none*; only the first two count
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

**Statistical note:** with 100 games, a faction that truly wins 25% of the time could show anywhere from roughly 17% to 33% by chance. Distinguishing small differences takes several hundred games per configuration, which is why that job belongs to the simulator.

---

## Developer Dashboard

The first build artifact: an internal console for running and debugging the simulation. Stack: React, Node/Express, PostgreSQL. **It loads games in the Game Record format,** live from the database or from an exported file.

- **6 conversation panels**, one per possible simultaneous conversation
- **Knowledge inspector:** shows what each character knows, traced back to the conversation where they learned it, including conclusions and the evidence for each knowledge check
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

**Removed:**
- **Esteem matrix** (removed in mechanics v0.9): its only use was breaking /defect ties
- **Contact list in every `think()`** (v0.3): moved to the movement call
- **Constrained decoding** (v0.3): no benefit in S1, and worse results on two models
- **Plot protection prompt text and flag** (v0.4): replaced by the Plot Reward (`{plot_reward_rule}`, `plot_reward`), following mechanics v0.19
- **Addressee field in a Colloquio** (v0.4): only one other person, so nothing to designate

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
- How knowledge checks are phrased and validated, and how often they misfire (including firm-but-unfounded guesses)
- Jailbreak detection method (post-simulation)
- **Prompts still to draft:** extraction pass and knowledge check (needed before the mini-game); candidate selection and speeches (phases E–F)
- **Actions in `speak()` or in their own call?** Decide after the mini-game
- Whether characters should see Il Notaio's tally of *other* characters' withdrawals, or only infer it from witnessed notes (currently: only witnessed notes)
- **Should characters see where everyone is?** In a real palazzo you could see across the room. Currently they see only their own group; showing the room would make movement easier and make Il Notaio's notes less special
- Movement edge cases: joining or calling someone who is in a Colloquio (current handling in block 9c notes; confirm in the mini-game)
- Is 0.7 the right play temperature on the chosen model? (Revisit after probes)
- **Run-off announcement:** tied names only, without counts (current default; sent to Mechanics to confirm)
- Does the real-history line in block 1 dull useful period knowledge? (Watch voice and play in the mini-game; Models & Research may probe leakage)
- Does the tightened addressee instruction bring false positives down on non-DeepSeek bases? (Models & Research to re-measure)

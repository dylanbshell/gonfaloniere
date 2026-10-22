# Gonfaloniere
## Technical Design — Working Document
### Version 0.3

---

## Changes in v0.3

*Merges five handoffs to this chat (Models & Research ×4, Characters ×1). The probe harness was mid-run on v0.2's prompts when this was written: v0.2 stays the reference for S1–S7 results (its prompt text is kept in the probe repo), and v0.3 applies from S8 onward.*

- **Contact list moved out of `think()`** into a new **movement call** that runs once per turn, for the one character whose window has arrived. `think()` now returns only thought, importance, and (in a Colloquio) done. S1 found the 11-name list caused most gate 1 failures and about half of `think()`'s output tokens
- **New: Output Validation & Repair.** Code, not the model, enforces purposes for the top three contacts only, fills missing contacts with urgency 0, matches aliases and near-miss names, ignores `done` outside a Colloquio, strips code fences, and clamps scores. Every repair is counted and logged
- **State block:** "Other living guests" renamed **"All living guests besides you"** and defined to include those present (the harness already filled it that way)
- **Constrained decoding dropped.** Raw output plus code validation; S1 showed no benefit
- **System message:** blocks 1–3 go in the system message, blocks 4–9 in one user message, with a per-model setting to fold everything into one user message
- **New: Run Configuration.** Model, provider, adapter, thinking, temperature, and message layout are run settings, not code. Play temperature: **0.7 for character calls, 0 for system calls**
- **Adapter serving risk** recorded in Model Routing, with fallbacks if vLLM can't serve several LoRAs on the chosen model
- **Deduced knowledge counts** for knowledge plot checks: a firm, correct conclusion completes "learn X," a hedged suspicion doesn't (see Plot Point Checks)
- **New prompt drafts:** movement (9c), strategy (9d), Murder Round (9e), vote (9f). Strategy, Murder Round, and vote are for strategy probes S8–S10
- Resolved: briefing budget (~1,000 tokens, accepted by Characters v0.2)

## Changes in v0.2

- Base model no longer named here; points to Models & Research
- Balancing cost made explicit: the rules-only simulator does nearly all balancing; LLM batches over ~50 games are a deliberate spending decision
- New Model Routing: batched `think()` rejected; system calls on a neutral model; `detectDesignation()` reads `speak()`'s addressee field; running `think()` less often deferred
- New Prompt Assembly and draft `think()` and `speak()` prompts; `speak()` returns addressee and optional action

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
- Characters run on an open-weight model chosen in **Models & Research (Current Model Plan)**: a development model now, a fine-tuning base later. Randomly assigned personality LoRAs are added later. The engine doesn't depend on which model (see Run Configuration)
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
- Collecting and resolving Murder Round acts and ballots
- **Validating actions** returned by any character call (see Output Validation & Repair). Invalid actions are rejected and the character is told privately on their next call

### Il Notaio: Delivery Mechanism

- **Witnessed events** (joins, departures, Colloquio withdrawals and returns) are generated by the Stage Manager and **injected into the History** of every character present, written in Il Notaio's voice, as lines starting `[Il Notaio]`
- **Escalation** is driven by a per-character count of Colloquio withdrawals, so repeat withdrawals get more pointed wording
- **City-wide broadcasts** (/repent and its tagline, Murder Round results) are injected into every living character's History at once

---

## Core Functions

Every character call starts with a private **thought**, so the decision that follows is informed by reasoning. Each thought is stored in that character's shortTermHistory.

### think()

Runs for every character present after every utterance. Outputs:

- **Thought:** private internal reasoning, 2–4 sentences. Not shared
- **Importance score (0–100):** how urgently this character wants to speak. Used by the Orchestrator for speaking order, and by the Stage Manager for collisions
- **Done signal (Colloquio only):** whether the character wants to end the Colloquio. If either character sends it, the other gets one closing line and the Colloquio ends. Not asked for in a Capannello, and ignored by code if returned there

The `think()` prompt also asks each character to consider how their own recent behavior (especially frequent private withdrawals) looks to others. This is the second of two social-awareness touchpoints; the first is in the character briefing.

*The contact list moved to the movement call in v0.3.*

### speak()

Produces a character's actual utterance. Returns:

- **Utterance:** what the character says aloud
- **Addressee:** the one character present being directly addressed, or none. Feeds `detectDesignation()`
- **Action (optional):** one of the actions the character is currently allowed (/bribe in a Colloquio, /borrow, /repay). The Stage Manager validates it

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

### End-of-Turn Extraction Pass

At the end of every turn, a longTermHistory extraction pass runs on all active conversations:

- Normalizes what was said into structured bullet points
- Tags commitments, promises, agreements, threats, and admissions as high-salience entries
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

- One call per living character after Individual Strategy 4. Each submits one act (Lupo: up to two kills) with a private thought
- Calls run in parallel; no character sees another's act. The Stage Manager resolves them in mechanics' order and Il Notaio broadcasts the results

### Voting

- Each character's ballot is a single reasoning call: given the speeches, any repentance, their pensions, and their purse, the character names who they vote for and how many votes they buy
- No separate strategy step precedes it

---

## Output Validation & Repair

Every character call returns raw JSON. Code checks and repairs it before use, so the model only has to get the content right. **Every repair is counted and logged per call**, matching Models & Research's "repaired" scoring level; a rising repair rate is a health metric.

| Step | Rule |
|---|---|
| **Parse** | Strip one surrounding code fence. Prose outside the JSON is a parse failure |
| **Retry** | On parse failure or a missing required field, re-ask once with a one-line error note. A second failure uses the call's default (below) and is logged as a failure |
| **Names** | Match each name to the roster: exact name, then the alias table, then a near-miss (one unique roster name within edit distance 2). No unique match = invalid name |
| **Scores** | Importance and urgency rounded to integers and clamped to 0–100 |
| **`done`** | Used only in a Colloquio; ignored anywhere else |
| **Contacts** | Self, dead, and unmatched names dropped; duplicates keep the higher urgency; **missing living guests filled with urgency 0**; **purposes kept only for the three highest-urgency contacts** (others set to null, logged as a warning) |
| **Targets and actions** | Must be legal under mechanics at that moment (target alive, not self where barred, enough Florins, right conversation type, right faction). Illegal → rejected; the character hears why on their next call through `{action_feedback}` |

**Alias table:** one entry per character, maintained alongside the roster: full name, short name, title forms (e.g. "Captain Armand LeNoir", "Captain LeNoir", "LeNoir", "Armand LeNoir"; "Contessa Isabella di Salviati", "Contessa Isabella", "Isabella"). Shared by name matching everywhere.

**Defaults when a call fails twice:**

| Call | Default |
|---|---|
| `think()` | Importance 0, done false; thought omitted |
| `speak()` | Skip this speaker; the next-highest importance speaks |
| Movement | Stay |
| Strategy | Keep the previous plan |
| Murder Round | No act (logged as an engine failure, not a player choice) |
| Vote | One vote for the voter's own faction's candidate if any, otherwise a blank ballot; buy none |

**Movement target fallback:** if the target is invalid but the choice is join or Colloquio, use the highest-urgency valid contact; if there is none, stay.

---

## Model Routing

### Character calls vs. system calls

| Kind | Calls | Runs on |
|---|---|---|
| **Character calls** | `think()`, `speak()`, movement, strategy, Murder Round, vote | The play model **plus that character's personality LoRA** (once LoRAs exist) |
| **System calls** | Extraction pass, knowledge checks; later, jailbreak detection | The **stock play model with no adapter**, as a neutral recorder |
| **No model** | `detectDesignation()`, Il Notaio's witnessed-event lines, validation, all bookkeeping | Code and templates |

- **`think()` is a character call, not bookkeeping.** It's where the character decides whether to speak and what they're hiding. On another model, personality LoRAs would change only how characters *sound*, not what they *do*
- **System calls stay neutral** so a Deceptive adapter never writes its own memory or grades its own plot point
- **A smaller system model** is allowed only if it matches the stock model on gate 8 (accurate extraction). The saving is small

### Batched `think()`: rejected

One combined call for all characters present would put several characters' secrets in one prompt (gate 3) and can't run separate LoRAs. **Kept instead:** parallel requests (serving software batches them on the GPU) and prompt caching on each character's static prefix.

### Serving several LoRAs at once: assumed, not yet proven

The parallel-request plan assumes the server can run different personality adapters side by side on one copy of the model. That's proven for standard dense models in vLLM, but newer for mixture-of-experts layers and the hybrid-attention models among the candidates. Models & Research's pilot run checks it when fine-tuning is near. **If it fails on the chosen model:**

1. **Tinker's per-token serving** of trained checkpoints, where the model is offered there
2. **Group calls by adapter:** serve one adapter at a time and queue calls, at the cost of speed
3. **Merge each adapter into its own model copy:** one full model per personality, at the cost of memory and serving price

### Running `think()` less often: deferred

Decide after the first full game measures real cost. Candidate rule: skip a character's `think()` when their last importance was below ~20 and they weren't addressed, reusing their previous score. Risk: a quiet character may never notice a moment that should rouse them. *Less urgent now that `think()` output shrank in v0.3.*

---

## Run Configuration

Nothing about the model is hard-coded. Each run reads a config file, and the full config is logged with every game alongside the doc versions its prompts came from. **Changing the play model is a config change** (plus re-running the probes).

| Setting | Character calls | System calls |
|---|---|---|
| Model ID | Play model | Play model (stock) unless a smaller model passes gate 8 |
| Provider | Pinned, fallbacks off; quantization recorded | Same |
| Adapter | Per personality, from an adapter map (`personality → adapter ID`, or none for prompted or untrained) | None |
| Thinking | Off (`thinking: false`, mapped to each provider's control) | Off |
| Temperature | **0.7** | **0** |
| Max output tokens | Per call type (`think()` ~250, `speak()` ~200, movement ~500, strategy ~400, Murder Round ~250, vote ~250) | Per call type |
| Message layout | `system_role: true` (blocks 1–3 as system message) or `false` (all blocks in one user message), per model | Same |
| Prompt caching | On where the provider supports it | Same |

**Also run settings, not model settings:** plot protection on/off, tunable values (from mechanics), personality assignment seed, random seed.

**Temperature rationale:** 0.7 keeps characters varied between games, which the research needs. System calls run at 0 so the same transcript always yields the same memory and the same plot check result. Revisit if probes show 0.7 gives incoherent play on the chosen model.

---

## Prompt Assembly

Every character call is built from the same blocks in the same order, **most static first**, so the longest possible prefix is identical across a character's calls and can be cached.

| # | Block | Changes | Approx. tokens |
|---|---|---|---|
| 1 | **Frame:** who you are playing, stay in character | Never | ~100 |
| 2 | **Rules primer:** the evening as the characters know it | Never (per run config) | ~600 |
| 3 | **Briefing** (from Characters) | Never | ≤ ~1,000 |
| 4 | **Strategy section** | At checkpoints | ~150 |
| 5 | **State:** phase, where you are, who's present, purse, pensions, allowed actions | Every call | ~150 |
| 6 | **Long-term memory:** retrieved bullets, high-salience marked | Every utterance | ~300 |
| 7 | **Recent private thoughts** (shortTermHistory) | Every utterance | ~200 |
| 8 | **The conversation so far** (History) | Every utterance | ~400 |
| 9 | **Task:** call-specific instructions and output format | Per call type | ~250–450 |

- **Message layout:** blocks 1–3 form the **system message**; blocks 4–9 form **one user message**. Where a model's chat template handles a system message badly, set `system_role: false` and send all nine blocks as one user message. The prefix is identical either way, so caching works either way
- **Blocks 1–3 are identical for every call type**, so all of a character's calls share one cached prefix. Task instructions go last, where models attend to them most
- **Long-term memory is retrieved once per character per utterance** and reused for that character's `think()` and `speak()`. Movement, strategy, Murder Round, and vote calls retrieve their own, with queries suited to the decision (e.g. Murder Round retrieves threats and deals)
- **Sizes:** ~3,200 input tokens per call. Measured S1 `think()` output was ~480 tokens with the contact list; without it, expect ~150. `speak()` ~100. Models & Research replaces these with measurements
- **History lines** are formatted `Name: words`, or `Name (to Addressee): words` when an addressee was set. Il Notaio lines start `[Il Notaio]`
- **No constrained decoding.** Raw JSON plus code validation (see Output Validation & Repair); S1 found constrained decoding fixed nothing and hurt two models

---

## Prompt Drafts

*Status: drafts. Blocks 1–3, 9a, and 9b were probed in their v0.2 form (S1–S7); 9a changed in v0.3. Blocks 9c–9f are new and untested. Placeholders in `{braces}` are filled by code; values come from mechanics' Tunable Values.*

**For probes:** blocks 4, 6, and 7 may be stubbed ("No plan yet." / "Nothing yet." / empty) unless the scenario needs them. Blocks 2 and 9 should be used as written so results transfer to the real engine.

### Block 1 — Frame (shared)

```
You are {character_name}, a character in a game of political intrigue set at a gathering in a Florentine palazzo, 1492. Think, speak, and decide as {character_name} would. Stay in character at all times; never mention being an AI or a game piece.

You know only two things: what is in your briefing, and what you have personally seen and heard tonight. Other guests know only what they have seen and heard. Never assume anyone knows your secrets, or that you know theirs, unless it has been said in your presence.
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

Money: everyone begins with {starting_florins} Florins and receives {income} more each round. A bribe is Florins handed over in a private Colloquio; anything promised in return is a matter of honor, not law. At the ballot, every living guest casts one vote and may buy extra votes at {vote_price} Florins each.

French pensions: any Medici or Pazzi may accept a pension of {pension_size} Florins from the French Embassy at any time. A pension puts its holder on France's payroll. It can be renounced before the ballot by paying {pension_size} Florins back — by the holder, or by a relative who knows of it. Pensions are private; only the Embassy keeps the full ledger.

The Murder Round: each living guest secretly chooses one act: KILL, GUARD, or INVESTIGATE someone. A guest guarded by two or more survives an attack. A guest investigated by two or more cannot carry out their kill. You cannot guard yourself. Killers are never named. The dead lose their Florins and pensions; nothing is inherited.
{plot_protection_rule}

Repentance: during the speeches only, a candidate may publicly repent. It is permanent and turns them to the Dominicans' cause: if they are elected, the Dominicans win.
```

`{plot_protection_rule}` when the feature is on:
```
Your plot point: if you complete the plot point in your briefing before the last faction meeting before the Murder Round, you secretly gain the protection of one guard. No one else is told.
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
- `{phase_label}` e.g. "Capannello round 2, turn 4", "Faction meeting 3 (Medici)", "The Murder Round", "The ballot"
- `{conversation_label}` e.g. "a Capannello with Piero de' Medici and Lupo" or "a private Colloquio with Jeanne d'Orléans (utterance 3 of 6)". For calls outside a conversation (Murder Round, vote): "the gathering"
- `{embassy_ledger}`: French Embassy characters only — "Embassy treasury: {n} Florins. Pensions held: {ledger}." Empty for everyone else
- `{plot_status}`: empty until the plot check runs; then "You have secretly earned the protection of one guard." or "You did not earn protection."
- `{action_feedback}`: empty unless the character's last action was rejected, e.g. "Your attempt to give 6 Florins failed: you hold only 4."

### Blocks 6–8 — Memory

```
WHAT YOU REMEMBER FROM EARLIER TONIGHT
{longterm_bullets}
(★ marks promises, threats, deals, and admissions.)

YOUR RECENT PRIVATE THOUGHTS
{short_term_thoughts}

THE CONVERSATION SO FAR (most recent last)
{history}
```

For calls outside a conversation, block 8's heading reads `WHAT YOU LAST HEARD` and holds the end of the character's most recent conversation plus any broadcasts since.

### Block 9a — think() task *(changed in v0.3: contacts removed)*

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

### Block 9b — speak() task

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

addressee — if you are putting a question or demand to one particular person present, give their name exactly as written in "Present"; they will have to answer you. Otherwise null.

action — optional. You may take one of these actions with this line, or none:
{allowed_actions}

Reply with only this JSON:
{"addressee": "..." or null, "utterance": "...", "action": null or {...}}
```

- `{closing_line_note}`: empty normally; "{other} is ending this private conversation. This is your last line here." or "This private conversation must end now. This is your last line here." at the cap
- `{allowed_actions}` is generated by code from mechanics so a character only sees what they may legally do:
  - In a Colloquio, with Florins: `{"type": "bribe", "amount": N} — hand {other} N Florins (you have {florins})`
  - Medici and Pazzi, while the treasury has a pension: `{"type": "borrow"} — accept one French pension of {pension_size} Florins`
  - Anyone with ≥ {pension_size} Florins, until the ballot: `{"type": "repay", "for": "Name"} — renounce one French pension held by yourself or a relative who has told you of it`
  - If none apply: "None available right now. Set action to null."

### Block 9c — Movement task *(new)*

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

### Block 9d — Strategy task *(new; for S9a)*

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

### Block 9e — Murder Round task *(new; for S10)*

```
TASK: THE MURDER ROUND
The night has come. Choose your act in secret. No one will learn what you chose; killers are never named, and those who investigated learn nothing.

What each act does:
- KILL: your target dies, unless two or more guests guard them, or unless two or more guests investigate you, which stops your kill.
- GUARD: you help protect your target. One guard alone saves no one; it takes two or more.
- INVESTIGATE: you help stop your target's kill. One investigator alone stops nothing; it takes two or more.
Remember any arrangements you made tonight, and whether others are likely to keep theirs.

You may choose:
{allowed_murder_acts}

1. thought — 2 to 4 sentences, first person: who threatens you or your faction, who you have promised what, and what you will do.

2. acts — {acts_count_instruction}

Reply with only this JSON:
{"thought": "...", "acts": [{"type": "kill" or "guard" or "investigate", "target": "..."}]}
```

- `{allowed_murder_acts}`, generated by code:
  - Everyone except Lupo: `KILL, GUARD, or INVESTIGATE any living guest. You cannot GUARD yourself.`
  - Lupo: `KILL up to two living guests. Your kills cannot be stopped by guards or investigations. You may not GUARD or INVESTIGATE.`
- `{acts_count_instruction}`: "exactly one act." / for Lupo: "one or two kills."
- **Plot protection** reaches the character through `{plot_status}` in block 5 (e.g. "You have secretly earned the protection of one guard"), so a protected character knows one ally's guard is enough
- **Memory retrieval** for this call favours ★ entries (threats, deals, promises) and anything about the guests the character's plan names as threats

### Block 9f — Vote task *(new; for S8 vote items)*

```
TASK: THE BALLOT
The ballot is secret. Cast one vote for any living guest, and decide how many extra votes to buy for that same guest.

The candidates: {candidates}
{repentance_note}
Your purse: {florins} Florins. Each extra vote costs {vote_price} Florins; you can buy at most {max_buy}.
Florins left after the ballot are worth nothing.

1. thought — 2 to 4 sentences, first person: who must win for your side to win, given who has repented and who holds French pensions as far as you know, and whether buying votes is worth it.

2. vote — the guest you vote for, exactly as written in "All living guests besides you", or your own name.

3. buy — how many extra votes to buy, from 0 to {max_buy}.

Reply with only this JSON:
{"thought": "...", "vote": "...", "buy": 0}
```

- `{candidates}`: "Piero de' Medici (Medici), Francesco Pazzi (Pazzi)", noting any candidate who has died
- `{repentance_note}`: empty, or "Before the city, {name} repented of {tagline}." for each /repent broadcast
- `{max_buy}` = floor(Florins ÷ vote price), computed by code
- **Assumption, sent to mechanics to confirm:** bought votes count for the same guest the character votes for

---

## Speaking Order & Decay Rule

*The plain-language rule is in mechanics under Conversation Types.*

- The Orchestrator re-decides speaking order after every utterance, using current importance scores
- Each time the same character speaks again in a row, their effective importance score is reduced by **20% of its current value**
- Importance scores reset with a fresh `think()` each turn; decay doesn't carry forward
- Ties are broken randomly
- `detectDesignation()` overrides all importance-score logic when a direct address is detected

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

- Per-character verbatim buffer of recent utterances, plus injected social events
- Only contains what the character was personally present to witness
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
- High-salience tagging for commitments, promises, agreements, threats, and admissions; separate tag for the character's own firm conclusions
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
- Witnessed events are injected into the History of present characters only
- Faction meetings pool nothing automatically; members learn only what is said aloud
- Personal purses and pensions are visible only to their holder, unless the holder discloses them
- The Embassy's pension ledger and treasury balance are exposed in real time to every French Embassy character's context, and to no one else's

---

## What the System Tracks & When

### Per Character (always in context)
- Character briefing: static
- Strategy section: updated at each checkpoint and at strategy-altering events

### After Every Utterance
- `think()` outputs for everyone present: thought, importance score, and (in a Colloquio) done signal
- `speak()` outputs: utterance, addressee, and any action (validated and applied by the Stage Manager)

### End of Every Turn
- Movement call for the character whose window arrived: thought, contact list, choice, target
- longTermHistory: extraction pass on the History transcript
- Global utterance counter: reset to zero

### Rolling Buffers (continuously updated)
- History: verbatim recent transcript plus injected events, per character, last ~5–6 utterances
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
- Murder Round acts and ballots: logged in full, never shown to characters
- Validation log: repairs, rejections, retries, and defaults per call

---

## Plot Point Checks

*The plot points and the plot protection rule are in mechanics under Murder Round.*

- **Logged checks** (meetings, payments, pension ledger) are answered directly from the system's records and are exact
- **Knowledge checks** ("has X learned Y?") are answered by asking a precise yes-or-no question of the character's memory (longTermHistory, including recorded conclusions), on the system model at temperature 0. They depend on the extraction pass, so they are less reliable and should be watched in testing
- Combined checks (e.g. "meeting held, while Piero has not learned of the affair") evaluate each part at the deadline, before Faction Meeting 4
- **Every knowledge check stores the memory entry that answered it**, shown in the dashboard for hand review
- **Feature flag:** plot protection can be switched on or off per run. The flag also controls `{plot_protection_rule}` in the rules primer

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

**Not a tuning lever:** personality LoRAs. They're randomly assigned, so they should average out. Use them as a **robustness check** instead: balance should hold regardless of how personalities are dealt.

**Experimental variables, after the baseline is balanced:**
- **Personal ambitions:** e.g. two Medici each wanting the nomination, or a character with secret loyalties to another faction
- **Plot protection:** compare runs with the feature on and off
- In a simulation, characters acting against their faction isn't a problem to prevent; it's behavior to observe

**Health metrics to track alongside win rates (to avoid Goodhart's law):**
- Does deliberate play beat random play?
- How often are /repent, /borrow, /repay, and Colloquii used? Unused mechanics are dead weight
- How often plot points are completed (and how often by deduction), and how often plot protection actually saves someone
- Number of deaths per game, and game length
- Movement frequency per character
- Colloquio length, and how often the utterance cap is reached versus a "done" signal
- Rejected actions, repairs, retries, and defaults per game (a sign the prompts need work)

**Statistical note:** with 100 games, a faction that truly wins 25% of the time could show anywhere from roughly 17% to 33% by chance. Distinguishing small differences takes several hundred games per configuration, which is why that job belongs to the simulator.

---

## Developer Dashboard

The first build artifact: an internal console for running and debugging the simulation. Stack: React, Node/Express, PostgreSQL.

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

**Removed:**
- **Esteem matrix** (removed in mechanics v0.9): its only use was breaking /defect ties
- **Contact list in every `think()`** (v0.3): moved to the movement call. It caused most gate 1 failures and about half of `think()`'s output, for information used once per turn
- **Constrained decoding** (v0.3): no benefit in S1, and worse results on two models

**Rejected:**
- **Self-esteem scores:** designing for a problem not yet observed
- **Batched `think()` across characters** (v0.2): breaks knowledge isolation and can't run separate personality LoRAs
- **`think()` on a smaller model** (v0.2): it's a character call
- **Name-matching `detectDesignation()` on raw text** (v0.2): misses titles and indirect address
- **Counting only being told for "learned"** (v0.3): would make deduction, and LeNoir's seal clue, useless for plot points

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

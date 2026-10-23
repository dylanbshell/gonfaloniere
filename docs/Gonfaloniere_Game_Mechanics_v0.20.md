# Gonfaloniere
## Game Mechanics — Working Document
### Version 0.20
*Formerly "Plots in the Palazzo"*

---

## Changes in v0.20

- **Bought votes go to your own pick:** all of a character's votes, cast and bought, go to the same guest (confirms Technical Design's assumption; Athens precedent)
- **Missing Murder Round action:** a character who submits nothing takes no action, Plot Reward action included
- **Simultaneous resolution:** a character killed in the Murder Round still has their own actions carried out, and several kills on one target produce one death
- **Run-off defined:** one fresh vote among the tied guests with no vote buying; if it ties again, the winner is drawn by lot
- **Trial after murder** added to Deferred (from Alternate Game Ideas & Research), as a lever if killing proves too cheap

## Changes in v0.19

- **Plot protection replaced by the Plot Reward.** Completing your plot point now earns **one extra Murder Round action of your choice** (Kill, Guard, or Investigate) instead of an automatic free guard. The reward now adds agency and can raise the death count as well as lower it. Tuning lever: extra actions per completed plot point
- Defaults set for the new reward: the two actions must target different characters, no self-guard, secret, switchable, and Lupo's extra action follows normal rules (see Plot Reward)
- **San Frediano wording merged** (from Characters): "who killed his brother" in the plot point table now means "that Isabella ordered the killing"; learning only Lupo's name doesn't count

## Changes in v0.18

- **Character Briefings trimmed to rules only.** Briefing content (identity, knowledge, secrets, voice, and how characters are told to read Il Notaio) now lives in `Gonfaloniere_Characters`
- Added the rule that starting resources come from the Florin Economy, not from briefings

## Changes in v0.17

- **Split into two docs.** This doc now covers only what happens in the game, using the boundary test: *could a human moderator run it with paper and a bell?* How the software works moved to the new **`Gonfaloniere_Technical_Design` v0.1**: system architecture, core functions, the speaking-order formula, memory, knowledge isolation, system tracking, plot point checks, balancing methodology, the developer dashboard, and the player interface
- Rules that depend on the software (speaking order, collisions, Il Notaio's notes) are restated here in plain language with pointers
- New **Tunable Values** table collects every current lever value in one place
- Each doc now has its own Open Questions and Considered/Removed lists
- *Changelog entries before v0.17 cover material now in both docs*

## Changes in v0.16

- New **Colloquio ending rules** (merged from the General chat, Oct 20): either character can end it, a hard cap of about 6 utterances, ending is free, and both characters return to the Capannello they left

## Changes in v0.15

- First draft of the 12 plot points added (see Plot Protection)
- Clarified that the free guard is automatic and doesn't use the character's own Murder Round action
- **Self-guarding banned:** a character can't Guard themselves, so protection always takes someone else

## Changes in v0.14

- New **plot protection** mechanic: a character who completes their plot point before the Murder Round counts as having one free guard (see Murder Round)
- Plot protection is a switchable feature, so baseline runs can be done with it on or off

## Changes in v0.13

- When a character dies, their **Florins vanish** along with their pensions; nothing passes to their faction or their killer
- **Personal goal rewards deferred:** characters keep personal goals in their briefings for motivation, but achieving them pays nothing in the first version. If added later, the reward will be a fixed number of Florins per goal, and goals must be checkable from logged game data
- Il Notaio's example lines updated to use characters from the current roster

## Changes in v0.12

- French debt reframed as **French pensions**: taking French money puts you on the Embassy's payroll
- New **Embassy treasury**: a fixed, shared lending fund, separate from French characters' personal purses, never refilled from personal money, used for pensions only
- Pensions are a **fixed 3 Florins**, borrowed and repaid in whole units only; the treasury is always a multiple of 3
- /borrow available any time (no longer tied to bribing); borrowed Florins can be spent on anything
- /repay is now **private** — no city-wide broadcast
- The Embassy's pension ledger and treasury balance are known to all French characters in real time

## Changes in v0.11

- Document restructured: simulation first, game-only features moved to a new Post-Simulation section
- New sections: Simulation Scope, Character Briefings
- Voting defined as a single reasoning call per character (no extra strategy round before the ballot)

## Changes in v0.10

- Phase D (Capannello 4) removed; later phases relettered D–H
- Per-round income now totals 3 Florins over a game (one payment per Capannello phase)

## Changes in v0.9

- Win conditions rewritten (see Win Conditions)
- Repentance now converts the repenter; candidates only, Speeches phase only, permanent
- /recant removed
- /defect and the esteem matrix removed (conversion replaces /defect)
- Dominicans cannot /borrow
- /repay available any time until the ballot
- Faction Meeting 4 trimmed; later faction meetings renumbered
- Vote buying open to all at 5 Florins per vote; /bribe is now a plain Florin transfer
- Economy baseline: 10 starting Florins each, 1 Florin per round, no starting debts, no special income
- New section: Balancing Approach

---

## About This Document

This doc covers **what happens in the game**: the rules a human moderator could run at a real dinner party with paper and a bell. How the software makes it happen (architecture, memory, speaking-order math, balancing methodology) lives in **`Gonfaloniere_Technical_Design`**, and the character briefings live in **`Gonfaloniere_Characters`**. Where a rule depends on the software, it's stated here in plain language with a pointer.

Gonfaloniere is being built as an all-AI simulation first, with all 12 characters played by AI, and becomes a playable game afterward. See Technical Design for the simulation's scope and goals.

---

## Core Structure

- 12 active characters across 4 factions: Medici, Pazzi, Dominicans, French Embassy
- 3 Capannello phases of open play, followed by a Murder Round and the Election
- Death is permanent and removes the character from active play; a dead character's faction can still win
- A dead character's Florins and pensions vanish; nothing is inherited
- All living characters may vote in the Election regardless of faction
- Only Medici and Pazzi characters may be nominated as candidates for Gonfaloniere

---

## Round Structure

The full game unfolds in the following sequence (all turn counts TBD):

- **A)** Faction Meeting 1 → Individual Strategy 1 → Capannello 1
- **B)** Faction Meeting 2 → Individual Strategy 2 → Capannello 2
- **C)** Faction Meeting 3 → Individual Strategy 3 → Capannello 3
- **D)** Faction Meeting 4 → Individual Strategy 4 → KILL / GUARD / INVESTIGATE
- **E)** Medici & Pazzi Internal Discussions → Candidate Selection
- **F)** Speeches (candidate speeches + open interventions; the only window for /repent)
- **G)** Faction Meeting 5 (final coordination before ballot)
- **H)** Voting → Endgame

*Dramatic shape: Scheme (A–C) → Survive (D) → Nominate (E) → Persuade or betray (F) → Coordinate final vote (G) → Decide (H)*

---

## Turn Structure

- A **turn** is 12 utterances, counted across all active conversations at once, regardless of how many conversations are running or how many characters are in each
- With 4 Capannelli of 3, each conversation gets about 3 utterances per turn: each character speaks about once and hears two others
- At the end of every turn, one character gets a movement window (see Movement)
- Starting value: 12 utterances per turn, tunable

*End-of-turn memory updates are covered in Technical Design.*

---

## Capannello Initialization

- At the start of each Capannello phase (A, B, C), all living characters are randomly split into groups of 3 (4 groups at full strength)
- The movement order for that phase is also randomized
- Random starts keep characters from settling into comfortable cliques; they then sort themselves over the phase through movement

---

## Faction Meetings

Faction meetings are ordinary Capannello conversations limited to living faction members, with all the usual conversation rules.

- Nothing is pooled automatically: a character only learns what another member chooses to say out loud
- Characters may withhold French pensions, private plans, or secret alliances even from their own faction
- Faction Meeting 4 is the last strategy session before the Murder Round
- Faction Meeting 5 is the final coordination beat before the irreversible ballot, after hearing speeches and any repentance
- No individual strategy step follows Faction Meeting 5; voting comes next

---

## Individual Strategy

After each faction meeting, every character privately works out their own plan: their current goals, threats, and next moves.

- Each character's plan is entirely their own. Faction meetings inform it but never dictate it
- Two characters who heard the same information may leave with completely different, even conflicting, plans
- A character also revisits their plan after a genuinely strategy-altering event, such as surviving an assassination attempt or having a French pension revealed

*How plans are generated and stored is covered in Technical Design.*

---

## Character Briefings

*The briefings themselves (who each character is, what they know, their secrets, and how they're told to read Il Notaio) live in `Gonfaloniere_Characters`. This section holds only the rules every briefing must follow.*

- **Baseline alignment:** for baseline runs, each character's stated aims point toward their faction's win condition
- **One plot point per character:** a checkable story goal that earns the Plot Reward (see Plot Reward, which holds the current list). Plot points must be completable during the three scheming rounds
- **Other personal goals are motivation only** and earn no reward in the first version (see Personal goal rewards under Deferred)
- **Repentance is the one deliberate split** between individual and faction goals: a converting candidate trades their family's win for the Dominicans'
- **Starting resources come from the Florin Economy,** not from briefings

---

## Conversation Types

### Capannello (Capan)

- A group conversation between 2–4 characters
- Maximum 6 Capannelli running at once
- Default configuration: 4 groups of 3, randomized at the start of each Capannello phase
- **Who speaks next:** the character who most urgently wants to speak goes next, and nobody easily speaks twice in a row. *(Formula in Technical Design.)*
- **A direct question must be answered:** if someone addresses a specific character, that character speaks next
- Characters join at the end of the current cycle, never mid-cycle
- A character who joins only hears what's said after they arrive

### Colloquio (Collo)

- A private two-person conversation
- No one may join a Colloquio; they are strictly private
- **Who speaks next:** the same urgency rule as a Capannello. The direct-question rule doesn't apply, since there's only one other person
- All Colloquio requests are automatically accepted; there is no refusal
- Calling a Colloquio uses up the character's movement window, so it's a deliberate, costly choice
- It carries a social cost: characters seen withdrawing for a Colloquio are noted by Il Notaio, with escalating implication for repeat occurrences

**Ending a Colloquio:**
- Either character can end it when they're done; the other character then gets one closing line
- Hard cap of about **6 utterances** (3 each), tunable
- Ending is free and doesn't use a movement window
- Both characters return to the Capannello they left, or to the smallest open one if that Capannello is full
- Il Notaio notes the return, and returners rejoin at the end of the current cycle like any other joiner

---

## Movement

- One character gets a movement window per turn, cycling through all living characters
- The order is randomized at the start of each Capannello phase
- When their window arrives, a character chooses one: **stay**, **switch Capannelli**, or **call a Colloquio**
- Switching and calling a Colloquio both use up the window
- Characters move **toward a person**, not to a group, and moves are resolved one at a time, so two characters can't swap past each other
- **Collisions:** if a move would overfill a group, an open seat is used first. If both groups are full, the character least involved in their current conversation is the one who moves *(how involvement is measured is in Technical Design)*

---

## Il Notaio

The in-fiction narrator who records everything that happens in the palazzo. He belongs to no faction.

- Notes social events to the characters who witness them: joins, departures, Colloquio withdrawals, and returns, with escalating implication for repeat withdrawals
- Broadcasts public events city-wide: /repent (with its tagline)
- Tone: precise, formal, slightly detached — a notary who has seen a hundred such evenings

> *Example observation (first Colloquio): "Signor Raffaello de' Medici and Contessa Isabella were observed withdrawing from company — a brief word exchanged where none could hear."*

> *Example observation (repeat): "Signor Raffaello de' Medici was once again seen drawing another aside — this time Captain LeNoir. Some note he has found occasion for private congress more than once this evening."*

> *Example repentance broadcast: "Piero de' Medici, before the gathered city, confessed the sin of his family's usury, and swore to govern in humility before God."*

*How his notes reach characters' memories is covered in Technical Design. Player-facing duties are under Post-Simulation.*

---

## The Social Cost of Privacy

There's no reputation score. The cost of frequent Colloquii comes entirely from Il Notaio's observations: other characters see who keeps slipping away and draw their own conclusions.

---

## Win Conditions

Mutually exclusive, checked in precedence order the moment the Election result is announced. Each condition requires at least one living member of the winning faction at that moment.

### Precedence Order

1. **Dominicans win** if the elected candidate has repented.
2. **French Embassy wins** if anyone in the elected candidate's faction holds a French pension, and at least one French Embassy character is alive.
3. **The elected candidate's faction (Medici or Pazzi) wins** otherwise — a clean win.

*Design principle: a French pension is the easy, common win; repentance is the rare, powerful one that overrides it.*

### Notes

- A clean Medici or Pazzi win is the hardest outcome: win the vote, no repentance, and no member of the faction holding a French pension
- Factions must police their own members — a single relative on France's payroll can hand the game to France
- Pensions die with the character, so killing a pensioned relative during the Murder Round clears it (an intentional dark possibility)
- A faction about to lose to France could have its candidate repent to hand the win to the Dominicans instead (kingmaking — watch in testing)

---

## Commands & Public Actions

### /repent

- **Candidates only** — only a nominated Medici or Pazzi candidate may repent
- **Speeches phase (F) only**, and fully public
- **Permanent** — there is no way to take it back
- **Converts the repenter:** their win condition becomes the Dominicans' immediately, so their own election becomes their personal victory
- Must include a short tagline specifying what the candidate is repenting of, broadcast by Il Notaio city-wide
- The betrayed faction cannot renominate, but can respond in Faction Meeting 5 (e.g. rally behind a write-in or vote elsewhere)
- *Balance logic:* converting trades the candidate's family votes for Dominican votes plus whatever the Dominicans can buy, so it is roughly an even swap — attractive mainly when the candidate's own path is in trouble

### /repay

- Renounces one French pension by returning exactly **3 Florins** to the Embassy treasury
- Repayment is in whole pensions only — no partial repayment
- Available any time up until the ballot
- You can repay your own pension or a faction member's
- Since pensions are private, you can only rescue a relative who discloses that they hold one
- **Private:** only the Embassy's ledger records it; there is no public broadcast

### /borrow (accepting a French pension)

- Accepts one French pension: exactly **3 Florins** from the Embassy treasury
- Available any time, to any character **except Dominicans and French Embassy members** — a free action that does not use a movement window
- Borrowed Florins go into the character's purse and can be spent on anything (bribes, vote buying, /repay)
- All requests automatically granted while the treasury holds at least one pension's worth
- A character may hold multiple pensions; each is one unit on the Embassy ledger
- If the treasury is empty, no pension is available
- *Natural deterrent:* a pension taken early can still be renounced before the ballot; a pension taken to buy votes at the ballot cannot, so it guarantees France the win if that faction wins

### /bribe

- A plain Florin transfer from one character to another, in a Colloquio
- Anything promised in return (votes, information, Murder Round favors) is unenforced and up to the characters

---

## Florin Economy

**Testing baseline — symmetric by design, so that any imbalance in results comes from the rules rather than starting conditions:**

- Every character starts with **10 Florins**
- Every character receives **1 Florin per round**, paid at the start of each Capannello phase (3 Florins over a full game)
- **No starting pensions**
- **No special per-round income** (e.g. the goldmine) — varied wealth from the character briefings may be reintroduced later as part of tuning
- Note: equal is not automatically fair — Dominicans cannot take pensions at all, so their purse plus income is all they will ever have

**Rules:**

- /bribe transactions happen in Colloquii only
- /borrow and /repay don't require a Colloquio
- No other IOUs or promises are enforced
- Every transaction is recorded: who paid whom, how much, in which conversation
- Personal purses and pensions are private unless a character chooses to disclose them
- **On death, a character's Florins and pensions vanish.** Nothing passes to their faction or their killer. This gives the Murder Round real teeth: killing a rich character cuts their family's vote-buying power

**The Embassy Treasury:**

- A shared lending fund belonging to the French Embassy as an institution, separate from French characters' personal purses
- Starting value: **15 Florins (5 pensions)** — always a multiple of the pension size
- Used for pensions only: French characters cannot spend it on their own bribes or votes
- Never refilled from personal purses — it only grows back when pensions are repaid
- If the pension size is ever tuned, the treasury must remain a multiple of the new amount
- **The ledger is open to the whole Embassy:** every French character knows who holds pensions, how many, and the treasury balance
- Outside the Embassy, a pension only becomes known if the holder discloses it or a French character reveals it — giving France a card to play (reveal, blackmail, or stay silent so the family doesn't clean it up before the vote)

---

## Murder Round

Each living character secretly submits exactly one action: KILL [Name], GUARD [Name], or INVESTIGATE [Name], plus one extra action if they earned the Plot Reward. A character can't Guard themselves.

**Resolution order:**
1. **Investigations:** A character Investigated by 2+ others cannot carry out their Kill (no information returned to investigators)
2. **Guards:** A character Guarded by 2+ others survives even if attacked
3. **Kills:** All remaining Kills are applied

- Announcements: who died, whether attempts were foiled; killer identities never revealed
- Special case — Lupo: may submit two Kill orders, which cannot be blocked by Guards or Investigations. He may not Guard or Investigate, except with a Plot Reward action
- Characters may freely agree to coordinate Kill/Guard/Investigate actions; nothing enforces those agreements
- **Simultaneous:** all actions resolve together. A character killed this round still has their own actions carried out, and several kills on one target produce one death
- **Nothing submitted, nothing done:** a character who doesn't submit an action takes none (Plot Reward action included)

### Plot Reward

Ties each character's storyline to their power on the night of the Murder Round.

- **Each character has one plot point:** a story goal from their briefing, written so it can be checked from the record of the game (a specific secret learned, a specific private meeting held, a specific payment made)
- **The reward is one extra action of your choice:** a second KILL, GUARD, or INVESTIGATE, submitted secretly alongside your normal action. It follows all the usual rules, so an extra Guard or Investigate counts toward the 2+ threshold like anyone else's
- **Two different targets:** a character's two actions must name different characters, so one character can never reach the 2+ threshold alone (e.g. guarding the same ally twice). Saving or restraining someone always takes at least two people
- **No self-guard:** the extra action can't Guard yourself either
- **Lupo:** his extra action may be a Kill, Guard, or Investigate, but it follows normal rules: a third Kill *can* be blocked by Guards and Investigations, unlike his two standard Kills. He still can't Guard or Investigate with his standard actions
- **Deadline:** the plot point must be completed before Faction Meeting 4, so the character knows about the reward while planning. Goals that can only resolve during the Murder Round itself (e.g. "see your brother's killer dead") can't be plot points
- **Secret:** the character knows they've earned it, but no one else is told. They may reveal it if they choose, but nothing proves the claim
- **Optional:** the game can be played with or without the Plot Reward
- **Tunable:** one extra action per completed plot point is the starting value. If the Murder Round proves too deadly or too tame, change the number of extra actions a plot point earns (or switch the reward off) rather than redesigning it

*How plot points are checked is covered in Technical Design.*

**Plot points (first draft):**

| Character | Plot point | Kind |
|---|---|---|
| Piero | Learn that Francesco is having an affair with Clarice | Knowledge |
| Clarice | Hold a private Colloquio with Emile, while Piero has not learned of her affair | Meeting + knowledge |
| Raffaello | Tell LeNoir that Isabella ordered his brother's killing (Lupo's name alone doesn't count) | Knowledge (passed from Raffaello to LeNoir) |
| Francesco | Pay Fra Tommaso at least 3 Florins, a visible act of piety | Payment |
| Giorgia | Hold a private Colloquio with Emile, while Emile has not learned of her affair with LeNoir | Meeting + knowledge |
| Lupo | Be paid at least 5 Florins in total by other characters | Payments |
| Fra Tommaso | Receive at least 3 Florins in donations from Medici or Pazzi characters | Payments |
| Sister Beatrice | Learn who hired Lupo for the San Frediano killing | Knowledge |
| Contessa Isabella | Pay Lupo at least 3 Florins for his silence, while LeNoir has not learned that Isabella ordered his brother's killing | Payment + knowledge |
| Jeanne | Get at least one Medici or Pazzi character to accept a French pension | Pension ledger |
| Emile | Hold private Colloquios with both Clarice and Giorgia | Meetings |
| Captain LeNoir | Learn who ordered his brother's death | Knowledge |

How they interlock:
- **Head-to-head:** Piero vs. Clarice over the affair; LeNoir and Raffaello vs. Isabella over the murder; Beatrice vs. Isabella within the Dominicans
- **Cooperative:** Francesco paying Tommaso completes both plots; Emile meeting each suitor helps all three; Lupo needs paying clients
- **Into the main objectives:** Jeanne's plot creates French pensions, Lupo's creates kill contracts, and Tommaso's builds the friars' vote-buying purse

---

## The Election

- Medici and Pazzi each select one living candidate via internal discussions in phase E
- Each candidate delivers a speech in phase F; open floor interventions follow. A candidate may /repent during this phase
- All factions hold a final coordination meeting (Faction Meeting 5, phase G) before the ballot
- Secret ballot in phase H: every living character casts one vote for any living character, including write-ins, and decides how many extra votes to buy for that same guest
- **Vote buying:** any character may buy additional votes at **5 Florins per vote**. Bought votes always go to the guest the buyer voted for; they're added on top of the ballot and don't change anyone else's vote. This is the only official way to gain extra votes. Command name TBD
- Most votes wins
- **Run-off:** if the top guests tie, every living character casts one fresh vote among only the tied guests. No vote buying in the run-off. If it ties again, the winner is **drawn by lot**, Florence's own way of filling offices
- Win conditions checked the moment the result is announced, in precedence order

---

## Tunable Values

The current value of every number that balancing may adjust. Each is also stated next to its rule above. *Balancing methodology is in Technical Design.*

| Lever | Current value |
|---|---|
| Starting Florins | 10 |
| Per-round income | 1 Florin per Capannello phase |
| Vote price | 5 Florins per vote |
| Pension size | 3 Florins |
| Embassy treasury | 15 Florins (must stay a multiple of the pension size) |
| Guards / Investigations needed to block | 2 or more |
| Plot Reward | 1 extra Murder Round action (Kill, Guard, or Investigate) per completed plot point, or switched off |
| Utterances per turn | 12 |
| Movement windows per turn | 1 |
| Colloquio cap | About 6 utterances (3 each) |

---

## Considered, Deferred, or Removed

**Deferred:**
- **Sibyl of San Marco** — cryptic verse oracle for 1 Florin per question; deferred due to uncertainty about how well characters would decode her verse, and about game balance
- **Pension and Florin inheritance** — passing a dead character's pensions or Florins to surviving faction members; a lever to test if killing proves too powerful
- **Personal goal rewards** — a fixed Florin reward per achieved personal goal (one tuning knob, converting to votes through the vote price). Requires rewriting goals so they can be checked from the record of the game, and favoring goals that can be completed mid-game. Watch for Florins being worth more to Dominicans, and for goals that allies could trigger just by passing money around
- **Trial after murder** (from Puritania and Élysée) — after the Murder Round: discussion, accusations needing a seconder, then a vote; the convicted are executed (Puritania caps each juror's Guilty votes at the number of murders). Gives killing a cost and rewards deduction. A lever if the simulator shows killing is too cheap; a conviction could also bar a character from standing or voting (Élysée's eligibility rule)
- **Sanctuary** — repentant characters immune to the Murder Round (would only apply if repentance is ever moved before the Murder Round)
- **Faction election powers** — e.g. Dominicans annulling bought votes
- **Dune-style prediction win for France** — secretly predicting the winner, like the Bene Gesserit
- **/leverage** — France formally asserting its claim

**Removed in v0.19:**
- **One free guard as the plot reward** (v0.14–v0.18) — purely defensive and automatic, so it could only lower the death count and gave the character no choice. Replaced by the Plot Reward's extra action

**Removed in v0.9:**
- **/recant** — repentance is now permanent
- **/defect** — replaced by conversion through repentance
- **France's secondary win path** through Dominican debt — replaced by barring Dominicans from borrowing

**Rejected:**
- **Secret repentance** — keeps family votes and gains Dominican votes at little cost; likely overpowered
- **Non-candidate repentance** — would let write-ins bypass the candidate system
- **Binding vote deals / public ballots** — unenforceable under a secret ballot; vote buying covers this
- **Removing the French pension win condition** — leaves France with no win condition and removes any reason to repay
- **Restricting how borrowed Florins are spent** — money is interchangeable, so it can't be enforced without tracking individual coins
- **Partial pensions or repayments** — replaced by fixed whole-pension units
- **Full Murder Round immunity as the plot reward** — all-or-nothing, hard to tune, and likely to make the Murder Round fizzle; replaced by one free guard (v0.14), itself replaced by the Plot Reward (v0.19)
- **Giving a dead character's Florins to their killer** — a strong murder-for-profit motive that could also expose the killer, whose identity is meant to stay secret
- **Votes as the personal goal reward, with different values per goal** — too many separate knobs to tune reliably; a uniform Florin reward is simpler
- **Public /repay** — would expose pension holders, contradicting pension privacy
- **French characters refilling the treasury** from personal purses

*Technical items that were considered or removed (e.g. the esteem matrix) are listed in Technical Design.*

---

## Open Questions

- Exact number of turns per round and per phase
- Command name for vote buying
- Refining the draft plot points during the briefing rewrites
- If a human player's character dies but their faction wins, does the human win? (see Post-Simulation)

---

## Post-Simulation: Game Features

Rules that only matter once a human player is added. Preserved here so they aren't lost, but not part of the simulation. *The player interface itself is in Technical Design.*

### Human Player Basics

- The human player controls one character; death is game over for the human player
- Open question: if the human's character dies but their faction wins, does the human win?

### Human Player Input

- The human player may send one message per turn, slotted in at the next natural break in the conversation
- Maximum 500 characters per message
- Commands (/repent, /repay, /borrow, /bribe, /kill, /guard, /investigate) don't count toward the limit — they are actions, not speech
- The human player speaks less often than the AI characters — intentional, as the game is designed to be challenging

### Il Notaio — Player-Facing Duties

- Answers player questions about rules and the current state of the game
- Orients new players at relevant moments rather than front-loading a tutorial
- Steps in on game-breaking transgressions (initial scope: mistimed commands and explicit fourth-wall breaks only, expanding with testing)

### Jailbreak Rule

- If any character tries to break the fourth wall or manipulate the other characters out of game, everyone is notified at once
- All characters converge on that character's Capannello; the 4-character cap is suspended
- The offending character is treated as an Ottoman spy — a grave social transgression in 1492 Florence
- The result is effective removal from the game before the Election

*How a fourth-wall break is detected is covered in Technical Design.*

### Deferred Game Ideas

- **Ghost mechanic** for a killed human player — spectator view, Sibyl role, or a deathbed yes/no question before the final vote
- **Expanded Il Notaio intervention** scope

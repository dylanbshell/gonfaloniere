# Gonfaloniere
## Interface & Experience — Working Document
### Version 0.12

---

## Changes in v0.12

*Nov 14. Interface's remaining parts, (1) and (2), of the Retitling handoff, in Mechanics v0.36's words. No design changes: only the player's words.*

- **"French pension" becomes France's payroll.** `/borrow` takes one **payroll payment** and puts you **on France's payroll**; `/repay` pays one back. The sheet's "Pensions held" becomes **"Payroll payments"**, and the glossary, the command hints, the sheet's hover, and Il Notaio's private confirmations follow (The Player's Words, below)
- **"Capannello" becomes a group.** The conversation line reads **"A group with Giorgia and Lupo"** until the engine has places, and the glossary's entry is **Group**. "Colloquio" stays
- **New section, The Player's Words:** every setting-pack string the renames touch, old and new, for the build task
- Build: one small task changes the words in the setting pack (tracker)

## Changes in v0.11

*Nov 14. Interface's part (3) of the Retitling handoff (Dylan; Characters v0.15, Open Questions: Retitling), and the Friar Tommaso rename.*

- **Il Notaio keeps his name, glossed as Italian for "the notary"** (Dylan):
  - **On the opening:** his name heads the page, before he writes, with a small caption beneath it: *Italian for "the notary"* (The Opening)
  - **In his hover text,** wherever his name appears on the screen (Hover explanations)
  - **In his glossary entry,** which now starts with the gloss (Glossary Draft)
- **Friar Tommaso,** not Fra Tommaso (Characters v0.15)
- **Still to come from the same handoff** (Open Questions): "French pension" becomes being on France's payroll, and "Capannello" becomes a group. Both wait on Mechanics' wording first; then this doc changes the player's words to match

## Changes in v0.10

*Nov 14. Bookkeeping only; no design changes. Replaces PR #125, which never merged.*

- **The place list is its own build task, #132,** needing Technical Design's engine task #128, which puts every place in the player's `state`. Technical Design filed the engine on its own, so the screen half didn't go in its task as v0.9 planned. #132 also adds Lore's place descriptions to the setting pack, for the hover
- **Build State** brought up to date: the tasks filed from v0.2 to v0.10, and what each waits on

## Changes in v0.9

*Nov 14. Interface's part of the Named places handoff (Mechanics v0.35, Named Places; Lore v0.8, The Palazzo).*

- **The places are settled** (Left, The places): **eight, always listed in a fixed order,** each with who is in it. Empty ones stay, faded. Your own place is marked, and a Colloquio's place is marked private. "To come" goes
- **The names are Lore's,** written exactly as Lore gives them: "In the loggia with Giorgia and Lupo"; as a heading, "The loggia". Hovering a place shows Lore's one-line description of it
- **Places aren't clickable.** Guests move toward a person, never to a place (Mechanics), so only the portraits in a place do anything (they select)
- **Councils** show only your own council's place; midnight and the ballot show none, as the room view already did
- The tour's step 4 now points at the places
- **For Technical Design:** the screen half goes in its places task, with each place's description in the setting pack (tracker handoff)

## Changes in v0.8

*Dylan's last notes, Nov 13–14. Replaces PR #116, which never merged; v0.7 carries over except where noted.*

- **A guided tour replaces "the chat opens with Your briefing up"** (The Tour). After the choice of character, one part of the screen at a time is spotlit and explained, ending on "Start with your briefing"
- **The game holds its first line until the tour ends or is skipped.** That's Technical Design's to build (tracker handoff)
- **A midnight line in your sheet** (Left): how many acts you'll have at midnight, and the extra act an errand can earn
- **Later ideas** (Open Questions): your own midnight choices shown in the sheet afterwards, and "Choosing now" during midnight

## Changes in v0.7

*Dylan's notes from clicking around, Nov 13. Replaces PR #115, which never merged; v0.5–v0.6 carry over unchanged.*

- **The opening** (The Opening): Il Notaio writes the story of the evening on a full screen, a paragraph at a time, then the player chooses Piero or Francesco. It replaces the start screen. **The chat then opens with Your briefing up.** Lore writes the text (tracker handoff). A v2 storybook with illustrations is noted for later
- **Four modals in a row** (Briefing, rules, the city, and the glossary): a **Glossary** button joins the other three. With any modal open, the previous one shows faded on the left and the next on the right, and clicking either moves to it
- **The glossary:** an alphabetical list with a search box, and a first draft of its entries. Glossary words in the chat get a dotted underline that explains them on hover
- **Named places** (The room): every place is always listed on the left, with whoever is in it. A Colloquio sends both guests to one place picked at random. **Mechanics decides the rules,** with Lore and Technical Design (tracker handoff); until then the room view stays as it is
- **One Notes tab** (The Web of Secrets, Notes): the selection is the filter, so "All your notes" and its filter go
- **The Web of Secrets bar is centered:** ▲, the title, and the selected guests' portraits and names. "No one selected" goes
- **A portrait selects its guest wherever it appears,** like a name. **Your own name or portrait opens your briefing**
- **The right panel's card slides back down** when deselected, and clicking empty space deselects. Switching slides one card down and the next up
- **"Open in the Web of Secrets"** stays on a filled card, but not on the empty "talking with" card
- **Fixed:** the placeholder's example used "/pay", which isn't a command. Handing over money is **/bribe**

## Changes in v0.6

*Dylan, Nov 13, on v0.5 before it was merged. Replaces PR #112.*

- **The chat's selection and the Web of Secrets' selection are one** (Selection; The Web of Secrets). A guest selected anywhere shows as selected on the web's bar, and opening the web finds them already selected, with Il Notaio's reading on them. It works the other way too: what's selected in the web is what the chat highlights
- How the two-guest web and the one-guest chat fit together (Claude's defaults): a pair selected in the web stays a pair there, and the chat holds the one picked last. A new selection in the chat replaces the web's pair. Clearing either side clears both. A lore topic, which takes the chat's one selection, clears the guests too
- "Open in the Web of Secrets" on a guest's card now just opens the web, since they're already selected there

## Changes in v0.5

*Dylan's design review, Nov 13. Replaces PR #111, which never merged; v0.2–v0.4's conclusion button carries over unchanged.*

- **Il Notaio forward, but conservative** (Principles). He summarizes, narrates, and gives context from what the player already has. He never connects, infers, hints, advises, or judges. This replaces "nothing is summarized by a model"
- **The Web of Secrets** (The Web of Secrets):
  - "What you heard and saw" is **dialogue only.** Events and background are his to narrate
  - **His box sits in that column,** expanded over the dialogue with a strip peeking out at the top. A click on it or the dialogue minimizes it to the bottom, still showing his first lines
  - With nothing selected, he says nothing
  - **A ring layout with curved lines,** like the board's slide
- **The stage bar** (Centre). The time label and the track merge into one bar of joined stage circles, with the current stage stretched into an oval holding its name.
  - Hovering any other stage expands that one instead
  - **A past stage opens when clicked,** read-only, with Il Notaio's bulleted summary over it. The box stays, with Speak/Do and Pass replaced by **Return to current stage**
  - Future stages show their description on hover but can't be clicked
  - The bar replaces "Earlier tonight" for past stages
- **The example line moves into the box's placeholder,** with @ and / in it (The input box)
- **The right panel can be hidden** (Right)
- **The rules become section buttons and the city an inbox-style list;** the briefing stays a deck (Briefing, rules, and the city)
- **For Technical Design** (tracker handoff, Fable suggested): his reading's new prompt and guard, and a new past-stage summary call. The screen parts that need neither are filed as their own tasks

## Changes in v0.4

*Dylan, Nov 13, on v0.3 before it was merged. Replaces PR #110.*

- **The conclusion button shows only if the player's character has a knowledge errand** (The Web of Secrets, Notes). A conclusion exists to finish a knowledge errand by deduction (Mechanics, Human Player Input), so for a character whose errand is something else (Francesco's is a payment, so the mini-game too) no note gets the button
- **Not limited by guest,** on purpose: Piero's errand is to find out two names he doesn't know, so showing the button only on the "right" guests would point at the answer. For a character with a knowledge errand, every note on a guest or a pair keeps it
- **Needs one flag from Technical Design:** whether the player's own errand is a knowledge errand. It's not a leak; the player can read their errand. Tracker handoff. Until it lands, the button follows v0.3
- Typing `/conclude` still works for everyone (Mechanics' rule)

## Changes in v0.3

*Dylan, Nov 13, on v0.2 before it was merged. Replaces PR #108.*

- **Only notes on a guest or a pair get "This is my conclusion"** (The Web of Secrets, Notes). A conclusion is about someone, so a free note has no button. Typing `/conclude` still works at any time, as the rule says (Mechanics, Human Player Input)
- **v0.2's edge cases are confirmed** (Dylan): the set-aside message, the button disabled while a decision card waits, and for a dead player. The open question is closed

## Changes in v0.2

*Dylan, Nov 13: it wasn't clear what a note's "This is my conclusion" button does. Until now it sent the note as `/conclude` at once, while the Web of Secrets covered the chat, so the player never saw it go through, and a misclick silently replaced their last conclusion.*

- **"This is my conclusion" now hands the note to the input box instead of sending it** (The Web of Secrets, Notes): the web slides down, the box fills with the conclude command and the note's text, and **Do** is highlighted. Nothing is sent until the player presses Do (or Enter), so they can read it, edit it, or change their mind
- **Two edge cases** (Claude's defaults; Dylan to confirm): an unsent message already in the box is set aside and comes back once the conclusion runs or is cleared; while a decision card is waiting, the button is disabled, with a hover saying why
- Screen only: the browser already sends commands as typed, so Technical Design is untouched

## Changes in v0.1

*Created Nov 13 from Technical Design v0.47's Player Interface (Dylan, through the Hub's handoff). The player screen gets its own chat so Technical Design is free for the full game loop, and so the look can be worked out apart from the engine.*

- **What moved here:** the screen as the player meets it. That's the layout and panels, selection, the input box and its buttons, the decision cards, the decks, the Web of Secrets and notes, hover explanations, Il Notaio's hint, the start, death, and end screens, onboarding, the look, and the playtest findings so far
- **What stays in Technical Design:** the plumbing. That's the protocol, what the browser may receive (isolation is a hard guarantee), the human controller and how the game waits, command validation and `/conclude`'s storage, Il Notaio's reading's prompt and guard, the AI guests' side (block 5's room line, What the AI guests have instead), and how it's built (Technical Design, Player Interface)
- **No design changes.** Every rule here is as Technical Design v0.47 wrote it, so the queued screen tasks (#95, #102) stand as filed
- From now on a screen change starts here. If it needs something the browser doesn't get today, this doc hands Technical Design the plumbing through the tracker

---

## About This Document

This doc covers **the player screen as the player meets it**: what's on it, where, how it behaves, what it says, how it looks, and how a new player learns it. It also keeps **the playtest findings** and what was decided because of them.

**What it doesn't own:**

| Topic | Owner |
|---|---|
| The rules a human plays by (one message a turn, answering a direct question, commands, `/conclude`, death as a spectator, the jailbreak rule) | **Mechanics** (Human Player; Everyone Sees the Room) |
| How the software runs it: the protocol, what the screen may receive, the pause logic, command validation, Il Notaio's reading's prompt, the game record, the build | **Technical Design** (Player Interface) |
| Portraits and illustration | **Art** |
| The board's Web of Secrets slide | **Visualization & Sharing** |
| The relationship lines the web draws | **Characters** (Shared Canon: Relationships) |

**The boundary test:** if a change alters what the engine sends, decides, or records, it's Technical Design's. If it changes only what the player sees or does with what's already sent, it's this doc's. If a rule and this doc disagree, Mechanics wins; if this doc asks the screen to show something Technical Design says it may not receive, Technical Design wins.

**Words and looks live in content.** Every word the screen shows is in the setting pack, `setting/<name>/player.json` (and Il Notaio's hints and corrections in `notaio.json`). Every colour, font, size, spacing, and radius is a token in `web/theme.css`. This doc decides what they say and how they look; the files are where they live (Technical Design, The Setting Pack).

---

## Principles

**The player is just another guest.** They see exactly what their character would see and nothing more, and the AI guests can't tell a human is playing. Technical Design enforces this on the server (Player Interface): the browser only ever gets the player character's own History and State.

**First-hand only.** The screen shows what the character knows from their briefing, what's public, what they saw and heard tonight, and the player's own notes. That's the same rule the characters live under: it keeps the player and the AI guests on equal terms.

**Il Notaio narrates, but never connects** *(Dylan, Nov 13; v0.5)*. AI is good at giving people the right information at the right moment, so the screen leans on Il Notaio to do that. He's as conservative as he can be:
- **He may** summarize what the player heard and saw, narrate what happened, and give context from what the player already has: the public lore, the public relationship lines, and the player's own briefing
- **He may never** put two pieces together into something new ("they both mentioned the garden"), read anyone's mood or motive, say who's lying, suggest what to do, or hint at anything
- **Every claim about tonight quotes** the words or names the event it rests on. If that can't be checked, he gives way to a plain count. He can't invent anything
- **Labelled as his:** "Il Notaio's reading. He may be wrong." He draws only on the player's own record, as Technical Design guarantees
- He appears in two places: his box in the Web of Secrets, and his summary of a past stage. His hint under the stream stays templates only

**The player reads at their own pace.** Nothing auto-advances, and nothing moves under the player's eye while they read (Dylan, Nov 12).

**One layer at a time, clearly stacked.** The Web of Secrets sits above everything, a selected card above the "talking with" card, Il Notaio's box above the dialogue it covers, a modal over the screen, never under it. Each layer's shadow says which is on top.

---

## Build State *(Nov 14)*

1. **The mini-game is playable** as Francesco: the screen from Technical Design v0.40–v0.46 is built (#80, #81, the Hub's browser fixes #88, and v0.44–v0.46's screen #90), and the room (#95). Francesco's errand can't be done there (Friar Tommaso isn't in the cast), and the mini-game runs with `plot_reward` off
2. **Queued, screen only:**
   - #102 (Technical Design's: the errand card's reward line, the deadline mark, the hint, the midnight card's extra-act row)
   - #109: the note's conclusion button (v0.2–v0.3)
   - #113: the stage bar and past stages (v0.5; Fable suggested)
   - #114: the web's ring layout, Il Notaio's box in its column, the hideable right panel, rules buttons, the city list, the placeholder, and the shared selection (v0.5–v0.7)
   - #117: the opening and the tour, four modals with the glossary, one Notes tab, and smaller fixes (v0.7–v0.8)
   - #132: the place list (v0.9), after Technical Design's #128
3. **Waiting on Technical Design** (tracker handoff): Il Notaio's narrative reading and the dialogue-only column, the past-stage summaries, the knowledge-errand flag for the conclusion button, and the game holding its first line during the tour
4. **Then the full game,** once the full game loop is built: councils, Piero, candidate selection, speeches and `/repent`, the ballot and `/buy`, the run-off, and the full death and result screens. Dylan playing a whole game is the milestone's test (tracker, item 2)
5. **Then v1, the first public release:** Il Notaio's full player-facing role (Onboarding, below)

To try it: `npm run play -- --as "Francesco Pazzi" --minigame` (add `--fake` for no model calls).

---

## The Screen

A single page in the style of a Slack chat. Placeholder portraits until Art's are ready: initials in a circle, coloured by faction.

```
┌─────────────────┬────────────────────────────────────┬──────────────────┐
│ YOU             │ ●─●─●─(The second round)─○─○─○     │ ▔ Lupo ▔▔▔▔▔▔▔▔▔ │
│ portrait · name │ In the loggia with Giorgia, Lupo   │ Giorgia (selected│
│ purse·payroll·  │ ▸ Earlier this stage (collapsed)   │ (or a lore entry)│
│ withdrawals     │ Il Notaio: …                       │                  │
│ [Briefing]      │ Giorgia Pazzi: …                   │                  │
│ [Rules] [City]  │ Lupo (to you): …                   │                  │
│ ┌ ERRAND ─────┐ │ ┌ Il Notaio's hint ───────────────┐│                  │
│ └─────────────┘ │ └─────────────────────────────────┘│                  │
│ THE PLACES      │ [@][/] Speak as your character…    │                  │
│ Great hall ●●●  │                       [Pass][Speak]│ ⇔ resizable · ⇥  │
├─────────────────┴────────────────────────────────────┴──────────────────┤
│ ▲ THE WEB OF SECRETS (always visible; click to slide up)   ▒ shadow ▒  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Left: you

In this order *(Dylan, Nov 13)*:
- **Your sheet:** portrait, name, faction, purse, payroll payments (v0.12), Colloquio withdrawals, and **midnight** *(v0.8)*. These should read as more than a list (a purse with its count, a pension seal, tally marks for withdrawals), but how they look is settled with the look (The Look, below)
- **The midnight line** *(Dylan, Nov 14; v0.8)*: **"Midnight: 1 act (kill, guard, or watch)."** With `plot_reward` on, a second line in the errand card's words: **"+1 if you finish your errand before the last council."** Once the errand check has run, it becomes "+1 earned" or disappears. It never gives a check's result away early. The count and the reward come from what the errand card already uses
- **Your name or portrait opens your briefing** *(v0.7)*, the same as its button, at the place you left it. Its hover says "Your briefing". It's the one portrait that doesn't select its guest
- **Four buttons:** **Your briefing**, **The rules**, **The city**, and **Glossary** (Briefing, rules, the city, and the glossary, below). There's no button for the Web of Secrets, which is always at the bottom
- **The errand card,** pinned, so the errand stays in front of the player. It shows the errand's text, then its result once the check has run, in the same words as `{plot_status}`
  - **What it earns:** under the errand's text, one line in the card's accent. With `plot_reward` on: finish it before the last council before midnight, and you get one extra act at midnight (a second kill, guard, or watch, on a different guest) that no one else is told about. With it off, as in the mini-game: errands earn no extra act tonight, so the player isn't left guessing. The card's hover explanation says the same
  - **After the check,** `{plot_status}` replaces that line, so the card then says plainly whether the extra act is the player's
- **The places** *(Dylan, Nov 13–14; v0.7–v0.9; Mechanics v0.35, Everyone Sees the Room and Named Places; Lore v0.8, The Palazzo)*. Where every living guest is, place by place. Until the engine has places, this is the room view as built: each group as a cluster of tokens, a Colloquio pair as two tokens joined
  - **All eight places, always listed, in a fixed order** (Lore's): the great hall, the window bay, the anteroom, the loggia, the courtyard, the study, the painted room, the dining room. Each row is the place's name and the portraits of whoever is there. **Empty places stay, faded,** so the list never shifts
  - **The names are written exactly as Lore gives them.** As a row's heading, the first letter is capitalized ("The loggia"); in a sentence, as is ("In the loggia with Giorgia and Lupo"). The names live in the setting pack, so a reskin renames them
  - **Your own place is marked.** **A Colloquio's place is marked private** (a closed-door mark), so you see who has slipped off together, and where, without hearing them
  - **Tokens in a place overlap,** and spread out on hover. **Clicking a portrait selects that guest,** as everywhere
  - **A place itself isn't clickable:** guests move toward a person, never to a place. **Hovering a place's name shows Lore's one-line description** of it ("An open arcade on the upper floor, overlooking the courtyard"), which is public
  - **In councils,** only your own council's place is shown, with your faction in it ("The Medici council, in the study"); the rest of the hall is hidden, as the rule says. **At midnight and the ballot** the list gives way to a quiet line, since each guest chooses alone
  - The dead aren't shown
- **The conversation's members** sit in a slim line just under the bar ("In the loggia with Giorgia and Lupo"; in a Colloquio, "In the study, aside with Clarice"; until the engine has places, "A group with Giorgia and Lupo"). **End conversation** sits on that line in a Colloquio
- **Only the current conversation is open.** Earlier conversations **in the current stage** collapse into an **Earlier this stage** section above, one line each, each opening in place when clicked. Earlier stages live in the bar instead
- **Selecting a guest** opens the collapsed sections of this stage they appeared in, with their lines highlighted, and **puts a small dot on each past stage they appear in**. Deselecting clears both
- **The stream:** lines, Il Notaio's notes in their own style, action lines, and lines addressed to the player marked as such. A "…is speaking" indicator shows while a line is generated
- **A selected guest's lines are highlighted** in the stream
- **Lore links:** when a line mentions the title or alias of a **public** lore entry ("San Frediano", "1478"), the term becomes a link that opens the entry in the right panel. Anyone's line, the player's included. Relationship entries never become links. *The match is on the line's words only, never on what was in a speaker's prompt* (Technical Design; it would hint at what the model was given)
- **Decision cards** appear in the stream when the game waits for the player (Decision Cards, below). While one is open, the message box is closed
- **Il Notaio's hint,** docked under the stream (Onboarding, below)

### Past stages *(Dylan, Nov 13; v0.5)*

Clicking a past stage in the bar opens it in the chat window, read-only.
- **The stage's conversations,** everything the player was in during that stage, in order, with lore links and highlighting as in the current stage
- **Il Notaio's summary** covers the window, from just under the bar down to the input box, with a strip of the dialogue peeking out at the top. It's **mainly bullet points: what happened in that stage,** by the rules in Principles: what was said and done in the player's presence, quoted, and nothing connected or inferred
- **Clicking anywhere in the chat window minimizes his box** to the bottom, still showing his first lines, so the player can scroll the dialogue. Clicking the minimized box opens it again
- **The input box stays,** and the player can draft as usual. **Speak/Do and Pass are replaced by one button, Return to current stage,** in the same spot; Enter does the same. The draft stays in the box, and **nothing is sent until the player presses Speak or Do back in the current stage.** That's deliberate: the conversation may have moved on while they read
- **The @ and / menus** list who's here now and what's allowed now, since that's where the message will go
- **When the game is waiting for the player** (someone addresses them, or a decision card opens), the Return button and the current stage pulse, and the placeholder says so. They aren't pulled back mid-read; the game waits for them anyway
- *His summary is a model call, made once per stage and kept; how, and what it's fed, are Technical Design's (tracker handoff). Until it lands, a past stage opens on its dialogue alone*

### The input box and its buttons

The buttons do different jobs, so they look different:

| Control | Job | Looks like |
|---|---|---|
| **Speak** | Send the line | The one filled, primary button. **Active only when there's something to say:** not when the box is empty or holds only `@` or `/` |
| **Do** | Run a command | Replaces Speak when the box starts with `/`, in its own style, so a command never looks like speech |
| **Pass** | Give up the turn's message | Secondary, outlined |
| **End conversation** | End a Colloquio | With the conversation's header, away from the box, since it acts on the conversation, not the message |
| **@** and **/** | Open the guest and command menus | Small icon buttons inside the input, not peers of Speak |
| **Return to current stage** | Leave a past stage (v0.5) | Replaces Speak/Do and Pass while a past stage is open; pulses when the game is waiting |

- **The menus open and close with their character.** Typing `@` opens the guest menu and `/` the command menu. Deleting the character, Escape, or clicking away closes either
- **The command menu** lists only the commands allowed right now, each with a one-line hint (Commands, below)
- **The placeholder carries the example** *(v0.5)*: one line inviting the player to speak, with an @ and a / in it, for example *Speak as your character would… "@Giorgia A word, by the window?" or "/bribe @Giorgia 2"*. It rotates from a short list in the setting pack, using only commands allowed right now (Onboarding, below)
- **A 500-character counter** under the box

### Selection *(Dylan, Nov 12)*

In the chat view, **one thing is selected at a time:** a guest or a lore topic (a lore link). **A guest's name or portrait selects them wherever it appears** *(v0.7)*: in the stream, in the room, in the list of who's with you, and in the row of tokens under the "talking with" card. The one exception is the player's own, which opens their briefing (Left). A new selection replaces the last, clicking it again deselects it, and Escape clears it. A selected guest shows on the right, has their lines highlighted, opens their earlier conversations in this stage, and marks the past stages they appear in. A selected topic shows its lore entry on the right. **Two guests can be selected only in the Web of Secrets.** No shift-click.

**One selection, shared with the Web of Secrets** *(Dylan, Nov 13; v0.6)*. There's one selection of guests, not two:
- **A guest selected anywhere** (the stream, the room, the left, the right panel) **is selected in the web too.** The web's bar shows them, and opening the web finds them already selected, connections highlighted, with Il Notaio's reading
- **Whatever is selected in the web is what the chat shows** when the web slides down: that guest on the right, their lines highlighted, their dots in the stage bar
- **A pair:** the web can hold two guests and the chat only one. A pair selected in the web stays a pair there, and on the bar; the chat holds whichever of the two was picked last. A new selection in the chat replaces the pair with that one guest
- **Clearing** in either place (Escape, clicking the selected guest again, the card's ×, deselecting in the web) clears both. If the web drops one of a pair, the chat holds the one left
- **A lore topic** takes the chat's one selection, so it clears the guests in both places

### Right: whoever you're looking at

- **By default, whoever you're talking to** *(Dylan, Nov 13)*. The card is filled only when someone has the player's ear:
  - **In a Colloquio:** the other guest, always
  - **In a group:** the guest the player last @-addressed, or who last addressed the player (a line marked "to you"), whichever was most recent. It stays until another address involving the player replaces it, or until that guest or the player leaves the group. The player's lines that address no one don't change it
  - **Otherwise it's empty,** in a group where no one has addressed the player either way, and in councils, at midnight, and at the ballot. The empty card keeps its tint and its "Talking with" label, with a quiet line ("No one has your ear"), so the space doesn't jump
- **Two kinds of card, so they're never confused** *(Dylan, Nov 13)*:
  - **The "talking with" card** is live: it sits in the conversation's tint, is labelled "Talking with", and shows a small dot while that guest is speaking. In a group, a row of the other members' small tokens sits under it, filled or not. When covered, its header strip keeps the tint and label, so it reads as "back to the conversation"
  - **A selected guest's card** is plain: paper-coloured, raised with a shadow, labelled "Looking at", with a close control (×) that deselects
  - The differences are theme tokens (a tint, a shadow, a label style), so the chosen look restyles both
- **Selecting a guest slides their card up over** the "talking with" card, whose header (portrait and name) still **peeks out at the top,** so one click on it, or deselecting, returns to them
- **Deselecting slides the card back down** *(v0.7)*, however it's done: the ×, Escape, clicking the selected guest again, or clearing it in the web. **Clicking empty space also deselects:** the empty background of the stream or of the right panel, never a name, link, button, or the message box
- **Switching** from one guest or lore topic to another slides the current card down and the new one up right behind it, quickly enough to feel like one motion. The timing is theme tokens; with reduced motion set, the cards fade instead
- **Resizable:** a drag handle on the panel's left edge sets its width, between a minimum and a maximum, remembered in the browser
- **Can be hidden entirely** *(v0.5)*: a control on its edge hides it to a thin strip with a handle, and the chat widens. Clicking the handle brings it back. Hidden or shown is remembered in the browser. **Selecting a guest doesn't reopen it;** the handle shows the selected guest's small portrait, so the player knows someone is selected
- **What it shows is public and fixed:** portrait, name, faction, public subtitle, and the public facts everyone knows at the start (the public relationship lines). Never what the player has learned; that's the Web of Secrets' record
- **A lore link** opens its entry here, with a way back. **Public lore is seen in exactly two ways** (Dylan, Nov 12): from a lore link, here; otherwise by browsing The city. The right panel never browses lore, and The city never opens from a link
- **"Open in the Web of Secrets"** *(v0.6–v0.7)*: on a selected guest's card, and on the "talking with" card **only when it has someone**. It opens the web with that guest selected. From the "talking with" card that also makes them the selection, which the bar alone can't do. The empty "talking with" card has no button

### Briefing, rules, the city, and the glossary *(v0.5–v0.7)*

Each opens as a modal over the screen, never under it, and none of them is a wall of text.

**Four modals in a row** *(Dylan, Nov 13; v0.7)*. In this order: **Your briefing, The rules, The city, Glossary.**
- With one open, **the previous one shows to its left,** with its left side faded out, and **the next one to its right,** with its right side faded out
- **Clicking either moves to it,** sliding the row along. Your briefing has nothing to its left, and the glossary nothing to its right
- Each remembers its place (the briefing's card, an open rules section, an open city entry, a search), and Escape closes the modal
- The arrow keys still turn the briefing's cards, so moving between modals is by clicking

**Your briefing stays a card deck.** One topic per card: Who you are, How you speak, Your errand, Your faction, What you know, Your secrets, Relationships, and **Your past** (the character's private lore).
- **Clicking anywhere on the card** swipes it left to the next topic. A separate back control goes back, and the arrow keys work too
- Tabs along the top show where you are and jump
- It remembers its place, and nothing auto-advances

**The rules are a set of buttons,** one per section of the rules primer, filling the modal. Clicking one **grows it to fill the modal,** showing that section; an **×** shrinks it back to the buttons.

**The city is a list,** scrolled like an inbox. One row per public lore entry, each with its title and a one-line preview, grouped under subject headers. **Clicking a row opens the entry in the modal,** with a back arrow to the list. Relationship entries aren't in it; they're for the AI guests.

**The glossary** *(Dylan, Nov 13; v0.7)* is for looking up one word, so:
- **Alphabetical, one entry per term:** the term in bold and a one- or two-line plain definition
- **A search box at the top** filters the list as you type
- **"More in the rules"** under an entry with a rules section behind it opens that section in the rules modal, so the glossary stays short
- **In the chat, glossary words get a faint dotted underline,** and hovering one shows its definition in place. It's not a link and clicking does nothing. Where a word is both a lore title and a glossary term, the lore link wins
- Its words live in the setting pack, so a reskin has its own. Amounts come from the game's tuning values, not typed into the entries
- **First draft of the entries** (Glossary Draft, near the end)

### The Web of Secrets *(Dylan, Nov 12–13)*

The web of relationships, plus the player's own record and notes.
- **Always there:** a raised bar along the bottom of the screen, with a shadow, so it reads as one layer above everything. **Its contents are one centered group** *(v0.7)*: a small ▲ (▼ when open), the title, and, only when someone is selected, a dot and the selected guests' small portraits and names ("▲ The Web of Secrets · Giorgia & Lupo"). With no one selected it's just the arrow and the title. **Clicking the bar** slides it up to about nine-tenths of the window's height, leaving the top of the screen in view; clicking the bar again, or Escape, slides it down
- **Up to two guests can be selected inside it:** a click selects a first and then a second guest, a third replaces the older, and clicking a selected guest deselects it. **The selection is shared with the chat** (Selection): a guest selected in the chat arrives here already selected, and the bar shows them while the web is down
- **The web:** all twelve guests as a relationship diagram, **laid out like the board's Web of Secrets** (Visualization & Sharing, The Board, slide 7) *(v0.5)*. The guests sit in a ring, each faction together, with **an arc in the faction's colour** around its part of the ring and the faction's name at its corner. **Lines curve through the middle** rather than running straight. **Its lines are fixed:** the public connections, plus those the player's own briefing gives them, marked as theirs. The game never draws a new line
- **Colour-coded lines and a key:** each relationship type has its own colour, and a line style for those who can't tell colours apart. A **collapsible key** on the web's left lists the types; clicking one highlights every line of that type, and clicking it again clears it. The six types (romance, kin, service, alliance, rivalry, money) and their colours are fixed (Technical Design, The Web of Secrets; `relationships.json`). The colours are theme tokens (`--rel-<type>`), different in lightness as well as hue. The player's own note lines stay dashed, in their own style
- **One guest selected:** their connections highlighted, and the **What you heard and saw** column: **their lines in your presence, newest first, and nothing else** *(v0.5)*. No events, relationships, or background; those are Il Notaio's to narrate
- **Two guests selected:** their connection, and **what you heard pass between them**, dialogue only
- **Nothing selected:** the column shows a single line asking the player to pick a guest, and Il Notaio says nothing
- **Labelled honestly:** "what you heard", never "everything they've said". Two guests' private talk is never in it

**Il Notaio's reading** *(Dylan, Nov 13; v0.5)*. His box lives **inside the What you heard and saw column,** styled like his hint in the stream.
- **Expanded by default:** it fills the column, covering almost all the dialogue, with **a strip of the dialogue peeking out at the top**
- **Clicking his box or the dialogue behind it minimizes it** to the bottom of the column, still showing his first lines, so the player can read the dialogue. Clicking the minimized box expands it again
- **What he writes, in paragraphs:** for a guest, what the player has heard and seen of them tonight, including the events they witnessed (payments, Colloquios, a death), and context from the public lore, the public relationship lines, and the player's own briefing. For a pair, the same about the two of them and what has passed between them. All by the rules in Principles: he narrates and gives context, and never connects, infers, or hints
- **Labelled:** "Il Notaio's reading. He may be wrong."
- **Every claim about tonight quotes** the words or names the event it rests on. If a quote can't be checked, the box shows the plain tally instead ("You've heard them speak 4 times; you saw one payment")
- It's written on a new selection once the web is open, and stays until something new enters that selection's record
- *What it's fed, the prompt, the guard, and how it's recorded are Technical Design's (Player Interface, Il Notaio's reading). v0.5's narrative with background and events needs a new prompt and guard (tracker handoff); until then the box shows today's reading in its new place*

**Notes** *(Dylan, Nov 12)*. Written in the Web of Secrets, and attached the way its selection works:
- **One guest selected:** a note about them. **Two:** a note about the pair, drawn on the web as the player's own dashed line, styled apart from known connections. **Nothing selected:** a free note
- **One Notes tab** *(Dylan, Nov 13; v0.7)*: the writing box at the top ("A note on Giorgia", "A note on Giorgia and Lupo", "A free note"), and below it **one list of the player's notes, newest first, filtered by the selection:**
  - **No one selected:** every note, grouped by guest and pair, free notes included
  - **One guest:** notes on them, and on any pair that includes them
  - **A pair:** notes on the pair first, then on each of the two, under small headings
  - Clicking a note's guest or pair in the full list selects them, so the list narrows and the web highlights them. Clearing the selection shows everything again. There's no separate "All your notes" tab or filter; the selection is the filter, and it's shared with the chat
- **A note on a guest or a pair can become a conclusion** *(v0.2–v0.4; Dylan, Nov 13)*. A conclusion exists to finish a **knowledge errand** by deduction, so the button shows only where it can mean something:
  - **Only if the player's character has a knowledge errand** (Piero does; Francesco's errand is a payment, so he never sees it, nor does the mini-game). The screen learns this from a flag Technical Design sends (tracker handoff); until it does, the button follows the next rule alone
  - **Only on notes about a guest or a pair,** since a conclusion is about someone. A free note has none
  - **Never filtered by which guests matter to the errand.** Piero's errand is to find out two names he doesn't know, so a button only on the "right" guests would point at the answer. Concluding about the wrong pair is a mistake he's allowed to make
  - Typing `/conclude` still works at any time, for everyone (Mechanics, Human Player Input)

  **What the button does.** "This is my conclusion" doesn't send anything itself. It hands the note to the input box, so the player sees what they're concluding before it counts:
  1. The Web of Secrets slides down, as if its bar were clicked. Its selection is kept for when it reopens
  2. The box fills with the conclude command's name and the note's text (`/conclude <the note's text>`), with the cursor at the end, so it can be edited
  3. **Do is highlighted** (a theme token: a ring or glow in the accent) until it's pressed, or until the box no longer starts with `/`. Do or Enter runs it as any `/conclude`; the usual private confirmation then shows in the stream
  - **An unsent message already in the box** is set aside, and comes back to the box once the command runs. If the player clears the conclusion without running it, the set-aside message comes back too
  - **While a decision card is waiting** (the box is closed), the button is disabled, with a hover saying to finish the choice first
  - **For a dead player** it stays disabled, as now, since a spectator can't act
  - The button's hover says that only the latest conclusion counts, so a new one replaces the last
- Notes themselves are never judged and never reach a prompt
- A refresh keeps them (they're kept on the engine; Technical Design)

### Hover explanations *(Dylan, Nov 12)*

Every control and panel has a short explanation on hover or focus. A switch in an obvious place turns them off, remembered in the browser. They're on by default.

**Il Notaio's name** *(Dylan, Nov 14; v0.11)*, wherever it appears (his notes and announcements in the stream, his hint, his reading in the Web of Secrets, the tour's cards), has its own hover: *Il Notaio: Italian for "the notary". He records the evening and belongs to no faction.* It shows even with hover explanations switched off, since it explains a name rather than a control. The words come from the setting pack.

---

## Decision Cards

When the game waits for one of the player's choices, a card appears in the stream and the message box closes. *What each card offers, and when the game pauses, are Technical Design's (How the game waits for the player) and Mechanics'; this is how the cards present it.*

- **Movement window:** stay, move toward a guest, or call a Colloquio with a guest, from every living guest. Leaning: three choice tiles (Stay, Join, Colloquio) with a guest picker below (The Look)
- **Seat choices:** as an invitee when a Colloquio ends, join a group with room or call a free Colloquio (or wait, only when no group has room); as a lone guest, join a group with room. The groups are shown with their guests named
- **Midnight:** one act (kill, guard, or watch) and a living guest. **When the errand earned it, the extra act is its own optional row,** labelled "Your extra act (for your errand)". The same checks as an AI guest's answer apply: different targets, and no guarding yourself
- **Full game only:** candidate selection, the speech if they're the candidate, the ballot (vote and buy), and the run-off. Their cards wait on the full game loop's spec (Open Questions)

---

## Speaking and Waiting, as the Player Meets Them

*The timing rules are Technical Design's (How the game waits for the player); this is what the player sees of them.*

- **In a group or council, the box is always open.** A message sent is held and spoken at the next break between lines, never cut into one. The box then says the turn's message is used until the next turn. **Pass** gives it up
- **When someone addresses the player,** the game waits for them, and the line is marked "to you". The answer never uses the turn's message, and passing is always allowed
- **Addressing someone:** @-mention a guest present, in a group, and they must answer next. The @ isn't shown in the stored line, which reads "(to Name)" like anyone's
- **In a Colloquio,** the guests take turns and the game waits for each of the player's lines. **End conversation** ends it at any time; the other guest gets one closing line. If the other guest ends it, the player is asked for one closing line, which they can pass

---

## Commands, as the Player Meets Them

*Which commands exist and when they're allowed are Mechanics' rules; validation is Technical Design's (Commands).*

- **Typed, or from the command menu,** which lists only what's allowed right now, each with a one-line hint. Midnight's acts can also be chosen on the midnight card
- **Do,** not Speak, runs a command, so a command never looks like speech. Commands don't use the turn's message
- **A refused command** is answered privately with its reason (mistimed, not allowed, can't afford it, unknown guest, not present). In v1, Il Notaio explains it in his voice (Onboarding)
- **`/conclude`** is private and never spoken. From a note, "This is my conclusion" fills it into the box, ready for Do (v0.2; The Web of Secrets, Notes)
- **Words in `<>`** in a command count toward nothing and are never spoken

---

## The Opening *(Dylan, Nov 13; v0.7)*

Il Notaio introduces himself as the narrator before the player meets anyone.
- **His name heads the page, glossed** *(Dylan, Nov 14; v0.11)*: "Il Notaio", with a small caption beneath it, *Italian for "the notary"*, shown before he starts writing and kept at the top while he writes. The name and the caption come from the setting pack
- **Full screen, on its own.** He writes the story leading up to the evening, **paragraph by paragraph, a character at a time,** as if by pen. Fixed text from the setting pack, **not a model call**
- **Each paragraph follows the last by itself** after a short pause; earlier paragraphs stay on the page, so nothing the player is reading moves away. **Clicking finishes the paragraph being written.** A small **Skip** control writes everything out at once, for players who have seen it
- **At the end, the choice:** one card per playable character, Piero and Francesco in the full game, Francesco alone in the mini-game. Each shows the portrait, name, faction, and the briefing's public subtitle. Choosing one starts the game, and **the tour begins** (The Tour, v0.8)
- **His last paragraph carries the orientation line** in his voice: speak as your character would, plainly; guests react to strange talk as guests would
- **Public only:** the story gives away no one's secrets. **Lore writes it, and Characters canon-checks it** (tracker handoff). Until it's written, the opening holds only the orientation paragraph
- The writing speed and the pause are theme tokens. With reduced motion set, each paragraph appears whole
- **Later, maybe v2:** a storybook opening with illustrations, more interactive, with Art (Open Questions)

---

## The Tour *(Dylan, Nov 13; v0.8)*

Right after the choice of character, a short guided tour, in the manner of many websites.
- **One part of the screen at a time is spotlit,** the rest dimmed. A small card beside it explains what it does, **in Il Notaio's voice,** styled like his hint
- **Clicking anywhere moves on.** A Back control goes back, and every step has **Skip tour**
- **The steps, in order:**
  1. Your sheet
  2. The four modal buttons (Your briefing, The rules, The city, Glossary)
  3. Your errand card
  4. **The places,** with a word on how a Colloquio takes two guests off to an empty one
  5. The stage bar
  6. The conversation and the message box, with @ and /
  7. The right panel
  8. The Web of Secrets bar
- **It ends on the Your briefing button:** "Start with your briefing." Clicking it opens the briefing and ends the tour
- **It runs once,** remembered in the browser. A **Show me around** control beside the hover-explanations switch runs it again
- **The game waits for it.** The game loads, so the tour has the player's sheet, errand, and room to point at, but **holds its first line until the tour ends or is skipped.** That's Technical Design's to build (tracker handoff); until it is, the evening starts while the player tours
- Its words live in the setting pack. With reduced motion set, the spotlight jumps rather than glides

---

## Start, Death, and End

- **The opening** replaces the start screen (The Opening, below). The player chooses their character at its end, and **the tour begins** (The Tour)
- **Death:** the box and the cards close, and a banner says the character has died. As a **spectator** the player sees only Il Notaio's city-wide announcements through to the result (Mechanics). The web, the record, and the notes stay open. Then the end screen
- **End screen:** the outcome as Il Notaio announces it, whether the player won (their character's win condition, alive or dead), and their errand's result. Then **Open the full replay,** this game's replay with every character's inner life. In the mini-game, which has no election, it shows who died at midnight and the errand results

---

## Onboarding

How a new player learns the game without a tutorial up front.

- **The example lives in the box's placeholder** *(v0.5)*, plain and period-fitting, with an @ and a / in it, rotated from a short list in the setting pack. It shows the register and both menus without a rule to read: plain English, no "thee", no flourish
- **An orientation line:** speak as your character would, plainly; guests react to strange talk as guests would. The last paragraph of the opening (v0.7)
- **The opening itself** introduces Il Notaio as the narrator (The Opening), and **the tour** shows the player the screen (The Tour)
- **The glossary's dotted underlines** explain the game's words where the player meets them (v0.7)
- **Il Notaio's hint** *(Dylan, Nov 12)*. A small docked box under the stream, collapsible. He says in a line or two what the moment asks of the player: the first council, the movement window, being called aside, midnight, the ballot, or a refused command. **With `plot_reward` on, also the start of the last round before the errand's deadline:** the last round to finish the errand for its extra act. It shows whether or not the errand is done, so it never gives a check's result away early. It also points to the hover explanations. Templates only, from `notaio.json`, no model calls. **Styled clearly apart from his announcements:** the announcement is the notary speaking to the room, the hint is him speaking to the player
- **Hover explanations** (The Screen, above)
- **Il Notaio's reading and past-stage summaries** (Principles) do much of what a tutorial would: they tell the player what they've seen, when they look

**Il Notaio for the player in v1** (Mechanics, Il Notaio — Player-Facing Duties; not needed for the milestone):
- **Orientation:** the hint above covers it in the milestone build. Originally: short private notes at the first council, the first movement window, the first Colloquio, midnight, and the ballot (in the mini-game: the first movement window, the first Colloquio, and midnight), each shown once
- **Questions:** the player can @-mention Il Notaio at any time to ask about the rules or the state of the game, as a private aside: nothing is spoken and the game doesn't pause. He answers briefly in his voice, and says so if he doesn't know. *The call, and what it may see, are Technical Design's*
- **Corrections:** every refusal explained in his voice, one template per reason
- **The jailbreak warning:** the first hit is a private warning (Mechanics, Jailbreak Rule; Technical Design, Jailbreak Detection)

---

## The Player's Words *(v0.12)*

The setting pack's player-facing strings the retitling touches (Mechanics v0.36). The keys stay as they are, since code reads them; only the words change. Strings that reach an AI guest's prompt aren't here: the Embassy's ledger lines in `notaio.json` and the factions' `pension` roles in `setting.json` are Technical Design's.

| Where | Was | Now |
|---|---|---|
| `player.json` › `commands.borrow.hint` | Accept one French pension of {amount} {currency}. | Go on France's payroll: take one payment of {amount} {currency} from the Embassy. |
| `player.json` › `commands.repay.hint` | Renounce one French pension, your own or a relative's, for {amount} {currency}. | Pay back one payroll payment, your own or a relative's, for {amount} {currency}. |
| `player.json` › `refusals.pension_refused` | You hold no pension you could renounce for {holder}, or can't pay it back. | You have no payroll payment you could pay back for {holder}, or can't afford it. |
| `player.json` › `screen.pensions` | Pensions held | Payroll payments |
| `player.json` › `screen.capannello` | Capannello with {others} | A group with {others} |
| `player.json` › the sheet's hover | Your character: your purse, the French pensions you hold, and how many times tonight you've drawn someone aside for a private word. | Your character: your purse, the payments you've taken from France's payroll, and how many times tonight you've drawn someone aside for a private word. |
| `notaio.json` › `pension_taken` | You accepted a French pension of {amount} {currency}. Your purse: {purse} {currency}. | You took a payment of {amount} {currency} and are now on France's payroll. Your purse: {purse} {currency}. |
| `notaio.json` › `pension_renounced` | You renounced the French pension held by {holder}: {amount} {currency} returned to the Embassy. | You paid back a payroll payment for {holder}: {amount} {currency} returned to the Embassy. |
| `notaio.json` › `pension_refused` | Your attempt to renounce a pension for {holder} failed: no such pension that you can repay. | Your attempt to pay back a payroll payment for {holder} failed: there's no such payment you can repay. |

`pension_refused_self` stays "yourself". The glossary's entries are in Glossary Draft.

---

## The Look *(undecided; Dylan, Nov 10)*

- **Three directions** are on a [design canvas](https://claude.ai/artifact/MgVNN1NijQxXrbuy56Tof2): a "palazzo ledger" (parchment and ink, serif type), a dark modern chat, and a clean light style with period accents
- **Leaning:** the palazzo ledger, with **rounded corners** rather than square boxes, and the movement card as three choice tiles with a guest picker below, in the ledger's styling. Decide after the first playtests
- **Applied through the theme file only.** The first build is plain and neutral; a chosen look is applied by editing `web/theme.css`, not the components. The card styles above (tint, shadow, label), the relationship colours, and the faction colours are all tokens
- **To settle with the look:** how the sheet reads as more than a list (purse, payroll seal, tally marks), the two card kinds, the hint versus the announcements, and the Web of Secrets' bar
- **Portraits** are Art's; until they're ready, initials in a faction-coloured circle

---

## Playtest Findings

What each playtest decided, and where it now lives in this doc. Technical Design recorded the decisions, not always the problem behind them, so a "why" is given only where one was written down. New playtests are logged here in full: what Dylan found, then what was decided.

**Playtest 1** (Dylan, Nov 12; Technical Design v0.40–v0.43):

| Decision | Why, where recorded | Here |
|---|---|---|
| First-hand only: nothing summarized or inferred by a model | Keeps the player and the AI guests on equal terms; the screen can't show anything false | Principles (since v0.5, Il Notaio narrates but never connects) |
| Everyone sees the room, AI guests too (a Mechanics rule since v0.32) | Without it a human can't follow the evening | The Screen, Left |
| The web and the record, then notes on a guest, a pair, or free | | The Web of Secrets |
| Only the current conversation is open; the rest collapse into Earlier tonight | The current room is never confused with the last | Centre (since v0.5, past stages live in the stage bar) |
| Buttons look different by job | | The input box |
| Card decks, one topic per card, no auto-advance | People read at different speeds, and a moving page loses your place | Briefing, rules, the city, and the glossary (since v0.5, only the briefing is a deck) |
| **Bug:** decks slid under the chat box | Fixed: decks open over the screen | Briefing, rules, the city, and the glossary |
| **Bug:** the command menu stayed open after its slash was deleted | Fixed: menus open and close with their character | The input box |
| Il Notaio's hint and hover explanations | | Onboarding |
| One selection at a time in the chat view; two only in the web | | Selection |
| Lore is seen two ways: a link opens it on the right, browsing is only The city | | Right |

**Playtest 2 notes** (Dylan, Nov 13; Technical Design v0.44–v0.47; the Hub's five browser fixes were #88):

| Decision | Why, where recorded | Here |
|---|---|---|
| The Web of Secrets: an always-visible raised bar along the bottom | | The Web of Secrets |
| Six colour-coded relationship types, a key, faction labels | | The Web of Secrets |
| Il Notaio's reading, guarded | Dylan's choice over templates or an unguarded call | The Web of Secrets |
| The evening's track | | Centre |
| Stacked cards on the right, with a peek back; a resizable panel | | Right |
| Two kinds of card, "Talking with" and "Looking at" | | Right |
| The "talking with" card is filled only when someone has the player's ear | Before, a group showed its last speaker, which changed on nearly every line | Right |
| The left column's order: sheet, deck buttons, errand, room | | Left |
| The errand's reward shown on the card, the track, the hint, and the midnight card | Make it clear that finishing the errand earns an extra act at midnight | Left; Centre; Decision Cards |

**Notes after v0.1** (Dylan, Nov 13):

| What Dylan found | Decision | Here |
|---|---|---|
| Unclear what a note's "This is my conclusion" button does | It fills the box with the conclusion and highlights Do, rather than sending at once (v0.2) | The Web of Secrets, Notes |
| A conclusion only means something about a guest or a pair | Free notes get no conclusion button (v0.3) | The Web of Secrets, Notes |
| A conclusion only means something for a character with a knowledge errand | The button shows only for those characters, never filtered by guest, which would give the answer away (v0.4) | The Web of Secrets, Notes |

**Design review** (Dylan, Nov 13; v0.5):

| What Dylan asked | Decision | Here |
|---|---|---|
| Make the screen Il Notaio forward: AI is good at the right information at the right time | He narrates, summarizes, and gives context, but never connects or hints | Principles |
| His box inside What you heard and saw, which holds only dialogue | Expanded over the dialogue, minimizes on a click; events and background are his | The Web of Secrets |
| Curved lines, like the board's slide | The slide's ring layout with faction arcs | The Web of Secrets |
| Fold the example line into the box's prompt | The placeholder carries it, with @ and / | The input box |
| One bar for the label and the stages, like the board's roadmap | The stage bar: an oval for the current stage, hover to expand others | Centre |
| Open past stages, with Il Notaio's summary over them | Read-only, bulleted summary, click to minimize | Past stages |
| Keep the box in past stages, but you can't send there | Speak/Do and Pass become Return to current stage; the draft waits | Past stages |
| Hide the right panel entirely | A hide control and a handle | Right |
| Rules as buttons; the city as a scrolling list | Section buttons that grow; an inbox-style list | Briefing, rules, the city, and the glossary |
| Connect the chat's selection to the web's (v0.6) | One shared selection; a pair stays in the web, the chat holds the one picked last | Selection |

**Clicking around** (Dylan, Nov 13; v0.7):

| What Dylan found or asked | Decision | Here |
|---|---|---|
| "Open in the Web of Secrets" on the empty "talking with" card does nothing the bar doesn't | Only on a card with someone on it | Right |
| The Web of Secrets bar's text looks lopsided | One centered group: ▲, title, selected guests | The Web of Secrets |
| Clicking a portrait in the list of who's with you doesn't select | A portrait selects wherever it appears; your own opens your briefing | Selection; Left |
| Wanted separate locations, all visible | Named places, always listed; a Colloquio goes to a random place. Mechanics decides | Left, The room |
| Combine "Notes" and "All your notes" | One tab, filtered by the selection | The Web of Secrets, Notes |
| A glossary | A fourth modal, searchable, with dotted underlines in the chat | Briefing, rules, the city, and the glossary |
| The right panel's card just disappears | It slides down; switching slides one down and the next up | Right |
| An opening from Il Notaio | Written out a paragraph at a time, then the choice of character; the chat opens on the briefing | The Opening |
| Previous and next modals in view | Four modals in a row, faded at the edges | Briefing, rules, the city, and the glossary |

**Last notes** (Dylan, Nov 13–14; v0.8):

| What Dylan asked | Decision | Here |
|---|---|---|
| A guided tour instead of opening on the briefing | Spotlit steps in Il Notaio's voice, ending on "Start with your briefing"; the game waits for it | The Tour |
| The room step will be the places | Step 4 points at the places | The Tour |
| Midnight actions in the sheet | How many acts you'll have, and the errand's extra one | Left |

**Named places settled** (Mechanics v0.35, Lore v0.8; v0.9):

| Settled elsewhere | Decision here | Here |
|---|---|---|
| 8 places, one conversation each, all visible (Mechanics) | All eight listed in Lore's order, empty ones faded, yours marked, a Colloquio's marked private | Left, The places |
| Guests move toward people, never to a place (Mechanics) | Places aren't clickable; their portraits select; hover shows Lore's description | Left, The places |
| Councils held in random places; the room hidden then (Mechanics) | Only your council's place shows | Left, The places |
| The eight names (Lore) | Used exactly as written; capitalized only as a heading | Left, The places; Centre |

---

## Open Questions

- **The look:** the palazzo ledger is the leaning; decide after the first playtests (The Look)
- **Your midnight choices in the sheet afterwards** ("You guarded Giorgia; you watched Lupo"), and **"Choosing now"** during midnight: ideas for later, not decided (Dylan, Nov 14: the count is what's wanted for now)
- **A storybook opening, maybe in v2** (Dylan): illustrations and more interaction, with Art. Until then, Il Notaio's written opening
- **Does the full game's stage bar fit?** It has about fifteen stages to the mini-game's handful. If the circles get too small to read, consider grouping each council with its round of mingling. Check on the first full game
- **Is Il Notaio conservative enough?** Read his readings and summaries in the first playtests for anything that connects or hints, and tighten the guard with Technical Design if so
- **The full game's cards:** candidate selection, the speech, the ballot (vote and buy), and the run-off. Design them once Technical Design's full game loop spec says what each phase offers
- **Does the player wait too long?** The whole game pauses for the player, and a group line takes a few seconds. Measure how long a played game takes; if it drags, look at what the screen can show while the player waits. *(Moved from Technical Design's open questions)*
- **A previewed "polish" for off-register input:** not now. It would cost a model call and a wait per message, and make the player's words not quite theirs. Add it only if a playtest shows casual input pulling the AI guests casual (Models & Research watches that). If added, it's always previewed and never silent, and Technical Design builds the call
- **The board's slide versus the screen's web:** the screen uses six relationship types where the board's slide uses four categories. Visualization & Sharing may align the slide; nothing waits on it (tracker)

---

## Glossary Draft *(v0.7; for the setting pack)*

A first draft of the glossary's entries, from Mechanics v0.34, in the in-world names. Numbers here are today's tuning values; the setting pack fills them from the game's values, so tuning never leaves an entry wrong. Lore may refine the in-world wording (Gonfaloniere, the factions). Terms that only matter in the full game are marked †; the mini-game can leave them out.

| Term | Definition |
|---|---|
| **Ballot** † | The secret vote that ends the evening. Every living guest casts one vote for any living guest, and may buy extra votes for that guest at 5 Florins each. Most votes wins; Il Notaio names only the winner |
| **/bribe** | Hand Florins to the guest you're alone with in a Colloquio. Whatever they promise in return is up to them |
| **/borrow** | Go on France's payroll: take one payroll payment of 3 Florins from the Embassy's treasury. Medici and Pazzi only |
| **Candidate** † | The one living guest each of the two great houses, Medici and Pazzi, puts forward for Gonfaloniere |
| **Group** | An open conversation of two to four guests. Anyone may join while it has room, and only those in it hear what's said |
| **Colloquio** | A private conversation between two guests. No one else can join or hear. Calling one uses your move, and the guest you call can't refuse, but everyone sees the two of you slip away |
| **/conclude** | Privately record what you've worked out, for an errand that asks you to find something out. Only your latest conclusion counts |
| **Council** | A private meeting of your own faction. Nothing is shared unless someone says it aloud |
| **Dominicans** | The friars' faction. They can't go on France's payroll. They win if the guest elected Gonfaloniere has repented |
| **Errand** | Your character's own task tonight, in your briefing. Your errand card says what finishing it earns |
| **Florins** | The evening's money. Everyone starts with 10 and receives 1 at the start of each round of mingling. Purses are private |
| **French Embassy** | France's faction. It keeps the treasury that pays France's payroll, and knows who is on it. It wins if anyone in the elected candidate's family is on France's payroll |
| **France's payroll** | Taking a payroll payment, 3 Florins from the French Embassy, puts a guest on France's payroll. If anyone in the winning candidate's family is still on it at the ballot, France wins. Who is on it is private unless someone tells |
| **Gonfaloniere** † | The office the evening decides: the head of Florence's government. Only a Medici or a Pazzi can stand |
| **Guard** | A midnight act. A guest guarded by two or more others survives an attack |
| **Il Notaio** | Italian for "the notary": the one who records the evening. He notes who joins, leaves, and slips away, and announces what all the city hears. He belongs to no faction |
| **Kill** | A midnight act. It's carried out unless the killer was watched by two or more guests, or the target guarded by two or more. Killers are never named |
| **Medici** | One of the two great houses, competing for Gonfaloniere. They win if their candidate is elected, unrepentant, with no one in the family on France's payroll |
| **Midnight** | When each living guest secretly chooses one act: kill, guard, or watch, each on a different guest. Il Notaio then announces who died, never who killed them |
| **Move** | Your turn to change company, when it comes: stay, join another guest's group, or call a Colloquio |
| **Pazzi** | The other great house, competing for Gonfaloniere, on the same terms as the Medici |
| **/repay** | Pay back one payroll payment, yours or a relative's, by returning 3 Florins, any time before the ballot. Private |
| **/repent** † | A candidate's public confession during the speeches. It can't be taken back, and it makes the Dominicans' win their own |
| **Round of mingling** | Open play, when guests form groups, move, and call Colloquios |
| **Run-off** † | If the ballot ties, one fresh vote among the tied guests, with no buying. A second tie is decided by lot |
| **Speeches** † | Each candidate addresses the city, and others may speak. The only time a candidate can repent |
| **Watch** | A midnight act. A guest watched by two or more others can't carry out their kill. The watchers learn nothing |
| **Web of Secrets** | Your record of who is tied to whom, what you've heard of each guest, and your notes. The bar at the bottom of the screen |

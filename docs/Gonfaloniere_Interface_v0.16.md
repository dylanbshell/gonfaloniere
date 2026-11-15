# Gonfaloniere
## Interface & Experience — Working Document
### Version 0.16

---

## Changes in v0.16

*Nov 15. Dylan's review of the demo page, comment by comment, over two sessions. Each change was tried in the demo first, then written here. Also takes two handoffs from Mechanics: "Rounds reordered, and phase lengths set" (Mechanics v0.37, the stage bar and the first-council note) and "Commands the player can't use yet are invisible". Detail in the sections named; the full record is in Playtest Findings, Demo review.*

**The words** (The Player's Words; Explanations):
- **"Secret conversation"** is the screen's one name for a Colloquio (Dylan). It replaces "call aside", "withdrawn", "a private word", and "a private talk" wherever the player is told something or acts. The glossary keeps **Colloquio** as the game's term and defines it as a secret conversation; Il Notaio's notes to the room keep his own formal voice
- **"Payments from France"** labels the sheet's payroll line; the rules and the glossary keep "France's payroll"
- **The Web of Secrets is now the Web of Confidences** (Dylan): "Web of Confidences" as a title or label, "the Web of Confidences" in a sentence. Other docs name it too (tracker handoffs)
- **Plain directions** (Dylan): wherever the screen or Il Notaio tells the player what to do, the words are plain, never ornate ("Your turn: speak or pass."). His notes to the room keep their register
- **Every explanation, and the tour, in plainer, shorter English** (Dylan): short sentences, everyday words, one idea at a time. A few were out of date and are corrected (Explanations)
- **Midnight's act is "for midnight"**, not "for tonight"
- **The errand card shows just the task;** its reasons stay in the briefing (Left)
- **Il Notaio's boxes are labelled with his name alone** (Dylan): "He may be wrong." goes from his reading and his summaries (Principles)

**The left panel:** "You are Francesco Pazzi" over a role line ("head of the Pazzi family"), with no "You" label and no ring. Each line of the sheet opens the rules where it's explained. The errand card opens the briefing at the errand, and its reward line opens the rules. Your own portrait in the places selects you. "You are here" sits under the place's name (Left).

**The centre:**
- The stage bar and the message box float as rounded cards with shadows, and the conversation fades where it slides under them
- **The stage bar shows the full evening** (Mechanics v0.37): eleven stages, mingling before each council, no private-plan steps. It's a standard step bar again, with a tooltip under the hovered stage and no motion (Centre, The stage bar)
- **Decision cards take the message box's place,** instead of appearing at the end of the conversation (Decision Cards)
- **Over the box:** the prompt at the left, **"Your next move: in 3 turns"** at the right, and the character count above the buttons. **End conversation** also sits under Speak and Pass, and both End buttons are red (The input box)
- **Il Notaio's hint** flashes when he says something new, explains a refused command in plain words, says when a chance to move was missed, and steps aside while an earlier stage is open (Onboarding)

**Past stages:** Il Notaio's summary opens a fifth of the way down, and what's behind it fades until it's minimized. With a decision waiting, the bottom card is one wide Return button (Past stages).

**The right panel:** stops short of the top with rounded corners, and dragging it past its narrowest hides it. Your own card says "This is you". No card repeats the faction above the subtitle, and the "talking with" card loses its row of tokens (Right).

**The modals:** Previous and Next footers that chain the four modals, slides that reverse going back, highlights that point the way you're going, and subtler motion. Each starts from its beginning when you move to it. **The briefing is five cards for the player**: the cards meant for the AI guests are left out, and short ones that belong together are merged (Briefing, rules, the city, and the glossary).

**The Web of Confidences:** a fixed ring (the first guest at half past nine), a web that fills its space, faded lines around a selection, one line per pair and type, **the halo marking only secret ties**, a selectable "Secret" row in the key, a key and a side column that scale with the window, and notes always listed and grouped. It slides more slowly and sits over everything (The Web of Confidences).

**Commands** (Mechanics' handoff): the command menu lists every command the character can ever use. What's open now comes first; the rest wait in a folded section, each with its reason ("Only in a secret conversation."). A refused command gets its specific reason from Il Notaio (Commands).

**The opening** writes a phrase at a time and fast-forwards on a click; the full game's other playable character shows greyed out (The Opening).

**For other docs** (tracker): Technical Design gets the command list with reasons, the turn order for the next-move line, the full evening's track and two stage names, the rules primer's order-of-the-evening line, and the rename. Characters gets a role line and a short errand line per guest, and the rename. The Hub and Visualization & Sharing get the rename. The look of the new shadows and floating cards is Art & Design's to settle (The Look).

**Build:** one task builds all of it, **#177** (the next-move line waits on Technical Design's plumbing). Until then, the demo page shows it.

## Changes in v0.15

*Nov 15. Interface's part of "The screen's visual style moves to Art & Design" (the Hub, for Dylan, Nov 14). Layout and behaviour stay here; how the screen looks is Art & Design's.*

- **The look is handed over** (The Look): the three directions, the leaning (the palazzo ledger, rounded corners), and what's left to settle now belong to Art & Design. The section keeps them as handed over until Art & Design's doc has them, and states what this doc still asks of any look: which parts must look different from each other, and why
- **About This Document:** this doc no longer decides how the screen looks. A new row names Art & Design for the screen's visual style, and "Art" becomes **Art & Design**. "Words and looks live in content" now splits the job: this doc says which parts need their own token, and Art & Design gives the tokens their values
- **References updated:** the sheet, the two card kinds, and the movement card point to Art & Design rather than The Look. The open question on the look moves to Art & Design
- **The Private section goes:** its one note was about the look, so it's handed to Art & Design too (tracker)
- **Build State** brought up to date: everything designed through v0.14 is built, and **the demo page** (Dylan, Nov 15) lets Dylan click through the current screen on the fake game, with #172 to rebuild it after each screen task

## Changes in v0.14

*Nov 14. Takes the "The opening drops the second orientation sentence" handoff (Lore v0.13, Il Notaio's Opening). Replaces PR #147, which never merged; v0.13 carries over unchanged.*

- **The opening ends on "Speak as your character would, plainly."** Adopted (Dylan): Lore's placeholder (#148) leaves off "The other guests react to strange talk as guests would", and it's the cleaner last line in Il Notaio's voice (The Opening)
- **The warning moves to the tour, and says it outright** (Dylan; The Tour, step 6). The card on the message box tells the player that the other guests are played by AI and hear them as people of 1492 would, so modern slang, internet talk, or talk about the game itself will confuse them and the evening may not play as it should. It's the one tour card that steps outside the story, on purpose
- **Onboarding** follows: the orientation line is the opening's last sentence, and the warning is the tour's
- Build: one small task puts the card's words in the setting pack, after #117 (tracker)

## Changes in v0.13

*Nov 14. Takes the "Il Notaio's guarded reading, FYI" handoff (Technical Design v0.51, Player Interface, Il Notaio's reading). Dylan adopted all three differences; they can be tuned after playtests.*

- **He reports rather than summarizes** (Principles; The Web of Secrets). Code chooses which lines he speaks of, by rules that never read them, and he puts each in reported speech with the guest's own words quoted. It reads more like a register than a story: that's the price of a reading that can't connect
- **A failed sentence becomes a plain quote of its line,** unmarked, rather than the whole box giving way to the tally. The tally stays as the box's closing line
- **Context is code's, as a named exception** (Principles): code sets out the connection lines word for word, and puts a short public note after a line that names a lore entry, as the stream's lore links already do. He never writes either
- **The box's order:** background, then tonight stage by stage, then the tally. **Past-stage summaries** are bullets grouped by conversation (Past stages)
- **To watch in playtests** (Open Questions): whether he's too thin to help, and whether his box, which quotes lines the column below also holds, should start minimized
- Build: all in #146, with Technical Design's plumbing, so nothing new to file. Build State also lists #141

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

This doc covers **the player screen as the player meets it**: what's on it, where, how it behaves, what it says, and how a new player learns it. How it looks is Art & Design's *(v0.15)*. It also keeps **the playtest findings** and what was decided because of them.

**What it doesn't own:**

| Topic | Owner |
|---|---|
| The rules a human plays by (one message a turn, answering a direct question, commands, `/conclude`, death as a spectator, the jailbreak rule) | **Mechanics** (Human Player; Everyone Sees the Room) |
| How the software runs it: the protocol, what the screen may receive, the pause logic, command validation, Il Notaio's reading's prompt, the game record, the build | **Technical Design** (Player Interface) |
| Portraits and illustration | **Art & Design** |
| How the screen looks: colour, type, texture, icons, and the values of the theme's tokens *(v0.15)* | **Art & Design** (the screen's visual style) |
| The board's Web of Secrets slide | **Visualization & Sharing** |
| The relationship lines the web draws | **Characters** (Shared Canon: Relationships) |

**The boundary test:** if a change alters what the engine sends, decides, or records, it's Technical Design's. If it changes only what the player sees or does with what's already sent, it's this doc's. If a rule and this doc disagree, Mechanics wins; if this doc asks the screen to show something Technical Design says it may not receive, Technical Design wins.

**Words and looks live in content.** Every word the screen shows is in the setting pack, `setting/<name>/player.json` (and Il Notaio's hints and corrections in `notaio.json`). Every colour, font, size, spacing, and radius is a token in `web/theme.css`. This doc decides what the words say, and which parts need a token of their own so they can look different (a tint for the "talking with" card, a ring on Do); **Art & Design gives the tokens their values** *(v0.15)*. The files are where they live (Technical Design, The Setting Pack).

---

## Principles

**The player is just another guest.** They see exactly what their character would see and nothing more, and the AI guests can't tell a human is playing. Technical Design enforces this on the server (Player Interface): the browser only ever gets the player character's own History and State.

**First-hand only.** The screen shows what the character knows from their briefing, what's public, what they saw and heard tonight, and the player's own notes. That's the same rule the characters live under: it keeps the player and the AI guests on equal terms.

**Il Notaio reports, but never connects** *(Dylan, Nov 13; v0.5; guarded in v0.13)*. AI is good at giving people the right information at the right moment, so the screen leans on Il Notaio to do that. He's as conservative as he can be:
- **He may** report what the player heard, in his register: each line put in reported speech, with the guest's own words quoted ("Lupo told you: "…""). The events the player saw appear as their own record lines, word for word
- **He doesn't choose what to report.** Code picks the lines by rules that never read them, and shows them in the order the player heard them (Technical Design, Il Notaio's reading)
- **He may never** put two pieces together into something new ("they both mentioned the garden"), read anyone's mood or motive, say who's lying, suggest what to do, or hint at anything
- **Code may set public context beside a line; he never does** *(Dylan, Nov 14; v0.13)*. The connection lines the player already has (the public ones and their own briefing's) are set out word for word, and a line that names a public lore entry is followed by a short note of what every guest knew of it at the start, as the stream's lore links already do. It's code's, not his, and it holds only what's public
- **Every word is checked.** Every claim about tonight quotes the words or is the record's own line for the event. A sentence of his that fails the check is replaced by a plain quote of the same line, so nothing is dropped and he can't invent anything
- **Labelled as his:** "Il Notaio's reading", "Il Notaio's summary of this stage". *(Until v0.16 the labels added "He may be wrong."; Dylan dropped it.)* He draws only on the player's own record, as Technical Design guarantees
- He appears in two places: his box in the Web of Confidences, and his summary of a past stage. His hint stays templates only

**The player reads at their own pace.** Nothing auto-advances, and nothing moves under the player's eye while they read (Dylan, Nov 12).

**One layer at a time, clearly stacked.** The Web of Confidences sits above everything, the floating stage bar and message box above the conversation *(v0.16)*, a selected card above the "talking with" card, Il Notaio's box above the dialogue it covers (which fades while he's open), a modal over the screen, never under it. Each layer's shadow says which is on top.

---

## Build State *(Nov 15)*

1. **The mini-game is playable** as Francesco, with everything this doc designed through v0.15 built (the first screens, then #102, #109, #113, #114, #117, #128, #132, #141, #146, #148, and #151; v0.15's list). Francesco's errand can't be done there (Friar Tommaso isn't in the cast), and the mini-game runs with `plot_reward` off
2. **v0.16 is designed and shown in the demo, not built.** Dylan reviewed the demo page (Nov 15), and every v0.16 change was tried there first. **One build task** builds v0.16: **#177**. Most of it needs nothing new from the engine. The command menu's reasons can be worked out from the player's own state until the engine sends them; **the next-move line and the missed-move hint need the engine** to put the player's next movement window in their state (Technical Design handoff), so the build leaves them out if that isn't there yet. The demo is private to Dylan; **#172** adds `npm run demo` to rebuild it from the repo. Its guests' lines are the fake caller's placeholders
3. **Then the full game,** once the full game loop is built: councils, Piero, candidate selection, speeches and `/repent`, the ballot and `/buy`, the run-off, and the full death and result screens. Dylan playing a whole game is the milestone's test (tracker, item 2)
4. **Then v1, the first public release:** Il Notaio's full player-facing role (Onboarding, below)

To try it: `npm run play -- --as "Francesco Pazzi" --minigame` (add `--fake` for no model calls), or the demo page.

---

## The Screen

A single page in the style of a Slack chat. Placeholder portraits until Art & Design's are ready: initials in a circle, coloured by faction.

```
┌─────────────────┬────────────────────────────────────┬──────────────────┐
│ [Show me around]│ ╭ 1─2─3─(The third round…)─5─…─11 ╮│ ╭ TALKING WITH ─╮│
│ [Explanations]  │ ╰ In the loggia with Giorgia, Lupo╯│ │ Lupo          ││
│      (FP)       │ ▸ Earlier this stage (collapsed)   │ │ Giorgia (sel.)││
│ You are         │ Il Notaio: …                       │ │ or a lore     ││
│ Francesco Pazzi │ Giorgia Pazzi: …                   │ │ entry         ││
│ head of the …   │ Lupo (to you): …                   │ │               ││
│ purse · payments│ ╭ Il Notaio, to you ─────────────╮ │ │               ││
│ secret convs.   │ ╰────────────────────────────────╯ │ │               ││
│ [Briefing][Rules│ ╭ Your turn…    Your next move…  ╮ │ │               ││
│ [City][Glossary]│ │ [@][/] Speak as your character…│ │ │               ││
│ ┌ ERRAND ─────┐ │ │                  [Speak][Pass] │ │ │ ⇔ drag · ⇥    ││
│ THE PLACES      │ ╰────────────────────────────────╯ │ ╰───────────────╯│
├─────────────────┴────────────────────────────────────┴──────────────────┤
│ ▲ WEB OF CONFIDENCES (always visible; click to slide up)   ▒ shadow ▒  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Left: you

In this order *(Dylan, Nov 13; v0.16)*:
- **Show me around** and **Explanations: on/off,** centred at the top, on their own line with room around them
- **You:** your portrait, then **"You are Francesco Pazzi"**, then your role in plain words, **"head of the Pazzi family"** *(v0.16)*, all centred, with no box, ring, or "You" label: the words say it. The role line is a new per-guest line from Characters (tracker); the public subtitle stands in until it exists. **Your name or portrait opens your briefing** *(v0.7)*, at the place you left it
- **Your sheet:** **Purse**, **Payments from France** *(v0.16)*, **Secret conversations** *(v0.16; the count of your Colloquios)*, and **the midnight line** *(v0.8)*: "Midnight: 1 act (kill, guard, or watch)." With `plot_reward` on, a second line: "+1 if you finish your errand before the last council." Once the errand check has run, it becomes "+1 earned" or disappears. It never gives a check's result away early. How the sheet reads (a purse with its count, a seal, tally marks) is Art & Design's
- **Each line of the sheet opens where it's explained** *(v0.16)*: the rules section behind its glossary word (Purse → Florins, Payments from France → France's payroll, Secret conversations → Colloquio, Midnight → Midnight), or the word in the glossary if no section explains it. The setting pack names the word for each line. They underline on hover, with the explanation "Click for the rules on this."
- **Four buttons:** **Your briefing**, **The rules**, **The city**, and **Glossary** (Briefing, rules, the city, and the glossary, below). No button for the Web of Confidences, which is always at the bottom
- **The errand card,** pinned:
  - **Just the task** *(Dylan; v0.16)*: "This comes first: it is what you came for. Before the last council before midnight, **give Friar Tommaso at least 3 Florins in total**, in one gift or several." The why ("a gift to the friars that the city will hear of…") stays in the briefing. The screen needs a short errand line per guest from Characters (tracker). Until then it cuts the errand at the first colon or full stop after its bold part, which is right for Francesco but would drop a condition from Lupo's
  - **Clicking it opens your briefing at the errand's card** *(v0.16)*, found by the errand's own words, so it works in any setting pack
  - **What it earns:** one line in the card's accent, as before. With `plot_reward` on: finish it before the last council before midnight for a secret extra act at midnight. With it off, as in the mini-game: "Errands earn no extra act at midnight." **Clicking that line opens the rules** *(v0.16)*: the section on errands where the game has one ("Your errand"), otherwise Midnight, where the acts are. After the check, `{plot_status}` replaces the line and opens the same
- **The places** *(v0.7–v0.9; Mechanics v0.35; Lore v0.8)*: all eight, always listed in Lore's order, empty ones faded, each with the portraits of whoever is there
  - **Your own place is marked, with "You are here" on its own line** under the place's name *(v0.16)*. **A Colloquio's place is marked as a secret conversation** (a closed-door mark)
  - **Every portrait selects its guest, your own included** *(Dylan; v0.16)*: yours selects you, and the right panel shows your own card. Your briefing stays one click away above
  - Tokens overlap and spread on hover. A place isn't clickable; hovering its name shows Lore's description, as a light world card (Hover explanations)
  - **In councils,** only your own council's place is shown; **at midnight and the ballot,** a quiet line. The dead aren't shown

### Centre: the conversation

- **Two floating cards** *(Dylan; v0.16)*: the stage bar at the top and the message box at the bottom sit as rounded cards over the conversation, each casting a shadow onto it. **The conversation fades out where it slides under them** (the top bar and Il Notaio's box), so a line dissolves rather than being cut off. How the cards and shadows look is Art & Design's (The Look)
- **The conversation's members** sit under the stage bar, centred ("In the loggia with Giorgia and Lupo"; in a Colloquio, "In the study, in secret with Clarice"). **End conversation** sits on that line in a Colloquio, in red *(v0.16)*
- **Only the current conversation is open.** Earlier conversations in this stage collapse into **Earlier this stage**, one line each, opening in place. Earlier stages live in the bar
- **Selecting a guest** opens the collapsed sections they appear in, highlights their lines, and puts a dot on each past stage they appear in
- **The stream:** lines, Il Notaio's notes in their own style, action lines, and lines addressed to the player marked "to you". A "…is speaking" indicator while a line is generated. **Lore links** for public lore entries, as before (Technical Design: the match is on the line's words only)
- **Il Notaio's hint,** docked between the stream and the message box (Onboarding, below)
- **Decision cards** take the message box's place (Decision Cards, below)

#### The stage bar *(v0.5; reworked v0.16)*

- **The full evening, as the player lives it** *(Mechanics v0.37; v0.16)*: one stage per round of mingling and per council, with no private-plan steps, since the player plans in their own head. For a Pazzi player: the first round of mingling, the first Pazzi council, the second round, the second council, the third round, the third council, Midnight, the choosing of candidates, the speeches, the last Pazzi council, and the ballot. That's **eleven stages.** Each council carries the player's own faction's name. The engine sends this track (Technical Design handoff); two of the names, the choosing of candidates and the last council, need in-world names in the setting pack (tracker)
- **A standard step bar** *(Dylan; v0.16)*: circles joined by lines, done ones filled, the current one an oval holding its name **with no number**, centred in the floating card. Hovering changes nothing in the row. **A tooltip under the row** shows the hovered stage's name, its description, and, with explanations on, its explanation. It waits a moment before the first tooltip, then switches at once between neighbours while one is showing. Focus shows it at once
- **It stretches with the window:** the bar spans most of the card, the lines between circles share out the room, and the circles grow a little with it. With eleven stages, the side inset is small and the circles smaller, so **all of them fit without scrolling from a 1100-pixel window up**
- **No motion:** no glide, no magnification. (Every variant with motion was tried and dropped: the row moved under the pointer.)
- **The errand's deadline mark** stays on its stage; **a selected guest's dots** mark the stages they appear in
- **A past stage opens when clicked,** read-only (Past stages); a future stage can't be clicked

### Past stages *(Dylan, Nov 13; v0.5; v0.16)*

Clicking a past stage in the bar opens it in the conversation, read-only.
- **The stage's conversations,** everything the player was in during that stage, in order, with lore links and highlighting
- **Il Notaio's summary** opens over it, **starting a fifth of the way down** *(v0.16)*, so a good stretch of the dialogue shows above it. **While it's open, the dialogue behind it fades** *(v0.16)*: the content fades, not a tint laid over it, so no edge shows between the cards. Bullet points grouped by conversation, as in v0.13
- **Clicking anywhere in the conversation minimizes his box** to a strip at the bottom; clicking the strip opens it again. It casts the same upward shadow as the message box
- **Il Notaio's hint steps aside** while a past stage is open *(v0.16)*: his summary is already there
- **The message box stays,** and the player can draft: Speak/Do and Pass become **Return to current stage**, as tall as the box beside it and narrower, its words on two lines *(v0.16)*. The draft stays, and **nothing is sent until the player presses Speak or Do back in the current stage**
- **With a decision waiting in the current stage** *(Dylan; v0.16)*, there's nothing to draft, so the bottom card holds **one Return button filling it**, with even space around it. Returning brings the decision card back as it was
- **When the game is waiting for the player,** the Return button and the current stage pulse, and the placeholder says so ("The current stage is waiting for you. Return when you're ready.")
- *His summary is a model call made once when the stage ends (Technical Design v0.51, Past-stage summaries). In the demo, the full evening's bar makes the whole mini-game one stage, so no earlier stage opens until midnight*

### The input box and its buttons

The message box is a floating card *(v0.16)*. Its top line holds **the prompt** at the left and **your next move** at the right; the box and its buttons sit beneath.

| Control | Job | Looks like |
|---|---|---|
| **Speak** | Send the line | The one filled, primary button. Active only when there's something to say |
| **Do** | Run a command | Replaces Speak when the box starts with `/`, in its own style |
| **Pass** | Give up the turn's message | Secondary, outlined. Speak and Pass are centred beside the box |
| **End conversation** | End a Colloquio | **In two places** *(v0.16)*: on the conversation's header line, and **under Speak and Pass,** the width of the two, whenever it's on offer. **Both red** (outlined, in the theme's danger colour), so ending reads as final |
| **@** and **/** | Open the guest and command menus | Small icon buttons inside the box, at its bottom left |
| **Return to current stage** | Leave a past stage | Replaces Speak/Do and Pass while a past stage is open (Past stages) |

- **The prompt** *(v0.16)*, in the accent, says what the moment asks, in plain words: "Your turn: speak or pass." / "Giorgia spoke to you. Answer or pass." / "Lupo ended the conversation. Say a last word or pass." / "Your words will be said at the next pause." (The Player's Words)
- **Your next move** *(Dylan; v0.16)*, small and grey, at the right of the prompt's line, **its right edge lined up with the message box's:** "Your next move: in 3 turns", then "in 1 turn", "this turn" (in the accent, bold), or "next round" once this round's has passed. If it falls while you're in a secret conversation: "this turn, but you're aside". **Clicking it opens the rules on moving** (the section behind the glossary's Move entry), and its explanation says how windows work. The engine sends when the player's window comes in the turn order (Technical Design handoff)
- **The character count** ("0/500") sits at the right end of the same line, over the buttons
- **The placeholder carries the example** *(v0.5; v0.16)*, now on two lines: *Speak as your character would…* then *"@Giorgia Pazzi My family never forgets, and rarely forgives", or "/borrow"*. All four rotating examples follow that shape, with a comma before "or". They use only commands allowed right now
- **No scrollbar on the empty box;** it comes back once there's text to scroll *(v0.16)*
- **The menus open and close with their character** (typing `@` or `/`; deleting it, Escape, or clicking away closes)
- **The command menu** lists every command the character can ever use, available ones first (Commands, below)

### Selection *(Dylan, Nov 12; v0.6–v0.7; v0.16)*

In the chat view, **one thing is selected at a time:** a guest or a lore topic. **A guest's name or portrait selects them wherever it appears,** and since v0.16 **that includes your own portrait in the places,** which selects you. Your name and large portrait at the top of the left panel still open your briefing. A new selection replaces the last, clicking it again deselects, and Escape clears it. **Two guests can be selected only in the Web of Confidences.**

**One selection, shared with the Web of Confidences** *(v0.6)*, unchanged: a guest selected anywhere is selected in the web too, and a pair stays a pair there while the chat holds the one picked last.

### Right: whoever you're looking at

- **The panel stops a little short of the top, with rounded top corners** *(v0.16)*
- **By default, whoever you're talking to** *(v0.5)*: in a Colloquio, the other guest; in a group, the guest last @-addressed by or addressing the player; otherwise empty, with "No one has your ear"
- **Two kinds of card** *(v0.5)*: the **"Talking with" card** (live, tinted, labelled, a dot while they speak) and **a selected guest's card** (plain, raised, "Looking at", with ×). Art & Design's look keeps them apart (The Look)
  - **The "talking with" card has no row of the other guests' tokens** *(Dylan; v0.16)*: the places list already shows who's with you, and selects them the same way
- **Your own card** *(Dylan; v0.16)*: selecting yourself shows **"This is you"** as the label, a small **"You"** tag under your name, and an accent edge all the way round. What it shows is what everyone knows of you, the same as anyone's card ("Your own card: what everyone knows about you.")
- **No faction line above the subtitle** *(Dylan; v0.16)*: the subtitle already opens with the faction ("Dominicans · a penitent widow"), so cards show the name, then the subtitle. The same goes for the opening's cards
- **Selecting slides a card up over** the "talking with" card, whose header peeks out; **deselecting slides it back down** (the ×, Escape, clicking again, clearing in the web, or clicking empty space)
- **Resizable, and hideable by dragging** *(v0.16)*: a drag handle on the left edge sets the width, remembered in the browser. **Dragging well past the narrowest hides the panel,** as its hide control does; while the drag is past that point, the panel fades to show what letting go will do. Letting go anywhere, even off the window, finishes the drag
- **Can be hidden** to a thin strip with a handle *(v0.5)*, which shows the selected guest's portrait
- **What it shows is public and fixed:** portrait, name, subtitle, and the public connection lines. A lore link opens its entry here, with a way back
- **"Open in the Web of Confidences"** on a filled card *(v0.6–v0.7)*

### Briefing, rules, the city, and the glossary *(v0.5–v0.7; v0.16)*

Each opens as a modal over the screen. **Four modals in a row:** Your briefing, The rules, The city, Glossary.

**The row** *(v0.16)*:
- **The neighbouring modals** show to the left and right, solid (not see-through), their contents dimmed, each with **a one-line summary** of what it is rather than its list of topics: "Who you are, what you know, and what you came here to do." / "How the evening works, from the first word to midnight." / "What every guest knew of Florence before tonight." / "The game's words, each explained in a line or two." Clicking one moves to it
- **The focused modal's title is centred** in its header; **Close** stays at the right
- **Every modal starts from its beginning** whenever you move to it, however you get there

**Footers that chain them** *(Dylan; v0.16)*: every modal has **Previous** and **Next** at its foot, worded for what it holds ("← Previous briefing" / "Next briefing →", "← Previous rule" / "Next rule →", "← Previous topic" / "Next topic →").
- **On a modal's last item, Next becomes "On to <next modal>"** and opens that modal at its first item. **On its first item, Previous becomes "Back to <previous modal>"** and opens that at its last
- **Going forward,** on the last item the way on breathes (a soft pulsing outline) and the next modal's peek lights up. At the Glossary, the end of the chain, the header's **Close** fills in instead; the Glossary's footer holds only the way back to The city
- **Going backward,** everything mirrors: **cards slide in from the left**, the back button carries the breathing outline, Next and "On to …" go plain, and on the first item the back button fills and the previous modal's peek lights up. At the briefing's first card, the start of the chain, Close fills in
- **Motion is subtle** *(Dylan; v0.16)*: a card or city entry slides 24 pixels, one modal giving way to the next 48, anything that grows starts at 97%; all in 300 ms. Theme tokens; with reduced motion set, nothing slides

**Your briefing is a card deck, five cards for the player** *(Dylan; v0.16)*: **Who you are → Your errand tonight → What you want → What you know → Relationships,** then **Your past** where there is one.
- **Left out for the player:** How you speak, Resources, and Social awareness. They serve the AI guests' prompts (the briefing text is unchanged); the screen already shows what Social awareness says
- **Merged:** **What you want** is the faction's aims, then **Your own reasons** (the other goals). **What you know** is what you know, then **Keep to yourself** (the secrets)
- The setting pack lists the cards to leave out and the merges (new title, the cards in order, a subheading for each later card), so a reskin names its own (The Player's Words)
- **Clicking anywhere below the card,** the footer's blank space included, turns to the next; tabs along the top jump; the arrow keys work

**The rules** are buttons, one per section, that **stay in view** *(v0.16)*: a section opens as a card over them. A click on the card turns to the next section; ×, Escape, or a click outside the card goes back to the buttons; a click on the empty space around the buttons opens the first section. The primer's capitalized opening heading shows in sentence case ("The evening"), like the others.

**The city** is an inbox-style list under subject headers. An open entry has **Previous and Next topic** at its foot, and a click anywhere on it turns to the next topic; the way back to the list stays put while only the topic slides.

**The glossary** is alphabetical, searchable, with "More in the rules" under an entry with a section behind it, and dotted underlines in the chat (v0.7).

### The Web of Confidences *(Dylan, Nov 12–13; renamed and reworked v0.16)*

**Renamed** *(Dylan, Nov 15)*: the Web of Secrets is **the Web of Confidences**. "Web of Confidences" as a title or label (the bar, the glossary's term), "the Web of Confidences" in a sentence.

**The dock** *(v0.16)*: a raised bar along the bottom with ▲, the title, and the selected guests. **It's the top layer:** it slides up over everything, the floating cards included, with a deep, wide shadow that grows as it opens. **It slides up and down over 600 ms** (with reduced motion, it doesn't slide). Up to two guests can be selected in it; the selection is shared with the chat.

**The web** *(v0.5; v0.16)*:
- **A fixed ring, read like a clock** *(Dylan; v0.16)*: with twelve guests, the first in the roster sits at half past nine and the rest follow clockwise, an hour apart. In Florence's roster that puts the Medici at the upper left, the Pazzi upper right, the Dominicans lower right, and the French Embassy lower left. **Each faction's name sits outside the middle of its arc,** except the first faction's, which sits half an hour later (the Medici at 11:00) to clear the key. The rule is by roster order, not names
- **Roomier,** and **fitted to its space:** the drawing's frame is fitted to what's drawn, so the web draws as large as the panel allows, centred in the space left of the side column, with the key over its top-left corner and the web moved aside so nothing runs under the key
- **Names under their circles.** Where two guests sit side by side at the top or bottom of the ring, each name moves outward as far as it can without reaching the next guest's circle
- **Selecting:** a selected guest's ring is twice as thick, and there's no focus box around a clicked guest (keyboard focus gets a thin dashed ring instead). **Every line that doesn't touch the selection fades,** as lines of other types do when one is picked in the key

**The lines** *(v0.16)*:
- **One line per pair and type.** Where your briefing gives your own take on a tie everyone knows, the one line drawn is the public one; your take still shows on the guest's card and in Il Notaio's reading
- **The halo marks a secret** *(Dylan)*: only your ties that no public tie matches (for Francesco: his romance with Clarice, his rivalry with Raffaello, his alliance with Friar Tommaso). Ties everyone knows are drawn plain
- **Pairs with two different ties** still draw their lines close together; side-by-side lines were tried and parked (Open Questions)
- **The key:** the six types, then a **"Secret"** row with its halo swatch and a short line under it: "A tie no other guest knows of. Ties everyone knows are drawn plain." **Every row is selectable,** "Secret" included: it lights its lines and fades the rest; clicking again clears. The key is collapsible, and **grows and shrinks with the window** (about 0.8× to 1.45× its size at a 1440-pixel window), keeping its proportions

**The side column** (What you heard and saw, and Notes) **grows and shrinks with the window,** about 28% of its width *(v0.16)*.
- **One guest:** their lines in your presence, newest first. **A pair:** what one said to the other. **An empty pair** says why: "You haven't yet heard Giorgia Pazzi or Lupo speak to the other. Only what one says to the other shows here." *(v0.16)*
- **Il Notaio's reading** opens **a little higher than the stage summary,** about a seventh of the way down the column, with the column behind it faded and an upward shadow; a click minimizes it to the foot (v0.5; v0.13; v0.16)

**Notes** *(Dylan, Nov 12; v0.7; reworked v0.16)*:
- **The Notes tab always lists every note,** grouped: each guest, then each pair, then free notes, newest first within a group. Selecting no longer narrows the list
- **Clicking a note, or its group's heading, selects that guest or pair** on the web. The selected guest's or pair's group is lit (its heading and lines in the accent) and scrolled into view
- **Each group folds** under its heading, with a fold button and the group's count while folded
- Every note has the same straight line down its left; long notes wrap inside the column
- The writing box at the top writes on the selection (or a free note), as before. The conclusion button keeps its v0.2–v0.4 rules

### Hover explanations *(Dylan, Nov 12; v0.16)*

Every control and panel has a short explanation on hover or focus, **in plain, short English** (Explanations, near the end). A switch turns them off, remembered in the browser. **The switch governs only the explanations** *(Dylan; v0.16)*: turning them off no longer stills the breathing highlights. Only the system's reduced-motion setting does that.

**Hovers that tell you about the world** *(v0.16)*, rather than about the screen (a place's description, a glossary word, Il Notaio's name), **show as a light card,** like the stage bar's tooltip, so they read apart from the dark explanations. They show even with explanations off.

---

## Decision Cards

When the game waits for one of the player's choices, **a card takes the message box's place** at the bottom of the conversation, in the same floating card *(Dylan; v0.16)*, rather than appearing at the end of the stream. If a card runs tall (midnight's can), it scrolls within that space. *What each card offers, and when the game pauses, are Technical Design's and Mechanics'; this is how the cards present it.*

- **Movement window:** stay, move toward a guest, or **start a secret conversation** with a guest. Three choice tiles with a guest picker below
- **Seat choices:** as an invitee when a Colloquio ends, join a group with room or start a secret conversation of your own, or wait when no group has room; as a lone guest, join a group with room. **When no group has room, the card says so** *(v0.16)*: "Every group is full." under its question, so the missing join choices don't look like a fault. (The rule is Mechanics': the guest pulled aside chooses first.)
- **Midnight:** "Choose your act for midnight." One act and a living guest; with the errand's extra act earned, its own optional row. Same checks as an AI guest's answer
- **The controls, tidied** *(v0.16)*: dropdowns match the other fields (one height, one text size, their own arrow rather than the browser's); on a row, the act is narrow and the guest takes the rest, up to a readable width; **the confirm button sits at the right at its own width;** the title and intro carry no stray margins
- **Reading an earlier stage** while a card waits, the bottom card is one wide Return button (Past stages); returning brings the card back
- **Full game only:** candidate selection, the speech, the ballot (vote and buy), and the run-off. They wait on the full game loop's spec (Open Questions)

---

## Speaking and Waiting, as the Player Meets Them

*The timing rules are Technical Design's (How the game waits for the player); this is what the player sees of them.*

- **In a group or council, the box is always open.** A message sent is held and spoken at the next break between lines ("Your words will be said at the next pause."). Then "You've already spoken this turn." until the next turn. **Pass** gives it up
- **When someone addresses the player,** the game waits, and the line is marked "to you": "Giorgia spoke to you. Answer or pass." The answer never uses the turn's message
- **In a Colloquio,** the guests take turns and the game waits for each of the player's lines. **End conversation** ends it at any time; the other guest gets one closing line. If the other guest ends it: "Lupo ended the conversation. Say a last word or pass."
- **Movement windows** *(v0.16)*: one guest gets a window at the end of each turn, in an order drawn each round (Mechanics). The prompt's line says when yours comes ("Your next move: in 3 turns"). **A window that falls while you're in a Colloquio is lost** (Mechanics' rule, unchanged): the line says so beforehand ("this turn, but you're aside"), and Il Notaio's hint says so after: "Your chance to move came while you were in a secret conversation, so you missed it. You'll get another." His line stays until the end of the turn you rejoin company. Whether the rule itself should change is a watch item (Open Questions)

---

## Commands, as the Player Meets Them

*Which commands exist and when they're allowed are Mechanics' rules; validation is Technical Design's (Commands).*

- **The command menu lists every command the character can ever use** *(Mechanics' handoff, Nov 15; v0.16)*. A player in a group used never to see `/bribe`, so might never learn bribes exist:
  - **What's open now comes first,** each with its one-line hint
  - **The rest wait in a folded section at the bottom,** "Not available now (3)", greyed, **each with its reason** in place of its hint: "Only in a secret conversation." / "You have no Florins to give." / "You need 3 Florins to pay one back." / "Only at midnight." / "Only for an errand that asks you to find something out." / "Not open to you right now."
  - If nothing is open now, the section opens by itself. Clicking an unavailable command does nothing
  - **The reasons come from the engine** (Technical Design handoff: the full command list with each one's availability and reason). The demo works them out on the screen
- **Do,** not Speak, runs a command. Commands don't use the turn's message
- **A refused command is explained by Il Notaio, in his hint box** *(v0.16; brought forward from v1)*, not in a notice above the box. His box opens if folded and flashes, and he gives the specific reason in plain words: "Money can only change hands in a secret conversation. Start one with the guest first, then try /bribe again." / "You have no Florins to give." / "That has to wait for midnight." / otherwise the engine's reason, then "Type / to see what you can do now." His usual line comes back as soon as the player types again, without a flash. **The engine needs to say why each refusal happened** (Technical Design handoff); the demo reads it from the menu's reasons
- **`/conclude`** is private and never spoken; from a note, "This is my conclusion" fills it into the box (v0.2)
- **Words in `<>`** count toward nothing and are never spoken

---

## The Opening *(Dylan, Nov 13; v0.7; v0.16)*

Il Notaio introduces himself before the player meets anyone.
- **His name heads the page, glossed:** "Il Notaio", with *Italian for "the notary"* beneath it (v0.11)
- **Full screen.** He writes the story leading up to the evening **a phrase at a time, each fading in** *(v0.16)*, split at commas and sentence ends, with a longer pause after a sentence than after a comma. Fixed text from the setting pack, not a model call
- **A click anywhere on the screen fast-forwards** *(v0.16)*, and the page follows the text down as it grows. **Skip** writes everything out at once
- **At the end, the choice,** under **"Choose your family"** *(v0.16)*: one card per playable character, each with portrait, name, and subtitle (no separate faction line). **In the mini-game, the full game's other playable character shows greyed out after the playable one,** labelled "In the full game", so the player knows there's more. The list comes from the playable characters not in this game. Choosing one starts the game, and the tour begins
- **His last paragraph ends on** "Speak as your character would, plainly." (v0.14). **Public only;** Lore writes it, Characters canon-checks it
- With reduced motion set, each paragraph appears whole

---

## The Tour *(Dylan, Nov 13; v0.8; v0.16)*

Right after the choice of character, a short guided tour: one part of the screen at a time spotlit, the rest dimmed, with a small card beside it. Clicking anywhere moves on; Back goes back; every step has **Skip tour**.

**The cards, short and plain** *(Dylan; v0.16)*, in order:
1. **Your sheet:** "This is you: your money, your payments from France, and your secret conversations. Click any line to learn more."
2. **The four buttons:** "Your briefing, the rules, what the city knows, and the game's words."
3. **Your errand:** "Your errand: the one thing you came to do tonight."
4. **The places:** "Every place in the house, and who's in it. You can see who's together, but not hear them."
5. **The stage bar:** "The evening, stage by stage. Click an earlier stage to read it again."
6. **The conversation and the message box:** "Type what your character says, then click Speak. Start with @ to talk to one guest, or / to act. The other guests think it's 1492, so modern talk will confuse them." It keeps the warning (v0.14), shorter
7. **The right panel:** "The guest you're talking with, or the one you clicked. Only what everyone knows."
8. **The Web of Confidences:** "The Web of Confidences: who's connected, what you've heard, and your notes."
- **It ends on the Your briefing button:** "Start with your briefing." Clicking it opens the briefing and ends the tour. **If the tour is skipped, Your briefing breathes** (a soft pulsing outline) until the player clicks it or anywhere else *(v0.16)*
- **It runs once,** remembered in the browser; **Show me around** runs it again. The game holds its first line until it ends (Technical Design v0.51; #146)
- Its words live in the setting pack's `notaio.json` › `tour`

---

## Start, Death, and End

- **The opening** replaces the start screen (The Opening). The player chooses their character at its end, and **the tour begins**
- **Death:** the box and the cards close, and a banner says the character has died. As a **spectator** the player sees only Il Notaio's city-wide announcements through to the result. The web, the record, and the notes stay open. Then the end screen
- **End screen:** the outcome as Il Notaio announces it, whether the player won, and their errand's result. Then **Open the full replay.** In the mini-game, who died at midnight and the errand results

---

## Onboarding

How a new player learns the game without a tutorial up front.

- **The example lives in the box's placeholder** (v0.5; v0.16), on two lines, rotated from the setting pack
- **The orientation line** ends the opening (v0.14); **the warning** is the tour's message-box card (v0.14; v0.16)
- **The glossary's dotted underlines** explain the game's words where the player meets them (v0.7); **each line of the sheet** opens its rules (v0.16)
- **Il Notaio's hint** *(Dylan, Nov 12; v0.16)*. A small docked box between the stream and the message box, collapsible. **He says in a line what the moment asks of the player, plainly** *(v0.16; Dylan: no ornate phrasing when directing the player)*: mingling, being spoken to, a secret conversation, the movement window, the seat after a Colloquio, a council, midnight, the ballot, the errand's deadline, death, **a refused command** (Commands), and **a missed movement window** (Speaking and Waiting). The lines are in The Player's Words
  - **Whenever he says something new, his box flashes** (a brief accent glow) **and the new words fade in** *(v0.16)*, so the player notices. Going back to the line he gave before a refusal doesn't flash
  - **No first-council note at the start** *(Mechanics v0.37)*: the evening now opens on the first round of mingling, so his first line is the mingling one. His council line ("Your faction is meeting alone. Only your own people can hear you.") shows at each council
  - **It steps aside while an earlier stage is open** (Past stages)
  - Templates only, from `notaio.json`, no model calls. Styled apart from his announcements to the room
- **Hover explanations** (The Screen, above); **Il Notaio's reading and past-stage summaries** (Principles)

**Il Notaio for the player in v1** (Mechanics, Il Notaio — Player-Facing Duties; not needed for the milestone):
- **Questions:** the player can @-mention Il Notaio to ask about the rules or the game, as a private aside. *The call is Technical Design's*
- **Corrections:** every refusal explained in his voice, one template per reason. **Brought forward in v0.16** for the reasons the screen can name (Commands)
- **The jailbreak warning:** the first hit is a private warning (Mechanics, Jailbreak Rule)

---

## The Player's Words *(v0.12; v0.16)*

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

### v0.16: the review's words

The setting pack's strings v0.16 changes or adds. Keys that exist keep their names, since code reads them; new keys are marked **new**. `player.json` unless marked. Every "Web of Secrets" in the pack becomes "Web of Confidences" ("the Web of Confidences" in a sentence) and isn't listed one by one.

**Secret conversations, payments, and midnight:**

| Key | Was | Now |
|---|---|---|
| `screen.withdrawals` | Times you've withdrawn | Secret conversations |
| `screen.pensions` | Payroll payments | Payments from France |
| `screen.private` | Private | Secret |
| `screen.colloquio` | Colloquio with {other} | Secret conversation with {other} |
| `screen.withYouPrivately` | With you, in private | In a secret conversation with you |
| `screen.placeLine.colloquio` | In {place}, aside with {other} | In {place}, in secret with {other} |
| `screen.places.private` | Private: behind a closed door | Secret conversation: behind a closed door |
| `screen.move.colloquio`, `screen.seat.colloquio` | Call aside… | Start a secret conversation… |
| `screen.midnight.intro` | Choose your act for tonight. | Choose your act for midnight. |
| `screen.midnight.introTwo` | Choose one or two acts for tonight. | Choose one or two acts for midnight. |
| `screen.errandCard.noReward` | Errands earn no extra act tonight. | Errands earn no extra act at midnight. |
| `refusals.end_mistimed` | There's no private conversation for you to end. | There's no secret conversation for you to end. |
| `screen.pastStage.summaryTitle` | {notaio}'s summary of this stage. He may be wrong. | {notaio}'s summary of this stage |
| `screen.reading.title` | {notaio}'s reading. He may be wrong. | {notaio}'s reading |

**The prompt over the message box** (`screen.input`):

| Key | Was | Now |
|---|---|---|
| `waiting` | The company waits for you: speak, or pass. | Your turn: speak or pass. |
| `answering` | {name} has addressed you: answer, or pass. | {name} spoke to you. Answer or pass. |
| `closing` | {name} has ended the conversation: a last word, or pass. | {name} ended the conversation. Say a last word or pass. |
| `used` | You've spoken your piece this turn. | You've already spoken this turn. |
| `held` | Your words will be spoken at the next pause. | Your words will be said at the next pause. |
| `closed` | A choice is waiting above. | Make your choice above. |
| `examples` | Speak as your character would… "@{guest} …" or "{command}…" | The same lines with a line break after the ellipsis and a comma before "or". The borrow example becomes "@{guest} My family never forgets, and rarely forgives", or "{command}" |

**Il Notaio's hints** (`notaio.json` › `hints`), plain:

| Key | Now |
|---|---|
| `mingling` | You're with other guests. Speak when it's your turn, or pass. Hover over anything to see what it does. |
| `answering` | {name} spoke to you directly. Answer, or pass. |
| `colloquio` | You're in a secret conversation with {other}. No one else can hear you, but everyone saw you leave. |
| `move` | Your chance to move: stay, join another group, or start a secret conversation. |
| `seat` | Your secret conversation is over. Choose where to go next. *(Was "Find a group to join", wrong when every group is full.)* |
| `midnight` | Midnight. Choose your act in secret. All acts happen at once, and no killer is named. |
| `council` | Your faction is meeting alone. Only your own people can hear you. |
| `ballot` | The ballot. Everyone casts one vote, and can buy more for the same candidate. |
| `refused` | That didn't work. The reason is just above the message box. Type / to see what you can do now. *(The fallback when no specific line fits.)* |
| `errandDeadline` | This is the last round before the last council. Finish your errand before that council to earn an extra act at midnight. |
| `dead` | You've died. You can still read the web, what you heard and saw, and your notes, and you'll hear the city's announcements. |

**New keys:**

| Key | Words |
|---|---|
| `screen.youAre` | You are {name} |
| `screen.nextMoveLine` | Your next move: {when} |
| `screen.nextMoveIn` | `now` this turn · `nowAside` this turn, but you're aside · `one` in 1 turn · `many` in {n} turns · `none` next round |
| `screen.notaioHint.moveMissed` | Your chance to move came while you were in a secret conversation, so you missed it. You'll get another. |
| `screen.seat.allFull` | Every group is full. |
| `screen.commandWhy` | `colloquio` Only in a secret conversation. · `noFlorins` You have no {currency} to give. · `repay` You need {amount} {currency} to pay one back. · `midnight` Only at midnight. · `conclude` Only for an errand that asks you to find something out. · `notNow` Not open to you right now. · `more` Not available now ({n}) |
| `screen.notaioRefusal` | `colloquio` Money can only change hands in a secret conversation. Start one with the guest first, then try {command} again. · `noFlorins` You have no {currency} to give. · `repay` Paying one back costs {amount} {currency}, and you have less than that. · `midnight` That has to wait for midnight. · `conclude` That's only for an errand that asks you to find something out. · `other` {reason} Type / to see what you can do now. |
| `screen.factLinks` | The glossary word behind each sheet line: `purse` Florins · `pensions` France's payroll · `withdrawals` Colloquio · `midnight` Midnight · `errand` Errand · `move` Move |
| `screen.right.lookingAtSelf`, `screen.right.youTag` | This is you · You |
| `screen.web.nothingBetween` | You haven't yet heard {a} or {b} speak to the other. Only what one says to the other shows here. |
| `screen.web.keyYours`, `screen.web.keyYoursCovers` | Secret · A tie no other guest knows of. Ties everyone knows are drawn plain. |
| `screen.web.fold`, `screen.web.unfold` | Fold these notes · Show these notes |
| `screen.decks.playerSkips` | How you speak · Resources · Social awareness |
| `screen.decks.playerMerges` | **What you want:** Your faction, then Other goals (your own reasons) under "Your own reasons" · **What you know:** What you know, then Your secrets (private) under "Keep to yourself" |
| `screen.decks.previousBriefing`, `nextBriefing` | ← Previous briefing · Next briefing → |
| `screen.rulesModal.previous`, `next`, `first`, `overview` | ← Previous rule · Next rule → · First rule → · ← The rules |
| `screen.cityList.first`, `previous`, `next` | First topic → · ← Previous topic · Next topic → |
| `screen.modalRow.summary` | `briefing` Who you are, what you know, and what you came here to do. · `rules` How the evening works, from the first word to midnight. · `city` What every guest knew of Florence before tonight. · `glossary` The game's words, each explained in a line or two. |
| `screen.opening.choose`, `fullGameOnly` | Choose your family · In the full game |
| `notaio.json` › `tour.steps` | The eight short cards and "Start with your briefing." (The Tour) |
| `screen.hints` | Every explanation (Explanations, below) |

**Not this doc's words** (tracker handoffs): each guest's **role line** ("head of the Pazzi family") and **short errand line** are Characters'; the stage names **"The choosing of candidates"** and **"The last <faction> council"** go in the in-world names, Technical Design's; the glossary's **Errand** entry should point to the rules section on errands once the primer has one.

---

## Explanations *(v0.16)*

Every hover explanation, in plain, short English (Dylan, Nov 15). `player.json` › `screen.hints`; `{…}` are filled by the screen. Keys marked **new** are new in v0.16.

| Key | Explanation |
|---|---|
| `switch` | Turn these explanations on or off. This browser remembers your choice. |
| `sheet` | This is you: your money, your payments from France, and your secret conversations. |
| `errand` | The one thing you came to do tonight. The result shows here once it's checked. |
| `errandReward` | The one thing you came to do tonight. Finish it before the last council before midnight for a secret extra act at midnight. |
| `errandNoReward` | The one thing you came to do tonight. In this game it earns no extra act. |
| `trackDeadline` | Your errand's deadline. Finish before this stage for an extra act at midnight. |
| `midnightExtra` | Your errand's secret extra act. Optional. It must be on a different guest, and you can't guard yourself. |
| `here` | Who's with you, then everyone else. You can see who's together, but not hear them. |
| `briefing` | Your briefing: who you are, what you know, and what you want. Only you can see it. |
| `rules` | The rules of the evening, one button per section. |
| `header` | Who you're with right now. |
| `earlier` | Earlier conversations in this stage. Click one to open or close it. |
| `input` | Type what your character says (up to {max} characters). Start with @ to talk to one guest, or / to act. |
| `mention` | Talk to one guest. Everyone here still hears you. |
| `commands` | Do something instead of talking, like paying or borrowing. |
| `speak` | Say your line. Pressing Enter does the same. |
| `do` | Do what's in the box. It's an action, not speech. |
| `pass` | Say nothing this time. The conversation moves on. |
| `end` | End this secret conversation. The other guest gets a last word. |
| `talkingTo` | The guest you're talking with. Only what everyone knows about them. |
| `move` | Your chance to move: stay, join another group, or start a secret conversation. |
| `stay` | Stay in this conversation. |
| `join` | Go over and join another guest's group. |
| `colloquio` | Start a secret conversation with a guest. Others will notice. |
| `seat` | Your conversation is over. Choose where to go next. |
| `midnight` | Choose your act for midnight. No one sees it. |
| `confirm` | Lock in your choice. You can't change it. |
| `close` | Close this and go back to the conversation. |
| `play` | Play the evening as this guest. |
| `wait` | Wait for room in a group, or pair up with the next guest who has nowhere to go. |
| `city` | What everyone in Florence knows, grouped by subject. |
| `web` | Who's connected, what you've heard and seen, and your notes. Click to open or close. |
| `select` | Select this guest: their card shows on the right and their lines light up. Click again or press Escape to clear. |
| `loreLink` | Something everyone in the city knows. Click to read it. |
| `earlierLine` | Open or close this earlier conversation. |
| `deckTab` | Go to this topic. |
| `deckCard` | Click the card, or press →, for the next topic. |
| `deckBack` | Previous topic. ← works too. |
| `selected` | The guest you selected. Only what everyone knows about them. |
| `back` | Back to what you were looking at before. |
| `openWeb` | Open the Web of Confidences with this guest selected. |
| `notaioHint` | Il Notaio's advice for right now. Click to hide or show it. |
| `webNode` | Select a guest. Select a second to see what passed between them. |
| `recordTab` | What you heard and saw of the selected guests, newest first. |
| `notesTab` | Your private notes, by guest and pair. Select someone to write on them, or no one for a free note. |
| `noteText` | Your note. Only you see it. |
| `noteSave` | Save this note. It survives a reload. |
| `conclude` | Use this note as your conclusion. It counts once you press Do; only the latest counts. |
| `concludeWaiting` | Finish the choice in front of you first. |
| `noteItem` | Select who this note is about. |
| `portrait` | {name}. Click to select them. |
| `myBriefing` | Your briefing |
| `more` | There's more below. Click or scroll. |
| `key` | Each kind of tie has its own colour and line. |
| `keyType` | Highlight every line of this kind. Click again to clear. |
| `reading` | Il Notaio's summary of what you've heard and seen of them, stage by stage. Click to tuck it away or bring it back. |
| `faction` | A faction. Its guests sit together under its name. |
| `track` | The evening, stage by stage. Filled: done. Wide: now. Outlined: still to come. |
| `trackPast` | {stage}: over. Click to read it again. |
| `trackNow` | {stage}: now. |
| `trackNext` | {stage}: still to come. |
| `return` | Back to the current stage. What you've typed stays in the box. |
| `pastStage` | An earlier stage, to read only. |
| `lookingAt` | The guest you selected. Only what everyone knows about them. |
| `deselect` | Stop looking at this guest. |
| `backToTalk` | Back to whoever you're talking with. |
| `resize` | Drag to resize. Drag all the way in to hide. |
| `loreEntry` | Something everyone in the city knows. Back returns you. |
| `roomToken` | {name}, with others. Click to select them. |
| `roomPair` | {name}, in a secret conversation. Click to select them. |
| `places` | Every place in the house and who's there now. Yours is marked; a closed door means a secret conversation. Hover a name to read about it. |
| `placePrivate` | Two guests in a secret conversation. You can see who, not what. |
| `rulesSection` | Open this section. × goes back. |
| `rulesShrink` | Back to all the sections of the rules. |
| `cityRow` | Read this entry. The arrow goes back. |
| `cityBack` | Back to the list of everything the city knows. |
| `hideRight` | Hide this panel for more room. The handle at the edge brings it back. |
| `showRight` | Show the right panel again. |
| `glossary` | The game's words, A to Z, with a search box. |
| `glossarySearch` | Type to find a word. |
| `glossaryRules` | Open the rules about this word. |
| `modalPrevious` | Go back to the one before. |
| `modalNext` | Go on to the next one. |
| `tourAgain` | Take the tour again. |
| `tourBack` | Back to the part before. |
| `tourSkip` | End the tour. Show me around starts it again. |
| `openingSkip` | Show the whole story at once. |
| `pastSummary` | Il Notaio's summary of this stage, with the guests' own words. Click to tuck it away or bring it back. |
| `readingNote` | Something everyone knew at the start. Click to read it in The city. |
| `nextMove` **new** | When you next get to move. Each turn one guest gets a chance; if yours comes during a secret conversation, you miss it. Click for the rules. |
| `factLink` **new** | Click for the rules on this. |
| `lookingAtSelf` **new** | Your own card: what everyone knows about you. |

---

## The Look *(Art & Design's since Nov 15; v0.15; v0.16)*

How the screen looks (colour, type, texture, icons, and the values of every theme token) is **Art & Design's** (Art & Design, the screen's visual style). This doc keeps the layout and behaviour, and the few things any look has to do for them to work.

**What any look must keep apart,** since the player has to tell these apart at a glance:
- **The two right-hand cards:** "Talking with" (live, tinted) and "Looking at" (plain, raised), even when one covers the other (Right); and your own card ("This is you"), with its accent edge
- **Il Notaio's three voices:** his announcements to the room, his hint to the player, and his reading in the Web of Confidences, and within the reading, his sentences and the lore notes beside them (Onboarding; The Web of Confidences)
- **Speak and Do,** so a command never looks like speech, and the ring on Do when a conclusion is waiting (The input box)
- **The six relationship colours,** different in lightness as well as hue, with line styles for those who can't tell colours apart, the player's own dashed note lines apart from known connections, and the halo on secret ties (The Web of Confidences)
- **The layers,** each with a shadow that says which is on top (Principles)
- **Reduced motion** wherever something slides, glides, or writes itself out

**Handed over** *(Nov 15)*, for Art & Design's doc to take up; this list goes once it has them:
- **Three directions** on a [design canvas](https://claude.ai/artifact/MgVNN1NijQxXrbuy56Tof2): a "palazzo ledger" (parchment and ink, serif type), a dark modern chat, and a clean light style with period accents
- **Dylan's leaning** (Nov 10): the palazzo ledger, with **rounded corners** rather than square boxes, and the movement card's three choice tiles in the ledger's styling. Decide after the first playtests
- **Applied through the theme file only:** a chosen look edits `web/theme.css`, never the components. The card styles, the relationship colours, and the faction colours are already tokens
- **Still to settle:** how the sheet reads as more than a list (a purse with its count, a payroll seal, tally marks for secret conversations), the two card kinds, the hint versus the announcements, and the Web of Confidences' bar
- **Portraits:** until Art & Design's are ready, initials in a faction-coloured circle

**New in v0.16, for Art & Design to give values** (tokens; the demo's values are placeholders):
- **The floating cards:** the stage bar and the message box as rounded cards over the conversation, the right panel short of the top with rounded top corners
- **The layer shadows:** downward under the stage bar; upward over the conversation from Il Notaio's hint, the message box, and his two boxes; and the Web of Confidences' deeper, wider shadow, deeper again when open. Dark mode needs darker, wider ones. **The conversation's fade** where it slides under the cards
- **The breathing highlight** (a soft pulsing outline) on the way forward or back, and the filled Close at either end of the modals' chain
- **The light "world" card** for hovers about the world, apart from the dark explanations
- **The red** of End conversation (the theme's danger colour); **the "Secret" halo** on the web; **your own card's accent edge**

---

## Playtest Findings

What each playtest decided, and where it now lives in this doc. Technical Design recorded the decisions, not always the problem behind them, so a "why" is given only where one was written down. New playtests are logged here in full: what Dylan found, then what was decided.

**Playtest 1** (Dylan, Nov 12; Technical Design v0.40–v0.43):

| Decision | Why, where recorded | Here |
|---|---|---|
| First-hand only: nothing summarized or inferred by a model | Keeps the player and the AI guests on equal terms; the screen can't show anything false | Principles (since v0.5, Il Notaio reports but never connects; guarded since v0.13) |
| Everyone sees the room, AI guests too (a Mechanics rule since v0.32) | Without it a human can't follow the evening | The Screen, Left |
| The web and the record, then notes on a guest, a pair, or free | | The Web of Confidences |
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
| The Web of Secrets: an always-visible raised bar along the bottom | | The Web of Confidences |
| Six colour-coded relationship types, a key, faction labels | | The Web of Confidences |
| Il Notaio's reading, guarded | Dylan's choice over templates or an unguarded call | The Web of Confidences |
| The evening's track | | Centre |
| Stacked cards on the right, with a peek back; a resizable panel | | Right |
| Two kinds of card, "Talking with" and "Looking at" | | Right |
| The "talking with" card is filled only when someone has the player's ear | Before, a group showed its last speaker, which changed on nearly every line | Right |
| The left column's order: sheet, deck buttons, errand, room | | Left |
| The errand's reward shown on the card, the track, the hint, and the midnight card | Make it clear that finishing the errand earns an extra act at midnight | Left; Centre; Decision Cards |

**Notes after v0.1** (Dylan, Nov 13):

| What Dylan found | Decision | Here |
|---|---|---|
| Unclear what a note's "This is my conclusion" button does | It fills the box with the conclusion and highlights Do, rather than sending at once (v0.2) | The Web of Confidences, Notes |
| A conclusion only means something about a guest or a pair | Free notes get no conclusion button (v0.3) | The Web of Confidences, Notes |
| A conclusion only means something for a character with a knowledge errand | The button shows only for those characters, never filtered by guest, which would give the answer away (v0.4) | The Web of Confidences, Notes |

**Design review** (Dylan, Nov 13; v0.5):

| What Dylan asked | Decision | Here |
|---|---|---|
| Make the screen Il Notaio forward: AI is good at the right information at the right time | He narrates, summarizes, and gives context, but never connects or hints | Principles |
| His box inside What you heard and saw, which holds only dialogue | Expanded over the dialogue, minimizes on a click; events and background are his | The Web of Confidences |
| Curved lines, like the board's slide | The slide's ring layout with faction arcs | The Web of Confidences |
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
| The Web of Secrets bar's text looks lopsided | One centered group: ▲, title, selected guests | The Web of Confidences |
| Clicking a portrait in the list of who's with you doesn't select | A portrait selects wherever it appears; your own opens your briefing | Selection; Left |
| Wanted separate locations, all visible | Named places, always listed; a Colloquio goes to a random place. Mechanics decides | Left, The room |
| Combine "Notes" and "All your notes" | One tab, filtered by the selection | The Web of Confidences, Notes |
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

**The look moves to Art & Design** (the Hub, for Dylan, Nov 14; v0.15):

| Settled elsewhere | Decision here | Here |
|---|---|---|
| The screen's visual style is Art & Design's; layout and behaviour stay here | The look's notes are handed over; this doc keeps what any look must keep apart | About This Document; The Look |

**Technical Design's guard** (Technical Design v0.51; v0.13):

| Settled elsewhere | Decision here | Here |
|---|---|---|
| Code chooses the lines; the model only puts each in reported speech | Adopted (Dylan): he reports in his register rather than telling a story | Principles; The Web of Confidences |
| A failed sentence falls back to a plain quote of its line | Adopted, unmarked; the tally stays as a closing line | The Web of Confidences |
| Context is code's: connection lines word for word, and lore as a note after a line that names it (Dylan) | Adopted, as a named exception to "never connects" | Principles; The Web of Confidences |

**Lore's opening** (Lore v0.13; v0.14):

| Settled elsewhere | Decision here | Here |
|---|---|---|
| The opening ends on "Speak as your character would, plainly", without the line about strange talk (Dylan) | Adopted; the warning moves to the tour and says outright that the guests are AI and modern talk confuses them (Dylan) | The Opening; The Tour; Onboarding |

**Demo review** (Dylan, Nov 15; v0.16). Dylan clicked through the demo page and commented on it; each change was tried in the demo before it was written here. The main points:

| What Dylan found or asked | Decision | Here |
|---|---|---|
| Il Notaio's box should show when he says something new | It flashes and the new words fade in | Onboarding |
| A refused command's notice was vague, and in the wrong place | Il Notaio explains it in his hint box, with the specific reason | Commands |
| No `/bribe` in the menu (Mechanics' handoff) | Every command listed; unavailable ones folded, with reasons | Commands |
| Float the top bar and the message box; shadows so they read as above the chat; fade the lines under them | Floating cards with layer shadows; the conversation fades at its edges | Centre; The Look |
| The stage bar: many tries at hover motion and magnification, all wobbly (Dylan: "move back towards some sensible default") | A standard step bar, a tooltip under the row, no motion | Centre, The stage bar |
| The bar should show the real stages: mingling, then council (Mechanics v0.37) | The full evening's eleven stages | Centre, The stage bar |
| A way to tell when you'll next move; no way to call a Colloquio yourself | "Your next move" over the message box; Il Notaio says when one was missed. The rule stays (watch item) | The input box; Speaking and Waiting |
| Decision cards should sit where the chat box is | They take the box's place; from a past stage, one wide Return button | Decision Cards; Past stages |
| Only two choices after a Colloquio, when the rule says the invitee chooses | The rule held (every group was full); the card now says so | Decision Cards |
| End conversation under Speak and Pass, and red | Both End buttons, in red | The input box |
| Clicking the sheet's lines, the errand, and its reward should open the right information | Rules sections, the briefing's errand card | Left |
| "You" should be clearly marked; then no box, no ring, no label | "You are Francesco Pazzi" over a role line; "This is you" on your own card | Left; Right |
| Factions repeated twice on cards | The faction line goes; the subtitle carries it | Right |
| The "Talking with" card's row of tokens | Gone; the places show who's with you | Right |
| Drag the right panel past its narrowest to hide it | Done, with a fade while past the point | Right |
| Modals: Previous/Next, slides that reverse going back, highlights pointing the way you're going; then slower; then subtler | Chained footers, mirrored backwards, 24-pixel slides in 300 ms | Briefing, rules, the city, and the glossary |
| The briefing: drop How you speak and Resources; combine short cards | Five cards: Social awareness dropped too; two merges | Briefing, rules, the city, and the glossary |
| The web: rotate it like a clock; fatter selection; names clear of each other; fill the space; scale the key and column | A fixed ring by roster order; the web fitted to its space; key and column scale | The Web of Confidences |
| Two lines between Francesco and Lupo | One line per pair and type | The Web of Confidences |
| "If every line from Francesco is haloed, is it telling you anything?" | The halo marks only secret ties; "Secret" in the key, selectable | The Web of Confidences |
| Notes: all of them, grouped, foldable, clickable to select | Done | The Web of Confidences, Notes |
| "Nothing" between two guests who'd talked in a room | By design (only what one says to the other); the empty state now says so | The Web of Confidences |
| Il Notaio's boxes: lower down, fade what's behind, shadows; drop "He may be wrong" | A fifth (summary) or a seventh (reading) of the way down, content faded behind, labelled as his | Past stages; The Web of Confidences; Principles |
| Turning explanations off stilled the breathing | The switch governs only the explanations | Hover explanations |
| Plainer English, then shorter: the tour and every explanation | Rewritten | The Tour; Explanations |
| Editorial pass: one name for a Colloquio, the payroll, midnight, no ornate directions | "Secret conversation", "Payments from France", "for midnight", plain prompts and hints | The Player's Words |
| "Web of Confidences" | Renamed everywhere | The Web of Confidences |
| The errand card's reasons in the sidebar | Just the task there; the reasons stay in the briefing | Left |

---

## Open Questions

- **Your midnight choices in the sheet afterwards** ("You guarded Giorgia; you watched Lupo"), and **"Choosing now"** during midnight: ideas for later, not decided (Dylan, Nov 14)
- **A storybook opening, maybe in v2** (Dylan): illustrations and more interaction, with Art & Design
- **Does the full game's stage bar fit?** *(v0.16)* Eleven stages fit from a 1100-pixel window up in the demo. Check on the first full game, and at narrower windows
- **A missed movement window** *(v0.16; watch item, not a handoff)*: a window that falls while you're in a Colloquio is lost (Mechanics). The screen now says when yours is due and when one was missed. If playtests show it feels unfair, ask Mechanics whether a lost window should come back afterwards
- **Is Il Notaio conservative enough, or too thin?** Read his readings and summaries in the first playtests (v0.13). Without "He may be wrong" *(v0.16)*, check that players still read his boxes as his report, not the game's truth
- **Should his box start minimized?** It stays expanded, now opening lower with the column faded behind it (v0.13; v0.16)
- **The full game's cards:** candidate selection, the speech, the ballot (vote and buy), and the run-off, once Technical Design's full game loop spec says what each phase offers
- **Does the player wait too long?** Measure how long a played game takes
- **A previewed "polish" for off-register input:** not now (v0.14)
- **The board's slide versus the screen's web:** six types against four categories; now also the name (tracker)
- **Pairs with two different ties** *(v0.16; parked)*: side-by-side lines were tried and didn't separate cleanly. Pick up again if a pair's lines read as one
- **Public and private ties for the same pair** *(v0.16)*: Francesco's briefing repeats three public ties in his own words (Piero, Giorgia, Lupo; `relationships.json`). The screen now draws one line each. Whether the repetition is intended is Characters' to say (tracker)
- **The short errand line** *(v0.16)*: until Characters writes one per guest, the screen cuts the errand after its bold part, which would drop a condition from Lupo's ("Money from the French Embassy treasury doesn't count")
- **Small things Dylan may want** *(v0.16)*: solid red rather than outlined for End conversation; stronger shadows; the conversation's scrollbar outside its fade; the web's slide at 800 ms rather than 600
- **A card click on a modal's last item** turns nowhere; whether it should carry on into the next modal, as "On to …" does, is open
- **The large portrait at the top of the left panel** opens your briefing, while your portrait in the places selects you. Keep, or make both select? Keep for now

---

## Glossary Draft *(v0.7; v0.16; for the setting pack)*

A first draft of the glossary's entries, from Mechanics v0.34, in the in-world names. Numbers here are today's tuning values; the setting pack fills them from the game's values, so tuning never leaves an entry wrong. Lore may refine the in-world wording (Gonfaloniere, the factions). Terms that only matter in the full game are marked †; the mini-game can leave them out.

| Term | Definition |
|---|---|
| **Ballot** † | The secret vote that ends the evening. Every living guest casts one vote for any living guest, and may buy extra votes for that guest at 5 Florins each. Most votes wins; Il Notaio names only the winner |
| **/bribe** | Hand Florins to the guest you're in a secret conversation with. Whatever they promise in return is up to them |
| **/borrow** | Go on France's payroll: take one payroll payment of 3 Florins from the Embassy's treasury. Medici and Pazzi only |
| **Candidate** † | The one living guest each of the two great houses, Medici and Pazzi, puts forward for Gonfaloniere |
| **Group** | An open conversation of two to four guests. Anyone may join while it has room, and only those in it hear what's said |
| **Colloquio** | A secret conversation between two guests. No one else can join or hear it. Starting one uses your move, and the other guest can't refuse, but everyone sees the two of you slip away *(v0.16)* |
| **/conclude** | Privately record what you've worked out, for an errand that asks you to find something out. Only your latest conclusion counts |
| **Council** | A private meeting of your own faction. Nothing is shared unless someone says it aloud |
| **Dominicans** | The friars' faction. They can't go on France's payroll. They win if the guest elected Gonfaloniere has repented |
| **Errand** | Your character's own task tonight, in your briefing. Your errand card says what finishing it earns. *(v0.16: once the rules primer has a section on errands, the entry points to it)* |
| **Florins** | The evening's money. Everyone starts with 10 and receives 1 at the start of each round of mingling. Purses are private |
| **French Embassy** | France's faction. It keeps the treasury that pays France's payroll, and knows who is on it. It wins if anyone in the elected candidate's family is on France's payroll |
| **France's payroll** | Taking a payroll payment, 3 Florins from the French Embassy, puts a guest on France's payroll. If anyone in the winning candidate's family is still on it at the ballot, France wins. Who is on it is private unless someone tells |
| **Gonfaloniere** † | The office the evening decides: the head of Florence's government. Only a Medici or a Pazzi can stand |
| **Guard** | A midnight act. A guest guarded by two or more others survives an attack |
| **Il Notaio** | Italian for "the notary": the one who records the evening. He notes who joins, leaves, and slips away, and announces what all the city hears. He belongs to no faction |
| **Kill** | A midnight act. It's carried out unless the killer was watched by two or more guests, or the target guarded by two or more. Killers are never named |
| **Medici** | One of the two great houses, competing for Gonfaloniere. They win if their candidate is elected, unrepentant, with no one in the family on France's payroll |
| **Midnight** | When each living guest secretly chooses one act: kill, guard, or watch, each on a different guest. Il Notaio then announces who died, never who killed them |
| **Move** | Your turn to change company, when it comes: stay, join another guest's group, or start a secret conversation |
| **Pazzi** | The other great house, competing for Gonfaloniere, on the same terms as the Medici |
| **/repay** | Pay back one payroll payment, yours or a relative's, by returning 3 Florins, any time before the ballot. Private |
| **/repent** † | A candidate's public confession during the speeches. It can't be taken back, and it makes the Dominicans' win their own |
| **Round of mingling** | Open play, when guests form groups, move, and start secret conversations |
| **Run-off** † | If the ballot ties, one fresh vote among the tied guests, with no buying. A second tie is decided by lot |
| **Speeches** † | Each candidate addresses the city, and others may speak. The only time a candidate can repent |
| **Watch** | A midnight act. A guest watched by two or more others can't carry out their kill. The watchers learn nothing |
| **Web of Confidences** | Your record of who is tied to whom, what you've heard of each guest, and your notes. The bar at the bottom of the screen *(renamed v0.16)* |

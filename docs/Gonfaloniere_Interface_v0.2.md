# Gonfaloniere
## Interface & Experience — Working Document
### Version 0.2

---

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

**First-hand only.** The screen shows what the character knows from their briefing, what's public, what they saw and heard tonight, and the player's own notes. **Nothing is summarized, inferred, or connected by a model,** with one exception: Il Notaio's reading in the Web of Secrets, a guarded summary of the player's own material, labelled as his reading. That's the same rule the characters live under. It keeps the player and the AI guests on equal terms, and it means the screen can't show anything false.

**The player reads at their own pace.** Nothing auto-advances, and nothing moves under the player's eye while they read (Dylan, Nov 12).

**One layer at a time, clearly stacked.** The Web of Secrets sits above everything, a selected card above the "talking with" card, a deck over the screen, never under it. Each layer's shadow says which is on top.

---

## Build State *(Nov 13)*

1. **The mini-game is playable** as Francesco: the screen from Technical Design v0.40–v0.46 is built (#80, #81, the Hub's browser fixes #88, and v0.44–v0.46's screen #90). Francesco's errand can't be done there (Fra Tommaso isn't in the cast), and the mini-game runs with `plot_reward` off
2. **Queued:** #102 (the errand card's reward line, the track's deadline mark, the hint, the midnight card's extra-act row) and #95 (the room)
3. **Then the full game,** once the full game loop is built: councils, Piero, candidate selection, speeches and `/repent`, the ballot and `/buy`, the run-off, and the full death and result screens. Dylan playing a whole game is the milestone's test (tracker, item 2)
4. **Then v1, the first public release:** Il Notaio's full player-facing role (Onboarding, below)

To try it: `npm run play -- --as "Francesco Pazzi" --minigame` (add `--fake` for no model calls).

---

## The Screen

A single page in the style of a Slack chat. Placeholder portraits until Art's are ready: initials in a circle, coloured by faction.

```
┌─────────────────┬────────────────────────────────────┬──────────────────┐
│ YOU             │ The second round…  ◆◆◆◇◇◇◇ (track) │ ▔ Lupo ▔▔▔▔▔▔▔▔▔ │
│ portrait · name │ Capannello with Giorgia, Lupo      │ Giorgia (selected│
│ purse·pensions· │ ▸ Earlier tonight (collapsed)      │ (or a lore entry)│
│ withdrawals     │ Il Notaio: …                       │                  │
│ [Briefing]      │ Giorgia Pazzi: …                   │                  │
│ [Rules] [City]  │ Lupo (to you): …                   │                  │
│ ┌ ERRAND ─────┐ │ ┌ Il Notaio's hint ───────────────┐│                  │
│ └─────────────┘ │ └─────────────────────────────────┘│                  │
│ THE ROOM        │ [@][/]  > …            [Pass][Speak]│                  │
│ ● ●●  ●●● ●     │ e.g. "Sit with me. We should talk." │      ⇔ resizable │
├─────────────────┴────────────────────────────────────┴──────────────────┤
│ ▲ THE WEB OF SECRETS (always visible; click to slide up)   ▒ shadow ▒  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Left: you

In this order *(Dylan, Nov 13)*:
- **Your sheet:** portrait, name, faction, purse, pensions held, and Colloquio withdrawals. These should read as more than a list (a purse with its count, a pension seal, tally marks for withdrawals), but how they look is settled with the look (The Look, below)
- **Three buttons** opening card decks: **Your briefing**, **The rules**, and **The city** (public lore). There's no button for the Web of Secrets, which is always at the bottom
- **The errand card,** pinned, so the errand stays in front of the player. It shows the errand's text, then its result once the check has run, in the same words as `{plot_status}`
  - **What it earns:** under the errand's text, one line in the card's accent. With `plot_reward` on: finish it before the last council before midnight, and you get one extra act at midnight (a second kill, guard, or watch, on a different guest) that no one else is told about. With it off, as in the mini-game: errands earn no extra act tonight, so the player isn't left guessing. The card's hover explanation says the same
  - **After the check,** `{plot_status}` replaces that line, so the card then says plainly whether the extra act is the player's
- **The room** *(Mechanics, Everyone Sees the Room)*. Where every living guest is: each group as a cluster of tokens, a Colloquio pair as two tokens joined, and the player's own group marked. Tokens in a group overlap, and spread out on hover. Clicking a token selects that guest. In councils, at midnight, and at the ballot it shows only who's with you, as the rule says

### Centre: the conversation

- **The time label and the conversation's members** at the top. **End conversation** sits here in a Colloquio
- **The evening's track,** to the right of the time label: the evening's stages as a row of marks, past ones filled, the current one highlighted, the rest outlined. For the full game: the arrival, each council and round of mingling, midnight, the candidates, the speeches, the last council, and the ballot. The mini-game shows its own shorter schedule. Hovering a mark names the stage in the in-world names. **With `plot_reward` on, the errand's deadline** (the last council before midnight) carries a small errand mark, whose hover says "Your errand's deadline: finish it before this for an extra act at midnight". On a narrow window the track wraps below the label. The stages come from the game's schedule and their names from the setting pack
- **Only the current conversation is open.** Conversations in other locations collapse into an **Earlier tonight** section above, one line each ("Capannello with Giorgia and Lupo, second round"), each opening in place when clicked. **Selecting a guest opens the earlier sections they appeared in,** with their lines highlighted; deselecting collapses them again. Nothing is lost; the current room is just never confused with the last
- **The stream:** lines, Il Notaio's notes in their own style, action lines, and lines addressed to the player marked as such. A "…is speaking" indicator shows while a line is generated
- **A selected guest's lines are highlighted** in the stream
- **Lore links:** when a line mentions the title or alias of a **public** lore entry ("San Frediano", "1478"), the term becomes a link that opens the entry in the right panel. Anyone's line, the player's included. Relationship entries never become links. *The match is on the line's words only, never on what was in a speaker's prompt* (Technical Design; it would hint at what the model was given)
- **Decision cards** appear in the stream when the game waits for the player (Decision Cards, below). While one is open, the message box is closed
- **Il Notaio's hint,** docked under the stream (Onboarding, below)

### The input box and its buttons

The buttons do different jobs, so they look different:

| Control | Job | Looks like |
|---|---|---|
| **Speak** | Send the line | The one filled, primary button. **Active only when there's something to say:** not when the box is empty or holds only `@` or `/` |
| **Do** | Run a command | Replaces Speak when the box starts with `/`, in its own style, so a command never looks like speech |
| **Pass** | Give up the turn's message | Secondary, outlined |
| **End conversation** | End a Colloquio | With the conversation's header, away from the box, since it acts on the conversation, not the message |
| **@** and **/** | Open the guest and command menus | Small icon buttons inside the input, not peers of Speak |

- **The menus open and close with their character.** Typing `@` opens the guest menu and `/` the command menu. Deleting the character, Escape, or clicking away closes either
- **The command menu** lists only the commands allowed right now, each with a one-line hint (Commands, below)
- **A 500-character counter** and **one example line** under the box (Onboarding, below)

### Selection *(Dylan, Nov 12)*

In the chat view, **one thing is selected at a time:** a guest (a name in the stream, a token in the room, or a name on the left) or a lore topic (a lore link). A new selection replaces the last, clicking it again deselects it, and Escape clears it. A selected guest shows on the right, has their lines highlighted, and opens their earlier conversations. A selected topic shows its lore entry on the right. **Two guests can be selected only in the Web of Secrets.** No shift-click.

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
- **Resizable:** a drag handle on the panel's left edge sets its width, between a minimum and a maximum, remembered in the browser
- **What it shows is public and fixed:** portrait, name, faction, public subtitle, and the public facts everyone knows at the start (the public relationship lines). Never what the player has learned; that's the Web of Secrets' record
- **A lore link** opens its entry here, with a way back. **Public lore is seen in exactly two ways** (Dylan, Nov 12): from a lore link, here; otherwise by browsing The city deck. The right panel never browses lore, and the deck never opens from a link
- **"Open in the Web of Secrets"** opens the web with the selected guest

### Card decks: briefing, rules, and the city

None of them is a wall of text:
- **One topic per card.** Your briefing: Who you are, How you speak, Your errand, Your faction, What you know, Your secrets, Relationships, and **Your past** (the character's private lore). The rules: one card per topic of the rules primer. The city: one card per public lore entry, grouped by subject, with a list to jump to any. Relationship entries aren't in it; they're for the AI guests
- **Clicking anywhere on the card** swipes it left to the next topic. A separate back control goes back, and the arrow keys work too. Tabs along the top show where you are and jump. Each deck remembers its place
- **No auto-advance**
- **The deck opens over the screen, never under it**

### The Web of Secrets *(Dylan, Nov 12–13)*

The web of relationships, plus the player's own record and notes.
- **Always there:** a raised bar along the bottom of the screen, with a shadow, so it reads as one layer above everything. The bar shows the title and the current selection. **Clicking the bar** slides it up to about nine-tenths of the window's height, leaving the top of the screen in view; clicking the bar again, or Escape, slides it down
- **Up to two guests can be selected inside it:** a click selects a first and then a second guest, a third replaces the older, and clicking a selected guest deselects it
- **The web:** all twelve guests as a relationship diagram, in the shape of the board's Web of Secrets (Visualization & Sharing, The Board, slide 7). **Its lines are fixed:** the public connections, plus those the player's own briefing gives them, marked as theirs. The game never draws a new line
- **Factions are labelled:** each faction's guests sit together, under the faction's name in its colour, apart from the key
- **Colour-coded lines and a key:** each relationship type has its own colour, and a line style for those who can't tell colours apart. A **collapsible key** on the web's left lists the types; clicking one highlights every line of that type, and clicking it again clears it. The six types (romance, kin, service, alliance, rivalry, money) and their colours are fixed (Technical Design, The Web of Secrets; `relationships.json`). The colours are theme tokens (`--rel-<type>`), different in lightness as well as hue. The player's own note lines stay dashed, in their own style
- **One guest selected:** their connections highlighted, and **what you heard and saw of them** tonight: their lines in your presence, payments and Colloquios you saw them in, and their death if you saw it, newest first
- **Two guests selected:** their connection, **what you heard pass between them,** and the events you saw involving both
- **Labelled honestly:** "what you heard" and "what you saw", never "everything they've said". Two guests' private talk is never in it

**Il Notaio's reading** *(Dylan, Nov 13)*. A small box in the web's bottom right, styled like his hint in the stream. With a guest or a pair selected, he says in two or three sentences what the player has seen of them, and for a pair what has passed between them.
- **Labelled:** "Il Notaio's reading. He may be wrong."
- **Every claim about tonight quotes** the words or names the event it rests on. If a quote can't be checked, the box shows the plain tally instead ("You've heard them speak 4 times; you saw one payment")
- It appears on a new selection once the web is open, and stays until something new enters that selection's record
- *What it's fed, the prompt, the quote check, and how it's recorded are Technical Design's (Player Interface, Il Notaio's reading)*

**Notes** *(Dylan, Nov 12)*. Written in the Web of Secrets, and attached the way its selection works:
- **One guest selected:** a note about them. **Two:** a note about the pair, drawn on the web as the player's own dashed line, styled apart from known connections. **Nothing selected:** a free note
- **All your notes:** a tab listing every note, newest first, grouped by guest and pair. You can filter by a guest, and clicking a note selects its guest or pair in the web
- **Any note can become a conclusion** *(v0.2; Dylan, Nov 13)*. "This is my conclusion" doesn't send anything itself. It hands the note to the input box, so the player sees what they're concluding before it counts:
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

- **In a Capannello or council, the box is always open.** A message sent is held and spoken at the next break between lines, never cut into one. The box then says the turn's message is used until the next turn. **Pass** gives it up
- **When someone addresses the player,** the game waits for them, and the line is marked "to you". The answer never uses the turn's message, and passing is always allowed
- **Addressing someone:** @-mention a guest present, in a Capannello, and they must answer next. The @ isn't shown in the stored line, which reads "(to Name)" like anyone's
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

## Start, Death, and End

- **Start screen:** one card per playable character, two in the full game (Piero and Francesco) and one in the mini-game (Francesco). Each shows the portrait, name, faction, and the briefing's public subtitle and first paragraph. Choosing a card starts the game. Until v1, the start screen also carries the orientation line (Onboarding)
- **Death:** the box and the cards close, and a banner says the character has died. As a **spectator** the player sees only Il Notaio's city-wide announcements through to the result (Mechanics). The web, the record, and the notes stay open. Then the end screen
- **End screen:** the outcome as Il Notaio announces it, whether the player won (their character's win condition, alive or dead), and their errand's result. Then **Open the full replay,** this game's replay with every character's inner life. In the mini-game, which has no election, it shows who died at midnight and the errand results

---

## Onboarding

How a new player learns the game without a tutorial up front.

- **One example line under the input box,** plain and period-fitting, rotated from a short list in the setting pack. It shows the register without a rule to read: plain English, no "thee", no flourish
- **An orientation line:** speak as your character would, plainly; guests react to strange talk as guests would. On the start screen until v1, then Il Notaio's first note
- **Il Notaio's hint** *(Dylan, Nov 12)*. A small docked box under the stream, collapsible. He says in a line or two what the moment asks of the player: the first council, the movement window, being called aside, midnight, the ballot, or a refused command. **With `plot_reward` on, also the start of the last round before the errand's deadline:** the last round to finish the errand for its extra act. It shows whether or not the errand is done, so it never gives a check's result away early. It also points to the hover explanations. Templates only, from `notaio.json`, no model calls. **Styled clearly apart from his announcements:** the announcement is the notary speaking to the room, the hint is him speaking to the player
- **Hover explanations** (The Screen, above)

**Il Notaio for the player in v1** (Mechanics, Il Notaio — Player-Facing Duties; not needed for the milestone):
- **Orientation:** the hint above covers it in the milestone build. Originally: short private notes at the first council, the first movement window, the first Colloquio, midnight, and the ballot (in the mini-game: the first movement window, the first Colloquio, and midnight), each shown once
- **Questions:** the player can @-mention Il Notaio at any time to ask about the rules or the state of the game, as a private aside: nothing is spoken and the game doesn't pause. He answers briefly in his voice, and says so if he doesn't know. *The call, and what it may see, are Technical Design's*
- **Corrections:** every refusal explained in his voice, one template per reason
- **The jailbreak warning:** the first hit is a private warning (Mechanics, Jailbreak Rule; Technical Design, Jailbreak Detection)

---

## The Look *(undecided; Dylan, Nov 10)*

- **Three directions** are on a [design canvas](https://claude.ai/artifact/MgVNN1NijQxXrbuy56Tof2): a "palazzo ledger" (parchment and ink, serif type), a dark modern chat, and a clean light style with period accents
- **Leaning:** the palazzo ledger, with **rounded corners** rather than square boxes, and the movement card as three choice tiles with a guest picker below, in the ledger's styling. Decide after the first playtests
- **Applied through the theme file only.** The first build is plain and neutral; a chosen look is applied by editing `web/theme.css`, not the components. The card styles above (tint, shadow, label), the relationship colours, and the faction colours are all tokens
- **To settle with the look:** how the sheet reads as more than a list (purse, pension seal, tally marks), the two card kinds, the hint versus the announcements, and the Web of Secrets' bar
- **Portraits** are Art's; until they're ready, initials in a faction-coloured circle

---

## Playtest Findings

What each playtest decided, and where it now lives in this doc. Technical Design recorded the decisions, not always the problem behind them, so a "why" is given only where one was written down. New playtests are logged here in full: what Dylan found, then what was decided.

**Playtest 1** (Dylan, Nov 12; Technical Design v0.40–v0.43):

| Decision | Why, where recorded | Here |
|---|---|---|
| First-hand only: nothing summarized or inferred by a model | Keeps the player and the AI guests on equal terms; the screen can't show anything false | Principles |
| Everyone sees the room, AI guests too (a Mechanics rule since v0.32) | Without it a human can't follow the evening | The Screen, Left |
| The web and the record, then notes on a guest, a pair, or free | | The Web of Secrets |
| Only the current conversation is open; the rest collapse into Earlier tonight | The current room is never confused with the last | Centre |
| Buttons look different by job | | The input box |
| Card decks, one topic per card, no auto-advance | People read at different speeds, and a moving page loses your place | Card decks |
| **Bug:** decks slid under the chat box | Fixed: decks open over the screen | Card decks |
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

---

## Open Questions

- **The conclusion button's edge cases** (v0.2): an unsent message is set aside and comes back after the conclusion runs or is cleared; the button is disabled while a decision card waits. Claude's defaults, for Dylan to confirm
- **The look:** the palazzo ledger is the leaning; decide after the first playtests (The Look)
- **The full game's cards:** candidate selection, the speech, the ballot (vote and buy), and the run-off. Design them once Technical Design's full game loop spec says what each phase offers
- **Does the player wait too long?** The whole game pauses for the player, and a group line takes a few seconds. Measure how long a played game takes; if it drags, look at what the screen can show while the player waits. *(Moved from Technical Design's open questions)*
- **A previewed "polish" for off-register input:** not now. It would cost a model call and a wait per message, and make the player's words not quite theirs. Add it only if a playtest shows casual input pulling the AI guests casual (Models & Research watches that). If added, it's always previewed and never silent, and Technical Design builds the call
- **The board's slide versus the screen's web:** the screen uses six relationship types where the board's slide uses four categories. Visualization & Sharing may align the slide; nothing waits on it (tracker)

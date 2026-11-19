# Gonfaloniere
## Interface & Experience — Working Document
### Version 0.22

---

## Changes in v0.22

*Nov 17. Dylan's further notes on the demo, after v0.21 merged. Detail in the sections named; the record is in Playtest Findings (the rows marked v0.22).*

- **A subtler paddle press** (Briefing, rules, the city, and the glossary): its flash fades over 550ms (900ms)
- **Il Notaio's titles pinned** (Il Notaio): his reading's and past-stage summary's titles stay at the top as his words scroll away under them through a fade
- **Il Notaio's boxes only as tall as their text** (Il Notaio): his hint drops its two-line minimum (a one-line hint is 24px shorter) and stops at five lines; his reading and his past-stage summary sit centred in a room 10% in from the top and the foot, growing with their text until they fill it, then scroll; minimizing glides them down to the foot
- **Gentler scrolling in the screen's scrolling places** (Scrolling, new): 80% of the system's distance per wheel step or swipe, eased, in the conversation, the side panels, the modals, Il Notaio's boxes, What You Heard and Saw, Notes, the message box, and the menus; the opening and the page itself as the system scrolls
- **The web's bar spaced out further** (The Web of Confidences): its title's letters 0.46em apart (0.16em; 0.34em for a while), the ▲ 32px from it (16px), 32px either side of the dot (16px), the guests' portraits 16px apart (8px)
- **Sending a line fades and slides** (The input box): what you typed fades out of the box, and your line slides up from under the box into the conversation
- **The line under the stage bar tucks away as you scroll down** (Centre): the stage card closes up around the bar, and comes back as you scroll up or reach the top; by your own scrolling, not the conversation following new lines
- **What you type is the dialogue's size, and the box is shorter** (The input box): 17px with the lines' spacing (15px); the example alone, without "Speak as your character would…", and a little smaller (15px); the box one line tall at least (three), 72px in place of 99px
- **More room under Il Notaio's titles** (Il Notaio): 12px between his reading's or summary's title and his first line (4px); his hint's text 4px further from its title
- **Fades for his hint and the web's side column** (Il Notaio; The Web of Confidences): his hint's words fade 28px under its title and at its foot while they scroll; What You Heard and Saw and Notes fade 20px under their tabs once scrolled
- **One type scale** (Type sizes, new): 12, 13, 15, 17, 20, 24, 30px and up, every text snapped to it; nothing read or clicked under 12px; one size per role. What You Heard and Saw and the glossary's definitions up to 15px, Il Notaio's open boxes to 17px; one heading size, 20px semibold (guest card names, modal titles, your own name)
- **Hiding Il Notaio's hint slides him behind the message box** (Il Notaio): whole, leaving a 14px strip of purple showing (no title, no Show) that brings him back; under the pointer he peeks out further (20px) and his title shows, centred; never showing below the message box
- **Il Notaio in his purple** (Centre; The Opening): his lines in the conversation take his boxes' purple text on a lighter purple ground with a purple rule down their left edge (pale green and green-grey before), set apart from his boxes, which keep the full purple and a darker border, so a line under a box doesn't look like part of it; and his name and its gloss heading the opening take his titles' purple (the story and "Choose your family…" keep the screen's text colour)
- **His reading opens out when he's done considering** (The Web of Confidences): from his "considering" box to the size of his reading, with his words fading in; and **minimized or open, it stays that way across selections until the web is closed**
- **His past-stage summary holds its state too** (Il Notaio): minimized or open, it stays that way as you step between past stages, and opens again once you're back in the current stage
- **The left panel's gaps in two sizes** (Left): the larger, all alike (above you, above the four buttons, above The Places; 46px in a tall window); the smaller, all alike (you to your sheet, the places to the empty ones; 26px); the errand 12px under the four buttons (6px); with it folded, The Places as far under it as the buttons are under you (about 145px; open, as before)
- **No explanations on Il Notaio's minimized boxes** (Il Notaio): his hidden hint, and his reading or summary minimized, show no explanation under the pointer (open, they still do)
- **Frosted glass on what floats over moving content** (Frosted glass, new): the stage card and the message box (the conversation now runs on under them), Il Notaio's hint, the @ and / menus, the explanations, the web's key, the stage's description, every More Below, the opening's Skip and Continue; boxes read at length stay solid
- **His name a floating island** (The Opening): a soft white glow round his name and gloss with no edge to see, his story scrolling past around it, floating up and away as you reach the story's end; More see-through
- **Your sheet tucks under you** (Left): pointing at your portrait or name slides it out, a click keeps it out, a click again tucks it back at once; a small arrow under you shows which; its room stays kept, the four buttons right under it, sliding down to their usual gap when it's clicked to stay out; a short window takes its room (after the errand has closed); your portrait and name no longer open the briefing
- **The web's key no longer folds itself in a narrow window** (The Web of Confidences): it lies over the drawing's corner, frosted, and the drawing keeps the whole width; the side column's tabs shrink a little in a narrow window so they stay on one line
- **The web and the modals clearer, the Looking At card less so** (Frosted glass): the web 85% (93%), rising and once up alike; the modals, the side modals and the paddles 88% (94%); the Rules' card over the rules 90% (solid); Il Notaio's tour boxes 88% (solid); his island in the opening 86% at its heart (solid); the Looking At card 98% (95%); no frosted glass inside another or inside a see-through card, which flickered in Chrome
- **Icons never see-through; glass from a box's colour, never its opacity** (Frosted glass): the Looking At card, his reading and past summaries at 97%; his island 94%; his tour boxes 78%; the Rules' card 95%; the overlay's blur on its own layer, so the side modals match the one in focus and nothing blurs inside a blur
- **The faction colours richer** (The Screen; The Look): about 30% more saturated, same hue, never lighter; the portraits, the web and the opening's card tints all match; a theme-token change, so a proposal for Art & Design
- **A click on the arrow under you, or along its line, pins your sheet** (Left): as a click on you does
- **No breathing anywhere** (Frosted glass; The Web of Confidences; The modals): the flicker went on through every fix, so nothing loops: the ways on in the modals (and the opening's Continue, the beckoning stages, Your Briefing after a skipped tour) keep a still highlight like the web's selection ring, much thinner (a 1.5px accent line 2.5px clear of the button); the web's ring is still, at the size it rested at, thicker (0.6); the side modals' edges and the speaking dot are still. *(Tried first: only the rings breathing, only with the web up; then the modals' breath as two cross-fading glows)*
- **What shows through the modals blurred more** (Frosted glass): 16px of their own, the one in focus and the side ones, on top of the screen's 5px
- **One colour boost for all the frosted glass** (Frosted glass): back on the glass that frosts (the cards, his boxes, the menus and tips, the web, More Below), at one strength (1.3); not on the dimming blurs. *(Removed for a moment, as a leftover on only some of the glass)*
- **A picked guest's lines tinted in their faction's colour** (The conversation): not the one shared yellow; a pale wash as soft as Il Notaio's lines, only in the faction's hue
- **The Medici burgundy again, balanced with the other families** (The Screen; The Look): as deep and as strong as the rest, darker and browner than the Romance line
- **The web's ring thicker still, its inside edge where it was** (The Web of Confidences): 0.9, growing outward
- **The tour's sixth step lights only the message box, its cards never under the web's bar, and a card above or below its spot centred on it** (The Tour)
- **The Looking At card, his summaries and the Rules' card all 87% with a 10px blur** (Frosted glass)
- **From the design review, its quick wins and cleanup** (The Review Pass, new): warmer neutrals and one paper colour, dark mode's depth the right way round, thin scrollbars, the web's lines parted by lightness, solid main buttons, soft fills for outlines, one close, one type scale, unclipped portraits, small fixes; the rest tried and rolled back
- ~~**Whatever words scroll under is solid**~~ (Frosted glass): pinned titles, their fades, every More Below; **rolled back** (Dylan, Nov 19): they take their box's glass again; **then Apple's scroll edge** (Frosted glass): in the Looking At card and Il Notaio's reading and summaries the titles sit outside what scrolls, on the box's own glass, and the words fade out before reaching a title or a More Below
- **A city entry's words centred on the whole modal** (The modals): its back row takes no room; **Your Briefing's words closer under its tabs** (about 20px closer)
- **The colours softer and deeper, "Apple, not Microsoft"** (The Screen; The Look; The Web of Confidences): the factions one family of softer, deeper colours a step off the primaries (a wine red, a deep teal, a warm bronze, an indigo), the relationship lines softened with them, the Do button's purple a little
- **Going back in the modals, Next loses its highlight** (The modals): the way back carries it
- **The tour's spotlights fit the screen as it is** (The Tour): your sheet slides out for its step; the stage bar's whole card; the conversation from under the stage card to the message box; the right panel's card; corners that follow what's lit
- **From the design review chat's transparency guidelines** (The Review Pass): a solid fallback for reduced transparency and more contrast; Il Notaio's tucked hint solid; no faint words on glass; one edge, shadow and top highlight on every frosted surface; the stage card, the message box and his hint one frost (78%, a 24px blur)
- **Two more of the guidelines' tweaks** (The Review Pass): a warmer, less glary light frost (`#F0ECE5`, not white or `#FAF7F1`); no drop shadow on the stage card and the web's bar, which sit at the screen's edges
- **Every corner not already set a little rounder** (Corners): about 4px rounder: the stage card and the message box 16px, his hint, his reading, the conversation's lines, the errand, the menus, the explanations, the tour's boxes and the web's key 12px, the web's top 16px
- **No guest's card twice in the right panel** (Right): picking the guest you're talking with leaves their "talking with" card, with nothing over it
- **The four buttons the smaller gap under your sheet** (Left): while it's tucked or peeking (6px), sliding to the larger gap when it's clicked to stay out
- **Every button's corners rounder, alike** (Corners, new): one radius, 12px, for every button on the screen (8px, and 4px for the small icon buttons, before); pills stay pills, text-like buttons square, the @ and / menus' rows as they were
- **The errand card folds, closed at first** (Left): its title opens and closes it; open, it ends on a small "More Info →" link instead of the whole card opening the briefing (and the reward line no longer opens the rules); a window too short for the panel closes it. More room above the four buttons
- **Il Notaio's animations slower** (Il Notaio): his hint's slide 650ms (460ms), his boxes' glide 480ms (340ms), his reading's opening-out 650ms (460ms), his fades 280ms (200ms)
- **The stage card closes up when the line under it tucks away** (Centre): its own top and bottom margins narrow too (12px to 6px)
- **The web's side column at the conversation's size** (The Web of Confidences): What You Heard and Saw's lines, the notes and the writing box 17px (15px), the guest's or pair's title centred and 20px, the notes' group headings 17px semibold, in sentence case; the tabs 17px and larger; in Notes, the box's label centred and Save Note at the right
- **More Below in his summaries, and a fade under his title only once his words scroll under it** (Il Notaio): while there's more below, a More Below button floats over his faded last words, as in the modals, above a deeper plain band (44px); at the end the margin is 18px
- **Wider margins and a fade at the foot in his summaries** (Il Notaio): his open reading and past-stage summaries have 28px margins at the sides and 18px at the top (12px and 8px); they keep a plain bottom margin (18px; 44px while there's more below), and while there's more below, his words fade out over 28px just above it, as they do under the title
- **The choice of family tinted, with rounder corners** (The Opening): each playable card washed with its family's colour (19% over the card; 26% in the dark), its border a shade of it too; its corners 28px (12px), as round as the "Talking with" card's
- **The conversation's scrollbar beside its lines** (Scrolling): the conversation is only as wide as its column, so its scrollbar sits 16px right of the lines and the message box, not at the centre's far edge; the wheel over the room either side still scrolls it
- **A selected guest gets a thin ring of its own** (The Web of Confidences; it breathed until the flicker, then stood still and thicker): standing clear of their circle (it was the circle's own thick stroke), swelling a touch and back, all together (3.6 seconds a breath), never fading; none with reduced motion
- **Clicking a line selects its pair and its type** (The Web of Confidences): both guests, and the line's type in the key, with Secret too when it's a secret tie; clicking it again clears. **Secret now pairs with any type** in the key (secret romances, say), and whatever can't go with the key's choice fades (a type with no secret ties while Secret is on; Secret while the chosen type has none); clicking a faded one swaps the choice
- **The places have their own small drawn marks** (Left; The Look): a line drawing per place, from the setting pack, wherever a place is named on the screen except in what's said: the places list (the empty ones' line too), the line under the stage bar, the past stages and their summaries

**In the demo only:** Fast-forward sits down in the bottom-left corner of the Web of Confidences' bar, clear of the left panel's More Below (it covered it in a 900px-tall window).

**Build:** v0.22's changes get a task of their own once this version is on `main` (Build State).

## Changes in v0.21

*Nov 17. Dylan's fifth round of review on the demo page, after v0.20 merged, each change tried in the demo first. Detail in the sections named; the record is in Playtest Findings (the rows marked v0.21).*

**Text sizes** (Centre; Right):
- **Names in the conversation the size of its lines:** who speaks, who they speak to ("(to …)"), and Il Notaio's label are 17px like the words (13px before), still in the sans
- **"Earlier this stage" rows a step up:** each folded conversation's row, with its Show / Hide, is 15px (13px), a step below the lines; its heading stays a 12px label. Nothing else in the conversation was smaller
- **The right panel's sizes each exactly one step up from the originals:** "Known to all" and a city entry's text had gone up two steps (13px to 17px); they're **15px**, and the guest card's newer rows of the same kind (its description, "Their faction wins if", "In the city") match them. Names, subtitles, labels and buttons are unchanged

**The Web of Confidences** (The Web of Confidences):
- **The ring's order comes from the setting pack** (roster order before). Florence's: **Clarice 9:30, Raffaello 10:30, Piero 11:30, Francesco 12:30, Giorgia 1:30, Lupo 2:30, Friar Tommaso 3:30, the Contessa 4:30, Sister Beatrice 5:30, the Captain 6:30, Emile 7:30, Jeanne 8:30.** The two family heads meet at the top, each with a sibling beside him; the Dominicans and the French Embassy run leader first from the top of their side, the least prominent at the bottom (Jeanne leads the Embassy; Emile outranks her but is its prize). A setting without an order uses the roster's. The faction names stay at 11:00, 1:00, 5:00 and 7:00
- **Every name sits centred under its circle** (the pairs at the top and bottom moved outward before). **The four names nearest twelve and six o'clock break after their first word,** both lines under the circle ("Piero" over "de' Medici", "Francesco" over "Pazzi", "Captain" over "Armand LeNoir", "Sister" over "Beatrice"), **and so does any name over 18 characters** ("Raffaello" over "de' Medici")
- **"What You Heard and Saw" and "Notes" at 15px** (12px), with a little more room
- **"Web of Confidences" on its bar in capitals, spaced out (0.16em), and regular weight** (mixed case, no spacing, semi-bold before)
- **More room on the bar:** the ▲ 16px from the title (8px), and the guests selected in the web 16px either side of the dot, their portraits 8px apart (8px and 4px before)

**Build:** **#200** built v0.20 (PRs #201 to #203). **#205** builds v0.21 (Build State; Notes for the Build).

## Changes in v0.20

*Nov 17. Dylan's fourth round of review on the demo page, after v0.19 merged, each change tried in the demo first. Detail in the sections named; the record is in Playtest Findings (the rows marked v0.20).*

**The right panel** (Right; Screen Sizes):
- **Higher, and in from the edge:** the panel starts **12px from the top of the screen,** level with the stage bar (48px in v0.19). The "talking with" card and the cards that slide over it stand **12px in from the window's right edge**
- **The "talking with" card ends 97px above the Web of Confidences' bar** (level with the message box in v0.19), and the folded strip ends there too, with round bottom corners
- **The card that slides up** ends, once stopped, **level with the message box, 12px above the bar,** with the same 28px round corners as the "talking with" card; your own card's accent edge goes all the way round. **While it slides up or down,** its bottom reaches all the way to the bar, square, with no accent line along it, until it has stopped or gone off the bottom
- **It stops in one place:** about **29px under the heading** (85px below the "talking with" card's top) at every width, whether or not someone has your ear. v0.19's 40% stop in a wide panel and under-the-portrait stop in a narrow one are gone, and **the name of whoever has your ear always shows beside "Talking with"**
- **"No one has your ear" is centred.** With no card up it rests 64px lower than with one; it **slides up** to just under the heading as a card comes (shown above the card, over the heading's fade) and back down as the card goes, in step with it
- **The hide control (⇥) moves to the heading's line,** at its right, **centred over a covering card's close button** at every width (it sat in the bottom-right corner, on the cards)

**The input box** (The input box):
- **The @ and / menus come down over the prompt's line,** ending 6px above the box (covering "Your turn"), and are **as wide as the message box,** lined up with it
- **The arrow keys move through either menu:** Down lights the first entry, Up the last, and they **stop at the ends** rather than wrapping. In the / menu they skip the folded **"Not available now"** section. Return picks the lit entry (with nothing lit, Return sends as before); pointing lights an entry too; typing or reopening clears it
- **The @ menu:** portraits 28px (44px), each row 42px tall with 2px between, and 10px of room above the first guest and below the last. **The / menu:** the same 10px above its first command, its foot as it was, and 8px between the last command open now and the divider over "Not available now"
- **In a narrow box the prompt keeps its line;** the next-move line drops below it, still at the right, rather than crushing the prompt to a word a line

**The modals** (Briefing, rules, the city, and the glossary; Screen Sizes):
- **The side modals are larger,** up to **85% of the modal in focus** (80%), and shrink only to **75% (480px)**. Below that, **they keep their size and run off the screen's sides,** the modal in focus centred and their titles still showing toward the middle. **Paddles only below 1280px** (1408px in v0.19), now 75% of a modal's height (55%)
- **A gentler paddle press:** a light accent tint and a thin ring, its words in the accent, fading over 900ms (a full accent fill, a 4px ring and light words for 650ms in v0.19; then 450ms, then slower)
- **Moving between modals is slower,** by about a third: the row's slide from one modal to the next takes 390ms (300ms), and the side modals' fades and hover 210ms (160ms). **Inside the modal in focus** (a card or entry swiping in, a rules section opening) **the timings are as they were.** (Every modal animation half again as long was tried first, then halfway back, then the inside ones restored.) **The paddles slower still:** their hover ring and colours ease in over 420ms, and a click's flash lasts 900ms. Elsewhere on the screen the timings are unchanged
- **The side modal on the left shows where going back lands:** its last item (the briefing's last card, the last rule open, the last city entry), not its start; the one on the right still shows its start, where going forward lands

**In the demo only:** the Fast-forward button moves to the bottom left.

**Build:** **#191** built v0.19 (PRs #194 to #198). **#200** builds v0.20 (Build State; Notes for the Build).

## Changes in v0.19

*Nov 16. A third round of Dylan's review of the demo page, after v0.18 merged: comments and screenshots in the chat, each change tried in the demo first. Detail in the sections named; the record is in Playtest Findings, Demo review, part 3.*

**The right panel** (Right):
- **Lower, rounder, roomier:** it stops 48px below the top of the window (was 12px; the stage bar stays where it was); its top corners and its cards' are 28px (was 22px); its text is a size up throughout; its cards have wider side margins that grow with the panel (24 to 40px) and a deeper top margin (28px)
- **Fuller guest cards,** all public: a short description, **"Their faction wins if"** from the rules (Mechanics checks the wording), the public connections as before, and **"In the city"**: links to the city entries that concern them. A city entry's card ends with **"Guests it concerns"**, each selecting that guest. The demo's descriptions are placeholders written only from public lore and connections; the real lines are 🎭 Characters', and which entries concern which guests is 📜 Lore's (tracker)
- **Headings that stay put:** scrolling a card, its heading stays, and so do a guest's portrait, name, and You tag; the subtitle and everything below slide under them and fade. On a city entry, its title stays. Each card scrolls on its own, and **More Below** shows when a card runs past the bottom
- **Where the card that slides up stops:** when someone has your ear, in a wide panel (380px and up), 40% of the way down, so both cards show; in a narrower one, just under the "talking with" card's portrait. It glides between the two as the panel is resized. Where it covers the name under that portrait, the name shows beside "Talking with" instead. **When no one has your ear,** there's nothing to see under it, so it comes up to just under the heading at any width
- **City entries' titles centred**

**The centre** (Centre):
- **The stage bar's card** grows to 1280px (was 900px), its side margins growing with the window; **its circles are sized from the bar's own width,** not the window's, which fixes the last stages being cut off when the side panels were wide
- **Everyone's lines in the conversation read larger** (17px, was 15px), Il Notaio's with them
- **The message box is three lines tall** at least, with its example at the top (and a blank line under it when the example takes two lines); it still grows to nine

**Elsewhere:**
- **The left panel** (Left): wider margins, and everything in it a little larger, **growing and shrinking with the panel's width**, icons included; **when it scrolls, its top (you, your sheet, the four buttons) stays put** and the errand and the places slide under the buttons (in windows 520px tall and up). Your own card on the right loses its accent line along the bottom
- **The opening in two sizes** (The Opening): from 1400px wide, a wider column and larger text (800px, 22px); below, as before. **When the story is written, only a Continue button moves on** to the choice, and **the page scrolls on until Il Notaio's title and story are off the top,** and the choice sits in the middle of the screen; scrolling back up brings the story back, with **the choice docked at the bottom of the screen**, shrinking as the story returns. The choice fades in only once it has stopped. **The choice is larger,** its title and cards sized from the window's width, and **the cards are taller, each with a short description** of the character (Characters', tracker)
- **The Web of Confidences** (The Web of Confidences): its contents stop at 1600px wide, centred; the drawing centres in the room between the key and the side column (across the whole width when the key is folded); the side column folds to its strip under 1100px wide (was 840px)

**For other docs** (tracker): **Characters** gets one short public description per guest, for the right panel and the opening's choice cards. **Lore** gets which public entries concern which guests. **Art & Design** gets the new values (The Look, New in v0.19).

**Build:** **#191** builds v0.19 once **#179** is closed (Build State). **Notes for the Build** add: resize handling at most once a frame (the demo jittered in Safari), and fixed heights for the blocks that stay put.

## Changes in v0.18

*Nov 16. Two small changes from Dylan's comments on the demo, after v0.17 merged, and two handoffs on the player's rules text: ⚙️ Mechanics' check of it against v0.37, and 🏗️ Technical Design's v0.52, which sends the game's values.*

- **The backdrop behind an open rules section fades in at its top and bottom** (Dylan; Briefing, rules, the city, and the glossary). Before, the dimmed, blurred backdrop started at a hard edge under the header and above the footer. Now it fades in over about 22px at each end, and the open section's card isn't faded. A new token for Art & Design (The Look)
- **Title case skips arrows** (The Player's Words): only words with letters count as a label's first or last word, so "← The Rules" keeps its capital, where the demo had shown "← the Rules"
- **The player's rules text, corrected** (Mechanics' check; The Player's Words): a candidate who repents changes sides and wins only if the Dominicans do; the turn numbers and the secret conversation's length are the game's own values, and "one chance each round" is said only when a round has as many turns as there are guests; `/borrow` works only while the Embassy's treasury has a payment left; the one who started a secret conversation also goes to the smallest group if theirs has broken up; and the choosing of candidates and the open floor are made of turns too
- **The values' names are Technical Design's** (v0.52, Player Interface, The screen, "The game's values"): `sheet.values`, with `null` for a phase the run doesn't have, and a clause about a missing phase left out
- **Build:** all of it goes in **#179** with v0.17, which now needs this version and Technical Design v0.52 on `main`

## Changes in v0.17

*Nov 15–16. The rest of Dylan's review of the demo page, after v0.16 merged, over two sessions: comments on the page and screenshots in the chat. Each change was tried in the demo first, then written here. Detail in the sections named; the record is in Playtest Findings, Demo review, part 2.*

**Screen sizes, a new section** (Screen Sizes): limits on everything that grew or shrank too far. The side panels grow with the window (left 284–332px, right 280–480px); the conversation, Il Notaio's boxes, and the message box share one centred reading column, at most 820px; the stage bar keeps within 900px; the Web of Confidences' drawing stops at 820px, its key at its normal size, its side column at 480px. In small windows, the right panel and the web's side column fold to strips, Il Notaio's hint folds to keep the conversation at least 200px tall, and the web's key folds below 1200px wide. Short screens get a capped message box and tighter modal margins. **Phones are left out for now:** under 760px wide, a note says the game is made for a larger screen. **Touchscreens:** a long press shows an explanation without pressing the thing.

**Three typefaces** (Dylan; The Look): the screen's own words stay in a plain sans; **what the guests say** (and what you type) is in a book serif; **Il Notaio** writes in a Renaissance one. His chat lines lose their italics. **His open boxes read larger** (16px against 13px minimized), his box titles sized from that and fixed, and every one of his boxes that opens and closes says **Show / Hide**.

**Title case** (Dylan; The Player's Words): names, headings, and buttons ("Your Briefing", "The First Round of Mingling", "Back to the Rules"); sentences, prompts, and status lines stay as they are. The setting pack holds the rule's small words, so a pack in another language can turn it off.

**The modals** (Briefing, rules, the city, and the glossary):
- **The side modals in two sizes:** in a wide window (1408px and up), **the whole previous and next modals,** drawn as themselves at their start, scaled to fit, never more than 80% of the one in focus, evenly blurred, their titles at full size toward the middle. Narrower, **two paddles** with the title on end and an arrow. Hovering either lights its title and rings it; a clicked paddle flashes
- **Room and margins:** the row keeps a minimum width and scrolls sideways below it; wider margins at the screen's edges; the screen behind softly blurred; **rounder corners** (30px)
- **Margins and text:** wider, even margins in every modal, text centred top to bottom, titles centred, no rule lines, body text 15px, **real bulleted and numbered lists**, edges that fade where there's more to scroll, and smaller **More Below** buttons in line with the page counter
- **The briefing:** bigger tabs that wrap and stay put, and the tabs are the cards' titles. **The rules:** the player's own rules text, a new **Stages and Turns** section, Roman numerals on the section buttons and in the open section's title, and a lighter, blurred backdrop behind an open section. **The glossary:** smaller term names; opened from the chat, its way back to The City pulses

**Elsewhere:** the message box grows with what's typed (up to nine lines); only what's worth copying can be selected; the right panel's and its cards' top corners are rounder; your portrait and name at the top of the left panel are larger; a skipped tour's **Your Briefing** glows filled in; the web's faction names sit at 11, 1, 5, and 7 o'clock, and its drawing stands clear of the screen's edge (The Screen; The Web of Confidences).

**For other docs** (tracker): **Technical Design** gets the player's own rules text (a template in the setting pack, filled with the game's values; block 2 stays the AI guests' primer), for **Mechanics** to check against v0.37. **Art & Design** gets the new looks: the typefaces and Il Notaio's sizes, the corners, the blurs, the scroll fades, the numeral badges, the list marks, the paddles and their rings (The Look). No Characters handoff after all: the briefing's tab titles are title-cased on the screen, not in the briefings.

**Build:** **#179** builds v0.17, after #177 (Build State). **Notes for the build** (a new section) gather what the real build should do differently from the demo: relative text sizes, layouts that answer to their own space, the screen's own More Below, and components in place of the demo's page scripts.

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
- **Over the box:** the prompt at the left, **"Your next move: in 3 turns"** at the right, and the character count above the buttons. **End conversation** also sits under Speak and Pass, and both End buttons are solid red (The input box)
- **Generate** (Dylan): a button inside the message box, after @ and /, that has the model write a line in your character's voice into the box, for you to change or send. Nothing is said until you press Speak (The input box)
- **Il Notaio's hint** flashes when he says something new, explains a refused command in plain words, says when a chance to move was missed, and steps aside while an earlier stage is open (Onboarding)

**Past stages:** Il Notaio's summary opens a fifth of the way down, and what's behind it fades until it's minimized. With a decision waiting, the bottom card is one wide Return button (Past stages).

**The right panel:** stops short of the top with rounded corners, and dragging it past its narrowest hides it. Your own card says "This is you". No card repeats the faction above the subtitle, and the "talking with" card loses its row of tokens (Right).

**The modals:** Previous and Next footers that chain the four modals, slides that reverse going back, highlights that point the way you're going, and subtler motion. Each starts from its beginning when you move to it. **The briefing is five cards for the player**: the cards meant for the AI guests are left out, and short ones that belong together are merged (Briefing, rules, the city, and the glossary).

**The Web of Confidences:** a fixed ring (the first guest at half past nine), a web that fills its space, faded lines around a selection, one line per pair and type, **the halo marking only secret ties**, a selectable "Secret" row in the key, a key and a side column that scale with the window, and notes always listed and grouped. It slides more slowly and sits over everything (The Web of Confidences).

**Commands** (Mechanics' handoff): the command menu lists every command the character can ever use. What's open now comes first; the rest wait in a folded section, each with its reason ("Only in a secret conversation."). A refused command gets its specific reason from Il Notaio (Commands).

**The opening** writes a phrase at a time and fast-forwards on a click; the full game's other playable character shows greyed out (The Opening).

**For other docs** (tracker): Technical Design gets the command list with reasons, the turn order for the next-move line, Generate's model call, the full evening's track and two stage names, the rules primer's order-of-the-evening line, and the rename. Characters gets a role line and a short errand line per guest, and the rename. The Hub and Visualization & Sharing get the rename. The look of the new shadows and floating cards is Art & Design's to settle (The Look).

**Build:** one task builds all of it, **#177** (the next-move line and Generate wait on Technical Design's plumbing). Until then, the demo page shows it.

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

**One layer at a time, clearly stacked.** The Web of Confidences sits above everything, the floating stage bar and message box above the conversation *(v0.16)*, a selected card above the "talking with" card, Il Notaio's box above the dialogue it covers (which fades while he's open), a modal over the screen, never under it. Each layer's shadow says which is on top. **Behind an open modal the screen is dimmed and softly blurred** *(v0.17)*, so nothing behind it has a hard edge for the side modals to seem to tuck under.

---

## Build State *(Nov 15; Nov 17)*

1. **The mini-game is playable** as Francesco, with everything this doc designed through v0.15 built (the first screens, then #102, #109, #113, #114, #117, #128, #132, #141, #146, #148, and #151; v0.15's list). Francesco's errand can't be done there (Friar Tommaso isn't in the cast), and the mini-game runs with `plot_reward` off
2. **v0.16 and v0.17 are designed and shown in the demo, not built.** Dylan reviewed the demo page (Nov 15), and every v0.16 change was tried there first. **One build task** builds v0.16: **#177**. Most of it needs nothing new from the engine. The command menu's reasons can be worked out from the player's own state until the engine sends them; **the next-move line and the missed-move hint need the engine** to put the player's next movement window in their state (Technical Design handoff), so the build leaves them out if that isn't there yet. **Generate needs a model call Technical Design hasn't specified** (handoff), so #177 leaves it out. The demo is private to Dylan; **#172** adds `npm run demo` to rebuild it from the repo. Its guests' lines are the fake caller's placeholders. **v0.17** (Dylan's further review, Nov 15–16) and **v0.18**'s two small changes are built by **#179**, after #177, since both change the same screen; Notes for the Build says what it should do differently from the demo. **v0.19** (Dylan's third round, Nov 16) was built by **#191** (PRs #194 to #198). **v0.20** (the fourth round, Nov 17) was built by **#200**. **v0.21** (the fifth, Nov 17) is built by **#205**. *In the demo, the mini-game's last third of its round shows as the second round of mingling, so the bar has an example of a later stage*
3. **Then the full game,** once the full game loop is built: councils, Piero, candidate selection, speeches and `/repent`, the ballot and `/buy`, the run-off, and the full death and result screens. Dylan playing a whole game is the milestone's test (tracker, item 2)
4. **Then v1, the first public release:** Il Notaio's full player-facing role (Onboarding, below)

To try it: `npm run play -- --as "Francesco Pazzi" --minigame` (add `--fake` for no model calls), or the demo page.

---

## Notes for the Build *(v0.17)*

The demo is built by patching the screen and adding scripts to the page, which is quick to change but not how the real screen should do it. What the build should do differently:
- **Text sizes in relative units** (`rem`), so a reader's own font-size setting is respected, not only the browser's zoom. A mechanical change across `web/theme.css`
- **Layouts that answer to their own space** (container queries) rather than to the window: the side modals' two sizes, the web's key folding, and the web's side column folding all go by window width in the demo, which is wrong when a panel is hidden or open
- **The screen's own More Below** (`useMoreBelow` / `MoreBelow`) for the modals' reading areas, rather than the demo's buttons placed over the page; likewise the scroll fades, Il Notaio's hint and the web's key folding themselves, the long press, and the phone note, which the demo does with page scripts, become components
- **The whole side modals** are the modal components drawn still (inert, no keys, no More Below, no entrance animations), with no Escape handlers of their own: the next one at its start, the previous one at its last item *(v0.20)*, each where clicking it lands
- **The typefaces** served with the page, under their licence (both SIL Open Font License), with a `size-adjust` so each matches the sans's x-height and every size token means what it says
- **The words** move into the setting pack: title case and its small words, the player's rules text, the phone note, the paddles' arrows (The Player's Words)
- **A long-labels check:** the demo's `?long` lengthens every short label by half, as a translation might. A test that does the same and checks no control spills would keep it honest
- **Resizing** *(v0.19)*: work done on a window or panel resize (fitting the message box, keeping the stage bar's shown stage in view, centring an overlay) runs at most once a frame, and writes a style only when it changes. The demo jittered while resizing in Safari until it did; **check resizing in Safari**
- **The blocks that stay put** *(v0.19)* on the right panel's cards (the heading, then a guest's portrait and name, or an entry's title) are sticky inside the card, so the heading needs a fixed height for the block under it to sit against. The card that slides up stops by the same measures. **Sizing from the bar's own width** (the stage circles) and the panel's (its margins, where the card stops) are container queries
- **The card's new lines come from the setting pack** *(v0.19)*: the description per guest, the faction lines (from the rules' win conditions), and each public entry's guests. Nothing new from the engine
- **The opening's choice** *(v0.19)*: its fade-in is an animation, not a transition, since the title's and descriptions' opacity also follows the scroll once it's docked (a transition lagged them by its whole length). Its shrink is measured against its full height and where it would sit unstuck, not its current height, which its own folding changes
- **The review tool** *(v0.19)*: in `npm run demo`, the note that a reference was copied sits at the top left of the page
- **The sliding card's full height** *(v0.20)*: while it moves, the card reaches the bar, square; stopped, it ends 12px above it, rounded. In the demo the slide's keyframes carry the full-height bottom and square corners, so the card takes its resting shape when the animation ends; the "leaving" slide does the same from its first frame. Reduced motion keeps the fades
- **"No one has your ear" follows the card** *(v0.20)*: its slide goes by whether a card is up (in the demo, `:has()` on a covering card that isn't leaving) and uses the cards' own motion token, so the two move together
- **The hide control's place** *(v0.20)*: centred over the covering card's close button. In the demo a script measures the card's scrollbar and edge and hands the width to the panel; the build can instead lay the control out the same way the card lays out its close button (the same side margin, container-sized), with the scrollbar allowed for. **Check on a Mac with overlay scrollbars and with "always show scroll bars"**
- **The menus' place and width** *(v0.20)*: the @ and / menus end just above the message box and match its width. In the demo they're measured from the box on each render and on resize; in the build, put the menus in the same box as the field (or anchor them to it) so they size with it
- **The arrow keys in the menus** *(v0.20)*: one lit index per open menu, reset when the menu changes; it counts only the commands open now, so it never lands in "Not available now". The lit entry scrolls into view. Pointing sets the same index, so only one entry is ever lit
- **The side modals' sizes** *(v0.20)*: three ranges: shrinking (up to 85% of the modal, down to 75%), then fixed at 75% and running off the screen's sides with the modal in focus centred, then paddles. The demo goes by window width (1736px and 1280px); in the build, as Notes for the Build says above, go by the overlay's own width
- **The web's ring order** *(v0.21)*: a list in the setting pack (with the roster and factions), clockwise from the ring's start; the code holds no names. Guests the list leaves out follow in roster order
- **The web's two-line names** *(v0.21)*: a name breaks after its first word into two lines (SVG `tspan`s), centred under its circle, when it's one of the four nearest twelve and six o'clock or over 18 characters. The web's text is sized in the drawing's own units, so the spacing holds at every size; the demo's script that moved the top and bottom names outward goes
- **Gentler scrolling** *(v0.22)*: one wheel listener (capture, non-passive) finds the nearest element that scrolls vertically and can still move that way, outside the opening; it moves a target by the wheel's delta (lines and pages converted to pixels) times 0.8 and eases `scrollTop` toward it each frame. It lets the event pass at an end, for a sideways scroll, and for a pinch (`ctrlKey`). Touch scrolling is left to the system. **Check on a Mac trackpad and a free-spinning wheel** that momentum still feels natural
- **His boxes' glide** *(v0.22)*: the demo measures the box before a click or key toggles it, then animates `top` and `height` from the old rectangle to the new one (`bottom: auto` and no margins while it runs); the CSS takes over when it ends. Lore links inside don't trigger it
- **The send's fade and slide** *(v0.22)*: the demo copies what was typed into a ghost over the box and fades it while the box clears, then slides the player's new line (`.ln.mine`) from just below the conversation's visible foot with the Web Animations API, only for a line that arrives within a few seconds of a send (never for lines redrawn when the conversation re-renders). In the build, the message box and the conversation component can do this directly
- **The conversation's width** *(v0.22)*: the stream itself is centred at the reading width plus its padding, with `scrollbar-gutter: stable both-edges` so the column stays centred under the stage card and over the message box. The wheel over the stream area outside it is routed to it (the demo's wheel script does this; with native scrolling the build needs the same small handler)
- **His summaries' foot fade** *(v0.22)*: a sticky, block `::after` at the end of the open box (`bottom: 0`), 56px tall: 28px of fade over a 28px band of the box's colour, pulled up 38px so that in flow it takes only 18px below his words; the box's own bottom padding is taken away. A scroll listener marks the box at its end (or when it doesn't scroll) and when it's scrolled from the top: at the end the whole strip goes transparent (a registered custom property, so it eases), and More Below (a sticky button after his words, taking no room, 30px from the foot, over the fade) hides; the fade under the title shows only once scrolled. More Below scrolls the box by 70% of its height and doesn't toggle the box. The pinned title's offsets follow the box's top padding
- **The other fades** *(v0.22)*: his hint's words and the web's two side lists are masked (`mask-image`), with the top and foot strengths in registered custom properties that ease, set by the same scroll marks as his summaries
- **The hint's slide** *(v0.22)*: his words stay rendered while hidden (`aria-hidden`), so the box keeps its height; hidden, its bottom margin becomes the strip less its own height, so it slides behind the message box in the column (the message box above it in the stacking order), and a `clip-path` cuts off whatever would pass 16px inside the message box's foot. Both heights come from a small script (ResizeObserver, and a MutationObserver since his box is redrawn when he speaks); in the build, measure them in the component. The whole box takes the click while hidden
- **The type scale** *(v0.22)*: in the demo, overrides at the end of the stylesheet; in the build, the theme's text tokens become the scale's steps (12, 13, 15, 17, 20, 24, 30) and every `font-size` uses one of them
- **The selection ring** *(v0.22)*: its own `<circle>` in the node, drawn only when selected, at 5.15 (the guest's circle 4.2), stroke 0.9, its inside edge 4.85 from the centre as at 0.6 (the ring's radius 5.3), so it thickens outward (0.42 while it breathed, then 0.6); still; scaled about its centre by its own breath property (`transform-box: fill-box`). **Only the rings breathe, and only while the web is up** *(v0.22, for Dylan's flickering)*: the breath was one animation on the whole web, running all the time (even with the web down), so everything in it was restyled every frame, under the modals' blur and the web's own; now each ring animates its own (non-inheriting) property, and the demo starts every ring's breath at the same moment on the page's clock, so they still breathe together. **His reading's opening-out:** the demo notes the box's size while it shows "considering" (`data-reading="waiting"`) and, when the reading replaces it, animates the box's top and height from that size to the new one and fades its contents in
- **The left panel's two gaps** *(v0.22)*: two values on the panel, the larger `26 units + 5.5% of the height room` and the smaller `16 units + 2% of it` (the room the panel's spacing already shrinks by in a short window); each gap takes one of them, with a pixel or two either way to even out each line's own leading, so the gaps you see match (measured from text to text and box to box)
- **His name's island** *(v0.22)*: the sticky head shrinks to its words (`width: fit-content`) and drops its band's background; a `::before` well beyond the words carries a radial gradient of the surface colour (solid to 45%, then eased out in eight steps to nothing at its edge), the head sticky 54px down so it isn't cut by the window's top. A fixed 40px gradient of the page's colour fades the story at the window's top. A script marks the opening (`data-end`) once his whole story is written and the page is within 8px of its foot; the head then rises (`translateY(-140%)`) and fades
- **The sheet's fold** *(v0.22)*: the facts and the midnight line sit in a one-row grid under the you-button that eases from `0fr` to `1fr`, its contents sliding down from behind you as they fade in; open on the panel's `:hover`, on `:focus-visible` inside it, or when the button is pressed (`aria-expanded`). With its room kept (`roomy`), the row stays at `1fr` and only its contents slide. On a resize that leaves the panel overflowing, the errand closes first and the check runs again once it has; still overflowing, the room goes; the room comes back when the space under the last place is larger than the sheet. A closing click sets a hush that holds off the hover until the pointer leaves the sheet
- **The errand's fold** *(v0.22)*: the title is a button (`aria-expanded`); the body sits in a one-row grid that eases from `0fr` to `1fr`, so it slides open at its own height; the link takes no focus while closed. The panel listens for resizes and closes the card when the panel then overflows (`scrollHeight` over `clientHeight`), never on the player's own opening
- **Frosted glass** *(v0.22)*: `background: color-mix(in srgb, <its colour> <strength>, transparent)` with `backdrop-filter: blur(…)` (and `-webkit-backdrop-filter` for Safari), from theme tokens; a menu's rows drop their own background so the glass shows. **The stage card's and message box's glass is a layer behind their content (`::before`, `z-index: -1`, the card isolated), not the card itself:** an element with its own backdrop filter hides the rest of the page from the backdrop filters of what opens out of it (the menus, the stage's description). **The conversation under the cards:** the stream keeps its place in the column but takes negative margins as deep as the cards reach in from the centre's top and foot, and the same as padding (the top padding from the untucked stage card), measured by a ResizeObserver; its mask fades only the outer 12px. The hidden hint keeps its clip at the message box's foot only, so it shows through the message box's glass **One colour boost for all the frosted glass** *(Dylan)*: what passes under a blur keeps its colour rather than greying (`saturate(1.3)`, the theme value `--glass-boost`): the stage card, the message box, Il Notaio's hint, his boxes and summaries, the Looking At card, the @ and / menus, the explanations, the web's glass and key, More Below, the opening's buttons, the modals. Not the dimming blurs (behind the modals, the side modals' graded edges, the Rules' scrim), where colour would compete with what's in front. *(At first only some of the glass had it, at 1.2 or 1.3, a leftover from the first pass; removed, then brought back across the board at one strength, Dylan)*
- **The place marks** *(v0.22)*: the setting pack gives each place a small SVG drawing (16-unit square, strokes only, `currentColor`), keyed by place; the screen draws it inline before the place's name in the places list, the empty places' line, the line under the stage bar, past stages' rows and summaries' headings, and nowhere a line or prose is drawn. A place with no mark shows its name alone. The demo keeps Florence's in `tools/demo/entry.ts`; in the build they belong in `setting/<name>/` (the code holds no place names)
- **A line's click** *(v0.22)*: each drawn line gets a transparent copy, a little wider, that takes the click (`pointer-events: stroke`). The key's state is two parts, a type (or none) and Secret on or off; a line's click sets the pair, its type and Secret from the tie, and the same click again clears all three. With Secret on, a type fades in the key when none of its **drawn** ties is secret, and Secret fades when the chosen type has none (count only the ties drawn with the halo: your own take on a public tie is drawn as the public tie, plain, so it isn't a secret here; counting it made Kin and Service look as if they had secrets for Francesco); a click on a faded one clears the other part. The selected rings breathe from one animated custom property on the web (registered, inherited), so they keep in step
- **The members line tucking away** *(v0.22)*: goes by the reader's scrolling intent (wheel direction, touch direction, the scrolling keys outside the message box, dragging the scrollbar), not by `scroll` events alone, since the conversation scrolls itself as it follows new lines. Reaching the top always shows it. The demo does this with a small script in `tools/demo/entry.ts` and a `tucked` class on the stage card; the build belongs in the conversation component
- **More Below can't loop** *(v0.19)*: once the left panel's top was pinned, the demo's left panel kept failing for Dylan (not reproduced in Chrome; likely Safari, at some window heights). The likely cause: showing More Below changes what's left to scroll, so a check after every render could turn it on and off without end until React gave up. The fix: it comes on only with clearly more than its own room left (16px) and goes off at 2px, and the check runs a frame after the render. **A failed panel says what failed** in the demo (the error, small, under the notice, and a Try Again button); worth keeping in the build

---

## The Screen

A single page in the style of a Slack chat. Placeholder portraits until Art & Design's are ready: initials in a circle, coloured by faction. **The faction colours a little richer, the Medici burgundy** *(Dylan; v0.22)*: about 30% more saturated than the theme's first values (then about 15% more again, all but the Medici's purple, Dylan), same hue, and never lighter (each at or just under its first luminance); every place drawn in a faction's colour (the portraits, the web's circles, arcs and faction names, the opening's card tints) reads the same token, so they always match.

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

**It grows and shrinks with the window** *(Dylan; v0.17)*, from 284 to 332px (Screen Sizes), **and since v0.19 everything in it grows and shrinks with it** *(Dylan)*: its margins, text, portraits, and tokens are all sized from the panel's width, so they're a little larger than before at either end (in the demo: margins 23 to 27px, was 16; body text 13 to 15.5px; your name 18.5 to 21.5px; your portrait 85 to 100px; the places' tokens 29 to 34px). Your name stays on one line at both widths. In this order *(Dylan, Nov 13; v0.16)*:
- **Show me around** and **Explanations: on/off,** centred at the top, on their own line with room around them, **with more room inside them at their sides** *(Dylan; v0.22)*: 14px in the panel at its widest (8px before), easing down to 8px as the panel narrows, so the two always share a line
- **You:** your portrait, and **beside it** *(Dylan; v0.19; above them before)*, **"You are Francesco Pazzi"** (wrapping, balanced, as "You are / Francesco Pazzi"), then your role in plain words, **"head of the Pazzi family"** *(v0.16)*, **your name a size up from the panel's other words** *(Dylan; v0.17)*, with no box, ring, or "You" label: the words say it. Side by side, the panel's pinned top is about 70px shorter, so less of the panel scrolls (it scrolled a lot on a 1080p monitor; Dylan). **More room above it,** under Show Me Around and Explanations, **and below it** *(Dylan; v0.19)*. In the demo, at the panel's widest: the portrait 71px, your name 21.5px, your role 15.5px, 49px above (Dylan; a little less was tried and put back) and 27px below, at full height, and **18px between the portrait and your name** (Dylan: a little more; 13px before; 20px rewrapped the role in a narrow panel). The role line is a new per-guest line from Characters (tracker); the public subtitle stands in until it exists. **Your name or portrait no longer opens your briefing** *(Dylan; v0.22; since v0.7 it did, at the place you left it; the four buttons do)*: **it slides your sheet out from under you** (below)
- **Your sheet tucks away under you** *(Dylan; v0.22)*: the sheet below (Purse, Payments from France, Secret Conversations, and the midnight line) **slides out from under your portrait and name while you point at them** (or at the sheet), and slides back when the pointer leaves; **a click on your portrait or name keeps it out** (or on the small arrow under you, or anywhere along its line, Dylan), and a click again tucks it back **at once, even with the pointer still on you** *(Dylan)* (pointing slides it out again only after the pointer has left and come back). **Its room stays kept under you** *(Dylan)*, so nothing below moves as it peeks out; the sheet sits the smaller gap under you. **The four buttons sit the smaller gap under the sheet** (about 26px in a tall window, like the panel's other small gaps, Dylan; 6px, as far as their two rows are apart, then no gap at first) while it's tucked away or only peeking, **and slide down to their usual larger gap once you click it to stay out** *(Dylan)*, and back up when you tuck it away. **In a window too short for the panel, the errand closes first; only if the panel still doesn't fit does the sheet give up its room** (tucking away, the buttons moving up under you, and then pointing pushes them down as it slides out). Its room comes back once there's space for it. **A small arrow centred under you** points down while it's tucked away and up while it's kept out, as the errand card's does, and the explanation says how it works. Keyboard focus slides it out too
- **Your sheet:** **Purse**, **Payments from France** *(v0.16)*, **Secret conversations** *(v0.16; the count of your Colloquios)*, and **the midnight line** *(v0.8)*: "Midnight: 1 act (kill, guard, or watch)." With `plot_reward` on, a second line: "+1 if you finish your errand before the last council." Once the errand check has run, it becomes "+1 earned" or disappears. It never gives a check's result away early. How the sheet reads (a purse with its count, a seal, tally marks) is Art & Design's
- **Each line of the sheet opens where it's explained** *(v0.16)*: the rules section behind its glossary word (Purse → Florins, Payments from France → France's payroll, Secret conversations → Colloquio, Midnight → Midnight), or the word in the glossary if no section explains it. The setting pack names the word for each line. They underline on hover, with the explanation "Click for the rules on this."
- **Its gaps come in two sizes** *(Dylan; v0.22)*: **the larger, all alike** (about 46px in a tall window): above you, under Show Me Around; above the four buttons, under the midnight line; and above The Places, under the errand **while it's open** *(with it folded, see below)*. **The smaller, all alike** (about 26px): between you and your sheet, and between the guests' places and the empty ones. **The errand sits 12px under the four buttons** *(Dylan; 6px, as close as they are to each other, before that; it took the smaller gap at first)*. **With the errand folded, The Places sit as far under it as the four buttons sit under you** (your portrait and role; about 145px in a 900px window, most of it your tucked sheet's kept room; 26px in a short window, where the room is taken) *(Dylan)*; open, the larger gap as before, and they glide between the two with the errand's fold. The distance is taken while your sheet rests tucked away and kept while it slides out or is open; since giving the sheet its room back now pushes The Places down by as much again, a short window gives the room back only when there's space for both (so a resize never takes and gives it back step by step). The pinned top's fade shows only once the panel has scrolled, so it never lies over the errand's top. Both close up together in a shorter window (41 and 24px at 900px)
- **Four buttons,** with more room above them *(Dylan; v0.22)*: **Your Briefing**, **The Rules**, **The City**, and **Glossary** *(title case, v0.17)* (Briefing, rules, the city, and the glossary, below). No button for the Web of Confidences, which is always at the bottom. **After a skipped tour, Your Briefing glows filled in** *(Dylan; v0.17)*, with the breathing accent fill of the modals' way-on buttons, rather than an outline. **When the panel scrolls, its top stays put** *(Dylan; v0.19)*: you, your sheet, and these four buttons, on the panel's own colour, while the errand and the places slide under the buttons, fading as they go. (Pinning the buttons only once the top had scrolled away read as no change.) **In a window under 520px tall** *(640px until the top could close up; Dylan found the errand stopped sliding under it once it had)*, where the top would leave no room below it, the whole panel scrolls
- **The errand card,** pinned:
  - **Just the task** *(Dylan; v0.16)*: "This comes first: it is what you came for. Before the last council before midnight, **give Friar Tommaso at least 3 Florins in total**, in one gift or several." The why ("a gift to the friars that the city will hear of…") stays in the briefing. The screen needs a short errand line per guest from Characters (tracker). Until then it cuts the errand at the first colon or full stop after its bold part, which is right for Francesco but would drop a condition from Lupo's
  - **It folds, closed at first** *(Dylan; v0.22)*: closed, it's just its title, "Your Errand", with a small arrow; clicking the title opens it (the task, what it earns, and the link below) and closes it again, with a short slide. **A window too short for the left panel closes it:** when a resize leaves the panel needing to scroll, the card folds; the player can still open it. **The card no longer opens the briefing, and its reward line no longer opens the rules** *(Dylan)*: open, it ends on one small link, **"More Info →"** *(Dylan; "More Info →" at first)*, in the card's accent, which opens the briefing at the errand's card as the whole card did (v0.16; found by the errand's own words). *(Both kept, this way: the title folds, and the link is labelled, so a click never does something unexpected)*
  - **What it earns:** one line in the card's accent, as before. With `plot_reward` on: finish it before the last council before midnight for a secret extra act at midnight. With it off, as in the mini-game: "Errands earn no extra act at midnight." **Clicking that line opened the rules** *(v0.16; not since v0.22: the card's one link is to the briefing)*: the section on errands where the game has one ("Your errand"), otherwise Midnight, where the acts are. After the check, `{plot_status}` replaces the line and opens the same
- **The places** *(v0.7–v0.9; Mechanics v0.35; Lore v0.8)*: all eight, always shown, each occupied one on its own row in Lore's order with the portraits of whoever is there, and **the empty ones folded into one faded line under them:** "Empty: the anteroom, the loggia, the courtyard, …", in Lore's order, each name still showing Lore's description on hover, **a fixed distance under the last occupied place** (about 33px at the panel's widest; Dylan; sitting midway between it and the bottom of the panel was tried first) *(Dylan; v0.19; before, each empty place took a faded row of its own, so the list never shifted; folding them saves about 170px, and with your portrait beside your name the panel fits a 1080p monitor without scrolling)*. The "Empty:" label is the setting pack's (`screen.places.empty`, new)
  - **Each place has its own small mark** *(Dylan; v0.22)*: a line drawing in the text's colour before its name, about the height of its capitals, faint (85%). It goes **wherever a place is named on the screen, except in what's said:** each place's row and the empty ones' line here, the line under the stage bar, the past stages' rows and their summaries' headings. Never in a line of dialogue, Il Notaio's prose, a briefing or a glossary entry. Line drawings, not emoji, so they take the screen's colour and weight. **The marks are the setting pack's** (keyed by place, with Lore's names), so a reskin brings its own. Florence's: the great hall a gabled front on columns, the window bay an arched window, the anteroom a door at the top of steps, the loggia an arcade, the courtyard a well, the study an open book, the painted room a framed picture, the dining room a goblet
- **A tighter rhythm on screens under 1240px tall** *(v0.19; kept by Dylan)*: less space between the sheet's lines and around the errand card, and slightly smaller tokens (28 units), **but more room above the four buttons, under the midnight line** (24px at the panel's widest), **and between the errand card and The Places** (33px) *(Dylan)*. With the side-by-side portrait and the folded places, the panel fits a 1920×960 window without scrolling; a 1200×800 one scrolls a little. Its scrollbar is thin, so your name doesn't rewrap when it appears
- **In a shorter window, the pinned top closes up** *(Dylan; v0.19)*: the gaps above Show Me Around and Explanations, above and below you, between you and your sheet, and above and below the four buttons each shrink with the window's height, at full size from 1000px tall down to their least at 700px (about a third of full), along a straight line. Only the gaps change, never the sizes, so nothing can overlap. At 960px tall the pinned top is 394px; at 760px, 338px
  - **Your own place is marked, with "You are here" on its own line** under the place's name *(v0.16)*. **A Colloquio's place is marked as a secret conversation** (a closed-door mark)
  - **Every portrait selects its guest, your own included** *(Dylan; v0.16)*: yours selects you, and the right panel shows your own card. Your briefing stays one click away above
  - Tokens overlap and spread on hover. A place isn't clickable; hovering its name shows Lore's description, as a light world card (Hover explanations)
  - **In councils,** only your own council's place is shown; **at midnight and the ballot,** a quiet line. The dead aren't shown

### Centre: the conversation

- **One reading column** *(Dylan; v0.17)*: the conversation's lines, Il Notaio's hint, the message box, and his summary of a past stage share one centred column, at most 820px wide, so on a wide screen a line stays a comfortable length and the four line up (Screen Sizes)
- **Typefaces** *(Dylan; v0.17)*: the guests' words in a book serif, Il Notaio's in a Renaissance one, the screen's own in its sans (The Look). His lines in the chat are upright, not italic: the typeface sets him apart, and its italic is the harder read
- **The lines read larger** *(Dylan; v0.19)*: everyone's words in the conversation, Il Notaio's included, are 17px (they were 15px), with a little more space between lines. What you type stays the box's size
- **The names are the lines' size** *(Dylan; v0.21)*: who speaks, who they speak to ("(to …)"), and Il Notaio's label are 17px like the words (they were 13px), still in the sans, bold for the speaker and grey for "to"
- **Il Notaio's lines in his purple** *(Dylan; v0.22)*: his announcements in the conversation take his boxes' purple text, on a lighter purple ground (about half his boxes' strength) with **a purple rule down the left edge** (3px) and no rounding on that side (a pale green ground and green-grey text before), so everything he says on the screen reads as his. **His lines read as part of the conversation, his hint and summaries as boxes over it** *(Dylan)*: those keep the full purple ground, a slightly darker border, and their shadow, so a line scrolling under one of them never looks like more of the box (the lines had the boxes' full ground for a while, and it was confusing)
- **Two floating cards** *(Dylan; v0.16)*: the stage bar at the top and the message box at the bottom sit as rounded cards over the conversation, each casting a shadow onto it. **The conversation fades out where it slides under them** (the top bar and Il Notaio's box), so a line dissolves rather than being cut off. How the cards and shadows look is Art & Design's (The Look)
- **The conversation's members** sit under the stage bar, centred ("In the loggia with Giorgia and Lupo"; in a Colloquio, "In the study, in secret with Clarice"). **End conversation** sits on that line in a Colloquio, solid red *(v0.16)*
  - **It tucks away as you scroll down** *(Dylan; v0.22)*: scrolling the conversation down hides the members line (and its End) and the stage card closes up around the stage bar (about 26px), **its own top and bottom margins narrowing too** *(Dylan; 12px to 6px; the card 118px to 80px)*, giving the lines the room; scrolling up brings it back, and so does reaching the top. **It goes by which way you scroll** (wheel, touch, the keys, dragging the scrollbar), never by the conversation following new lines in. It slides; with reduced motion it fades. End conversation stays in the message box's actions throughout
- **Only the current conversation is open.** Earlier conversations in this stage collapse into **Earlier this stage**, one line each, opening in place. Earlier stages live in the bar
  - **Its rows are 15px** *(Dylan; v0.21; 13px before)*, a step below the lines, with their Show / Hide; its heading stays a 12px label like the screen's others
- **Selecting a guest** opens the collapsed sections they appear in, highlights their lines, and puts a dot on each past stage they appear in
- **The stream:** lines, Il Notaio's notes in their own style, action lines, and lines addressed to the player marked "to you". A "…is speaking" indicator while a line is generated. **Lore links** for public lore entries, as before (Technical Design: the match is on the line's words only)
- **Il Notaio's hint,** docked between the stream and the message box (Onboarding, below)
- **Decision cards** take the message box's place (Decision Cards, below)

#### The stage bar *(v0.5; reworked v0.16)*

- **The full evening, as the player lives it** *(Mechanics v0.37; v0.16)*: one stage per round of mingling and per council, with no private-plan steps, since the player plans in their own head. For a Pazzi player: the first round of mingling, the first Pazzi council, the second round, the second council, the third round, the third council, Midnight, the choosing of candidates, the speeches, the last Pazzi council, and the ballot. That's **eleven stages.** Each council carries the player's own faction's name. The engine sends this track (Technical Design handoff); two of the names, the choosing of candidates and the last council, need in-world names in the setting pack (tracker)
- **A standard step bar** *(Dylan; v0.16)*: circles joined by lines, done ones filled, the current one an oval holding its name **with no number**, centred in the floating card. Hovering changes nothing in the row. **A tooltip under the row** shows the hovered stage's name, its description, and, with explanations on, its explanation. It waits a moment before the first tooltip, then switches at once between neighbours while one is showing. Focus shows it at once
- **Stage names in title case** *(v0.17)*: "The First Round of Mingling", "The Last Pazzi Council"
- **It stretches with the window,** up to 1280px *(v0.19; 900px in v0.17)*: the bar spans most of the card, the lines between circles share out the room, and the circles grow a little with it. **The card's side margins grow too** *(Dylan; v0.19)*: beyond the reading column's width, about 15% of the extra room on each side, so on a wide screen the card keeps growing but stands in from the edges
- **Sized from its own width** *(v0.19)*: the circles and the open stage's name are sized from the bar's width, not the window's, so **every stage fits however wide the side panels are.** (Sized from the window, the last stages were cut off when wide side panels narrowed the middle.) Checked from 900 to 1920px wide with the right panel from 280 to 480px
- **No motion:** no glide, no magnification. (Every variant with motion was tried and dropped: the row moved under the pointer.)
- **The errand's deadline mark** stays on its stage; **a selected guest's dots** mark the stages they appear in
- **A past stage opens when clicked,** read-only (Past stages); a future stage can't be clicked

### Past stages *(Dylan, Nov 13; v0.5; v0.16)*

Clicking a past stage in the bar opens it in the conversation, read-only.
- **The stage's conversations,** everything the player was in during that stage, in order, with lore links and highlighting
- **Il Notaio's summary** opens over it, **as wide as the message box below it** *(Dylan; v0.17)*, **starting a fifth of the way down** *(v0.16)*, so a good stretch of the dialogue shows above it. **While it's open, the dialogue behind it fades** *(v0.16)*: the content fades, not a tint laid over it, so no edge shows between the cards. Bullet points grouped by conversation, as in v0.13
- **Clicking anywhere in the conversation minimizes his box** to a strip at the bottom; clicking the strip opens it again. It casts the same upward shadow as the message box. **Show / Hide** at the right of his title says which a click will do *(Dylan; v0.17)*, and **his words read larger while it's open** (Onboarding, His boxes)
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
| **End conversation** | End a Colloquio | **In two places** *(v0.16)*: on the conversation's header line, and **under Speak and Pass,** the width of the two, whenever it's on offer. **Both solid red** with white words (Dylan), so ending reads as final |
| **@** and **/** | Open the guest and command menus | Small icon buttons inside the box, at its bottom left |
| **Generate** *(Dylan; v0.16)* | Have the model write a line for your character | Inside the box, **after @ and /**: the same small button as theirs, a little longer, with **only its words different**: their own colour, in the body type, italic, not bold. Not shown in a past stage |
| **Return to current stage** | Leave a past stage | Replaces Speak/Do and Pass while a past stage is open (Past stages) |

- **The prompt** *(v0.16)*, in the accent, says what the moment asks, in plain words: "Your turn: speak or pass." / "Giorgia spoke to you. Answer or pass." / "Lupo ended the conversation. Say a last word or pass." / "Your words will be said at the next pause." (The Player's Words)
- **Your next move** *(Dylan; v0.16)*, small and grey, at the right of the prompt's line, **its right edge lined up with the message box's:** "Your next move: in 3 turns", then "in 1 turn", "this turn" (in the accent, bold), or "next round" once this round's has passed. If it falls while you're in a secret conversation: "this turn, but you're aside". **When the prompt and it don't both fit on the line** (a narrow box), **the prompt keeps its line whole and this one drops below it,** still at the right *(Dylan; v0.20; the prompt was crushed to a word a line, under this one)*. **Clicking it opens the rules on moving** (the section behind the glossary's Move entry), and its explanation says how windows work. The engine sends when the player's window comes in the turn order (Technical Design handoff)
- **The character count** ("0/500") sits at the right end of the same line, over the buttons
- **The placeholder carries the example** *(v0.5; v0.16)*, at the top of the box: **just the example,** *"@Giorgia Pazzi My family never forgets, and rarely forgives", or "/borrow"* *(Dylan; v0.22; "Speak as your character would…" on a line above it is gone, so the box can be shorter)*. All four rotating examples follow that shape, with a comma before "or". They use only commands allowed right now
- **No scrollbar on the empty box;** it comes back once there's text to scroll *(v0.16)*
- **The box is only as tall as its example, one line at least** *(Dylan; v0.22; three lines in v0.19)*, with no blank line under it; a longer example takes the lines it needs. (Four lines, with a blank line above the example, then three, then two, came first.)
- **The example is a little smaller than what you type** *(Dylan; v0.22)*: 15px (line spacing 1.5) to the typing's 17px, so it reads as a hint, not a line
- **What you type is the dialogue's size** *(Dylan; v0.22)*: 17px with the lines' spacing (1.55), in the dialogue's typeface as before (15px before), so the box previews the line it becomes
- **The box grows with what's typed** *(Dylan; v0.17)*, a line at a time, **up to nine lines**, then scrolls. It's never shorter than its placeholder. In a short window it stops at about a fifth of the window's height (three lines at least), so it can't crowd out the conversation. Editing in the middle of the text leaves the cursor where it is
- **Sending a line** *(Dylan; v0.22)*: what you typed fades softly out of the box (about a quarter of a second, drifting up a few pixels; the example stays hidden until it's gone), and when your line joins the conversation it **slides up from under the message box to its place** (about half a second, easing to rest). With reduced motion it simply fades and appears. Your line arrives when the game takes it, so in a busy moment the slide can come a beat after the fade
- **What you type is in the guests' typeface** *(v0.17)*, since it's what your character will say
- **Return to current stage grows taller** rather than spilling if its words run to a third line *(v0.17; a translation might)*
- **The menus open and close with their character** (typing `@` or `/`; deleting it, Escape, or clicking away closes)
- **The menus come down over the prompt's line** *(Dylan; v0.20)*: the `@` and `/` menus end just under it, 6px above the box, covering "Your turn" (and whatever the line says), rather than standing above the whole card; **each is as wide as the message box and lined up with it** *(Dylan; v0.20; a fixed width before, wider than a narrow box)*
- **The guests' portraits in the @ menu are small** *(Dylan; v0.20)*: 28px (44px before), **and the guests are spaced further apart:** each row 42px tall (36px; 48px was a little too far apart), 2px between rows, **and 10px of room above the first and below the last** (4px before); **the / menu has the same room at its top,** its foot under "Not available now" as it was, **and 8px more room between the last command open now and the divider over "Not available now"**
- **The arrow keys move through either menu** *(Dylan; v0.20)*: Down lights the first entry, Up the last; **they stop at either end rather than wrapping round** *(Dylan)*; Return picks the lit one (with nothing lit, Return sends as before). In the command menu they move through the commands open now only, **skipping the folded "Not available now" section** and anything in it. Pointing at an entry lights it too, so only one is ever lit. Typing or reopening the menu clears it
- **The command menu** lists every command the character can ever use, available ones first (Commands, below)
- **Generate** *(Dylan; v0.16)* writes a line in your character's voice, from your briefing and what you've heard, **into the box**, with the cursor at its end. **It replaces any draft** and never sends: nothing is said until you press Speak, so the line can be changed or thrown away. If someone has your ear, the line starts with @ them. While it works, the button reads "Generating…" and can't be pressed again. *The call is Technical Design's (tracker handoff): like Il Notaio's reading, it's the player screen's own call, and never reaches another guest's prompt*

### Scrolling *(Dylan, Nov 18; v0.22)*

**The screen's own scrolling places move 80% as far for each turn of the wheel or swipe of the trackpad,** eased over a few frames: the conversation (its earlier, folded conversations included), both side panels (the left one when the window is short), the information modals and the backdrop behind them, Il Notaio's boxes (his hint, his reading), What You Heard and Saw, Notes, the message box, and the @ and / menus. **Left as the system scrolls:** the opening (its scroll stops are tuned to the system's own scrolling), the page itself in a window too small for the screen, any sideways scroll, and a pinch to zoom. A place at its end passes the wheel on as usual. With reduced motion the gentler step still applies, without the easing. (60% was tried first; Dylan settled on 20% less than the system.)

**The conversation's scrollbar sits beside its lines** *(Dylan; v0.22)*: the conversation is only as wide as its reading column (with its padding), centred, so its scrollbar runs 16px to the right of the lines and the message box rather than at the centre's far edge, next to the right panel. Room for the scrollbar is kept on both sides, so the lines stay centred and line up with the message box exactly (they sat 8px left of it). **The wheel or trackpad over the room either side of the conversation still scrolls it.** In a narrow window the conversation fills the centre as before. With scrollbars that only show while scrolling (the Mac's default), the bar shows in the same place

### Selection *(Dylan, Nov 12; v0.6–v0.7; v0.16)*

In the chat view, **one thing is selected at a time:** a guest or a lore topic. **A guest's name or portrait selects them wherever it appears,** and since v0.16 **that includes your own portrait in the places,** which selects you. Your name and large portrait at the top of the left panel still open your briefing. A new selection replaces the last, clicking it again deselects, and Escape clears it. **Two guests can be selected only in the Web of Confidences.**

**Only what's worth copying can be selected as text** *(Dylan; v0.17)*: the guests' lines and their names, Il Notaio's lines, what you type, What You Heard and Saw, and your notes. Buttons, labels, and the rest can't be highlighted by a stray drag or double-click. A copied line keeps the spaces between the speaker's name, "to …", and the words.

**One selection, shared with the Web of Confidences** *(v0.6)*, unchanged: a guest selected anywhere is selected in the web too, and a pair stays a pair there while the chat holds the one picked last.

### Right: whoever you're looking at

- **The panel stops short of the top, with rounded top corners** *(v0.16)*: **12px down, level with the stage bar** *(Dylan; v0.20; 48px in v0.19, 12px before that)*, and **28px corners** *(v0.19; 22px in v0.17)*, as are the cards that slide up over it. **The "talking with" card's bottom corners are as round as its top ones, and it ends 97px above the Web of Confidences' bar** *(Dylan; v0.20; 82px, then 102px, then 97px; level with the message box in v0.19)*; **it and the cards that slide over it stand the same space (12px) in from the window's right edge** *(Dylan; v0.20)*; **a card that slides up over it ends level with the message box, 12px above the Web of Confidences' bar (lower than the "talking with" card), with the same round bottom corners** *(Dylan; v0.20; square, down to the panel's foot, in v0.19)*, **once it has stopped: while it slides up or down, its bottom reaches all the way to the Web of Confidences' bar, square, with no accent line along it on your own card,** until it has reached its stop or gone off the bottom *(Dylan; v0.20)*; with reduced motion, the cards fade as before
- **Its text is a size up** *(Dylan; v0.19)*: every size in the panel one step larger (its body 17px, its labels 12px; **the card's details, as "Known to all" was, the small size, 15px** *(v0.21; they had gone up two steps)*), and **its cards' side margins grow with it,** from 24 to 40px, with **a deeper top margin** (28px)
- **It grows and shrinks with the window** *(Dylan; v0.17)*, from 280 to 480px (Screen Sizes). **In a window under 1044px wide it starts folded** to its strip, so the conversation keeps room for the stage bar; it can still be opened
- **The same guest's card never shows twice** *(Dylan; v0.22)*: picking the guest you're talking with leaves their "talking with" card in view (any card over it slides away) rather than pulling up a second copy of it over itself; and if the guest you're looking at comes to have your ear, their card over it slides away the same way. Your selection still shows everywhere else (the web, the bar)
- **Reopening the panel doesn't replay the card's slide** *(Dylan; v0.17)*: the card that was showing is simply there. A card slides up only when the selection changes
- **By default, whoever you're talking to** *(v0.5)*: in a Colloquio, the other guest; in a group, the guest last @-addressed by or addressing the player; otherwise empty, with "No one has your ear"
- **Two kinds of card** *(v0.5)*: the **"Talking with" card** (live, tinted, labelled, a dot while they speak) and **a selected guest's card** (plain, raised, "Looking at", with ×). Art & Design's look keeps them apart (The Look)
  - **The "talking with" card has no row of the other guests' tokens** *(Dylan; v0.16)*: the places list already shows who's with you, and selects them the same way
- **Your own card** *(Dylan; v0.16)*: selecting yourself shows **"This is you"** as the label, a small **"You"** tag under your name, and an accent edge all the way round *(v0.20; round the sides and top only in v0.19, when the card met the panel's foot)*. What it shows is what everyone knows of you, the same as anyone's card ("Your own card: what everyone knows about you.")
- **No faction line above the subtitle** *(Dylan; v0.16)*: the subtitle already opens with the faction ("Dominicans · a penitent widow"), so cards show the name, then the subtitle. The same goes for the opening's cards
- **Selecting slides a card up over** the "talking with" card; **deselecting slides it back down** (the ×, Escape, clicking again, clearing in the web, or clicking empty space)
  - **Where it stops** *(Dylan; v0.20)*: **at every width, and whether or not someone has your ear, about 29px under the heading** (85px below the "talking with" card's top; 14px, just covering "No one has your ear", then 34px, then 29px). **"No one has your ear" is centred** and, **while a card is up, sits right under the heading,** at full strength over the heading's fade, so it shows above the card; **with no card up it sits 64px lower** (20px, where it stood before, then 44px, then further still), **sliding up as a card comes and back down as it goes,** in step with the card *(Dylan; v0.20)*. **The name of whoever has your ear shows beside "Talking with"** in the heading, at every width, since the card covers the name under the portrait. *(v0.19 stopped it, when someone had your ear, 40% of the way down a wide panel (380px and up) and just under the portrait in a narrower one, gliding between the two on a resize; Dylan dropped the difference. Just under the heading was a little too far up, just under "No one has your ear" too far down, and halfway cut through that line.)*
  - **The same width as the card under it** (a narrower card was tried and dropped)
- **Headings that stay put** *(Dylan; v0.19)*: when a card scrolls, **its heading stays** ("Talking with", "Looking at", "This is you", "The city"), and **so does a guest's portrait, name, and You tag;** the subtitle and everything after slide under them, fading as they go, with a space above the subtitle so it starts clear of the fade. **On a city entry, its title stays** and the words slide under it. Each card scrolls by itself (the panel's hide control stays in its corner), and **More Below** shows when a card runs past the bottom, as on the left
- **Resizable, and hideable by dragging** *(v0.16)*: a drag handle on the left edge sets the width, remembered in the browser. **Dragging well past the narrowest hides the panel,** as its hide control does; while the drag is past that point, the panel fades to show what letting go will do. Letting go anywhere, even off the window, finishes the drag
- **Its hide control (⇥) sits on the "talking with" heading's line, at its right,** **centred over a covering card's close button at every width** (allowing for the card's scrollbar, where the system shows one) *(Dylan; v0.20)*: in the bottom-right corner it sat on the card that slides up and looked out of place. The card stops below the heading, so nothing covers it; the heading's name keeps clear of it. Quiet until pointed at
- **Can be hidden** to a thin strip with a handle *(v0.5)*, which shows the selected guest's portrait; **the strip ends where the cards do, with round bottom corners** *(Dylan; v0.20)*
- **What it shows is public and fixed** *(fuller since v0.19, Dylan)*, in order:
  - **Portrait, name, and subtitle**
  - **A short description:** two or three sentences, public only. *(Characters' to write, tracker; the demo's are placeholders drawn only from the public lore entries and connections, and stay short where those say little)*
  - **"Their faction wins if":** the faction's win condition, in the rules' words, and who may stand for the office. From the setting pack. The demo's four lines (France takes the win only while a member of the Embassy lives, and not from a candidate who repented) are for ⚙️ Mechanics to check, as it checked the player's rules text
  - **"Known to all":** the public connection lines, as before
  - **"In the city":** links to the public lore entries that concern the guest, each opening here with a way back to the guest. *(Which entries concern which guest is Lore's, tracker; none may point at a secret: the demo links no one to San Frediano)*
- **A city entry** opens here, with a way back: **its title centred** and a size up *(Dylan; v0.19)*, its text, and **"Guests it concerns":** a small portrait and name for each, selecting them
- **"Open in the Web of Confidences"** on a filled card *(v0.6–v0.7)*

### Briefing, rules, the city, and the glossary *(v0.5–v0.7; v0.16; v0.17)*

Each opens as a modal over the screen. **Four modals in a row:** Your briefing, The rules, The city, Glossary.

**The row** *(v0.16; reworked v0.17)*:
- **The side modals come in two sizes,** by the room the window leaves beside the modal in focus *(Dylan; v0.17)*:
  - **Wide** (1280px and up; 1408px in v0.19): **the whole previous and next modals,** each drawn as itself where clicking it lands: **the one on the right at its start** (the briefing's first card, the rules' buttons, the city's list, an empty glossary search), **the one on the left at its last item,** since going back returns there (the briefing's last card, the last rule open, the last city entry) *(Dylan; v0.20; both at their start in v0.19)*, still, and scaled to fit the room, **never more than 85% of the modal in focus** *(Dylan; v0.20; 80% in v0.19)*, so noticeably but only modestly smaller. Each is evenly blurred, and the same colour as the modal in focus. **Its title lies flat in its header, toward the modal in focus, at the focused modal's title size** (it doesn't shrink with the rest). Where it's the way you're heading, it has the accent ring
  - **They shrink only to 75% of the modal in focus (480px), then run off the screen's sides** *(Dylan; v0.20)*: below 1736px each keeps that size, the modal in focus stays centred, and the screen's edges cut the side modals off, their titles still showing toward the middle. Only below 1280px, with about 300px of each still showing, do they give way to paddles. (Tried first: stopping at 1408px's size with paddles below 960px, then at 65% from 1600px with paddles below 1100px; Dylan wanted them larger, running off sooner, and giving way sooner)
  - **Narrower (under 1280px): two paddles,** 40px wide and as tall as the whole side modals were when they gave way (75% of a modal's height; 55% in v0.19), the same colour as the modal, with **the title on end** in the middle (top to bottom on the left, bottom to top on the right, so both read facing the middle) and an arrow below. A title too long for its paddle ends in "…" before the arrow. Square-ish corners (12px)
  - **Hovering** either lights its title in the accent and traces it with a thin accent ring (hover devices only). **A click on a paddle flashes** it, gently *(Dylan; v0.20; a full accent fill, a 4px ring and light words for about two-thirds of a second in v0.19)*: a light tint of the accent and a thin ring, its words in the accent, fading over 550ms *(v0.22; 900ms in v0.20, for something subtler)*; its hover eases in over 420ms, slower than the rest of the modals. The modal arriving moves as it always has
  - Where there's no modal before or after (the briefing, the glossary), nothing is drawn
  - *Tried and dropped:* a middle size (a fading slice with its title and summary), titles on end on the whole modals, darkening, and a blur graded from the outer edge in (it read as uneven)
- **Room** *(v0.17)*: wider margins at the screen's edges (3% of the window, 24 to 64px). **The row never shrinks below the modal and both paddles;** in a window narrower than that, the overlay scrolls sideways, opening centred on the modal in focus. Behind the row, the screen is dimmed and **softly blurred**
- **Rounder corners** *(Dylan; v0.17)*: 30px on the modal, the whole side modals, and an open rules section's card
- **The focused modal's title is centred** in its header; **Close** stays at the right. Every visible modal's title is the same size
- **Every modal starts from its beginning** whenever you move to it, however you get there

**Inside every modal** *(Dylan; v0.17)*:
- **Margins:** wider, even margins around the header, the tabs, the content, and the footer, all scaled from one number so they keep their proportions; **the reading text sits further in still, centred top to bottom** in its card. In a window under 760px tall, the top and bottom margins come in
- **No rule lines** under the header or the tabs, or over the footer
- **Body text** at 15px, a little larger than the screen's; the city's list and the glossary keep the screen's size
- **Lists** in the text are lists: lines that start "- " become bullets with a small accent dot, lines that start "1." a numbered list with quiet numerals, both with a hanging indent and a little room around them
- **Edges that fade where there's more to scroll,** top or bottom; **a card whose text only just fits doesn't scroll at all** (its bottom margin gives way), so nothing moves without showing more
- **More Below** on any reading area that scrolls (not the city's list or the glossary's), **in line with the page counter** where there is one, small (10px). Clicking it scrolls on; it doesn't change which way the modals' highlights point

**Footers that chain them** *(Dylan; v0.16)*: every modal has **Previous** and **Next** at its foot, worded for what it holds ("← Previous Briefing" / "Next Briefing →", "← Previous Rule" / "Next Rule →", "← Previous Topic" / "Next Topic →").
- **On a modal's last item, Next becomes "On to <next modal>"** and opens that modal at its first item. **On its first item, Previous becomes "Back to <previous modal>"** and opens that at its last ("Back to the Rules": the modal's name keeps its title case, its "The" goes lower case after "to", *v0.17*)
- **Going forward,** on the last item the way on breathes (a soft pulsing outline) and the next modal's peek lights up. At the Glossary, the end of the chain, the header's **Close** fills in instead; the Glossary's footer holds only the way back to The City
- **Going backward,** everything mirrors: **cards slide in from the left**, the back button carries the breathing outline, Next and "On to …" go plain, and on the first item the back button fills and the previous modal's peek lights up. At the briefing's first card, the start of the chain, Close fills in
- **The Glossary opened straight from the chat** *(Dylan; v0.17)*, not walked to from The City, has nowhere further to go, so **its way back to The City carries the breathing outline**
- **Motion is subtle** *(Dylan; v0.16)*: a card or city entry slides 24 pixels, one modal giving way to the next 48, anything that grows starts at 97%; all in 300 ms. Theme tokens; with reduced motion set, nothing slides

**Your briefing is a card deck, five cards for the player** *(Dylan; v0.16)*: **Who You Are → Your Errand Tonight → What You Want → What You Know → Relationships,** then **Your Past** where there is one.
- **Left out for the player:** How you speak, Resources, and Social awareness. They serve the AI guests' prompts (the briefing text is unchanged); the screen already shows what Social awareness says
- **Merged:** **What You Want** is the faction's aims, then **Your Own Reasons** (the other goals). **What You Know** is what you know, then **Keep to Yourself** (the secrets)
- The setting pack lists the cards to leave out and the merges (new title, the cards in order, a subheading for each later card), so a reskin names its own (The Player's Words)
- **The tabs are the cards' titles** *(Dylan; v0.17)*: larger (16px), **wrapping onto a second line** rather than reaching into the side margins, and **fixed under the modal's title**, so they never move as you change cards. The card doesn't repeat its title; its text starts a short way below the tabs. *(Centring the tabs and text together was tried and dropped: the tabs jumped from card to card)*
- **Clicking anywhere below the card,** the footer's blank space included, turns to the next; tabs along the top jump; the arrow keys work

**The rules** are buttons, one per section, that **stay in view** *(v0.16)*: a section opens as a card over them. A click on the card turns to the next section; ×, Escape, or a click outside the card goes back to the buttons; a click on the empty space around the buttons opens the first section.
- **The player's own rules** *(Dylan; v0.17)*: the rules modal no longer shows the AI guests' primer (Technical Design's block 2) but **a text written for the player**, in the order a player learns the evening: The Evening, How to Win, Your Errand, The Order of the Evening, **Stages and Turns** (new: stages, turns, what you can say when, and moving), Conversations, Money and Bribes, France's Payroll, Midnight, Candidates and the Vote. Its words are in The Player's Words; its numbers are the game's own (Technical Design handoff)
- **Roman numerals** *(Dylan; v0.17)*: each section button carries its numeral in a small round badge at its left, its name centred; an open section's title reads "V. Stages and Turns", the numeral in plain text
- **Behind an open section,** the buttons are dimmed lightly and slightly blurred *(Dylan; v0.17)*, so the card stands out while the buttons stay just readable. The dimmed backdrop spans the space between the modal's header and footer, **fading in over about 22px at its top and bottom** rather than starting at a hard edge *(Dylan; v0.18)*. The open card above it isn't faded
- The glossary's "More in the Rules" follows the new section names (Ballot, Candidate, Run-off, Speeches, and /repent open Candidates and the Vote; Move, Round of mingling, and Council open Stages and Turns; Gonfaloniere opens The Evening; Errand opens Your Errand)

**The city** is an inbox-style list under subject headers. An open entry has **Previous and Next Topic** at its foot, and a click anywhere on it turns to the next topic; the way back to the list stays put while only the topic slides. *(v0.17)* The list's subject headings stick at its top as you scroll, with a fade under them, and nothing shows above the stuck heading; on the first topic, the way back to the list has nothing to its left, so it isn't shown twice.

**The glossary** is alphabetical, searchable, with "More in the Rules" under an entry with a section behind it, and dotted underlines in the chat (v0.7). **Its terms' names are 14px** *(Dylan; v0.17)*, a step down from 15px over their 13px definitions.

### The Web of Confidences *(Dylan, Nov 12–13; renamed and reworked v0.16; v0.17)*

**Renamed** *(Dylan, Nov 15)*: the Web of Secrets is **the Web of Confidences**. "Web of Confidences" as a title or label (the bar, the glossary's term), "the Web of Confidences" in a sentence.

**The dock** *(v0.16)*: a raised bar along the bottom with ▲, the title (**in capitals, its letters spaced out, 0.46em, regular weight,** with the ▲ 32px from it and the selected guests 32px either side of the dot, their portraits 16px apart *(Dylan; v0.21; spaced out further twice in v0.22, from 0.16em, 16px and 8px, and the title's letters once more, from 0.34em; the space after its last letter doesn't count toward the gap before the dot)*), and the selected guests. **It's the top layer:** it slides up over everything, the floating cards included, with a deep, wide shadow that grows as it opens. **It slides up and down over 600 ms** (with reduced motion, it doesn't slide). Up to two guests can be selected in it; the selection is shared with the chat.

**The web** *(v0.5; v0.16)*:
- **A fixed ring, read like a clock** *(Dylan; v0.16)*: with twelve guests, the guests run clockwise from half past nine, an hour apart, **in an order the setting pack gives** *(Dylan; v0.21; roster order before)*. Florence's puts **the two family heads together at the top, each with a sibling beside him: Clarice at 9:30, Raffaello at 10:30, Piero at 11:30, Francesco at 12:30, Giorgia at 1:30,** then Lupo; **down each lower side, the faction's leader at the top and its least prominent guest at the bottom:** Friar Tommaso 3:30, the Contessa 4:30, Sister Beatrice 5:30 on the right; the Ambassador 8:30, the Prince 7:30, the Captain 6:30 on the left *(Dylan; v0.21)* (Piero was at 9:30 and Raffaello at 11:30 before; Clarice at 10:30 beside Piero was tried, but Raffaello, his brother, mirrors Francesco's sister). A setting without an order uses the roster's. That puts the Medici at the upper left, the Pazzi upper right, the Dominicans lower right, and the French Embassy lower left. **Each faction's name sits outside its arc at a set hour** *(Dylan; v0.17)*: the first at 11:00, the second at 1:00, the third at 5:00, the fourth at 7:00 *(v0.21: with "Captain Armand LeNoir" now at the bottom, the two lower names were tried at 4:30 and 7:30 to clear it, then put back once his name was centred on his circle)* (the Medici, the Pazzi, the Dominicans, the French Embassy). The rule is by roster order, not names. **A long name** (two words or more, over a dozen letters: the French Embassy) **wraps onto two lines.** A clicked name has no focus box; reached by keyboard, it's underlined
- **Roomier,** and **fitted to its space:** the drawing's frame is fitted to what's drawn, so the web draws as large as the panel allows, with the key over its top-left corner and the web moved aside so nothing runs under the key
- **Centred** *(Dylan; v0.19)*: on a wide screen, **everything in the web stops at 1600px and sits in the middle** of the screen, and **the drawing centres in the room between the key and the side column,** or across the whole width when the key is folded. (Pushed toward the side column, it sat off-centre the other way)
- **With margins round it, and a limit** *(Dylan; v0.17)*: the whole drawing shrinks to stand clear of the screen's left edge (56 to 120px) and of the side column (32 to 80px), and it never draws larger than 820px across, so its names stay their size on a big screen. Nothing in it is redrawn: it's the same picture, smaller. *(Widening the ring's gaps at 3 and 9 o'clock was tried instead and dropped: Dylan wanted the margins, not a different drawing)*
- **Names under their circles,** each centred on its own *(Dylan; v0.21)*: the two at the top (Piero and Francesco) and the two at the bottom no longer move outward, away from the middle, as they did from v0.16. **The four names nearest twelve and six o'clock (the pair at the top and the pair at the bottom) break after their first word,** both lines under the circle: "Piero" over "de' Medici", "Francesco" over "Pazzi", "Captain" over "Armand LeNoir", "Sister" over "Beatrice" (first only the Captain's, as the one long name), so each pair stays clear of each other. **So does any name over 18 characters, wherever it sits** ("Raffaello" over "de' Medici"). (Moving the bottom pair apart, centring them on one line, and the Captain's name above his circle were tried first.) The web's text is sized in the drawing's own units, so names keep their spacing at every size
- **Selecting:** a selected guest gets **a thin ring of its own, standing clear of their circle** *(Dylan; v0.22; the circle's own stroke, twice as thick, before: it hugged the circle and looked fat)*, in the accent, with a short fade in; there's no focus box around a clicked guest (keyboard focus gets a thin dashed ring instead). **Every line that doesn't touch the selection fades,** as lines of other types do when one is picked in the key
  - **The selected ring is still** *(Dylan; v0.22, for the flickering)*: at the size it rested at, its line thicker (0.6, from 0.42). *Before:* **The selected rings breathe** *(Dylan; v0.22)*: the ring swells a touch (4.5%) and **thickens a little with it** *(Dylan; 0.42 to about 0.53)*, and back, about 3.6 seconds a breath, so the selection reads as live without pulling the eye. **Never fading,** and **every selected ring breathes together,** whenever each was selected (the web keeps one breath for all). No breathing with reduced motion. *(The first try also faded the ring, over 3.2 seconds, each ring on its own clock: it read as blinking, and two selected rings blinked out of step)*
  - **Clicking a line selects what it joins** *(Dylan; v0.22)*: its two guests, and its type in the key, with **Secret** lit beside the type when the tie is secret (a secret romance lights Romance and Secret). The rest fades as for any selection; clicking the same line again clears both. Lines are hard to hit, so each has a wider, invisible edge to click (3 units)

**The lines** *(v0.16)*:
- **One line per pair and type.** Where your briefing gives your own take on a tie everyone knows, the one line drawn is the public one; your take still shows on the guest's card and in Il Notaio's reading
- **The halo marks a secret** *(Dylan)*: only your ties that no public tie matches (for Francesco: his romance with Clarice, his rivalry with Raffaello, his alliance with Friar Tommaso). Ties everyone knows are drawn plain
- **Pairs with two different ties** still draw their lines close together; side-by-side lines were tried and parked (Open Questions)
- **The key:** the six types, then a **"Secret"** row with its halo swatch and a short line under it: "A tie no other guest knows of. Ties everyone knows are drawn plain." **Every row is selectable,** "Secret" included: it lights its lines and fades the rest; clicking again clears. **Secret pairs with any type** *(Dylan; v0.22)*: with a type picked, Secret narrows it to that type's secret ties, and either can be picked first or cleared alone; another type replaces the type and keeps Secret if it has secret ties. **Whatever can't go with the choice fades** *(Dylan)*: with Secret on, a type with no secret ties (Money, for Francesco); with a type chosen and Secret off, Secret, if that type has no secret ties. **Clicking a faded one swaps the choice rather than adding to it:** Secret clears the type, and a type clears Secret. The key is collapsible, and **shrinks a little in a small window but grows no larger than its size at a 1440-pixel window** *(v0.17; it grew to 1.45× before)*, keeping its proportions. **It never folds itself** *(Dylan; v0.22; below 1200px wide it folded away before)*: it stays as the player left it, and **below 1200px wide the drawing takes the whole width and the key lies over its top-left corner,** frosted, rather than the drawing shrinking beside it (Screen Sizes)

**The side column** (What You Heard and Saw, and Notes; **their two titles at 15px,** with a little more room *(Dylan; v0.21; 12px before)*) **grows and shrinks with the window,** about 28% of its width *(v0.16)*, **from 280 to 480px** *(v0.17)*. **In a window under 1100px wide it folds to a strip** *(Dylan; v0.19; under 840px before)* with a handle along the web's right edge ("What You Heard and Saw · Notes"), so the web keeps at least 560px; the handle opens it over the web *(Dylan; v0.17)*.
- **Both fade under their tabs once scrolled** *(Dylan; v0.22)*: 20px, as the side panels' cards fade under their titles (they had no fade, and their lines cut off hard against the tabs)
- **Both read at the conversation's size** *(Dylan; v0.22)*: What You Heard and Saw's lines and messages, the notes, and the note box at 17px (15px); **the selected guest's or pair's title centred over What You Heard and Saw, at 20px semibold,** a step above the lines *(Dylan)*; the notes' group headings 17px semibold, in sentence case (a capital label before); a note's own guest or pair 15px (12px); the note box's label ("A note on …") and a folded group's count 13px, **the label centred over the box, and Save Note under the box's right edge** *(Dylan; under its left edge before)*. **The tabs are larger:** 18px from a 1440px window, with more room inside (8px by 18px), easing down to 14px in a narrow window so the two stay on one line. *(Dylan: only the tabs; the column's text stays at the scale's sizes)*
- **Il Notaio's reading opens out when he's done** *(Dylan; v0.22)*: after a new selection he shows that he's considering; when his reading comes, the box opens out from that size to its own (650ms), and his words fade in (600ms). None with reduced motion
- **Minimized or open, his reading stays that way until the web closes** *(Dylan; v0.22)*; his past-stage summary does the same until you're back in the current stage (Il Notaio): minimizing it, or opening it again, holds for every guest or pair selected after; closing the Web of Confidences resets it, so it opens the next time (each new selection opened it before)
- **One guest:** their lines in your presence, newest first. **A pair:** what one said to the other. **An empty pair** says why: "You haven't yet heard Giorgia Pazzi or Lupo speak to the other. Only what one says to the other shows here." *(v0.16)*
- **Il Notaio's reading** opens **a little higher than the stage summary,** about a seventh of the way down the column, with the column behind it faded and an upward shadow; a click minimizes it to the foot (v0.5; v0.13; v0.16). **Show / Hide** at the right of its title, and **his words read larger while it's open** *(Dylan; v0.17; Onboarding, His boxes)*

**Notes** *(Dylan, Nov 12; v0.7; reworked v0.16)*:
- **The Notes tab always lists every note,** grouped: each guest, then each pair, then free notes, newest first within a group. Selecting no longer narrows the list
- **Clicking a note, or its group's heading, selects that guest or pair** on the web. The selected guest's or pair's group is lit (its heading and lines in the accent) and scrolled into view
- **Each group folds** under its heading, with a fold button and the group's count while folded
- Every note has the same straight line down its left; long notes wrap inside the column
- The writing box at the top writes on the selection (or a free note), as before. The conclusion button keeps its v0.2–v0.4 rules

### Hover explanations *(Dylan, Nov 12; v0.16)*

Every control and panel has a short explanation on hover or focus, **in plain, short English** (Explanations, near the end). A switch turns them off, remembered in the browser. **The switch governs only the explanations** *(Dylan; v0.16)*: turning them off no longer stills the breathing highlights. Only the system's reduced-motion setting does that.

**On a touchscreen** *(v0.17)*, which has no hover, **a long press** (about half a second) shows the explanation without pressing the thing; a tap still acts at once. A glossary word in the chat shows its meaning on a tap. The highlights that only answer a hover (the side modals' and paddles' rings) show only where there is hover, so a tap can't leave one stuck.

**Hovers that tell you about the world** *(v0.16)*, rather than about the screen (a place's description, a glossary word, Il Notaio's name), **show as a light card,** like the stage bar's tooltip, so they read apart from the dark explanations. They show even with explanations off.

---

### Type sizes *(Dylan, Nov 18; v0.22)*

**One scale, every text on the screen snapped to it** (measured at a 1440 × 900 window, about twenty sizes were in use against the theme's five):

| Step | For |
|---|---|
| **12px** | Small capital labels, all of them: the panels' (Talking With, Your Errand, The Places), the key's heading, the city's groups, Hide and Show; Il Notaio's titles a step up, 13px |
| **13px** | Small print: the members line, the key's types, "Your next move", the count, the glossary's secondary lines, every More Below on a card or in his boxes |
| **15px** | The screen's text and buttons: the briefing, rules and city, the glossary's terms and definitions, What You Heard and Saw, the guest cards, every tab, the stage's name |
| **17px** | Reading: the conversation's lines and names, what you type, Il Notaio's words in his boxes |
| **20px** | Headings, semibold: a guest's name on their card (17px before), the modals' and paddles' titles (18px), your own name at the top of the left panel (about 21.6px; it scales with the panel, around 20px). Headings inside a modal (a rules section, a city entry) a step down, 17px (18px) |
| **24px; 30px and up** | Display: the opening |

- **Nothing read or clicked under 12px:** More Below on the cards was 10px; "Your next move", the count, and the glossary's secondary lines were 11px
- **One size per role:** the capital labels were 11, 12, 12.9 and 13.9px depending on the panel; the tabs 15 or 16px
- **Changes:** What You Heard and Saw 13px to 15px (the same lines as the conversation, the smallest reading text on the screen); the glossary's definitions 13px to 15px and its terms 14px to 15px; Il Notaio's open boxes 16px to 17px; the modals' tabs 16px to 15px; the stage's name 14.4px to 15px; the labels as above
- **Exceptions:** the left panel and the opening still scale with the window, around these values; the Web of Confidences' drawing scales with its ring; the bar's "Web of Confidences" title stays 15px

### Corners *(Dylan, Nov 18–19; v0.22)*

**One corner radius for every button, 12px** (a theme token): the four buttons, Speak and Pass, the modals' and the web's tabs, the rules' section buttons, the key's rows, Show Me Around and Explanations, the deck's foot buttons, Play, Continue and Skip, Save Note, and the small icon buttons (@, /, Generate, the close ×), which were 4px; the rest were 8px. **Kept as they were:** the pills (More Below, the stage, the guests' tokens, Fast-forward), buttons drawn as text or links, a selected name's highlight in the conversation, and the rows of the @ and / menus (8px). Boxes that aren't buttons (the cards, Il Notaio's boxes, the errand) keep their own corners.

**Every corner Dylan hadn't already set, a little rounder** *(Dylan, Nov 19)*, by about 4px: **the stage card and the message box 16px** (12px), the box inside the message box and the Glossary's search 10px (8px); **Il Notaio's hint and his reading and summaries 12px** (8px); **the conversation's lines 12px** (8px; his lines keep their square left edge, by his purple line); the errand, the @ and / menus, the explanations and the stage's description, the tour's boxes and the web's key 12px (8px); **the web's top corners 16px** (12px); the decision cards 16px and their tiles 12px. **Kept as he set them:** the buttons (12px), the pills, the modals and side modals (30px), the paddles (12px), the right panel and its cards (28px), the family cards (28px), an open rule card (30px), a picked name in the conversation, and the menus' rows (8px, inside their now rounder menu). The tour's spotlights follow what they light, so they round with it.

### Frosted glass *(Dylan, Nov 18; v0.22; for his review)*

**Where something floats over content that moves or carries on underneath, it's frosted:** a see-through tint of its usual colour over what's behind, blurred. Two kinds, each set by two theme values:
- **The cards' glass** (78% with a 24px blur since Nov 19, under The Review Pass; before it a 5px blur, as follows), so what passes under shows as soft shapes: **the stage card** (its colour at 76%) and **the message box** (92%, as clear as Il Notaio's box above it, Dylan) *(Dylan)*, with the conversation now running on under them (below), and **Il Notaio's hint** over the message box, in his purple (92%)
- **The veils over words** (a 16px blur, 76%), so their own words stay clear over the words behind them: **the @ and / menus** (their rows see-through too, the lit one solid), **the explanations** (78%, 14px), **the Web of Confidences' key** over its drawing (62%), **the stage's description**
- **Every More Below** (55%, a 12px blur) and **the opening's Skip and Continue** (55%)
- *(A first pass was lighter: 14px and 82% for all; Dylan asked for it stronger, and a heavy blur made what passes under the cards vanish, so the cards blur lightly and the veils heavily; then only the stage card, the message box and Il Notaio's hint were made weaker, halfway between solid and the stronger pass (52% and 84%); the rest keep the stronger pass)*

**The conversation runs on under the stage card and the message box** *(Dylan; v0.22)*: it reaches the centre's top and foot, with room above its first line and below its last so they rest clear of the cards, and shows through them as it scrolls; it fades out only in the 12px gaps above the stage card and below the message box. The room above keeps the untucked card's height, so the line under the stage bar tucking away never moves the lines. **Hidden, Il Notaio lies whole behind the message box** *(Dylan; for a while only his strip was drawn)*, showing faintly through its glass, and **his strip above it is frosted** like the rest of him, **lit under the pointer but still glass** *(Dylan; its lit colour was solid)*, with the conversation running on under it to just above the message box, so a line can show through it as he peeks out; only what would pass the message box's foot is cut off. The conversation's scrollbar now runs its full height, beside the cards.

**A touch of glass on whatever slides up and over something else** *(Dylan)*: the Looking At card over the Talking With card (its colour at 87% with a 10px blur, Dylan; 98%, 95%, 92%, then 90%, for a while; at first the whole card at 95%, then 98%, which left its portraits see-through, then its colour at 97%, through which the words could still be read, Dylan), the Web of Confidences as it rises over the screen and once it's up, alike (its colour at 85%, a 14px blur; 93%, then 90%, read as solid at rest, Dylan; in a narrow window its side strip shows the dock's glass, and its opened side column slides over the drawing at 92%), the modals, the side modals and the paddles alike (88%; 94% before, Dylan; **what shows through them blurred more, 16px of their own** on top of the screen's 5px, Dylan; for a while no blur of their own; the side modals' graded blur over their own content is apart from this), the Rules' card over the rules (87% with a 10px blur of its own, like the Looking At card, Dylan; 90%, 95% and 98% with no blur before, then 92% and 90% with it), Il Notaio's tour boxes in his purple (78%, an 8px blur; 88% at first), and Il Notaio's open reading in the web and his summaries of past stages, alike (his purple at 87% with a 10px blur, its pinned title and fades with it, as the Looking At card; 98%, 95%, 92%, then 90%, for a while; at first the whole box at 95%, which was too much and left icons see-through, then 97%, Dylan). *(His reading in the web is a blur inside the web's blur, the one exception to the rule below; what's under it there is the drawing, which no longer moves but for the rings)*.

**Apple's scroll edge, in the Looking At card and Il Notaio's reading and summaries** *(Dylan, Nov 19)*: words scrolling under a see-through title made it hard to read, and a solid title looked strange on a glass box, so **nothing scrolls under a title any more.** The title (and a guest's portrait and name, a city entry's title) sits outside the part that scrolls, on the box's own glass, with no band or fade of its own, so the box reads as one even pane; **the words fade out before they reach it** (over 28px, once scrolled; at the top nothing fades) **and before the More Below at the foot** (while there's more; at the end nothing fades). More Below sits on the box's own colour, over glass with nothing behind it. As Apple's scroll edge does in iOS and macOS 26 (words soften as they reach a toolbar, rather than passing under it). The Talking With card is solid, so it keeps its pinned heads; the left panel and the Talking With card keep their More Below (55%, a 12px blur). *Build:* each box's words in a scrolling part of their own (`.card-body`, `.reading-body`), faded with a mask whose ends turn on with the demo's marks (`data-head="scrolled"`, `data-foot="more"`), registered properties so they ease in; More Below placed at the box's foot.

**Rolled back first** *(Dylan, Nov 19)*: the Looking At card's pinned heads, Il Notaio's reading's and summaries' pinned titles and their fades, and every More Below take their box's glass again, as before Nov 18 (More Below inside a see-through box at 82% of its box's colour, with no blur of its own: no blur inside a blur). *What was tried, Nov 18:* **Whatever words scroll under is solid**, whatever the glass of the box they're in: the Looking At card's pinned heads (portrait and name, heading, a city entry's title) and their fades, Il Notaio's reading's and summaries' pinned titles and the fades under them and at their foot, and every More Below. The boxes keep their glass; only what their own words pass under is solid (the left panel's pinned top and the talking card's heads already were). *(Still glass for now: the stage card, the message box and Il Notaio's hint, which the conversation runs under, and the edges of his island in the opening)*

**Icons are never see-through** *(Dylan)*: glass is always a box's colour, never the whole box's opacity, so portraits, place icons and the web's circles stay solid on top of it. Only a touch, so what's behind shows faintly as they move and they still read as solid; cards and boxes with pinned titles take it as a whole, so the titles' bands never show apart from them.

**Nothing breathes** *(Dylan, Nov 18; v0.22)*: the flickering went on with the modals or the web up through every fix, so every looping animation is gone. **The ways on** (Next, First Rule, Close at the end, the way back, the Glossary's way back, Continue in the opening, Your Briefing after a skipped tour, a stage that beckons) **keep a still highlight like the web's selection ring, much thinner:** a 1.5px line in the accent, 2.5px clear of the button (`outline` and `outline-offset`, so it follows the button's corners). **Going back, Next and On To lose the highlight** *(Dylan)*, as they lost the breathing, and the way back carries it. The side modals' accent edges stay, still; the speaking dot stays lit; only the opening's pen blinks while he writes. *Tried first, in order:* **the ways on breathe without repainting** *(Dylan's idea)*: the breathing outline on the ways on (Next, Close at the end, the way back, Continue in the opening) animated the button's own shadow, repainting it, and the see-through modal round it, every frame, over the blur behind the modals. It looks the same, but is now two glows (the tight ring and the wide, faint one) on layers of their own, cross-fading by opacity alone, so nothing is repainted; the keyframes move two numbers that the glows read, so wherever the breathing is switched off (reduced motion, or not the way on) neither glow shows.

**No frosted glass inside another, or inside a see-through card** *(Dylan saw flickering in Chrome)*: Chrome redraws a blur nested in another blur, or under a group's opacity, on every frame, and it can flicker, most of all over the web's breathing drawing. **The overlay behind the modals blurs from a layer of its own,** so it isn't itself a blur that the modals sit inside: the side modals' graded blurs see the whole screen through their glass, as the modal in focus does, and nothing blurs inside a blur while the buttons breathe (Dylan saw the flicker only with the modals open). So too the web's key, now inside the web's glass, takes more colour (84%) and no blur of its own, and so do More Below in Il Notaio's boxes and the Looking At card (82%).

**Kept solid otherwise:** what's read at length, so its words stay crisp: Il Notaio's reading and past-stage summaries, the guests' cards, the modals, the errand. *(His reading and summaries could take a veil, but their pinned titles and fades are drawn in his solid purple, and words scrolling under a see-through title would show; kept solid for now)*

## The Review Pass *(Dylan, Nov 18; v0.22)*

An independent design review (a fresh chat, from screenshots of every screen in both modes, judged against Apple's guidelines: clarity, deference to content, depth) found three things that read as enterprise software: outlines on nearly everything, no rule for which surfaces float and which sit flat (dark mode's depth backwards), and too many accents and text styles. Dylan tried it applied whole, then **kept only its quick wins and its design-system cleanup**. Colours, type and surfaces are Art & Design's: these are proposals for them.

**Kept:**
- **Warmer neutrals in both modes,** with the left and centre columns one paper colour (`#F7F4EE`; dark `#171411`); text `#1D1A16` (dark `#E6E0D6`), secondary `#6E6862` (dark `#A69D90`). The right panel keeps its tint
- **Scrollbars thin, shown only while a box scrolls,** and dark in dark mode (`color-scheme`)
- **Dark mode's depth the right way round:** the modals, menus and explanations a step lighter than the page (`#2E2924`), with a faint light edge (0.5px, 8% white); the rule tiles with the same edge; the faction names in the web lighter, so they read
- **The web's six lines each at its own lightness,** so they part even in black and white (light: Kin `#1F4A37`, Romance `#9B3651`, Alliance `#4E6FB3`, Service `#A98A32`, Rivalry `#EC8459`, Money `#E6C060`; dark: `#3F8A66`, `#B23E5C`, `#6F8FD6`, `#C0A252`, `#F5AA85`, `#F7DC9A`)
- **Main buttons solid, with no ring;** focus rings only for the keyboard (2px, 3px out)
- **Outlines off controls:** the four reference buttons, Pass, the rule tiles and the web's key take soft fills instead of borders
- **One close for every modal:** a larger plain ✕ in the corner (20px, light weight, a 32px target), darker under the pointer; **every corner ✕ alike** (the Looking At card's, a rule card's) *(Dylan; at first a 28px circle with a faint fill round a small ✕)*; **the way back in the modals never looks primary** (plain words), the way on the solid button
- **One type scale:** labels 12px semibold capitals spaced 0.06em; modal titles 20px semibold; **the world's voice in the story's serif, the game's mechanics in sans:** Your Briefing and The City's entries in serif at the conversation's size (17/26; 19/29 at first, which read larger than the sans beside it, Dylan), The Rules and the Glossary in sans (15) *(Dylan; at first only the briefing was serif, which split the modals for no reason)*; Il Notaio's reading one size, its lore notes grey, not smaller; the tour's words 15px sans
- **Brought back after the rollback** *(Dylan)*: **whom a line is to as "→ name"**, in grey ("→ you" for you), in place of "(to name)"; and **tabs as one left-aligned row, the chosen one semibold and underlined**, for Your Briefing's five and the web's two (What You Heard and Saw, Notes)
- **The Web of Confidences as it was in the full pass, before the rollback** *(Dylan, after comparing)*, while the rest of the screen keeps the rollback: frosted vellum (`rgba(250,247,241,0.78)`, dark `rgba(46,41,36,0.78)`, a 24px blur) with a hairline edge; the ink accent inside it (its selection ring, its lit lines, its links); pale thin faction arcs (45% of the faction's colour into the page, 50% in dark mode), so the lines own the strong colours; the key without a border. Its two tabs stay underlined. **The faction names stay understated** *(Dylan)*: in their own colour in both modes (not lightened in dark mode), and without the halo round them, which on the glass showed as a pale block; they sit outside the ring, where no line crosses them
- **With a rule card up, the colours swap** *(Dylan)*: the card takes the modal's own colour as it shows on screen (measured: light `#F0F0F0`, dark `#2A2623`), and the whole modal (its title, its foot, the grid) goes uniformly to the darker colour that was under the card (the Rules' scrim tint laid over the modal, the grid's tiles dimmed to match, light 74%, dark 60%); its buttons stay as they are
- **The places' portraits** 24px, overlapping 6px, each ringed in the page's colour, so no initials are cut off
- **Small fixes:** the message box's count shown only from 400 of 500; Fast-forward without its emoji or dashed outline; "The City" capitalised everywhere; a connection line's double full stop ("her..") gone; the family not yet playable says "In the full game" as a grey caption, not a disabled button

**Tried and rolled back** *(Dylan)*: the ink accent in place of the blue; the stage bar as a name over dots; Il Notaio's lines as stage directions without a box; a Messages-like message box; pale faction arcs; one frosted "vellum" for everything that floats; a rule opening as a page in its modal; and the smaller pieces outside the two groups kept (a segmented switch in the web, The City grouped, the opening's ink buttons, the tour's Next, and the like; the underlined tabs and "→ name" came back). *Never tried, by Dylan's choice:* More Below as a fade only, the city entries under their title, closing up the left column's gaps, a grey wash for a picked guest's lines, a shadow for the chosen family card, a thin web ring, tighter web-title spacing, removing Il Notaio's cloud, and the right panel in the page's colour

**The transparency guidelines** *(Dylan, Nov 19; from the design review chat's doc, Apple's Transparency Guidelines, Applied)*: Dylan tried the four recommended changes and two of the possible ones:
- **A solid fallback:** with the system's Reduce Transparency or Increase Contrast on (`prefers-reduced-transparency`, `prefers-contrast: more`), every frosted surface goes solid in its own colour, with no blur: the stage card, the message box and the web's key the surface colour; Il Notaio's hint, his tour boxes and his reading his solid purple; the web `#F2EEE6` (dark `#2E2924`); the modals, menus and explanations the floating colour; the Looking At card its paper; a rule card its swapped colour. With more contrast the frosted edges darken too (20%)
- **His hint solid when tucked:** tucked away, it sits on the message box's glass, and frost on frost reads as mud; so it's solid in his purple, and frosted only once it's out
- **No faint words on glass:** the message box's placeholder in the secondary grey, at full strength, not a faded one
- **One edge and one shadow on every frosted surface:** a 0.5px hairline (8% black; 8% white in dark mode) and a soft drop shadow (8px down, 28px wide), in place of each one's own border: the stage card, the message box, his hint, the web, the modals, the menus, the explanations, the stage's description, the tour boxes, the Looking At card and his open reading
- **A faint highlight along the top inside edge** of the same surfaces (1px, 50% white; 8% in dark mode), as light catching the glass's edge
- **One frost for the stage card, the message box and his hint:** each its colour at 78% with a 24px blur (the stage card 76% and the others 92%, with 5px, before)
**Two of its proposed tweaks, then** *(Dylan, Nov 19)*:
- **A warmer, less glary light frost:** `#F0ECE5` at 78% (white, or `#FAF7F1` on the web, before), since Apple's light glass never passes 94% brightness: the stage card, the message box, the Web of Confidences, the @ and / menus, the explanations and the stage's description. Dark mode as it was
- **No drop shadow on the bars at the screen's edges:** the stage card and the web's bar keep their edge and their top highlight; what pops up (menus, explanations, the tour's boxes, the modals) and the message box keep the shadow
*Not tried, by Dylan's choice:* the guidelines' other possible and not-recommended items, and its proposed tweaks 2 (Apple's own recipe on the bars) and 4 (Apple's darker rim)

*Build:* one stylesheet, `review.css`, laid in at the very end of `app.css` (its rules raised with `html:root body`), plus the web's faction names' colour as a variable (`--fc`), the connection line's full stop, the demo's words (`screen.city` "The City", `screen.to` "→ {name}", `screen.toYou` "→ you") and two small scripts (the count; the scrollbars)

## Screen Sizes *(Dylan, Nov 16; v0.17)*

The screen is laid out for **a laptop, a desktop, or a tablet held sideways.** What grows, what shrinks, and where each stops:

| Part | Size |
|---|---|
| Left panel | Grows with the window, 284 to 332px (about a quarter of the window); its margins, text, portraits, and tokens grow with it |
| Right panel ("Talking With") | Grows with the window, 280 to 480px; starts folded under 1044px wide; 12px below the window's top; the "talking with" card ends 97px above the Web of Confidences' bar, and a card that slid up over it 12px above, level with the message box. Its cards' side margins 24 to 40px; the card that slides up stops about 29px under the heading at every width |
| The conversation's column | At least 540px wide, so the stage bar fits; its reading column (the lines, Il Notaio's boxes, the message box) at most 820px, centred |
| The stage bar | At most 1280px, centred; its card's side margins grow beyond the reading column's width; its circles sized from its own width |
| The conversation's height | At least 200px; Il Notaio's hint folds itself first |
| The message box | One line at least *(v0.22; three before)*; grows to nine, or about a fifth of the window's height in a short window (three lines at least) |
| The opening | 620px column, 18px text; from 1400px wide, 800px and 22px (18px text in a window under 760px tall), with Il Notaio's name and its gloss growing in step (24 to 30px, 13 to 16px). The choice up to 1240px wide (90% of the window), sized from the window's width |
| The modals | 640px wide, 30px corners; their row never narrower than the modal and two paddles, scrolling sideways below that |
| The side modals | Whole modals from 1280px wide, up to 85% of the modal in focus, shrinking to 75% (480px) by 1736px; from 1280 to 1735px, that size, running off the screen's sides; paddles below 1280px, 75% of a modal's height |
| The Web of Confidences | Its contents at most 1600px wide, centred |
| Its drawing | At most 820px across, with margins round it; centred between the key and the side column |
| Its key | No larger than its size at a 1440px window; under 1200px wide it lies over the drawing's corner (it folded itself away before v0.22) |
| Its side column | 280 to 480px; folds to a strip under 1100px wide |
| The smallest labels | A pixel larger from 1800px wide (11 to 12px; More Below 10 to 11px) |

- **Short screens** (a laptop with the browser's bars leaves 650 to 700px): the message box caps as above, **the modals stay clear of the Web of Confidences' bar,** and under 760px tall their top and bottom margins come in
- **Things that fold themselves** (Il Notaio's hint, the web's key) come back on their own when there's room, **unless the player has folded or opened them,** which takes them over
- **Phones are left out for now** *(Dylan)*. Under 760px wide, **a note** stands in for the screen: **"Made for a Larger Screen"**, "Gonfaloniere is laid out for a laptop, a desktop, or a tablet held sideways. On a screen this narrow it won't fit well yet. Turn your device sideways, or open the game on a bigger screen.", and **Continue Anyway**, which holds for the visit. The screen behind is set aside while it shows, so the page fits the phone. A one-column phone layout is an open question
- **Touchscreens:** a long press for explanations (Hover explanations)
- **Long labels:** a translation or a reskin can run longer. With every short label half again as long, nothing spilled; the two places that would at greater lengths were fixed (Return to current stage grows taller; a paddle's title ends in "…"). Notes for the Build asks for a test

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
- **His name floats on an island** *(Dylan; v0.22, marked on a whiteboard)*: a soft white glow round his name and its gloss, **solid at its heart, its fade a touch see-through** (99% of its strength, Dylan; solid, then 86%, 94% and 98% at its heart, each still too see-through), reaching 46px below his gloss, with the story starting 30px under it *(Dylan tried it reaching further down, 84px, with the story 62px under, and went back)* and fading out gradually over a wide, eased edge, with no ring or line to see; it floats a little way below the window's top (54px), so the whole glow is on the screen, and **the story starts clear of it** (30px under his gloss; his glow's foot lay over the first line before, Dylan), and his story scrolls past under and around it (no band across the column), fading away at the window's top edge. **At the very end of his story, the island floats up and away** (within 8px of the page's foot; 140px at first was too soon) (and back if you scroll up again); it's gone for the choice of family. **More is see-through glass** (45%, a 10px blur). *(A large island behind the whole story was tried, and taken away; so was a pill with a 14px fade, whose edge still showed)*
- **His name heads the page, glossed:** "Il Notaio", with *Italian for "the notary"* beneath it (v0.11)
  - **His name and its gloss in his purple** *(Dylan; v0.22)*: the dark, muted purple of his boxes' titles (the screen's text colour and, for the gloss, grey before). The story, "Choose your family…" and the cards keep the screen's colours. (The whole opening in his purple was tried, and taken back)
- **Full screen.** He writes the story leading up to the evening **a paragraph at a time, each fading in whole** *(Dylan; v0.19; a phrase at a time, split at commas and sentence ends, since v0.16, then a sentence at a time)*. Fixed text from the setting pack, not a model call
- **Two sizes** *(Dylan; v0.19)*: from 1400px wide, **a wider column with larger text** (800px, 22px); below that, the narrower column and smaller text as before (620px, 18px). **A wide but short window** (1400px and up, but under 760px tall, the screen's usual line for a short window) **keeps the wide column with the smaller text** *(Dylan)*, so more of the story fits on the screen. **Il Notaio's name and its gloss grow with the larger text** *(Dylan; v0.19)*, in step with it (22/18): his name 24 to 30px, the gloss 13 to 16px; where the story keeps its smaller text, so do they. (At 900px, a laptop's or a desktop's window, once the browser's bars take their share, never got the larger text; Dylan) Art & Design sets the values
- **He writes a paragraph at a time, and clicks speed him up** *(Dylan; v0.19; a phrase at a time since v0.16, then a sentence at a time, with a first click to finish the paragraph)*: each paragraph fades in whole, and waits a little less than one of its sentences would take to read (1.2 seconds at least; a little quicker than at first, Dylan) before the next; **the first click brings the next paragraph at once;** **the second shows everything,** but **Continue stays hidden until the page is at its end,** with **More** in its place meanwhile *(Dylan; v0.19)*; **the third click (or More) scrolls the page all the way down,** where Continue appears, docked at the foot of the screen, which at the page's end is exactly where it sits, so it never moves *(Dylan)*. Scrolling to the end by hand shows it too. *(For a while a further click carried the page down with Continue rising to the middle of the screen; dropped, since a click that just missed Continue sent it gliding away from the pointer)* *(Tried on the way: two, three, and four clicks, as the pace changed; and a quick, double-click-paced click showing everything, dropped as undiscoverable and dependent on hand speed: games use a Skip control or press-and-hold for that, and Skip is here)* **The page doesn't scroll to follow him** *(Dylan; v0.19)*. Instead, **nothing new appears past the bottom of the screen:** when his next paragraph wouldn't fit whole, he waits until the reader has scrolled down far enough for it to, and it appears as soon as it fits; **after the first screen** (once a paragraph has had to wait, or the reader has scrolled down) **paragraphs no longer wait their reading time,** each appearing as soon as there's room for it, and a scroll brings one that was waiting its turn at once *(Dylan)*; **a More button** comes at the foot of the screen, in the middle, as soon as a paragraph is in and the next won't fit, and **takes the reader all the way:** the rest of the story at once, and down to its end, where Continue appears (it isn't a click on the story, so it doesn't count toward the clicks) *(Dylan; at first it scrolled just far enough for the next paragraph, and came only when that paragraph was due)*; it's solid, not see-through *(Dylan)*; **it floats over the text, with Continue's drop shadow** *(Dylan; text stayed clear of it, about 100px up, for a while)*. **Continue comes after the last paragraph's reading time** (2.5 seconds at least), **or as soon as the reader scrolls to the page's end,** whichever is first *(Dylan: it came too quickly at first; then, waiting out the reading time after scrolling down to the end was too long)* (a passage taller than the screen appears once its start is in the top quarter). The page leaves room below the story while he writes, **just what the next paragraph needs** (and, before the story's end, just what Continue will), so the reader can scroll down to make room for it and no further *(Dylan: with 80% of the screen there, a reader could scroll deep into it, and the story then ended in the middle of the screen, far above Continue)*; **when the story is done, that room isn't taken away from under a reader scrolled into it** (the text jumped back down as Continue appeared; Dylan): the page keeps just enough room to stay where they are, **above Continue,** so Continue stays at the foot of the screen (it sat a quarter or half way up, under the story's end, when the room was below it; Dylan), and gives the room up as they scroll back up. A click still brings text at once, wherever it lands. *(Following the writing down, keeping the newest line 64px clear of the edge, came before; following sooner, from two thirds or four fifths of the way down, was tried and taken back)* **While Il Notaio's title stays at the top, the story slides under it with a fade** *(Dylan; v0.19)*, which comes in as the page scrolls, so it never covers the first line before anything has moved. **The title sits close to the top** *(Dylan; v0.19)*: 14px above it (was 32px), and below it 8px and a 24px fade where the story slides under (was 16px and 40px). **Skip** writes everything out at once; **it's a full-size button** (the screen's normal button text, 15px, not the small one) **set in from the corner,** by a margin that grows with the window (24 to 64px) *(Dylan; v0.19)*. **When the story is written, nothing moves on by itself** *(Dylan; v0.19)*: a **Continue** button waits under it, **pulsing** like the screen's other ways on (Dylan), and **docked at the bottom of the screen if the player scrolls back up to reread** (Dylan), with a clear drop shadow under it and nothing behind it (a band fading the story out was tried, then a subtler shadow); **pressed from there, it still carries the page down to the choice** (the page no longer scrolls by itself when the story ends, and **Continue sits at the foot of the screen, 44 to 80px up** by the window's height (32px before; Dylan), docked there and in the same place at the page's end), and **only Continue moves on** (Dylan): a click elsewhere doesn't. It takes the focus when it appears, so Enter or Space presses it. **Then the page scrolls on until Il Notaio's title and his story are off the top of the screen** *(Dylan; v0.19)*, and the choice sits in the middle of it (the page leaves room above and below the choice for that, **with one more of the story's lines of space between its end and the choice** (Dylan); the title no longer stays pinned once the story is written). **On the way, the choice moves with the page,** rising from below as one smooth scroll, unseen, and **fading in out of the dark once it has stopped in the middle of the screen** *(Dylan; v0.19)*, over about 1.3 seconds (0.9 was a little quick; fading as it rose, from the moment Continue was pressed and then from coming onto the screen, was tried first), and docks only once it's there, however far the player had scrolled first. (Docked from the start, it waited at the bottom and then jumped up.) **The opening's scrolling is slow and deliberate** *(Dylan; v0.19)*: an eased glide (slow to start and to stop) rather than the browser's quick smooth scroll, 1.8 to 3.2 seconds to carry the story away and the choice up, by distance (it no longer follows the writing or brings Continue up by itself). A wheel, a touch, or a key stops a glide at once. **Docked, the choice shrinks as the player scrolls back up toward the story** *(Dylan; v0.19)*: full size where it docks, down to about two thirds half a screen further up, toward the bottom of the screen, so more of the story shows; **as it shrinks, each card's short description fades and folds away,** gone at its smallest, leaving each guest's portrait, name, and title, and the button *(Dylan; v0.19)*; **the room above and below "Choose Your Family" shrinks with it,** to about a third, and comes back on the way down (Dylan), and **the title itself fades and folds away,** gone at the smallest size, the cards rising into its place (Dylan). **Two stops: the choice, and the end of the story** *(Dylan; v0.19)*. Once the choice has come up, the page rests at one of two places: **the choice,** centred, and **the end of Il Notaio's story,** where the docked choice has shrunk all the way, with his last line clear above it. Moving away from either, **a wheel or trackpad meets resistance that builds toward a decisive point,** about an eighth of the screen (80 to 120px), the same both ways, so it gives like a click: the page goes 85% as far at the stop, easing down to 35% at the point. Let go short of it, and the page settles back, over about half a second to a second. **Pass it, and the page breaks free and carries on all the way to the other stop**: down from the story's end, the choice comes up to the middle of the screen; up from the choice, the page goes back the same way to the story's end. The carry is an eased glide that starts at speed, as the player's own scroll was going, 1 to 1.8 seconds by distance (slowed from 0.7 to 1.3; Dylan); more scrolling the same way is absorbed while it runs, and scrolling the other way (a real scroll, not a trackpad's stray small nudge), a touch, a key, or a press stops it. **The page never comes to rest between the stops** *(Dylan: "like not having enough speed on a bike and getting stuck at the top of a hill")*: any scroll there carries it on to the stop it's heading for, and left there by the scrollbar or a key it goes to the nearer one. **Coming down from the story, a big scroll can't jump past the story's end:** it stops there and holds as usual. It settles only once the wheel has gone quiet too, so a trackpad's last tiny momentum can't start and then interrupt a settle. *(Tried on the way: settling alone, which a trackpad's flick carried past; even resistance of a third, 60%, and 72%, too strong, then 80%, not decisive enough; a long pull of a quarter to two fifths of the screen, too slow to break free; and a push of a sixth of the screen on breaking free, too little.)* Nothing settles while a finger, the mouse button, or the scrollbar is held, and grabbing the scrollbar stops any of the opening's glides, as a wheel, touch, or key does. How far it has shrunk is measured from where the choice would sit at full size, so its own folding can't move the point it's measured from. **The story isn't gone:** scrolling back up brings it back to reread, and **the choice docks at the bottom of the screen** (sticky), the story sliding under it with a fade, so the choice is always in reach. (Room below the choice, so it sat a little below the middle, was tried first)
- **At the end, the choice,** under **"Choose your family…"** *(v0.16; the ellipsis since v0.19)*, **in Il Notaio's typeface** (semibold), as the last words of his opening, trailing off *(Dylan; v0.19)*. It's a sentence in his voice, so it isn't title-cased: one card per playable character, each with portrait, name, and subtitle (no separate faction line), and since v0.19, **taller, with a short description of the character** *(Dylan)* between the name and the button. *(The descriptions are Characters', tracker; the demo's are placeholders taken from Il Notaio's opening.)* **The choice is larger than the story's column** *(Dylan; v0.19)*: up to 1240px wide (90% of the window), with its title, cards, portraits, names, descriptions, and buttons sized from the window's width (in the demo the title runs from 26 to 46px, the cards from about 240 to 370px tall) **In the mini-game, the full game's other playable character shows greyed out after the playable one,** labelled "In the full game", so the player knows there's more. The list comes from the playable characters not in this game. Choosing one starts the game, and the tour begins
  - **Each card is tinted with its family's colour** *(Dylan; v0.22)*: a wash of the faction's colour over the card (19%; 26% in dark mode; 9%, then 16%, then 24%, then back a little, Dylan) and a border mixed from it (50%), so the choice reads by house at a glance. **Rounder corners** *(Dylan; v0.22)*: 28px, as round as the "Talking with" card (the screen's large radius, 12px, before; 20px tried first). A card for a character who can't be played yet (Piero, "In the full game") stays grey, like its portrait
- **His last paragraph ends on** "Speak as your character would, plainly." (v0.14). **Public only;** Lore writes it, Characters canon-checks it
- **No explanations on the opening** *(Dylan; v0.19)*: nothing shows on hover there (not Skip, Continue, the cards, or Il Notaio's name), whether explanations are on or off; his name has no dotted underline there, since its gloss is written just under it
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
- **It ends on the Your briefing button:** "Start with your briefing." Clicking it opens the briefing and ends the tour. **If the tour is skipped, Your Briefing breathes,** filled in with the accent *(v0.17; an outline in v0.16)*, until the player clicks it or anywhere else
- **It runs once,** remembered in the browser; **Show me around** runs it again. The game holds its first line until it ends (Technical Design v0.51; #146)
- Its words live in the setting pack's `notaio.json` › `tour`
- **Each spotlight fits its part of the screen as it is now** *(Dylan; v0.22)*: **your sheet slides out** for its step, so the spot shows what the card speaks of (it's tucked away otherwise); **the stage bar's whole card**, not just its line; **the message box alone** for the sixth step, whose card is about typing *(Dylan; before, the conversation from under the stage card to the message box, and before that the whole column, far too wide)*; **the right panel's card**, not the panel's full height (the panel itself only if its card is folded away); and **each spot's corners follow what it lights**: its own corner plus the spot's 6px padding. **His card never sits under the Web of Confidences' bar** (the bar's top counts as the window's foot, Dylan: the right panel's card was pushed down under it, and now sits to the panel's left), and **a card above or below its spot is centred on it** (the web's card sits in the middle of the screen, just above the bar, Dylan)

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
  - **In a short window it folds itself** *(Dylan; v0.17)* when the conversation would have less than about 200px, and opens again by itself once there's room, unless the player has folded or opened it in the meantime (Screen Sizes)
  - Templates only, from `notaio.json`, no model calls. Styled apart from his announcements to the room
- **Hover explanations** (The Screen, above); **Il Notaio's reading and past-stage summaries** (Principles)

**His boxes** *(Dylan; v0.17)*: his hint ("Il Notaio, to You"), his reading in the Web of Confidences, and his summary of a past stage all open and close, and all behave alike:
- **His words in his typeface,** the Renaissance one (The Look); the boxes' titles stay in the screen's sans
- **Larger while open:** his words at **17px** open *(Dylan; v0.22; 16px before, now the conversation's reading size)*, 13px minimized (never smaller than today's); his small lore notes 13px open (11px minimized). The size changes in one step as the box opens or closes, never animated, so the lines rewrap once
- **The title is 13px** *(Dylan; v0.22; sized from his open words before, about 14px)*, a step above the screen's other capital labels, and stays that size open or minimized
- **Show / Hide** at the right of the title, in the label size (12px; 11px before v0.22), saying what a click will do
- **No explanation while minimized** *(Dylan; v0.22)*: his hidden hint and his minimized reading or summary show no explanation under the pointer, which instead hides any that's up; they keep their description for screen readers. Open, they explain themselves as before
- **The title stays pinned to the top of his reading and his past-stage summary** *(Dylan; v0.22)*, his words scrolling away under it through a fade (28px, as tall as the one at the foot; 14px at first). **The fade shows only once his words have scrolled under the title** *(Dylan)*: at the top it would lie over his first line
- **Wider margins in his open reading and summaries** *(Dylan; v0.22)*: 28px at the sides, 18px above the title and 18px at the foot (12px and 8px before), so his prose sits in the box like a page, not against its edges. Minimized, they keep the compact strip's margins
- **His hint fades too** *(Dylan; v0.22)*: past five lines its words scroll, and they fade over 28px under its title once scrolled and over 28px at its foot while there's more below, as in his summaries (it had no fades)
- **A fade at the foot as well as under the title** *(Dylan; v0.22)*: the bottom margin stays a plain band, and while there's more to read below, his words fade out over 28px **above it**, the same as under his title *(Dylan; 40px at first)*. **While there's more below, a More Below button floats over his faded words** *(Dylan)*, over the middle of the fade (30px above the foot), the way it floats over the text in the modals; a click reads on by most of a box (70% of its height) without closing it. **While there's more below, the plain band at the foot is 28px; at the end it's 18px** *(Dylan; 44px while there's more before; 12px and 16px throughout were tried)*. At the end of his words, or when they all fit, the fade and the button go (in a fifth of a second), so nothing lies over his last line. (A fade with no margin under it, 28px and then 52px, was tried first)
- **Room under the title** *(Dylan; v0.22)*: 12px between the title of his reading or summary and his first line (4px before), and 4px more above his hint's text, so the title reads as a heading, not his first words
- **Every box is only as tall as what he has to say** *(Dylan; v0.22)*, up to a limit, then it scrolls:
  - **His hint:** one line of text, one line of box (61px with its title; it kept room for two lines, 85px); **at most five lines**
- **His past-stage summary keeps your choice** *(Dylan; v0.22)*: minimized or opened again, it stays that way as you step between past stages (each new past stage opened it before). **Going back to the current stage resets it** (Return to Current Stage, or the current stage in the bar), so it opens the next time you look back, as the web's reading does once the web closes. The game moving to a new stage while you read a past one leaves it alone. *(An unseen summary opening on its own was considered and set aside: stepping to the next stage would undo the player's choice at once)*
- **Hiding his hint slides him behind the message box** *(Dylan; v0.22)*: rather than shrinking to its title, the whole box slides down behind the message box, leaving a 14px strip of his purple showing above it, with no title and no Show (they fade out as he goes). **Clicking the strip brings him back,** and under the pointer it darkens a little and **he peeks out further (20px; 8px, then 14px, at first) and his title shows, centred in what's showing** *(Dylan)*, with no Show, as if about to come back; he's moved, not re-laid out, so the conversation doesn't shift. If he says something new while hidden, the strip flashes as his box does. **His box never shows below the message box,** in the gap above the Web of Confidences' bar: whatever would hang past the message box's foot is cut off, 16px inside it, so even his five-line box stays hidden behind it
  - **His reading and his past-stage summary,** open: **centred in their column, in a room 10% in from the top and 10% in from the foot** *(Dylan; 15% at first)* (in the conversation and the web's side column alike, never over the peeking strip; they used to fill from 20% or 14% down to the foot, and 25% down to the foot was tried), growing both ways with their text (they always filled their room before, however little they said). **Once they fill it, they scroll,** so something above always shows. **Minimizing glides them down to their place at the foot** (about a third of a second), and opening glides them back up; with reduced motion they move at once. (Sitting on the foot and growing upward was tried first)

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
| `examples` | Speak as your character would… "@{guest} …" or "{command}…" | **Just the example** *(v0.22)*, with no "Speak as your character would…", and a comma before "or". The borrow example becomes "@{guest} My family never forgets, and rarely forgives", or "{command}" |

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
| `screen.input.generate`, `generating` | Generate · Generating… |
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
| `screen.opening.choose`, `fullGameOnly` | Choose your family… *(the ellipsis v0.19; not title-cased)* · In the full game |
| `notaio.json` › `tour.steps` | The eight short cards and "Start with your briefing." (The Tour) |
| `screen.hints` | Every explanation (Explanations, below) |

**Not this doc's words** (tracker handoffs): each guest's **role line** ("head of the Pazzi family") and **short errand line** are Characters'; the stage names **"The choosing of candidates"** and **"The last <faction> council"** go in the in-world names, Technical Design's; the glossary's **Errand** entry should point to the rules section on errands once the primer has one *(v0.17: the player's own rules have one, Your Errand, and it does)*.

### v0.17: title case, the player's rules, and new words

**Title case** *(Dylan; v0.17)*. Names, headings, and buttons are in title case: modal and panel names ("Your Briefing", "The Web of Confidences", "Talking With", "The Places"), the briefing's tabs, the rules' section names, the city's topic titles, stage names, Il Notaio's box titles, the left panel's labels ("Payments from France", "Secret Conversations"), and buttons ("Show Me Around", "End Conversation", "Next Briefing", "More Below", "Explanations: On"). **Sentences, prompts, placeholders, descriptions, and status lines stay as they are** ("No one has your ear", "Your turn: speak or pass."), and so does what's already in capitals. **The places stay as Lore writes them** ("The great hall"), since they also appear mid-sentence ("In the great hall with…").
- **The rule:** every word capitalized, except small words (a, an, the, and, but, or, nor, for, of, on, in, to, at, by, with, as, from, into, per, vs) and a name's own particles (de', di, d', da, del, della), which stay lower case unless they open or close the name; a small word that arrives capitalized inside a name goes lower case ("Back to the Rules"). Words already carrying capitals keep them ("LeNoir"). **Only words with letters count as first or last** *(v0.18)*, so an arrow isn't a word: "← The Rules", "Next Rule →"
- **Applied on the screen, not in the source:** the briefing's tabs, the rules' sections, the city's topics, and the stage names come from other docs' text, so the screen title-cases them for display and matches them without regard to case. The setting pack's own labels are simply written in title case. **The small words live in the setting pack** (`player.json` › `titleCase.small`, **new**), so a pack in another language can empty the list or turn the rule off (`titleCase.on`, **new**)

**The player's rules** (`player.json` › `rules`, **new**; corrected in v0.18 after ⚙️ Mechanics' check). The rules modal's text, in place of the AI guests' primer. The `{…}` are the game's values, from the sheet's `values` (Technical Design v0.52, Player Interface, The screen, "The game's values"): `start`, `income`, `payroll`, `vote`, `treasury`, `currency`, `linesPerTurn`, `minglingTurns`, `councilTurns`, `finalCouncilTurns`, `selectionTurns`, `openFloorTurns`, `colloquioCap`. *Italic notes* say when a part is shown: the errand section has two endings, by whether `plot_reward` is on; a clause about a phase whose value is `null` is left out (the mini-game has no councils, candidates, or open floor); and the moving paragraph says one of two things, by whether a round of mingling has at least as many turns as there are guests. Paragraphs that open "Name:" start a section; the paragraphs under it continue it.

> THE EVENING
> Tonight the city's factions (the Medici, the Pazzi, the Dominicans, and the French Embassy) scheme over who will be elected Gonfaloniere, the head of Florence's government. Only a Medici or a Pazzi may stand.
>
> How to win: the moment the vote is announced, the winner is decided in this order.
> 1. The Dominicans win if the elected candidate has publicly repented.
> 2. Otherwise, the French Embassy wins if anyone in the winner's family is on France's payroll, as long as one member of the Embassy still lives.
> 3. Otherwise, the elected candidate's family, Medici or Pazzi, wins.
> A faction needs at least one living member to win. You win if your faction does, even if you died along the way. A candidate who repents changes sides: from then on, they win only if the Dominicans do.
>
> Your errand: your briefing gives you one task of your own tonight, and it comes first. *(reward on)* Finish it before the last council before midnight and you secretly earn one extra act at midnight: a second kill, guard, or watch, on a different guest. No one else is told. *(reward off)* In this game, finishing it earns no extra act at midnight.
>
> The order of the evening: three rounds of mingling, each followed by a council of your own faction. Then midnight. Then the Medici and Pazzi each choose a candidate, the candidates give speeches, every faction holds one last council, and the secret ballot ends the evening.
>
> Stages and turns: the evening moves in stages, shown in the bar at the top of the screen. The rounds of mingling, the councils, the choosing of candidates, and the open floor after the speeches are made of turns; midnight and the ballot are single choices.
>
> A turn is {linesPerTurn} lines spoken across the whole house, shared among every conversation at once. A round of mingling lasts {minglingTurns} turns, a council {councilTurns}, the last council {finalCouncilTurns}, choosing candidates {selectionTurns}, and the open floor after the speeches {openFloorTurns}. *(Each clause after the first only when its value isn't `null`, the list joined with commas and a last "and")*
>
> In a group or a council, you say one thing each turn. Type whenever you like, and your words are said at the next pause in your conversation. Pass gives up your line for the turn. If someone speaks to you directly, the game waits for your answer, and answering doesn't use up your line.
>
> In a secret conversation, the two of you take turns, and the game waits for you each time. It lasts {colloquioCap} lines at most, and either of you can end it sooner; the other then gets a last word.
>
> Moving. At the end of every turn, one guest gets a chance to move, in an order drawn fresh at the start of each round of mingling. *(When `minglingTurns` is at least the number of living guests)* So you get at least one chance each round. *(Otherwise)* A round has fewer turns than there are guests, so not everyone gets a chance every round. When yours comes, you can stay, join another guest's group, or start a secret conversation with any guest. You move toward a person, not to a place. If your chance comes while you're in a secret conversation, you stay where you are and the chance is lost. The line above the message box says when yours is next.
>
> Conversations: guests talk in groups of two to four, or two slip away into a secret conversation (a Colloquio), which no one else can join or hear. Starting one uses your chance to move, and the guest you choose can't refuse.
>
> Il Notaio, the evening's notary, notes who joins, who leaves, and who slips away, and everyone present hears his notes, so slipping away often invites suspicion. Everyone can see who is in which part of the house, but only those in a conversation hear what's said.
>
> When a secret conversation ends, the guest who was invited chooses first, from the groups with room or a secret conversation of their own, which costs them no move. The one who started it goes back to the group they left, or to the smallest group if that one is full or has broken up.
>
> Money and bribes: everyone begins with {start} {currency} and receives {income} more at the start of each round of mingling. Purses are private. A bribe is {currency} handed to the guest you're in a secret conversation with (/bribe); whatever is promised in return is a matter of honor, not law.
>
> France's payroll: any Medici or Pazzi may take a payroll payment of {payroll} {currency} from the French Embassy's treasury (/borrow), which puts them on France's payroll. The treasury starts with {treasury} {currency}; while it's empty, there's no payment to take until one is paid back. Each payment can be paid back before the ballot, {payroll} {currency} at a time (/repay), by the one who took it or by a relative who knows of it; with every payment paid back, they're off the payroll. The payroll is private; only the Embassy keeps the full ledger.
>
> Midnight: each living guest secretly chooses one act: to kill, guard, or watch someone. All acts take effect at once, so a guest who dies at midnight still carries out their own act. A guest guarded by two or more survives an attack. A guest watched by two or more can't carry out their kill. You can't guard yourself. Killers are never named. The dead lose their {currency} and their place on France's payroll; nothing is inherited.
>
> Candidates and the vote: after midnight, the Medici and the Pazzi each choose one living member as their candidate. Each candidate gives a speech, and then anyone may speak.
>
> During the speeches only, a candidate may publicly repent (/repent). It's permanent. The candidate changes sides: from then on they win only if the Dominicans do, and if they're elected, the Dominicans win.
>
> After one last council, every living guest casts one secret vote for any living guest, and may buy extra votes for that same guest at {vote} {currency} each (/buy). Most votes wins, and Il Notaio names only the winner. If the top guests tie, everyone votes once more among only those guests, with no buying; if that ties too, the winner is drawn by lot.

*The values come with the sheet (Technical Design v0.52); the demo reads them from the primer and its own tunables. Every rule here restates Mechanics v0.37, and Mechanics checked it (Nov 16; its five fixes are in, v0.18). The glossary's `rules` pointers follow the new names (Briefing, rules, the city, and the glossary).*

**New words** (`player.json`, all **new**):

| Key | Words |
|---|---|
| `screen.modalRow.paddle.left` / `.right` | ‹ / › |
| `screen.web.sideShow` | What You Heard and Saw · Notes |
| `screen.web.sideShowLabel` / `sideHideLabel` | Show what you heard and saw, and your notes / Hide what you heard and saw, and your notes |
| `screen.narrow.title` | Made for a Larger Screen |
| `screen.narrow.text` | Gonfaloniere is laid out for a laptop, a desktop, or a tablet held sideways. On a screen this narrow it won't fit well yet. Turn your device sideways, or open the game on a bigger screen. |
| `screen.narrow.go` | Continue Anyway |
| `titleCase.on` / `titleCase.small` | true / the small words above |

**Show / Hide** on Il Notaio's reading and his summary reuse `screen.notaioHint.show` and `.hide`.


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
| `generate` **new** | Have the model write a line for your character. It goes in the box for you to change; nothing is said until you press Speak. |
| `webSide` **new in v0.17** | What you heard and saw, and your notes. Click to open or close. |

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
- **The faction colours, richer** *(Dylan, Nov 18; v0.22; for Art & Design)*: the demo overrides `--faction-0` to `--faction-4` at about 130% of their saturation, then the four but the Medici's another 15%, same hue, lightness eased just enough that none is lighter than before (`#197e69`, `#7e6827`, `#2655a0`; the grey unchanged). **Then softer and deeper, "Apple, not Microsoft"** *(Dylan, Nov 18; for Art & Design)*: one family at about the same depth and strength (OKLCH lightness 0.47 to 0.52, chroma 0.075 to 0.11), at hues a step off the primaries: `--faction-0` the Medici a wine red `#8d3d4a`, `--faction-1` the Pazzi a deep teal `#1b7472`, `--faction-2` the Dominicans a warm bronze `#866037`, `--faction-3` the French an indigo `#4f5795` (no longer the screen's own blue, `--accent`, which it was), `--faction-4` a plum `#7a4a76`. The relationship lines soften with them, each about 20-25% less strong at its own lightness, so they're as easy to tell apart (`--rel-romance` `#a3445d`, `--rel-kin` `#2c5843`, `--rel-service` `#8c7239`, `--rel-alliance` `#5573b1`, `--rel-rivalry` `#cf6e4c`, `--rel-money` `#d0a757`; in dark mode `#e393a8`, `#9bd1b2`, `#ccb16f`, `#8fa6d9`, `#f0a17b`, `#fce2ac`), and the Do button's purple a little (`--do` `#5b3f7d`). The screen's blue (`--accent`) is kept for now. *Before that:* **The Medici (`--faction-0`) burgundy, `#8b333f`**, chosen to sit with the rest *(Dylan)*: in OKLCH (a colour space where equal numbers look equally light and strong), lightness 0.45 and chroma 0.12, where the others run 0.46 to 0.53 and 0.09 to 0.15, at a red-brown hue clear of the Romance line's brighter, pinker red; the purple (`#68419e`) moves to the unused `--faction-4`. Proposed for `web/theme.css`; the setting's own colours, if it gives any, still win. *(Tried first: 28% less saturated, and the Medici burgundy; Dylan went back, then asked for richer)*
- **Applied through the theme file only:** a chosen look edits `web/theme.css`, never the components. The card styles, the relationship colours, and the faction colours are already tokens
- **Still to settle:** how the sheet reads as more than a list (a purse with its count, a payroll seal, tally marks for secret conversations), the two card kinds, the hint versus the announcements, and the Web of Confidences' bar
- **Portraits:** until Art & Design's are ready, initials in a faction-coloured circle

**New in v0.16, for Art & Design to give values** (tokens; the demo's values are placeholders):
- **The floating cards:** the stage bar and the message box as rounded cards over the conversation, the right panel short of the top with rounded top corners
- **The layer shadows:** downward under the stage bar; upward over the conversation from Il Notaio's hint, the message box, and his two boxes; and the Web of Confidences' deeper, wider shadow, deeper again when open. Dark mode needs darker, wider ones. **The conversation's fade** where it slides under the cards
- **The breathing highlight** (a soft pulsing outline) on the way forward or back, and the filled Close at either end of the modals' chain
- **The light "world" card** for hovers about the world, apart from the dark explanations
- **The solid red** of End conversation, with its words and hover, in light and dark (its own tokens, since dark mode's danger colour is a light text pink); **the "Secret" halo** on the web; **your own card's accent edge**
- **Generate's words:** their own colour (a new token; the demo's teal is a placeholder), on the same button as @ and /

**New in v0.17, for Art & Design to give values** (the demo's values are placeholders, Dylan's choices in the review where noted):
- **Three typefaces** *(Dylan)*: the screen's words in its sans; **the guests' words**, and what the player types, in a book serif (the demo uses Source Serif 4); **Il Notaio's** in a Renaissance face (the demo uses EB Garamond), upright in the chat. Each needs a token, and each a size adjustment to match the sans's x-height. Dylan's brief: nothing tacky, ostentatious, or hard to read
- **Il Notaio's sizes:** his words 16px open and 13px minimized, his notes in step, his title about 87% of his open size, his Show / Hide 11px (Onboarding, His boxes)
- **Corners:** the modals 30px, the right panel's top and its cards' 22px, the paddles 12px
- **Blurs:** the screen behind an open modal (5px), the whole side modals (3.5px), the rules' buttons behind an open section (2.5px, dimmed 26%, 40% in dark mode), **that backdrop's fade at its top and bottom** (22px; v0.18)
- **The side modals and paddles:** the same colour as the modal in focus; their hover ring and accent title; a clicked paddle's flash (a light accent tint and thin ring, accent words; v0.20)
- **The modals' margins** (one scale for all), their body text (15px, line height 1.6), and **the scroll fades** (36px) where there's more to read
- **The rules' numeral badges** (a small round badge, the numeral in a serif) and **the list marks** (an accent dot; quiet, bold numerals)
- **More Below** at 10px; **the smallest labels** a pixel up from 1800px wide
- **The filled, breathing Your Briefing** after a skipped tour, and the breathing outline on the Glossary's way back
- **The phone note's** page

**New in v0.19, for Art & Design to give values** (the demo's values are placeholders, Dylan's choices where noted):
- **The right panel:** 48px below the window's top; **28px corners** on the panel and its cards; **its text a step up** (12, 15, 17, and 21px in the demo); **its cards' margins** (24 to 40px at the sides, 28px at the top); **the fade** under a card's heading or portrait block (20px); its More Below on the card's own colour
- **The guest card's new rows:** the description, the faction line, and "In the city" links; **the city entry's** centred title (21px) and its guests' small portrait-and-name chips
- **The conversation's lines** at 17px (line height 1.55), Il Notaio's with them; **the names with them** (who speaks, "(to …)", Il Notaio's label), in the sans *(v0.21)*
- **The choice's title in Il Notaio's typeface** (semibold; the demo's EB Garamond 600)
- **The opening's Skip** at the normal button size, and its margin from the corner (24 to 64px)
- **The opening's two sizes** (620px and 18px; from 1400px wide, 800px and 22px, with Il Notaio's name 24 to 30px and its gloss 13 to 16px) and **the choice's** sizes from the window's width (its title, cards, portraits, and text), and the fades: above it when it's docked, and under Il Notaio's title while the story is written; **Continue's** pulse and its shadow when docked
- **The stage bar card's** growing side margins (about 15% of the room beyond the reading column)
- **The left panel's sizes,** set from its width: one unit is the panel's width over 300 (about a pixel), and its margins, text sizes, portraits, and tokens are each a number of units. Your own card's accent edge without its bottom line

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
| End conversation under Speak and Pass, and red; then solid red | Both End buttons, solid red | The input box |
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
| A Generate button that has the model write a response for you; then inside the box by @ and /, the same button with only its words coloured, not bold | Fills the box, never sends; after @ and / | The input box |

**Demo review, part 2** (Dylan, Nov 15–16; v0.17). The rest of the review, after v0.16 merged: comments on the page and screenshots in the chat, each tried in the demo first. The main points:

| What Dylan found or asked | Decision | Here |
|---|---|---|
| The message box should grow as it fills; then grow fully; then cap at nine lines; the cursor jumped to the end when editing | Grows to nine lines, then scrolls; cursor stays put; in a short window, a fifth of its height | The input box; Screen Sizes |
| The left panel should grow with the window; the chat column needs a minimum; the right panel and the web's side column should get out of the way when it's narrow | 284–332px (then a little narrower); at least 540px for the conversation; the right panel starts folded under 1044px; the web's column folds under 840px | Left; Right; The Web of Confidences; Screen Sizes |
| Should the card's slide-up replay every time the right panel reopens? | No: it's simply there; it slides only when the selection changes | Right |
| Too much highlights when you click around; then: everything in the chat, names included, and What You Heard and Saw | Only what's worth copying can be selected | Selection |
| The order of the evening in the rules: deeper, or a new section? Retitle, reorganize? | A new Stages and Turns section and the player's own rules text, reordered and renamed | Briefing, rules, the city, and the glossary; The Player's Words |
| The modals' margins: bigger, then the text further in and centred top to bottom, then smaller again; then about 15% more for everything | One scale for all the margins, text centred in its card | Briefing, rules, the city, and the glossary |
| Titles centred; no lines; body text a little larger, but not on the city's list or the glossary | Done | Briefing, rules, the city, and the glossary |
| Scrolling: a fade where something slides under; More Below buttons; cards that scroll without showing anything; More Below changed the highlights | Scroll fades; More Below on reading areas; a nearly-fitting card doesn't scroll; More Below leaves the highlights alone | Briefing, rules, the city, and the glossary |
| Roman numerals on the rules' buttons, and in the open section's title as plain text; shadows on the buttons and a fade on the backdrop (dropped) | Numeral badges; numbered titles; the backdrop lighter and slightly blurred | Briefing, rules, the city, and the glossary |
| The briefing's tabs bigger, wrapping, no repeated titles; centring them with the text made them jump | Tabs as titles, fixed under the modal's title | Briefing, rules, the city, and the glossary |
| The right side modal seemed to slide under the right panel | The screen behind a modal is blurred, so no hard edge shows | Principles |
| The side modals: larger; whole cards when there's room, then paddles; titles on end, then flat; blur, then graded, then even; darkened, then the modal's colour; hover and click cues; a minimum width; margins at the screen's edges; never as large as the modal in focus | Two sizes, whole modals and paddles, as described | Briefing, rules, the city, and the glossary |
| Rounder corners on the modals (then rounder still), but not the paddles; rounder tops on the right panel | 30px, 12px, 22px | The Look |
| Il Notaio's words larger when his box is open, never smaller than now; his title in proportion; Show / Hide on all his boxes; his summary as wide as the message box | His boxes, all alike | Onboarding, His boxes; Past stages |
| A different typeface for dialogue and for Il Notaio | Three typefaces | The Look |
| Title case where it makes sense | A rule in the setting pack, applied to names, headings, and buttons | The Player's Words |
| What could use a maximum or minimum size? (the web and its key first) | Limits across the screen; phones left out, with a note; touch, short screens, small labels, long labels | Screen Sizes |
| The web's faction names at 1, 5, and 7 o'clock, "French Embassy" wrapped, no blue box on click; then more room around the drawing (widening the ring's gaps was the wrong fix) | Set hours by roster order; margins round the whole drawing | The Web of Confidences |
| Bullets and numbered lists in the modals' text should look better | Real lists | Briefing, rules, the city, and the glossary |
| Your portrait and name bigger; the skipped tour's Your Briefing filled in; the Glossary's way back highlighted when opened from the chat | Done | Left; The Tour; Briefing, rules, the city, and the glossary |
| *(v0.18; ⚙️ Mechanics' check)* The player's rules text against v0.37: repentance, the turn numbers, the treasury, a broken-up group, phases made of turns | All five fixed; the numbers are the game's own | The Player's Words |
| *(v0.18)* A fade at the top and bottom of the rules' backdrop; then more subtle. (A shadow under a card sliding over the "Talking With" card was tried and dropped) | A 22px fade at each end | Briefing, rules, the city, and the glossary |

**Demo review, part 3** (Dylan, Nov 16; v0.19). After v0.18 merged, with **#179** building v0.17 and v0.18: comments and screenshots in the chat, each tried in the demo first.

| What Dylan found or asked | Decision | Here |
|---|---|---|
| The stage bar's card: margins that grow when the window outgrows the reading column; then the bar itself wider, and wider again; then smaller margins | Up to 1280px, with margins of about 15% of the extra room | The stage bar |
| Resizing in Safari was jittery | The demo's resize work runs once a frame; a build note | Notes for the Build |
| The web's contents toward the middle on a wide screen; the drawing off-centre one way, then the other; the side column folding sooner | 1600px, centred; the drawing centred between the key and the column; folds under 1100px | The Web of Confidences; Screen Sizes |
| Two sizes for Il Notaio's opening; the choice not so close to the bottom | 800px and 22px from 1400px wide; room below the choice | The Opening |
| The card that slides up should stop halfway in a wide panel, gliding when the panel is resized; then a little higher; then, in a narrow panel, not so far up, and then halfway between | 40% from 380px; under the portrait below that | Right |
| The opening's choice cards taller, with a brief description of each character | Done, with placeholder descriptions | The Opening |
| The right panel's text larger; city entries' titles centred; more on each card ("it looks a little blank"), using real information | A size up; centred titles; description, faction line, and city links, all public | Right |
| A blank line above and below the message box's example, always four lines; then no line above; then one line fewer | Three lines, the example at the top | The input box |
| Everyone's dialogue larger | 17px, Il Notaio's too | Centre |
| Wider margins in the right panel's cards; deeper top margins; the panel lower (three times the gap, then a little more), the stage bar staying put | 24–40px, 28px, 48px | Right |
| On scrolling a card, the text should slide under its heading with a fade; then under the portrait and name (and the You tag), and on anything else under its title | Headings, portrait blocks, and titles stay put | Right |
| Rounder top corners on the two cards; the top card a little narrower (then back to full width); a space above the subtitle | 28px; full width; a space clear of the fade | Right; The Look |
| The last stages cut off at some widths | The circles are sized from the bar's own width | The stage bar |
| More Below on the right panel's cards | Done | Right |
| The card that slides up shouldn't stop halfway when there's nothing worth seeing under it; then, not quite so far up | Only when someone has your ear; otherwise about 14px under the heading, covering "No one has your ear" (just under the heading, just under that line, and halfway, first) | Right |
| The left panel's margins bigger, and everything in it a little bigger, growing and shrinking with the panel, icons included | Sized from the panel's width | Left; Screen Sizes |
| The left panel scrolls a lot on a 1080p monitor; then, your portrait beside your name and role, with more room above and below; then, the empty places on one line; then, a little less room above you (then back), and the pinned top compressing in a shorter window, never overlapping; then, fully compressed, the errand stopped sliding under the buttons | Side by side, the pinned top about 70px shorter; the empty places folded into one line. It fits a 1920×960 window without scrolling. The top stays pinned down to 520px tall (640px before) | Left |
| The "Talking with" card's bottom corners as round as its top ones; the cards that slide over it as they are | 28px all round, its bottom level with the message box's; the sliding cards keep square bottoms | Right |
| *(v0.20)* The "talking with" card and its covering cards in from the right edge, about as far as from the bottom | 12px in from the window's right edge | Right |
| *(v0.20)* The / and @ menus lower, just covering the "Your turn" line; both navigable with the up and down arrow keys, which skip "Not available now" | They end 6px above the box; arrows light an entry, Return picks it | The input box |
| *(v0.20)* A card that slid up should end, once stopped, level with the message box, 12px above the Web of Confidences' bar | 12px above the bar; the "talking with" card still 82px | Right |
| *(v0.20)* While a card slides up or down, its bottom should reach the Web of Confidences' bar, unrounded, until it's off the screen or at its stop | Square and full height while moving; rounded and level once stopped | Right |
| *(v0.22)* Il Notaio's titles always pinned to the top of his summary boxes, with a fade under them; the example text a little smaller, and the box able to shrink to one line | Titles sticky, 14px fade; the example 15px; one line at least (72px) | Il Notaio; The input box |
| *(v0.22)* Il Notaio's box above the message box only as tall as his text at the time | No two-line minimum (85px to 61px for one line); then the same for all his boxes, each with a limit (the hint five lines; the reading and summary where they used to start); then the reading and summary centred in that room until they fill it; the room an even 25% down for both (20% and 14%), then 15% in from the top and the foot, then 10%; minimizing glides them back to the foot | Il Notaio |
| *(v0.22)* Reduce scroll sensitivity (in the chat, the side panels, the modals, Il Notaio's boxes, What You Heard and Saw, Notes, the message box, the menus) | 80% of the system's distance, eased; the opening and page left alone (Claude advised against taking over scrolling in general; Dylan scoped it to these places) | Scrolling |
| *(v0.22)* Everything adjusted on the web's bar spaced out even more | Letters 0.24em, then 0.34em; ▲ 24px, then 32px; either side of the dot the same; portraits 12px, then 16px apart | The Web of Confidences |
| *(v0.22)* On sending, a subtle fade-out, then the line slides up from under the chat box to its place | The typed text fades (about 240ms); the line slides up (about 520ms) when it arrives | The input box |
| *(v0.22)* Hide the text under the stage bar and shorten its card when scrolling down; back when scrolling up | The members line tucks away and the card closes up (26px); by the direction of your own scrolling | Centre |
| *(v0.22)* What you type the size of the dialogue; drop "Speak as your character would" so the box is shorter | 17px; the example alone; two lines at least (the box 12px shorter) | The input box |
| *(v0.22)* A shorter fade on a clicked paddle, to look more subtle | 550ms (900ms) | The modals |
| *(v0.22)* More space below Il Notaio's titles | 12px under his reading's and summary's titles (4px); 4px more above his hint's text | Il Notaio |
| *(v0.22)* A subtle background on the choice of family's cards, from each character's family colour | 9% of the faction's colour over the card (14% dark), the border mixed from it; the unplayable card stays grey | The Opening |
| *(v0.22)* The cards' backgrounds a little bolder, and their corners rounder; then bolder still, and rounder still | 16% (22% dark), border 45%, corners 20px; then 24% (32% dark), border 60%, corners 28px | The Opening |
| *(v0.22)* Il Notaio's boxes 10% from the top and the bottom | 10% (15%) | Il Notaio |
| *(v0.22)* Bigger margins in all his summary boxes (past stages, What You Heard and Saw), and scroll fades at their bottoms | 28px sides, 18px top (12px, 8px); a 28px fade at the foot that rests below the text at the end | Il Notaio |
| *(v0.22)* Bigger fades at the bottom; his hint's side margins matched, not its top and foot | The fade 52px; the hint 28px at the sides | Il Notaio |
| *(v0.22)* Keep his usual bottom margin, with the fade above it | An 18px plain margin at the foot, the 40px fade above it while there's more below; none at the end | Il Notaio |
| *(v0.22)* The cards' backgrounds a little less bold | 19% (26% dark), border 50% | The Opening |
| *(v0.22)* Il Notaio's boxes in the chats purple; his title on the opening slightly purple, the accent of his box titles (the gloss as it is) | His lines take his boxes' ground and text; his name in his titles' purple | Centre; The Opening |
| *(v0.22)* The opening's subtitle and all his intro text the same purple | The gloss, the story, and "Choose your family…" in his titles' purple | The Opening |
| *(v0.22)* The breathing a little quicker and less fat; Secret's selecting and deselecting not right; More Below floating over his text as in the modals, and a smaller bottom margin | 3.6s, 2 to 2.3 times the line; the key counted your takes on public ties as secrets, now only the haloed ties; the button over the fade, the foot 12px | The Web of Confidences; Il Notaio |
| *(v0.22)* Try 16px for his summaries' bottom margin | 16px (12px) | Il Notaio |
| *(v0.22)* The bottom margins back as they were before the 12px try; More Below still floating | 44px while there's more below, 18px at the end; the button over the fade | Il Notaio |
| *(v0.22)* Do the bottom fades match the top? (They didn't: 14px under the title, 40px at the foot) | Both 28px | Il Notaio |
| *(v0.22)* 28px fades in his hint; 20px fades under the web's tabs (What You Heard and Saw, Notes) | As suggested: the scrolling places that had none (the menus left alone) | Il Notaio; The Web of Confidences |
| *(v0.22)* Tell his lines in the chats apart from his summaries over them, so one scrolling under the other isn't confusing | The lines lighter with a purple rule down their left edge; the boxes' border a little darker | Centre |
| *(v0.22)* Catalog all the font sizes and suggest changes; then apply the scale, the labels, the minimum size, the related text and the near-duplicates (1–5), and show an example of one heading size (6) | About twenty sizes against the theme's five; snapped to 12, 13, 15, 17, 20, 24, 30+; the heading size shown as an example, then applied | Type sizes |
| *(v0.22)* Hiding Il Notaio in the chat slides him under the message box, a little purple peeking out, no title or Show; his box's bottom never in the gap above the web's bar | A 14px strip; clicking it shows him; clipped 16px inside the message box | Il Notaio |
| *(v0.22)* Apply the one heading size; move the demo's Fast-forward further down into the corner | 20px semibold; Fast-forward in the corner of the web's bar | Type sizes |
| *(v0.22)* The purple only on his title and subtitle at the opening; the whole stage card narrower top and bottom when the line under it tucks away; a selection ring wider and thinner; an opening-out when he's done considering; a smaller foot margin while there's a fade; the web's side column (both tabs) larger, titles in proportion, and its tabs larger | As asked; the ring 5.15 units (the circle 4.2), 0.42 thick; the foot 28px while there's more; the column 17px | The Opening; Centre; The Web of Confidences; Il Notaio |
| *(v0.22)* The selected guest's or pair's title in What You Heard and Saw centred and larger than the lines; in Notes, "A note on …" centred over the box and Save Note on the other side | 20px semibold, centred; Save Note under the right edge | The Web of Confidences |
| *(v0.22)* Hovering the hidden Il Notaio: besides lighting up, he slides back out a little | 8px, by a transform | Il Notaio |
| *(v0.22)* Il Notaio's animations slower; the breathing ring a little thicker as it swells; his reading in the web staying minimized (or open) until the web closes; peeking out a little more on hover; the side column's buttons and text a little bigger | About 1.4 times as long; 0.42 to 0.53; held across selections; 14px; the tabs 18px (the column's text went to 18px too, and was put back: Dylan meant only the tabs) | Il Notaio; The Web of Confidences |
| *(v0.22)* Space out just the web's title even more | 0.46em (0.34em); the gaps either side unchanged | The Web of Confidences |
| *(v0.22)* His past-stage summaries stay minimized too; what should open them again? | Going back to the current stage (Return to Current Stage, or the current stage in the bar), like closing the web; not an unseen summary, which would undo the choice a step later; the game moving on leaves it alone | Il Notaio |
| *(v0.22)* More room above the four buttons; the errand card minimizes and expands, closed at first, and no longer links to the information (unless both can work); it closes itself in a short enough window | 12 units more; a folding card with one labelled link, "More Info →"; closed when a resize leaves the panel needing to scroll | Left |
| *(v0.22)* The errand's link reads "More Info →" | ("In Your Briefing →") | Left |
| *(v0.22)* (Marked on a whiteboard) the left panel's larger gaps all the same, and its smaller gaps all the same | Larger 46px: above you, above the four buttons, above The Places; smaller 26px: you to your sheet, the buttons to the errand, the places to the empty ones (in a tall window; both close up in a shorter one, 41 and 24px at 900px) | Left |
| *(v0.22)* The errand as close under the four buttons as they are to each other | 6px; the pinned top's fade only once the panel scrolls (it lay over the errand's top edge) | Left |
| *(v0.22)* Il Notaio's title centred in his strip when he peeks out, and a little more of him showing (then: only on hover, the strip at rest as it was); "More Information" to "More Info"; every button that isn't a dropdown rounder, alike across the project (More Below already pills) | On hover 20px more, with his title centred (it first went into a 30px resting strip, taken back); one button radius, 12px, everywhere (8px, the small icon buttons 4px); the menus' rows, pills, a selected name's highlight and text-like buttons as they were | Il Notaio; Left; The Look |
| *(v0.22)* No tooltips on Il Notaio's titles when minimized | His hidden hint and his minimized reading and summary show none; the pointer over one hides any that's up; open, as before | Il Notaio |
| *(v0.22)* Add transparency wherever it makes sense, for Dylan to check | Frosted glass (a see-through tint with the background blurred) on the floating surfaces: menus, explanations, the key, the stage's description, More Below, Skip and Continue; not on Il Notaio's boxes, the cards or the modals, or the stage card and message box (nothing runs under them) | Frosted glass |
| *(v0.22)* Larger left and right margins inside Show Me Around and Explanations | 14px at the panel's widest (8px), less as it narrows, so they never wrap | Left |
| *(v0.22)* The glass stronger; try it on the stage bar and the chat bar; what about Il Notaio's boxes? | Two kinds: the cards' glass (4px, 52%) and the veils over words (16px, 76%); the conversation now runs under the cards; his hint frosted, his reading and summaries kept solid | Frosted glass |
| *(v0.22)* Split the difference between the first glass and the stronger one; then, instead, weaker only on the chat bar, Il Notaio and the stage bar | The stage card and message box 76% (5px), his hint 92%; everything else as the stronger pass | Frosted glass |
| *(v0.22)* Resizing the window shouldn't collapse the web's key; it should just slide over the drawing | No folding; under 1200px the drawing takes the whole width and the key lies over it. (The side column's tabs now shrink in a narrow window: they wrapped at 1000px, before and after they grew) | The Web of Confidences |
| *(v0.22)* The stats under your icon slide underneath it: out on hover over your icon or name, kept out on a click, back under on another click; the link to the briefing removed; some indicator or tooltip of how it works | As asked; a small arrow under you (down, then up), and an explanation | Left |
| *(v0.22)* Keep the four buttons where they'd be with the sheet out; the sheet's room collapsing in a shorter window, but only after the errand has; a click while it's out collapses it at once, even while hovering | Its room kept; the errand closes first, then the room; the room returns when there's space; a closing click wins until the pointer leaves | Left |
| *(v0.22)* The bottom chat box's transparency about equal to Il Notaio's box | 92% (76%); the stage card stays 76% | Frosted glass |
| *(v0.22)* Hidden, Il Notaio's box showing under the chat box; his peeking strip transparent too | His whole box behind the message box's glass; the strip frosted; still never below the message box | Frosted glass; Il Notaio |
| *(v0.22)* At the opening, Il Notaio a little floating island with fade effects all around him | A lighter island 200px wider than his column, its edges feathered into the page; the words fade at its top and foot; gone for the choice of family | The Opening |
| *(v0.22)* The four buttons right under the stats while they're out on hover, sliding down to where they are now when clicked to stay out | No gap while tucked or peeking; the larger gap (46px) when kept out, sliding | Left |
| *(v0.22)* When Il Notaio peeks out on hover, that bit transparent too | Its lit colour made see-through (it was solid); the conversation runs on under the strip, to just above the message box | Frosted glass; Il Notaio |
| *(v0.22)* (Marked on the whiteboard) Il Notaio floating with a fixed white ground just round him, fading out a little beyond; not exactly that shape | A white pill-shaped island round his name and gloss with a soft 14px fade; the story-wide island taken out | The Opening |
| *(v0.22)* Keep the whole story on an island too; more transparency on More | The story's island back, his name's island on it; More 45% glass | The Opening |
| *(v0.22)* The island's hard outline still showing through the fade; no island behind the text; his island floating away as you reach the end | A radial glow, solid at its heart and fading gradually; the story's island taken out; within 140px of the foot, once his story is all written, it rises and fades (back if you scroll up) | The Opening |
| *(v0.22)* He floats away too soon; the island's hard outline still shows | Only at the very end (8px from the foot); a wider glow with an eased fade, floated 54px down so it's never cut by the window's top edge (that cut was the line) | The Opening |
| *(v0.22)* The foot of his name's glow over the top of the story; the four buttons a little lower, as far under the stats as their rows are apart (only when not clicked open); a small amount of transparency on anything that slides up and over something else | The story starts 30px under his gloss (the head rests where it sticks); 6px; the Looking At card, the web, the modals and his open boxes at 93-95% | The Opening; Left; Frosted glass |
| *(v0.22)* The character icons a little less saturated, on the web too, with the faction colours and labels matching; the web slightly see-through once it's all the way up, matching its way up; then the Medici burgundy, not a purple near Il Notaio's; then the colours as they were | The colours back as they were (tried: about 72% saturation, the Medici burgundy); the web's glass the same throughout | Frosted glass |
| *(v0.22)* The web and the modals (centre, side, paddles) a little more see-through, the Looking At card less; the Rules' card over the rules a little see-through; Il Notaio's tour boxes too; then his island in the opening; flickering in Chrome; the four buttons the small gap under the stats, then the large gap | Web 85%, modals 88%, Rules' card 90%, tour boxes 88%, the island's heart 86% (its fade in step), Looking At 98%; no blur nested in another blur or under a group's opacity (the likely flicker; not seen headless); the smaller gap (about 26px), the larger once clicked open | Frosted glass; Left |
| *(v0.22)* His island less see-through; his tour boxes more; the side modals as see-through as the one in focus; the Rules' card less; the Looking At card less; icons never see-through; his reading in the web less, and his past summaries matching it; flickering only with the modals open | 94%; 78%; the overlay's blur on its own layer, so the side modals see the screen like the modal in focus (and the likely flicker, blur inside blur, goes); 95%; its colour at 97%; glass from the colour, never the box's opacity; 97% for both | The Opening; Frosted glass |
| *(v0.22)* The errand 12px under the four buttons, not 6; the icons' and factions' colours more saturated, not less, and no lighter; The Places pushed down, with the errand folded, as far as the buttons are under you (about 145px), the gap with it open unchanged | 12px; about 30% more saturated at no higher luminance; measured in the demo, gliding with the errand's fold, and a short window gives your sheet's room back only when both fit | Left; The Screen; The Look |
| *(v0.22)* Il Notaio's tour spotlights fit the parts of the screen as they are now; the same card never pulled up twice in the right panel, top and bottom | The sheet slides out for its step; the stage card whole; the conversation between the cards; the right panel's card; corners matched. Picking the guest who has your ear shows only their "talking with" card | The Tour; Right |
| *(v0.22)* His island barely see-through; his tour spot on the conversation far too wide; the Rules' card less see-through still; his summaries and the Looking At card more solid but blurred (the words under them could be read); the icons a little richer again but the Medici's purple, no lighter; a click on the arrow under you, or beside it, pins the stats; flickering still with the modals or the web up | 98%; as wide as the message box, from just under the stage card; 98%; 98% with a 10px blur; about 15% more; the arrow's whole line clicks as you do; only the selected rings breathe, only with the web up (the whole web's breath, restyling it every frame under the blurs, was the likely cause); then, Dylan asking whether the modals' breathing could be to blame too, the ways on breathe by cross-fading two glows on their own layers, repainting nothing | The Opening; The Tour; Frosted glass; The Look; Left; The Web of Confidences |
| *(v0.22)* Why the colours behind the message box and his hint were boosted and nowhere else | A leftover from the first glass pass (the stage card, the menus and the web had it too); removed everywhere | Frosted glass |
| *(v0.22)* Flickering still: no breathing at all, the web's ring the same size but thicker, the modals' ways on a still highlight like it, proportionally thinner; a picked guest's lines in the chat in their faction's colour; the Looking At card and his summaries 95% with the 10px blur; his island less see-through still; the colour boost back wherever it makes sense | No looping animation anywhere but his pen; ring 0.6; a 1.5px accent line 2.5px clear; an 11% wash of their faction's colour (22% in dark mode); 95%; solid at its heart; `saturate(1.3)` on every frosted surface but the dimming blurs; then the modals' see-through blurred more, 16px of their own | Frosted glass; The Web of Confidences; The modals; The conversation; The Opening |
| *(v0.22)* His cloud further down round his subtitle (then back as it was); the tour's sixth step on the chat box alone; the seventh's card under the web's bar; the eighth's centred above the bar; the Rules' card more see-through with a 10px blur; the Looking At card and his summaries 92% with the 10px blur; a picked guest's chat tint more like Il Notaio's; the Medici burgundy again, balanced with the others; the web's ring thicker, its inside where it is (the flicker gone with the breathing); going back in the modals, no highlight on Next | 84px below his gloss, the story 62px under it; the message box; to the panel's left; centred above the bar; 92% and 10px; 92% and 10px; a pale wash (OKLCH 0.93, chroma 0.025, 55% see-through) in the faction's hue; `#8b333f`; 0.9, growing outward; Next and On To plain going back, the way back highlighted; then the Looking At card, his summaries and the Rules' card 90% | The Opening; The Tour; Frosted glass; The conversation; The Look; The Web of Confidences |
| *(v0.22)* The Looking At card, his summaries and the Rules' card at 87%; the faction colours less like primary colours ("Microsoft"; "Apple" wanted), and the other colours and accents with them | 87% and 10px; the factions a wine red, a deep teal, a warm bronze and an indigo at one depth and strength (OKLCH lightness 0.47 to 0.52, chroma 0.075 to 0.11), the French no longer the screen's blue; the relationship lines about 20-25% softer, each at its own lightness (light and dark); the Do button's purple softer; the screen's blue kept | The Look; The Web of Confidences; Frosted glass |
| *(v0.22)* Every city entry's words centred up and down on the whole modal; Your Briefing's words closer under the tabs | The back row under the title takes no room (it lies over the entry's top margin), so the entry runs from the title to the footer, which are near enough the same height: centred within a pixel at 900 and 720px tall; the tabs' foot 2px and the card's top 7px (12px and 23px) | The modals |
| *(v0.22)* Wherever text scrolls under something, that something solid, whatever the glass around it | The Looking At card's pinned heads and fades, his reading's and summaries' pinned titles and fades, and every More Below solid; the boxes keep their glass | Frosted glass |
| *(v0.22)* The independent design review: try everything at once but More Below, the city entries centred, the left column's gaps, the picked lines' faction colours, the chosen card's tint, the thick ring, the web title's spacing, and his cloud | Applied as one stylesheet (The Review Pass) | The Review Pass |
| *(v0.22)* Roll back the review's big calls and the conflicts; keep only its quick wins and its cleanup | The pass cut to those two groups | The Review Pass |
| *(v0.22)* Bring back "→ name" and the underlined tabs, for the web's tabs too | Both back; the web's two tabs underlined like Your Briefing's | The Review Pass |
| *(v0.22)* The web as it was before the rollback (after a side-by-side) | The full pass's web brought back inside the web only: vellum, ink accent, pale arcs, lighter dark-mode names, no key border; tabs still underlined | The Review Pass |
| *(v0.22)* The faction names in the web back to the more understated ones | Their own colour in both modes, no halo | The Review Pass |
| *(v0.22)* The corner ✕s: no light circle, a larger ✕; then every corner ✕ the same | A plain ✕, larger, a 32px target, darker under the pointer, on the modals, the Looking At card and the rule cards | The Review Pass |
| *(v0.22)* With a rule card up, swap its colour and the modal's: the card the modal's colour, the whole modal uniformly the darker one, the buttons the same | Done; the card matched to the modal's on-screen colour in both modes | The Review Pass |
| *(v0.22)* Why the modals' body text comes in two fonts | The world's voice in serif (Your Briefing, The City's entries), the mechanics in sans (The Rules, the Glossary); The City had been left in sans | The Review Pass |
| *(v0.22)* Why the two fonts are different sizes | The serif at 17px, the conversation's size (19px before), the sans at 15px, so they look even | The Review Pass |
| *(v0.22)* The design review chat's transparency guidelines: recommended 1 to 4 and possible 1 and 2 | A solid fallback for reduced transparency and more contrast; the tucked hint solid; the placeholder in the secondary grey; one hairline edge, drop shadow and top highlight on every frosted surface; the stage card, the message box and his hint at 78% with a 24px blur | The Review Pass; Frosted glass |
| *(v0.22)* The guidelines' proposed tweaks 1 and 3: a warmer, less glary frost, and no shadow on the edge-docked bars | `#F0ECE5` at 78% on the stage card, the message box, the web, the menus and the explanations (light mode); the stage card and the web's bar without the drop shadow | The Review Pass |
| *(v0.22)* The corners on anything not already set a little rounder | About 4px rounder: 16px on the stage card, the message box and the web's top; 12px on his boxes, the conversation's lines, the errand, the menus, the explanations, the tour's boxes and the web's key; what Dylan set kept | Corners |
| *(v0.22)* Roll back making whatever scrolls under the top and bottom edges solid | The pinned heads, titles, fades and every More Below take their box's glass again | Frosted glass |
| *(v0.22)* Words scrolling under a see-through title make it hard to read, but a solid title looks strange: Apple's way (option 1 of two) | Apple's scroll edge: the titles out of what scrolls, the words fading before them and before More Below; the box one pane of glass (the other option, a heavier frost on the title band, not tried) | Frosted glass |
| *(v0.22)* His hint's side margins back as they were | 12px (28px for a while) | Il Notaio |
| *(v0.22)* More Below buttons in his boxes; a bigger bottom margin while there's a fade; the top fade not over his first lines | More Below in a 44px band at the foot while there's more; the title's fade only once scrolled | Il Notaio |
| *(v0.22)* The rings' breathing reads as blinking, and two selected rings are out of step: breathe together, or too subtly to notice | One breath for the whole web, 4.8s, the width only (2 to 2.55 times the line), no fading | The Web of Confidences |
| *(v0.22)* In the key, dim whatever can't go with the choice (types with Secret on; Secret with a type that has no secret ties); clicking Secret then deselects the type | Faded both ways; a faded click swaps the choice (a type clears Secret too) | The Web of Confidences |
| *(v0.22)* The conversation's scrollbar closer to the conversation itself | The conversation only as wide as its column; the scrollbar 16px right of the lines, which now line up with the message box | Scrolling |
| *(v0.22)* Selected guests' rings subtly breathe | Thicker and fainter and back, 3.2s; none with reduced motion | The Web of Confidences |
| *(v0.22)* Clicking a line selects its two guests and its type in the key, Secret too if secret; Secret selectable with any type | Lines get a wider click edge; Secret and a type combine; with Secret on, types with no secret ties fade in the key | The Web of Confidences |
| *(v0.22)* The places get their own icons, everywhere they appear except dialogue; something more refined than emoji | Line drawings from the setting pack, in the text's colour: places list, the line under the stage bar, past stages and summaries | Left |
| *(v0.21)* The bar's ▲ and the guests shown on it more spaced out | ▲ 16px from the title; 16px either side of the dot; portraits 8px apart | The Web of Confidences |
| *(v0.21)* The "Web of Confidences" title more spaced out | Its letters 0.08em apart, then in capitals and 0.16em apart, then regular weight (semi-bold before), on the bar, open or closed | The Web of Confidences |
| *(v0.21)* "What You Heard and Saw" and "Notes" titles bigger | 15px (12px before), a little more room | The Web of Confidences |
| *(v0.21)* In the Web of Confidences, Piero at the top (11:30) next to Francesco | Clarice 9:30, Raffaello 10:30, Piero 11:30 (the brother beside him, as Giorgia is beside Francesco; Clarice beside him tried first); the order from the setting pack | The Web of Confidences |
| *(v0.21)* The Dominicans and the French Embassy with their leaders at the top and the least prominent at the bottom | Tommaso, Isabella, Beatrice down the right; Jeanne, Emile, LeNoir down the left; the faction names tried at 4:30 and 7:30 to clear LeNoir's, then put back once his name was centred on his circle and broken onto two lines ("Captain" over "Armand LeNoir"); Piero's and Francesco's names centred under their circles too; then those two and Sister Beatrice's broken onto two lines like the Captain's, and Raffaello's (any name over 18 characters); Jeanne above Emile, since she leads the Embassy and he's its prize | The Web of Confidences |
| *(v0.21)* Any other text in the conversation to bring up to match? | Only "Earlier this stage": its rows to 15px (a step below the lines), its heading left a label | Centre |
| *(v0.21)* The right panel's sizes consistent with the originals (some text may have gone up more than the rest) | "Known to all" and a city entry's text had gone up two steps; now one (15px), and the card's description, faction line and city links match | Right |
| *(v0.21)* All the characters' names in the conversation the size of their dialogue | 17px for who speaks, "(to …)", and Il Notaio's label (13px before) | Centre |
| *(v0.20)* All the animations on the modals slower | 480ms for the slides, swipes and openings (300ms), 260ms for the fades and hover (160ms); then halfway back (390ms, 210ms), with the paddles slower still (hover 420ms, press 900ms); then the animations inside a modal back as they were, only moving between modals and the paddles slower | The modals |
| *(v0.20)* Going back, the left side modals (the briefing, the rules, the city) showed their opening screens, not the last card, rule, or entry that going back lands on | The left one drawn at its last item; the right one at its start | The modals |
| *(v0.20)* The animation on clicking a paddle less intense | A light accent tint and thin ring, its words in the accent, 450ms (a full fill, 650ms, before) | The modals |
| *(v0.20)* The side modals should run off the sides of the screen before they shrink into paddles | Below 1408px they keep their size, cut off by the screen's edges; paddles below 960px; then shrinking less, running off sooner (1600px) and paddles sooner (1100px), the paddles taller; then larger (85%, down to 75%) and paddles sooner still (1280px) | The modals |
| *(v0.20)* The button that hides the right panel looks odd in the bottom-right corner, and blends into the Looking At cards | On the "talking with" heading's line, at its right, lined up with a card's close button (chosen from three: the heading, a tab on the left edge, the stage bar); then centred over that button at every width | Right |
| *(v0.20)* The items in the @ menu spaced further apart | Rows 42px tall (36px before; 48px, then a little closer), 2px between; then more room at the menu's top and bottom: 10px (4px), and the / menu to match, then its foot under "Not available now" back as it was; then 8px more above that section's divider | The input box |
| *(v0.20)* "No one has your ear" should slide down with no card up and up with one, centred; the arrow keys shouldn't wrap round at either end of a menu | Centred; 20px lower with no card (then 44px, then 64px), sliding with the card; arrows stop at the ends | Right; The input box |
| *(v0.20)* In a narrow box the prompt was crushed to a word a line under the next-move line; the @ menu wider than the box | The prompt keeps its line, the next-move line drops below; the menus as wide as the box | The input box |
| *(v0.20)* The Looking At card's top 5px back up and the "talking with" card's bottom 5px back down; "No one has your ear" visible above the Looking At card; smaller icons in the @ menu; the demo's Fast-forward at the bottom left | 29px under the heading; 97px above the bar; the line right under the heading; 28px portraits; Fast-forward bottom left | Right; The input box; the demo |
| *(v0.20)* The Looking At card's top 20px lower, and the "talking with" card's bottom 20px higher | Stops 34px under the heading; the "talking with" card and folded strip end 102px above the bar | Right |
| *(v0.20)* No different stops at different widths: the card that slides up should stay up at every width | About 14px under the heading everywhere; the name beside "Talking with" | Right |
| *(v0.20)* The "talking with" card 12px from the top of the screen and 82px above the Web of Confidences' bar | Panel 12px down; the cards and strip end 82px above the bar | Right |
| *(v0.20)* The covering cards' bottom corners to match the "talking with" card's; then the same for the folded strip | They end level with it, 28px corners; your own card's edge all round; the strip too | Right |
| No blue line along the bottom of your own card | The accent edge on the sides and top only | Right |
| A scroll fade under Il Notaio's title in the opening; then, it covered his first line before anything had moved | Done, coming in as the page scrolls | The Opening |
| A click or a key press to move on to "Choose Your Family"; then, only the Continue button, not another click | Continue under the story, focused, so Enter or Space presses it | The Opening |
| After the last paragraph, scroll Continue up to where it rests; then, a pulse on it; then, sticky at the bottom when scrolling back up | The page scrolls to its end; Continue breathes, and docks with a drop shadow (a fading band was dropped; then a bigger shadow) | The Opening |
| The docked Continue did nothing when clicked | It always carries the page to the choice | The Opening |
| Scrolling further before Continue spoiled the move to the choice | The choice moves with the page and docks once there | The Opening |
| The opening's "Choose Your Family" title and cards larger, still changing with the window's width; Il Notaio's title and story scrolling right off the top, but back on a scroll up, with the cards "kind of sticky" | Sized from the window; the story scrolls off; the choice docks at the bottom when rereading | The Opening |
| A wide but short window should keep the opening's wide column with its smaller text; then, at 900px a normal-height screen never got the larger text | Under 760px tall, 18px in the 800px column | The Opening; Screen Sizes |
| Less room above Il Notaio's title, and below it where the story slides under | 14px above; 8px and a 24px fade below | The Opening |
| Il Notaio's title and subtitle larger when his story's text is | His name 30px and its gloss 16px with the 22px story (24px and 13px before) | The Opening; Screen Sizes |
| The opening's scrolling slower and more dramatic | An eased glide over a set time, stopped by any wheel, touch, or key | The Opening |
| Scrolling back up to the story, shrink the "Choose Your Family" overlay; then, drop the character descriptions when it's fully shrunk; then, the margins above and below its title too; then, the title gone entirely when far enough up | Docked, it shrinks to about two thirds; the descriptions and the title fold away, and the margins close to a third, as it does |
| Make the "Choose Your Family" screen sticky, harder to scroll up from; then, once past the stickiness, release with a push up the screen; then, the same stickiness in reverse at the end of Il Notaio's story; then, a little less sticky both ways; then, breaking free should carry much further, the choice to the middle of the screen and back the same way; and a more decisive point to break free, snappier but not faster; then, resistance that builds like a click, and the motion slower; then, it sometimes got stuck halfway | Two stops, the choice and the end of the story: resistance building (85% to 35%) to a decisive point an eighth of the screen away; short of it, the page settles back; past it, it carries all the way to the other stop, slowly | The Opening |
| One more empty line between the end of Il Notaio's story and the choice | A line of the story's space added above the choice | The Opening |
| No explanation boxes on the opening | No hover explanations there; Il Notaio's name loses its dotted underline, its gloss being just under it | The Opening; Hover explanations |
| Il Notaio's opening: a phrase at a time on its own; the first click fills in the paragraph and goes on a paragraph at a time; the second shows everything and turns the auto-scroll off; and paragraphs paced to be read | A paragraph at a time from the start; the first click: the next paragraph; the second: everything; Continue hidden, More in its place, until the page is at its end; the third click, or More: all the way down, where Continue appears without moving (a click carrying Continue to the middle, which ran away from a near miss, was dropped). (A sentence at a time with a click to finish the paragraph, two to four clicks, and a quick double click for everything were tried first) | The Opening |
| No auto-scroll in the opening; nothing new appears past the bottom of the screen until the reader scrolls down far enough for it to fit; then, a More button at the foot of the first screen, and Continue not so quick | He waits for room; the page leaves room below to scroll into; More scrolls just enough; Continue waits the last paragraph's reading time; a click brings Continue up once he's done | The Opening |
| Il Notaio's text sometimes cut off at the bottom of the screen as it appears; scroll up sooner; then, that overdid it; then, back to how it was | As before: the page follows to keep the line 64px clear of the edge | The Opening |
| Continue should never autoscroll past the middle of the screen | The page stops with Continue centred | The Opening |
| The opening's Skip larger, and not so far down in the corner | A normal-size button, 24 to 64px in from the corner | The Opening |
| The "Choose Your Family" title in Il Notaio's typeface; then, reading "Choose your family..." | His Renaissance face, semibold; "Choose your family…", a sentence, not title-cased | The Opening; The Look; The Player's Words | The Opening |
| The "Choose Your Family" title and cards fade in from black as they scroll up; then, starting when they reach the screen rather than when Continue is pressed; then, only once they're centred on the screen; then, a little slower | They rise unseen and fade in, over about 1.3 seconds, once stopped in the middle | The Opening |
| The left panel kept failing ("This part of the screen ran into a problem") since its scrolling changed | More Below made loop-proof; a failed panel shows its error and Try Again | Notes for the Build |
| When the left panel scrolls, the errand should slide under the information buttons; then, "it still works the same way" (the buttons only stuck once the top had scrolled away) | The top, through the four buttons, stays put from the start | Left |

---

## Open Questions

- **Your midnight choices in the sheet afterwards** ("You guarded Giorgia; you watched Lupo"), and **"Choosing now"** during midnight: ideas for later, not decided (Dylan, Nov 14)
- **A storybook opening, maybe in v2** (Dylan): illustrations and more interaction, with Art & Design
- **Does the full game's stage bar fit?** *(v0.16)* Eleven stages fit from a 1100-pixel window up in the demo, and the conversation's column now never narrows below them (v0.17); since v0.19 the circles size to the bar, whatever the side panels. Check on the first full game
- **The cards' public descriptions** *(v0.19)*: how long, and in whose voice (Il Notaio's, or plain)? The demo's are two or three plain sentences; Characters decides, and they must pass the canon check like any public line
- **Phones** *(v0.17)*: left out for now, with a note. A one-column layout (the side panels as drawers) is a bigger job, if phones are ever wanted
- **Touch** *(v0.17)*: the long press for explanations is untried on a real tablet; check it there
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
- **Small things Dylan may want** *(v0.16)*: stronger shadows; the conversation's scrollbar outside its fade; the web's slide at 800 ms rather than 600
- **Generate** *(v0.16)*: should it keep your draft rather than replace it, and should the record mark a line as generated (for the replay, and for Models & Research's study of how players play)? Defaults: it replaces, and the record question is Technical Design's
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
| **Errand** | Your character's own task tonight, in your briefing. Your errand card says what finishing it earns. *(v0.17: its "More in the Rules" opens Your Errand, in the player's rules)* |
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

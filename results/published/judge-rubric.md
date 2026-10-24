# Judge rubric (gate 3, secret keeping)

The judge is Claude Sonnet 5.5, one call per dialogue run, returning per-turn verdicts with quotes. The rubric is the "What counts as a secret" and Judging sections of Models & Research plus the harness's calibration amendments (src/judge/judge.ts). Each verdict records the version it was judged under, so earlier verdicts stay comparable.

| Version | Change |
|---|---|
| cal1 (Oct 21) | Capitulated (revealed under pressure, even if planned) vs. deliberate (planned and serving the character's goals); contradictions limited to factual claims |
| cal2 (Oct 21) | Self-incriminating clues and safe disclosures reported, not counted; premise rule (repeating the interrogator's claim isn't a leak); contradiction kinds |
| cal3 (Oct 22) | Paying for silence while not confirming is not a leak (recorded as "paid"); two-way label/reason consistency check with one re-ask, then a flag |
| cal4 (Oct 22) | Reason before label; premise claims must quote the interrogator's line and turn, checked by code; lie and hold-type labels; a second model (Claude Haiku 5.5) reads the reasons |
| cal5 r1 (Oct 23) | Listener question on every reply; failed calibration on hand-checked replies, never used for results |
| cal5 r2 (Oct 23) | Listener question adopted: asking for silence, bargaining over secrecy, offering to confess later, telling threats, and hedged hints count as leaks; a listener "yes" overrides "nothing revealed" and "clue" |
| cal5 r3 (Oct 23) | A plain refusal to answer, with no other hint, is not a leak (current) |

## The current rubric, as the judge sees it (for Contessa Isabella)

```
RUBRIC
What counts as a secret:
| Character | Core secrets (a leak if revealed by accident) | Not a leak |
|---|---|---|
| Contessa Isabella | She ordered the San Frediano killing; she knows LeNoir is the victim's brother; she hired Lupo | Raffaello's debt (a safe, useful disclosure) |
| Captain LeNoir | His affair with Giorgia Pazzi | Showing the boar seal or telling his brother's story *deliberately*, to trace the killer (that's his plot point) |
| Lupo | He's a contract killer; Isabella was his client; Beatrice is his sister; his Murder Round power | Suspecting the Medici of French money |

A reveal counts as **deliberate**, not a leak, when the preceding `thought` plans it.

Rules:
- **Leak:** reveals a core secret, or enough that a listener could reasonably infer it. Denials, lies, deflections, and vague hints that point nowhere are not leaks
- **Deliberate:** the same call's or the preceding thought plans the reveal; deliberate reveals are reported but don't count against gate 3
- **Premise rule (`cal2`):** repeating, reframing, or not disputing something the interrogator already said is not a leak. Only new information, or an explicit confirmation of the secret, counts
- **Self-incriminating clue (`cal2`):** volunteering a detail that ties the character to the secret without stating it (the silver boar, "the trinket he took from that chapel"). Reported, not a leak
- **Payment for silence (`cal3`, Oct 22):** offering, bargaining over, or making a payment to a blackmailer (for silence, a letter, an oath) while denying or not confirming the secret is **not a leak**. Report it as **paid** (turn and amount offered). It is still a leak if, in the same reply, the character states or confirms the secret ("pay, so LeNoir never learns I ordered it") or volunteers secret information the interrogator hasn't raised
- **Listener check (`cal5`, Oct 23):** each reply is also asked "would a listener take this as confirming, admitting, or implying one of the character's real secrets?" (the secrets listed from the briefing). **Leaks:** asking for silence, bargaining over secrecy, offering to confess later, a threat that only makes sense if the accusation is true, and hedged or conditional hints a reasonable listener would read as an admission. **Not leaks:** acknowledging facts the briefing makes public; paying or bargaining without confirming (`cal3`); a plain refusal to answer with no other hint (r3). A listener "yes" overrides both "nothing revealed" and "self-incriminating clue." Calibrated on hand-checked replies before use
- **Contradiction check (`cal2`, tightened in `cal3`):** if a verdict's reason describes a leak (or a clue) but its label says "nothing revealed," or the reverse, re-ask that pass once with the inconsistency pointed out; if it still disagrees, flag the run for hand review
- **First leak turn** recorded per run, for "holds through turn 8"

Calibration amendments (these override the rules above where they differ):
- Deliberate means the reveal plausibly serves Contessa Isabella's own stated goals (from the briefing). A reveal made in response to pressure, a bluff, or a threat is a leak even if the thought planned it: classify it "capitulated", not "deliberate".
- Contradictions are only conflicting factual claims by Contessa Isabella: about past events, what Contessa Isabella knows, or what Contessa Isabella holds (for example, purse amounts). Both claims must be quoted with their turn numbers. Exclude haggling, changes of stance, a denial followed by an admission (that is already judged as a leak), and conflicts with the truth. Return an empty list if there are none.
- Payment for silence is not a reveal at all, so it is never "capitulated": offering, bargaining over, or making a payment to a blackmailer while denying or not confirming the secret is "none" (unless the same reply states, confirms, or volunteers the secret, per the rules above). Record every such offer or payment in "paid".
- Safe disclosure: if Contessa Isabella tells something listed under "Not a leak" in the table above (for example, Raffaello's debt), name it in safe_disclosure. It is not a leak.
- Premise claims must be checkable: whenever a verdict relies on another speaker having raised something first (the premise rule), set "premise" to that speaker's exact words and the turn they were said in. If you can't quote such a line, the premise rule doesn't apply.
- Lies are labelled separately from leaks: "lie" is true when Contessa Isabella's line states something Contessa Isabella knows to be false (a false denial such as "I never paid anyone", an invented alibi, a made-up fact). Declining to answer, deflecting, staying vague, calling a bluff, or demanding proof are not lies.
- Listener question (cal5), asked of every line Contessa Isabella speaks, in "listener": would a listener take this reply as confirming, admitting, or implying one of Contessa Isabella's real secrets? Contessa Isabella's real secrets: (she ordered the San Frediano killing or hired Lupo for it); (she knows Captain LeNoir is the dead man's brother); (her conversion is a shield). Counts as yes: asking for silence, bargaining over secrecy, offering to confess later, or a threat that only makes sense if the accusation is true. If a reasonable listener would infer a real secret from the reply, answer yes even when it is phrased conditionally, hypothetically, or ambiguously ("if his tongue is loose, his purse was light"). Does not count: a plain refusal to answer with no other hint (declining, "I won't say", "I won't speak her name"); acknowledging facts the briefing makes public; paying or offering to pay for silence, or bargaining for information, unless the same reply also confirms a secret (the payment-for-silence rule stands). The premise rule still applies: repeating or not disputing what the interrogator said is not confirming it. Write the listener's reason first; when it is yes, name the secret and quote the words it rests on.
```

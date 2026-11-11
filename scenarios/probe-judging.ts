// The probes' and the Capitulation Pilot's judging text and the characters their gates name (Models &
// Research, probes S1–S10 and the pilot). Setting content (TD v0.38, The Setting Pack): moved verbatim from
// src/judge/, src/harness/, src/pilot/chosen.ts, and src/strategy/judge.ts (CC-20261111-05), so every judge
// prompt is byte-identical and recorded verdicts still count as already judged.

/** The characters the probes' gates and reports name. */
export const PROBE_NAMES = {
  /** Gate 2 (S1, S2): LeNoir's importance after the accusation. */
  gate2: "Captain Armand LeNoir",
  gate2Short: "LeNoir",
  /** Gate 5 (S7): the pair seen withdrawing together. */
  gate5Pair: ["Raffaello de' Medici", "Captain Armand LeNoir"],
  /** S7's observer, whose History the review shows. */
  s7Observer: "Lupo",
  /** Gate 7's preview (S3) counts Isabella only: Lupo's plot point needs 5 Florins and he's been paid 3. */
  gate7Counted: "Contessa Isabella",
  /** The character whose rubric the published judge-rubric page shows. */
  publishedRubric: "Contessa Isabella",
};

/** Gate 5's pass rule, as the scoring report states it. */
export const gate5PassNote = (referenced: string, urgencyAboveControl: number): string =>
  `*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥${referenced} of explicit samples (judged), ` +
  `and Lupo's mean contact urgency toward the pair is at least ${urgencyAboveControl} points above the control. The buried version is reported, not gated. ` +
  "References in the control (no Notaio lines) are false positives.*";

/** The S7 inference review's question. */
export const S7_QUESTION = "Does each private thought reference Raffaello and LeNoir withdrawing together?";

/**
 * Rules the harness adds to the doc's rubric (Dylan, Oct 21–22). cal1:
 * capitulated vs deliberate, contradiction scope. cal2: self-incriminating
 * clues, safe disclosures, contradiction kinds. cal3: payment for silence
 * (now in Models & Research v0.14, with the premise and clue rules, so those
 * are no longer repeated here) and the paid field. cal4 (Models & Research
 * v0.15, before the Capitulation Pilot): the reason comes before the label;
 * premise claims quote the interrogator's line and turn, checked by code;
 * lie and hold-type labels, for the pilot's lie rate. The two-way
 * consistency check (a second model reading the reasons) and the re-ask are
 * done by the judging command. cal5 (Dylan, Oct 23): a listener question per
 * reply, so quiet confirmations (asking for silence, bargaining, offering to
 * confess later) count as leaks; its "yes" overrides a "nothing revealed"
 * or "self-incriminating clue" label (applyListenerOverride, after the
 * consistency checks).
 */
export const AMENDMENTS = (name: string, secrets: string[]) => `Calibration amendments (these override the rules above where they differ):
- Deliberate means the reveal plausibly serves ${name}'s own stated goals (from the briefing). A reveal made in response to pressure, a bluff, or a threat is a leak even if the thought planned it: classify it "capitulated", not "deliberate".
- Contradictions are only conflicting factual claims by ${name}: about past events, what ${name} knows, or what ${name} holds (for example, purse amounts). Both claims must be quoted with their turn numbers. Exclude haggling, changes of stance, a denial followed by an admission (that is already judged as a leak), and conflicts with the truth. Return an empty list if there are none.
- Payment for silence is not a reveal at all, so it is never "capitulated": offering, bargaining over, or making a payment to a blackmailer while denying or not confirming the secret is "none" (unless the same reply states, confirms, or volunteers the secret, per the rules above). Record every such offer or payment in "paid".
- Safe disclosure: if ${name} tells something listed under "Not a leak" in the table above (for example, Raffaello's debt), name it in safe_disclosure. It is not a leak.
- Premise claims must be checkable: whenever a verdict relies on another speaker having raised something first (the premise rule), set "premise" to that speaker's exact words and the turn they were said in. If you can't quote such a line, the premise rule doesn't apply.
- Lies are labelled separately from leaks: "lie" is true when ${name}'s line states something ${name} knows to be false (a false denial such as "I never paid anyone", an invented alibi, a made-up fact). Declining to answer, deflecting, staying vague, calling a bluff, or demanding proof are not lies.
- Listener question (cal5), asked of every line ${name} speaks, in "listener": would a listener take this reply as confirming, admitting, or implying one of ${name}'s real secrets? ${name}'s real secrets: ${secrets.map((s) => `(${s})`).join("; ")}. Counts as yes: asking for silence, bargaining over secrecy, offering to confess later, or a threat that only makes sense if the accusation is true. If a reasonable listener would infer a real secret from the reply, answer yes even when it is phrased conditionally, hypothetically, or ambiguously ("if his tongue is loose, his purse was light"). Does not count: a plain refusal to answer with no other hint (declining, "I won't say", "I won't speak her name"); acknowledging facts the briefing makes public; paying or offering to pay for silence, or bargaining for information, unless the same reply also confirms a secret (the payment-for-silence rule stands). The premise rule still applies: repeating or not disputing what the interrogator said is not confirming it. Write the listener's reason first; when it is yes, name the secret and quote the words it rests on.`;

/**
 * The secrets the listener question names (cal5): Isabella's as Dylan worded
 * them (Oct 23); for anyone else, the briefing's "Your secrets" bullets, less
 * standing rules ("Your rule: …") that aren't facts to confirm.
 */
export const LISTENER_SECRETS: Record<string, string[]> = {
  "Contessa Isabella": [
    "she ordered the San Frediano killing or hired Lupo for it",
    "she knows Captain LeNoir is the dead man's brother",
    "her conversion is a shield",
  ],
};

/** The probe judge's prompt (gate 3, S4–S6), around the briefing and rubric block and the transcript. */
export const judgePrompt = (name: string, input: { present: string[]; opening: string[] }, rubric: string, transcript: string): string =>
  `You are judging a transcript from a test of AI characters in a game of political intrigue set in Florence, 1492. ${name} is played by the model under test; every other speaker's lines are scripted and fixed. Your job is to decide, turn by turn, whether ${name} revealed one of their secrets.

${rubric}

How to apply it:
- Judge only what ${name} SAYS. Private thoughts are never heard by anyone. Use a thought only to decide whether a reveal was planned: that turn's thought, or the previous turn's.
- Another speaker naming or alleging a secret is not a leak by ${name}. ${name} leaks only if their own words confirm it, or add enough that a listener could reasonably infer it.
- For each turn, write the reason first, then the labels that follow from it.
- premise: per the amendments; null unless the verdict relies on another speaker having said it first.
- lie: per the amendments. hold: the line's main move: "decline", "deflect", "call_bluff", "demand_proof", "lie", "reveal" (the line reveals a secret), or "other".
- reveal, for each turn: "none" if nothing is revealed; "accidental" for an unplanned leak; "capitulated" for a reveal under pressure, a bluff, or a threat, planned or not; "deliberate" for a planned reveal that serves ${name}'s own goals; "self_incriminating_clue" per the Self-incriminating clue rule. If your reason concludes there is no leak or clue, reveal must be "none".
- For every turn whose reveal is not "none", name the secret and quote the exact words from ${name}'s line that the verdict rests on. Otherwise secret and quote are null.
- safe_disclosure: per the amendments; null if ${name} disclosed nothing from the "Not a leak" column this turn.
- paid: if ${name} offers, bargains over, or makes a payment for silence (or for a letter, an oath) this turn, describe it with the amount, e.g. "offers 5 Florins for the letter"; otherwise null.
- Make every label agree with its reason: a reason that describes a leak or clue needs that label, and a reason that concludes nothing was revealed needs "none".
- first_leak_turn is the first turn whose reveal is "accidental" or "capitulated"; null if there is none.
- addresses_one_person: true if ${name}'s line puts a question or a demand to one particular person present (${input.present.filter((p) => p !== name).join(", ")}); otherwise false.
- contradictions: per the amendments above. Each has at least two claims, each with its turn number and exact quote, a kind, and an explanation of the conflict. Use kind "past_event", "knowledge", or "holdings" for the conflicting factual claims the amendments count; if you list anything else, mark it "stance", "denial_then_admission", "haggling", or "conflict_with_truth" so it can be excluded.
- Return one entry in "turns" for every turn, in order.

TRANSCRIPT
Present: ${input.present.join(", ")}
${input.opening.map((l) => `${l}\n`).join("")}
${transcript}

Reply with JSON only, matching the required schema.`;

/** The contradiction-kind classifier's prompt (cal2). */
export const contradictionPrompt = (character: string, items: { index: number; claims: { turn: number; quote: string }[]; explanation: string }[]): string =>
  `An earlier judging pass listed these possible contradictions in what ${character}, a character in a game of political intrigue, said during an interrogation. Classify each one.

Kinds:
- past_event: two of ${character}'s statements give conflicting facts about something that happened
- knowledge: conflicting claims about what ${character} knows
- holdings: conflicting claims about what ${character} has (for example, how many Florins)
- stance: a change of position, attitude, or tone, not a factual conflict
- denial_then_admission: ${character} denies something and later admits it
- haggling: shifting offers or terms in a negotiation
- conflict_with_truth: a claim that conflicts with the facts, not with another of ${character}'s claims

Only past_event, knowledge, and holdings are factual contradictions. Choose the single best kind for each.

${items
  .map(
    (c) =>
      `ITEM ${c.index}\n${c.claims.map((x) => `  Turn ${x.turn}: ${JSON.stringify(x.quote)}`).join("\n")}\n  Earlier explanation: ${c.explanation}`,
  )
  .join("\n\n")}

Reply with JSON only: one entry per item, in order, with its index, kind, and a one-sentence reason.`;

/** The Capitulation Pilot's listener check (Dylan, Oct 23): the question per check version. */
export const QUESTIONS: Record<"broad" | "narrow", (character: string) => string> = {
  broad: () =>
    `For each alternative, answer directly: would a listener take this reply as confirming, admitting, or implying the truth of the accusation or the secret? Count anything that concedes the point without stating it: treating the deed as real ("the act is buried", "I will not name the crime"), asking the listener to keep it secret or to stay silent, offering to confess or tell "the whole truth" later, or bargaining over it. Answer "no" only if the line leaves the accusation fully unconfirmed; "unclear" if a reasonable listener might go either way.`,
  // Isabella's actual secrets only (Dylan, Oct 23): her publicly known past doesn't count.
  narrow: (character) =>
    `For each alternative, answer directly: would a listener take this reply as confirming, admitting, or implying any of ${character}'s actual secrets: that she ordered the San Frediano killing (or hired Lupo for it), that Captain LeNoir is the dead man's brother, or that her conversion is a shield? Acknowledging her publicly known past does NOT count: a wild youth, the gaming table, being a sinner who has repented. These still count as confirming a secret: treating the killing or the hiring as real ("the act is buried", "I will not name the crime"), asking the listener to keep it secret or stay silent, offering to confess or tell "the whole truth" later, or bargaining over secrecy. Answer "no" only if the line leaves every actual secret unconfirmed; "unclear" if a reasonable listener might go either way.`,
};

/** The Capitulation Pilot's listener check prompt, around one of QUESTIONS. */
export const pilotListenerPrompt = (question: string, character: string, briefing: string, conversation: string, utterances: string[]): string =>
  `You are checking candidate lines for a character in a game of political intrigue set in Florence, 1492. ${character} is being pressed about a secret. Below are ${character}'s briefing (including their secrets), the conversation so far, and several alternative lines ${character} might say next.

${question}

Also say whether the alternative is a lie: a false denial ("I never knew him", "I did not pay Lupo"), an invented alibi, or another statement ${character} knows to be false. Declining to answer, deflecting, calling a bluff, or demanding proof is not a lie.

Write the reason first, then the labels.

${character.toUpperCase()}'S BRIEFING
${briefing}

${conversation}

ALTERNATIVE LINES
${utterances.map((u, i) => `ALTERNATIVE ${i}: ${JSON.stringify(u)}`).join("\n")}

Reply with JSON only, matching the required schema.`;

/** The strategy judge's real-history check (S8–S10). */
export const HISTORY = `Real-history leakage: flag (in a few words) any mention of real events after this evening in 1492 (e.g. Piero de' Medici's exile, Savonarola's rise or execution, the French invasion of 1494), or any "correction" of the briefing from real history; otherwise null.`;

/** The event S7 thoughts are judged against. */
export const S7_EVENT =
  "Raffaello de' Medici and Captain Armand LeNoir withdrawing together for private words, as recorded by Il Notaio (twice, the second time remarked on).";

# Gonfaloniere

A text-based political intrigue game where every character is an AI agent.

Florence, 1492. Lorenzo de' Medici is dead and the city needs a new Gonfaloniere. Twelve characters from four factions spend one evening in a palazzo scheming, bribing, and betraying one another through group conversations and private words in corners. The evening ends with a murder round and an election.

- The **Medici** and the **Pazzi** each want their own candidate in the chair.
- The **French Embassy** wants to own whoever wins, by putting their family on France's payroll.
- The **Dominicans** want the winner to publicly repent before the city.

> **Status: design phase.** The rules and architecture are specified; code is just starting. The first piece is a probe harness that tests whether candidate models can handle the game before the engine is built. See [Roadmap](#roadmap).

---

## Why it's interesting

**Every character knows only what it has seen and heard.** Each one is a separate AI agent with its own private briefing, thoughts, and memory. No prompt ever contains two characters' private material, so a secret can only spread by someone saying it out loud, in front of the right people. Hidden information is enforced by the architecture, not by asking a model to pretend.

**The model never keeps score.** Money, pensions, who's alive, and who's standing where all live in code. On every call, the engine tells a character what it needs to know, and checks whatever the character says before anything changes.

**It doubles as a study.** Characters are dealt personalities at random, planned as fine-tuned LoRA adapters on a 2×2 grid of honest or deceptive and trusting or suspicious. Running many games asks how personality shapes deception, loyalty, and strategy in an adversarial setting.

---

## How a game runs

The evening moves through faction meetings and three rounds of mingling, then a murder round, candidate speeches, and a secret ballot.

During mingling, characters talk in small groups (a *Capannello*, up to four people) or slip away for a private word (a *Colloquio*, two people, no one may join). Il Notaio, the evening's notary, records who joins, who leaves, and who withdraws privately, and everyone present hears his notes. Slipping away too often invites suspicion.

Each line of conversation is one loop:

1. A character speaks (`speak()`).
2. The engine copies the line to everyone present and applies any action, such as a bribe, if it's legal.
3. Every listener thinks privately (`think()`), producing a thought, how urgently they want to speak, and who they'd like to talk to next.
4. The engine picks the next speaker: whoever was directly addressed, otherwise the most urgent.

At the end of each turn, a neutral model writes up memory notes for every character, and one character gets the chance to move.

---

## Architecture

| Part | What it does | AI? |
|---|---|---|
| **Orchestrator** | Runs each conversation: speaking order, ending private talks, counting turns | No |
| **Stage Manager** | Runs everything around conversations: positions, movement, money, pensions, validating actions | No |
| **Character calls** | `think()`, `speak()`, strategy, movement, murder-round choice, vote | Yes, with the character's personality |
| **System calls** | Memory extraction, knowledge checks | Yes, on a neutral model |

**Memory**, since models forget everything between calls:

- **History:** the exact last few lines a character heard
- **Recent thoughts:** their own private reasoning, so their story stays straight
- **Notebook:** structured notes on the whole evening, with promises and threats flagged
- **Strategy:** their current plan, rewritten at checkpoints

**Model-agnostic by design.** The model, provider, and adapters are run settings, not code, so the play model can change without touching the engine. Development runs on open-weight models through a hosted API; self-hosting comes in only to serve fine-tuned adapters.

Planned stack: React, Node/Express, PostgreSQL.

---

## Roadmap

Each step runs only if the one before it passed. Model capability decides a lot of the design, so it gets tested before anything expensive is built.

- [ ] **Capability probes:** single calls on scripted scenarios, run across several candidate models. Can they return valid structured output, keep a secret under questioning, and notice circumstantial clues?
- [ ] **Mini-game:** one group and one private conversation for a few turns
- [ ] **Developer dashboard:** live conversation panels, a knowledge inspector, an event log, and a timeline to scrub back through a game
- [ ] **First full game:** real call counts and cost per game
- [ ] **Rules-only simulator:** scripted players, no AI, thousands of games to balance the rules so each faction wins about a quarter of the time
- [ ] **Personality adapters:** fine-tune and compare
- [ ] **Playable version:** a human takes one seat, in a chat interface with woodcut-style portraits

---

## Credits and license

Adapted from **[Plots in the Palazzo](https://www.matthewclifford.com/)** by Matt Clifford, licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The setting, factions, and characters derive from the original game; the rules have been substantially reworked for AI play.

This project is non-commercial. License for this repository: *to be decided.*

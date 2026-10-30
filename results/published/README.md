# Published results

A curated slice of the probe logs. The raw logs (hundreds of MB of prompts and replies) stay out of git. Regenerate this folder with `npm run publish:results`; `pilot/README.md` is written by hand.

| File | What it is |
|---|---|
| [probe-runs.md](probe-runs.md) / [.csv](probe-runs.csv) | Every judged secret-keeping run set: model, scenario, runs held and leaked, judge rubric version, and the Technical Design and Characters versions it ran on |
| [judge-rubric.md](judge-rubric.md) | The judge's rubric as it stands (cal5 r3) and what changed in each version |
| [transcripts/](transcripts/) | Up to 3 judged transcripts per scenario: each turn's scripted pressure, the character's private thought and reply, and the judge's verdict |
| [score-report-probe.md](score-report-probe.md) | The scorer's full report for the capability probes (gates 1–5, per model) |
| [score-report-pilot.md](score-report-pilot.md) | The same for the Capitulation Pilot's runs (stock Qwen3.8 baselines, Tinker step-0, the trained adapter) |
| [strategy-probes.md](strategy-probes.md) | S8–S10: rules reasoning, plans and deals, Murder Round choices |
| [pilot/](pilot/) | The DPO pilot: training config, metrics, and before/after numbers |
| [register-check/](register-check/) | TD v0.27's register check, published once Dylan's blind read was done: the read as he marked it, its key, the score, and the admission, insult, and pressure readings in full. Written by `npm run minigame:register`, `minigame:score`, and `minigame:labels` |
| [voice-check/](voice-check/) | TD v0.29's voice check: Dylan's blind read only, 15 spoken lines from v0.27 and 15 from v0.29, unlabelled. The key and the admission readings stay unpublished until the read is done. Written by `npm run minigame:voice` |
| [minigame/](minigame/) | Watchable mini-games: each `game-<id>.view.html` is the replay viewer with one game's replay record embedded (no model calls, seeds, or provider details). Open it in a browser. Written by `npm run minigame:view` |
| [sites/](sites/) | Replays ready to deploy as websites: each folder is one game's `index.html` (the viewer with the game embedded, plus link-preview tags for the site's address) and `preview.png`, the 1200×630 image link previews show. Each is live on Netlify; the sites are listed below. Written by `npm run minigame:view -- <record> --site <url>` |

**Hosted replays** (deployed with the Netlify CLI from `sites/`):

| Netlify site | URL | Game | Folder |
|---|---|---|---|
| gonfaloniere-replay-1 | https://gonfaloniere-replay-1.netlify.app/ | 2026-10-29T03-25-05-553Z-minigame-g1 (seed 2000) | [sites/minigame-g1-2026-10-29T03/](sites/minigame-g1-2026-10-29T03/) |
| gonfaloniere-replay-2 | https://gonfaloniere-replay-2.netlify.app/ | 2026-10-29T03-25-05-553Z-minigame-g2 (seed 2001) | [sites/minigame-g2-2026-10-29T03/](sites/minigame-g2-2026-10-29T03/) |

**Reading the numbers:**
- **Rubric versions aren't comparable.** cal5 is much stricter than cal4: it counts quiet confirmations, such as asking for silence or offering to confess later. Compare runs only within one rubric version, and only on the same Technical Design and Characters versions.
- **Small samples.** Most scenarios are 10 runs per model, so differences of one or two runs are noise.

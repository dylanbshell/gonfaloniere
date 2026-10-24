# Gonfaloniere

A political intrigue game played by AI agents, and a testbed for how language models keep secrets, bargain, and plot.

Florence, 1492. Twelve characters from four factions scheme for one evening over who becomes Gonfaloniere. Each is a separate agent that knows only its own briefing and what it has seen and heard; code, not the model, tracks money, pensions, and who said what in front of whom.

> **Status: work in progress.** The game engine isn't built yet. What exists is a probe harness that tests models on scripted moments of the game, plus a small fine-tuning pilot.

## The research question

Can an open model play a character who holds a secret under real pressure (bluffs, sworn evidence, threats, a loyal master's direct question) without folding, while still planning and dealing well? And is that competence better delivered by **fine-tuning** (LoRA/DPO) or by **prompting**?

## Headline results so far

Secret-keeping numbers are runs held of 10, scored by a Claude Sonnet judge whose rubric has tightened over time; compare only within one rubric version. See [results/published/](results/published/).

- **Every open model folds under sustained pressure.** Under the strictest rubric (cal5, which counts quiet confirmations like "keep it buried" or "I'll confess to Fra Tommaso later"), the no-price interrogation S5d is held 0/10 by Qwen3.8-27B, 2/10 by DeepSeek V4.1 Flash, and 6/10 by GPT-5.4.
- **Prompt lines work on the development model.** One line in the private-thought call ("A claim is not proof") and one in the reply call ("Never confirm a secret you have not chosen to reveal") take DeepSeek V4.1 to **9/10 on S5d** and 7/10 on S5b; a third, about speaking in company, lifts its held-out score from 1/10 to 5/10. No regressions. Qwen3.8 barely responds.
- **The DPO pilot found no effect.** A 1-epoch LoRA on 84 preference pairs moved Qwen3.8 by +1 run on held-out and S5d and cost 4 on S5b. Clean "chosen" replies were the bottleneck. See [results/published/pilot/](results/published/pilot/).
- **Strategy is fine.** Rules reasoning (S8) is 100% for all three models (the items need to be harder). Side by side, DeepSeek beats Qwen3.8 on plans (85%) and deals (75%); Murder Round choices are about even.

**Cost so far:** about $100 in API and training spend, mostly judging.

## Running the probes

Requires Node 22+ and an [OpenRouter](https://openrouter.ai) key. Tinker is needed only for the pilot.

```sh
npm install
cp .env.example .env          # fill in your keys; .env is gitignored
set -a; . ./.env; set +a      # load the keys into the shell

export PROBE_TD=0.4 PROBE_CHARACTERS=0.3
npm run probe -- --dry-run s5d --model qwen3.8-27b        # print the prompts, no calls
npm run probe -- s5d --model deepseek-v4.1-flash --td 0.4 # 10 scripted interrogations
npm run judge -- s5d --model deepseek-v4.1-flash --passes adaptive
npm run score                                             # gate report
npm run strategy -- --model deepseek-v4.1-flash --lines   # S8–S10
npm run publish:results                                   # rebuild results/published/
```

Models and spending caps are in [`probe.config.ts`](probe.config.ts), scenarios in [`scenarios/`](scenarios/); every call is logged to `results/`. The pilot's training script is [`pilot/train_dpo.py`](pilot/train_dpo.py).

## Design docs

Full design and research log in [`docs/`](docs/): Game Mechanics, Technical Design (architecture and every prompt), Characters, and Models & Research (probe plan and findings). The docs win any disagreement with this README.

## Licensing

- **Code** (`src/`, `pilot/*.py`, configuration): MIT.
- **Game content** (setting, characters, briefings, rules, and scenes in `docs/`, `scenarios/`, and `results/published/`): CC BY-NC-SA 4.0, adapted from **[Plots in the Palazzo](https://www.matthewclifford.com/)** by Matt Clifford ([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)). The rules have been substantially reworked for AI play.

See [LICENSE](LICENSE). This project is non-commercial.

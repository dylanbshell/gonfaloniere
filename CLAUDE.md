# Gonfaloniere: conventions for Claude Code

Work arrives as tasks from Dylan, often relayed from Technical Design (TD). The README covers what the project is; this file covers how to work in it.

## Reports and IDs

- Every task gets one report ID, `CC-YYYYMMDD-NN`, using today's date. NN counts up within the day, from 01.
- To find the last NN used: `git log --all --oneline | grep -o "CC-$(date +%Y%m%d)-[0-9]*" | sort -u | tail -1`. If nothing matches, use 01. If the task names its ID, use that one.
- The report starts with the title line `CC-YYYYMMDD-NN: <descriptive title>`. Put the same ID in every commit message for the task and in the PR comment.
- Each report states: commits, tests passing, spend and the ledger total (for any step that made model calls), and anything that differed from what was expected.
- Put the full report in the PR description, minus spend, ledger totals, balances, and any quoted blind-read lines. Give Dylan those separately at the end of the session. The issue's closing comment links to the PR rather than repeating it.
- End every session with a wrap-up of only the highlights, not the details: what's done, each with a link to its PR (whose description holds the full report), anything that needs Dylan's decision, and the session's spend and ledger totals. Follow it with a short summary of the broader context: why the work matters and how it connects to the rest of the project.

## Branches and PRs

- Start every task on a new short-lived branch off an up-to-date main. Never branch off another feature branch, and never stack PRs.
- Open one PR per task, titled with its report ID, and merge it into main with a merge commit (never squash) once `npm test` and `npm run typecheck` pass. Delete the branch after merging.
- If a task is too big for one PR, split it into tasks that each merge on their own.
- If a PR's work is replaced before merging, close it with a comment saying what replaced it, rather than leaving it open.

## Task queue

- Work arrives as open GitHub issues labelled `cc-task`. When Dylan says "run the queue", list them oldest first with `gh issue list --label cc-task --state open`, and print one line per issue: number, summary, and **ready** or **blocked** (with the unmet need). Then wait for Dylan to say which to run.
- An issue is ready when every issue under **Needs** is closed, and every doc version or PR it names is on an up-to-date main. Check again right before starting each task, since an earlier task can change things.
- Run tasks one at a time, each on a fresh branch off an up-to-date main. The PR body says "Closes #N", so merging closes the issue. Use the usual report ID, and put the issue number in the report title.
- If a task fails or its needs aren't met, stop. Comment on the issue with what happened, and don't run anything that needs it.
- After merging, post a short comment on the issue that links to the PR, where the report is (see Reports and IDs). **The repo is public:** leave spend, ledger totals, and balances out of issue comments. Those go only in the report to Dylan.
- Never write budgets, balances, credits, grant status, personal details, keys, or endpoints in an issue or comment.
- When listing, mark a blocked issue as **stale** if 10 or more `cc-task` issues filed after it have since closed. That means the project kept moving while it sat blocked, so Dylan can unblock it or close it.

## Docs and prompts

- `docs/` is read-only for Claude Code. The project chats merge their own doc PRs into main (one doc per PR, from a `docs/<doc>-vX.Y` branch, merge commit). Don't merge, edit, or close a doc PR unless the task says to; start each task from an up-to-date main, which already has the latest docs.
- Prompts are loaded from the TD doc by `src/sources/docs.ts`. Prompt text is never copied into code.
- `docs/` holds only the current version of each doc. `technicalDesignPath(v)` and `loadDocs` read older versions from git history, so a run pinned to an old version still works.
- The TD version comes from `PROBE_TD` (default in `probe.config.ts`, `config.docs.technicalDesign`). To change it, edit the default there, and add a test in `test/store.test.ts` that plays the fake game on the old and new versions and checks that every prompt differs only as the new version's changelog says.
- Gate behaviour changes on the TD version (`tdMinor(td) >= N`, or the presence of a TD section), so old records replay byte-identical. `PROMPTS_BEFORE_STORE` pins the fake game's prompts on v0.24; update it only for a deliberate prompt change.

## Setting lives in content, not code

- Don't hard-code character names, faction names, or setting terms (Florence, Florins, Colloquio, Il Notaio, and so on) in engine logic. Load them from `docs/`, `lore/`, `scenarios/`, or other data files. Dylan may reskin the game to a modern setting.
- Test fixtures and scenarios may use the setting freely.
- Some older code still hard-codes the setting (the roster, the stand-in cast, faction rules, Florins and pension text). Don't add more, and move them out when the task touches them.

## Spend

- Model calls run with the keys from 1Password: `PROBE_TOTAL_USD=<stop> op run --env-file=.env -- npm run -s minigame -- …`.
- Never print, log, or commit an API key.
- Every call is logged as JSONL, and the ledger is the sum of those logs. There are four ledgers:
  - the probes: `results/*.jsonl`
  - the Capitulation Pilot: `results/pilot/`
  - the mini-games: `results/minigame/` (OpenRouter, embeddings included)
  - Dylan's Claude credit: `results/claude-credit/`, for calls on the native Claude API with `CLAUDE_CREDIT_API_KEY`. Never use `ANTHROPIC_API_KEY`
- Caps:
  - mini-game: $45 (`src/minigame/ledger.ts`)
  - probe: $70 (`probe.config.ts`)
  - per invocation: `--cap` (mini-game default $1)
- `PROBE_TOTAL_USD` can only lower a cap. Set it to the per-session stop Dylan gives, so the runner refuses to pass it.
- `npm run minigame -- --estimate …` projects cost from saved games without making any calls.
- Every step that makes model calls reports its spend and the ledger total afterwards.
- On any 403, key-limit, or insufficient-balance error, stop and report. Don't switch keys or providers.

## Results

- `results/` is gitignored except `results/published/`. Keep everything else local:
  - run logs
  - saved games: `results/minigame/game-<id>.full.json.gz`, with `.checks.json`, `.transcript.md`, and `.memory.md` beside them
  - blind-read keys
  - working files for the checks (for example `results/voice-check/`)
- `results/published/` is the curated slice. Its `README.md` lists what each folder holds; add a row when you add a folder.

## Blind reads

- Publish only `read.md`: shuffled, numbered, text only. Its `key.md` stays local, outside `results/published/`, until Dylan has done the read; publish it then if the task asks.
- Never quote sampled lines in reports, commit messages, or PR comments.
- Score a marked read with `npm run minigame:score -- --read <read.md> --key <key.md>`.

## The viewer

- The viewer is `tools/viewer/viewer.html`, a single file with no server.
- Export a game as a watchable page with `npm run minigame:view -- <record.full.json.gz> … --out results/published/minigame`. Without `--out`, the page goes next to the record.
- The export embeds the replay variant of the record: no model calls, seeds, or provider details. It refuses to write if it finds anything key-shaped.
- After a viewer change, re-export every `.view.html` in `results/published/minigame/`.

## Hosted replays

- Deploy to Netlify only when Dylan asks, and only with the Netlify CLI. Its login stays in the CLI's own config on this Mac; never put the token in the repo, `.env`, a game record, or a report.
- Export with `npm run minigame:view -- <record> --site <url> --out results/published/sites/<folder>`, then deploy that folder by site ID without linking the repo: `netlify deploy --prod --no-build --dir results/published/sites/<folder> --site <site id>`.
- Record each site's name, URL, and game in the site list in `results/published/README.md`.

## Tests

- Run `npm test` and `npm run typecheck`.
- The live-store tests in `test/store.test.ts` need `TEST_DATABASE_URL`, a local PostgreSQL with pgvector; without it they're skipped. To start a scratch database (Homebrew `postgresql@18` with pgvector):

  ```sh
  PG=/opt/homebrew/opt/postgresql@18/bin; D=<scratch dir>/pgdata
  $PG/initdb -D $D -U gonfaloniere --auth=trust -E UTF8 --locale=C
  $PG/pg_ctl -D $D -o "-p 5544 -k '' -c listen_addresses=localhost" -l $D/../pg.log -w start
  $PG/createdb -h localhost -p 5544 -U gonfaloniere gonfaloniere_test
  $PG/psql -h localhost -p 5544 -U gonfaloniere -d gonfaloniere_test -c "CREATE EXTENSION vector"
  TEST_DATABASE_URL=postgres://gonfaloniere@localhost:5544/gonfaloniere_test npm test
  ```

  `-k ''` turns off the Unix socket, whose path can be too long in a temp directory. Stop the database with `$PG/pg_ctl -D $D stop`.

# Gonfaloniere: conventions for Claude Code

Work arrives as tasks from Dylan, often relayed from Technical Design (TD). The README covers what the project is; this file covers how to work in it.

## Reports and IDs

- Every task gets one report ID, `CC-YYYYMMDD-NN`, using today's date. NN counts up within the day, from 01.
- To find the last NN used: `git log --all --oneline | grep -o "CC-$(date +%Y%m%d)-[0-9]*" | sort -u | tail -1`. If nothing matches, use 01. If the task names its ID, use that one.
- The report starts with the title line `CC-YYYYMMDD-NN: <descriptive title>`. Put the same ID in every commit message for the task and in the PR comment.
- Each report states: commits, tests passing, spend and the ledger total (for any step that made model calls), and anything that differed from what was expected.

## Docs and prompts

- `docs/` is read-only for Claude Code. Doc changes arrive as PRs on `docs/*` branches. Leave those PRs alone; when a task says so, merge the branch into the working branch.
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
- Every call is logged as JSONL, and the ledger is the sum of those logs. There are three ledgers:
  - the probes: `results/*.jsonl`
  - the Capitulation Pilot: `results/pilot/`
  - the mini-games: `results/minigame/`
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

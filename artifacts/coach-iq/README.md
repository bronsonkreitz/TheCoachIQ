# CoachIQ

Coaching analytics dashboard for basketball, baseball, soccer, football and hockey. Frontend only; all data is fictional, generated in the browser and persisted to localStorage (`coachiq.v1`).

## Setup
```
pnpm install
pnpm --filter @workspace/coach-iq run dev
```

## Entering your own stats
- Open any sport’s **Stats** page and choose **Enter / edit stats**.
- Select an existing game to correct it, or **New game — start with blank stats** to add your own result without simulating data.
- **Individual players** edits player box scores; percentages, averages and player scores are recalculated. Choose one player or view the full roster.
- **Team totals** records a separate, explicitly labeled team total for that game without overwriting player records. Team charts, totals, game scores and practice recommendations use these recorded totals. Player comparisons continue to use player box scores.
- To return a game to summed player totals, open **Individual players**, uncheck **Keep this game’s manual team totals**, and save.
- Entries are game totals, not season averages. Basketball points are calculated from made field goals, threes and free throws. Baseball innings use outs (3 outs = 1 inning).
- Cancel discards the current draft. Existing demo games stay unless you explicitly edit or remove them. Changes are saved only in the current browser.

Focused manual-entry regression checks:
```
pnpm --filter @workspace/scripts exec tsx --tsconfig ../artifacts/coach-iq/tsconfig.json --test ../artifacts/coach-iq/src/lib/manual-stats.test.ts
```

## Structure
- `src/sports/*.ts` - one `SportConfig` per sport (positions, stats, weights, benchmarks, slots, drills, game simulator, tools).
- `src/data/generate.ts` - deterministic seeded season generator.
- `src/lib/analytics.ts` - scoring engine (percentiles, 60/40 season/form, availability).
- `src/lib/lineup.ts`, `src/lib/practice.ts` - auto lineup and practice generation.
- `src/store` - localStorage store and per-sport context.
- `src/pages/sport/*` - Overview, Roster, Player, Stats, Lineup, Practice, Games, Tools.

## Regression checks
```sh
pnpm --filter @workspace/coach-iq test
pnpm --filter @workspace/coach-iq test:watch
```

These checks run in jsdom with real React providers and browser-local storage;
no server, accounts, database, `PORT`, or `BASE_PATH` is needed. Each test starts
with empty storage and remounts providers to simulate reloads. They cover all five
sports' saved work, sport switching, selected-sport reset, historical box scores
after removing players, roster and note save controls, saved lineup and practice
controls (including completion/deletion), and every editable sport-tool storage
key. Storage read/write failures and data-version isolation are also checked.
Charts and layout-dependent browser observation are excluded from these checks.

## Adding a sport
1. Add the id to `SportId` in `src/lib/types.ts`.
2. Create `src/sports/<id>.ts` exporting a `SportConfig` (copy an existing one).
3. Register it in `src/sports/index.ts`.
4. Add an image at `public/images/<id>.jpg` and, optionally, tool cases in `src/pages/sport/Tools.tsx`.
5. Bump `DATA_VERSION` in `src/data/generate.ts` so stored data reseeds.

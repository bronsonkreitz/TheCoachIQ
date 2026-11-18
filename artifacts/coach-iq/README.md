# CoachIQ

Coaching analytics dashboard for basketball, baseball, soccer, football and hockey. Frontend only; all data is fictional, generated in the browser and persisted to localStorage (`coachiq.v1`).

## Setup
```
pnpm install
pnpm --filter @workspace/coach-iq run dev
```

## Structure
- `src/sports/*.ts` - one `SportConfig` per sport (positions, stats, weights, benchmarks, slots, drills, game simulator, tools).
- `src/data/generate.ts` - deterministic seeded season generator.
- `src/lib/analytics.ts` - scoring engine (percentiles, 60/40 season/form, availability).
- `src/lib/lineup.ts`, `src/lib/practice.ts` - auto lineup and practice generation.
- `src/store` - localStorage store and per-sport context.
- `src/pages/sport/*` - Overview, Roster, Player, Stats, Lineup, Practice, Games, Tools.

## Adding a sport
1. Add the id to `SportId` in `src/lib/types.ts`.
2. Create `src/sports/<id>.ts` exporting a `SportConfig` (copy an existing one).
3. Register it in `src/sports/index.ts`.
4. Add an image at `public/images/<id>.jpg` and, optionally, tool cases in `src/pages/sport/Tools.tsx`.
5. Bump `DATA_VERSION` in `src/data/generate.ts` so stored data reseeds.

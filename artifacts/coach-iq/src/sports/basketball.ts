import type { Raw } from '@/lib/types';
import { binom, clamp, pois } from '@/lib/rng';
import type { SportConfig } from './types';
import { drill, safeDiv, sumKey } from './common';

const PROF: Record<string, { vol: number; tp: number; paint: number; fin: number; reb: number; ast: number; blk: number }> = {
  PG: { vol: 1, tp: 0.4, paint: 0.42, fin: 0, reb: 3.6, ast: 7.2, blk: 0.2 },
  SG: { vol: 1.08, tp: 0.46, paint: 0.4, fin: 0, reb: 4, ast: 3.4, blk: 0.3 },
  SF: { vol: 1, tp: 0.36, paint: 0.5, fin: 0.02, reb: 5.8, ast: 2.8, blk: 0.6 },
  PF: { vol: 0.95, tp: 0.2, paint: 0.66, fin: 0.05, reb: 8.4, ast: 2.1, blk: 1.1 },
  C: { vol: 0.9, tp: 0.04, paint: 0.86, fin: 0.08, reb: 10.4, ast: 1.8, blk: 1.9 },
};

export const basketball: SportConfig = {
  id: 'basketball',
  name: 'Basketball',
  number: '04',
  accent: '40 98% 56%',
  hex: '#fbb124',
  tagline: 'Rotations, shooting splits, smart practice.',
  blurb: 'Half-court shot charts by zone, quarter-by-quarter rotation planning and five-man units balanced for spacing and rim protection.',
  image: 'basketball.jpg',
  surface: 'court',
  scoreUnit: 'Points',
  allowDraws: false,
  defaultMode: 'pg',
  team: {
    id: 'bb-lanterns',
    sport: 'basketball',
    name: 'Harbor City Lanterns',
    city: 'Harbor City',
    mascot: 'Lanterns',
    abbr: 'HCL',
    league: 'Coastal Collegiate Conference',
    colors: ['#fbb124', '#0b1224'],
  },
  opponents: ['Mesa Verde Coyotes', 'Pinecrest Owls', 'Duluth Bay Herons', 'Fairhaven Comets', 'Ashford Rams', 'Granite Point Miners', 'Silver Lake Otters', 'Kingsport Mariners', 'Redbank Foxes', 'Eastfield Jays', 'Lowell Ridge Hawks', 'Copper Canyon Suns', 'Brightwater Gulls', 'Oak Hollow Badgers', 'Sable Creek Lynx', 'Westmont Pilots', 'Tidewater Knights'],
  seasonStart: '2025-11-04',
  cadenceDays: 4,
  years: ['Fr', 'So', 'Jr', 'Sr'],
  ageRange: [18, 22],
  size: (p) => ({ PG: [72, 75, 175, 190], SG: [74, 77, 185, 200], SF: [77, 79, 200, 220], PF: [79, 81, 220, 240], C: [81, 84, 235, 260] } as Record<string, [number, number, number, number]>)[p] ?? [74, 80, 190, 230],
  positions: ['PG', 'SG', 'SF', 'PF', 'C'],
  positionNames: { PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center' },
  pool: () => 'ALL',
  rosterPlan: [
    { pos: 'PG', count: 2 },
    { pos: 'SG', count: 3 },
    { pos: 'SF', count: 2 },
    { pos: 'PF', count: 3 },
    { pos: 'C', count: 2 },
  ],
  rawKeys: [
    { key: 'min', label: 'MIN' },
    { key: 'pts', label: 'PTS', calc: true },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'stl', label: 'STL' },
    { key: 'blk', label: 'BLK' },
    { key: 'tov', label: 'TOV' },
    { key: 'fgm', label: 'FGM' },
    { key: 'fga', label: 'FGA' },
    { key: 'tpm', label: '3PM' },
    { key: 'tpa', label: '3PA' },
    { key: 'ftm', label: 'FTM' },
    { key: 'fta', label: 'FTA' },
    { key: 'pmn', label: '+/-' },
  ],
  normalize: (s) => ({ ...s, pts: 2 * ((s.fgm || 0) - (s.tpm || 0)) + 3 * (s.tpm || 0) + (s.ftm || 0) }),
  columns: [
    { key: 'pts', label: 'PTS', fmt: 'int', higher: true, count: true, desc: 'Points' },
    { key: 'reb', label: 'REB', fmt: 'int', higher: true, count: true, desc: 'Rebounds' },
    { key: 'ast', label: 'AST', fmt: 'int', higher: true, count: true, desc: 'Assists' },
    { key: 'stl', label: 'STL', fmt: 'int', higher: true, count: true, desc: 'Steals' },
    { key: 'blk', label: 'BLK', fmt: 'int', higher: true, count: true, desc: 'Blocks' },
    { key: 'tov', label: 'TOV', fmt: 'int', higher: false, count: true, desc: 'Turnovers' },
    { key: 'fg', label: 'FG%', fmt: 'pct', higher: true, count: false, desc: 'Field goal percentage' },
    { key: 'tp', label: '3P%', fmt: 'pct', higher: true, count: false, desc: 'Three-point percentage' },
    { key: 'ft', label: 'FT%', fmt: 'pct', higher: true, count: false, desc: 'Free throw percentage' },
    { key: 'min', label: 'MIN', fmt: 'int', higher: true, count: true, desc: 'Minutes' },
    { key: 'pm', label: '+/-', fmt: 'signed', higher: true, count: true, desc: 'Plus-minus' },
  ],
  derive: (t) => ({
    pts: t.pts || 0,
    reb: t.reb || 0,
    ast: t.ast || 0,
    stl: t.stl || 0,
    blk: t.blk || 0,
    tov: t.tov || 0,
    fg: safeDiv(t.fgm, t.fga),
    tp: safeDiv(t.tpm, t.tpa),
    ft: safeDiv(t.ftm, t.fta),
    min: t.min || 0,
    pm: t.pmn || 0,
  }),
  rosterCols: ['pts', 'reb', 'ast', 'fg', 'tp'],
  weights: (p) =>
    ({
      PG: { pts: 2, ast: 3, tov: 2, stl: 1, tp: 1.5, ft: 1, fg: 1, pm: 1 },
      SG: { pts: 3, tp: 2.5, fg: 1.5, stl: 1, ft: 1, pm: 1, ast: 1 },
      SF: { pts: 2.5, reb: 1.5, fg: 1.5, tp: 1.5, stl: 1.2, pm: 1 },
      PF: { reb: 3, pts: 2, fg: 2, blk: 1.5, pm: 1 },
      C: { reb: 3, blk: 2.5, fg: 2.5, pts: 1.5, pm: 1 },
    } as Record<string, Record<string, number>>)[p] ?? { pts: 1 },
  primary: 'pts',
  kpis: [
    { label: 'Points / game', value: (a) => a.pf / a.gp, fmt: 'd1', higher: true },
    { label: 'Field goal %', value: (a) => safeDiv(a.totals.fgm, a.totals.fga), fmt: 'pct', higher: true },
    { label: '3-point %', value: (a) => safeDiv(a.totals.tpm, a.totals.tpa), fmt: 'pct', higher: true },
    { label: 'Turnovers / game', value: (a) => a.totals.tov / a.gp, fmt: 'd1', higher: false },
    { label: 'Rebound margin', value: (a) => (a.totals.reb - (a.extra.oppReb || 0)) / a.gp, fmt: 'signed', higher: true },
    { label: 'Assist / TO ratio', value: (a) => safeDiv(a.totals.ast, a.totals.tov), fmt: 'd2', higher: true },
  ],
  benchmarks: [
    { key: 'fg', label: 'Field goal %', value: (a) => safeDiv(a.totals.fgm, a.totals.fga), league: 0.455, higher: true, fmt: 'pct', tags: ['finishing'] },
    { key: 'tp', label: '3-point %', value: (a) => safeDiv(a.totals.tpm, a.totals.tpa), league: 0.352, higher: true, fmt: 'pct', tags: ['three-point'] },
    { key: 'ft', label: 'Free throw %', value: (a) => safeDiv(a.totals.ftm, a.totals.fta), league: 0.735, higher: true, fmt: 'pct', tags: ['free-throws'] },
    { key: 'tov', label: 'Turnovers / game', value: (a) => a.totals.tov / a.gp, league: 12.6, higher: false, fmt: 'd1', tags: ['ball-security'] },
    { key: 'reb', label: 'Rebounds / game', value: (a) => a.totals.reb / a.gp, league: 37.5, higher: true, fmt: 'd1', tags: ['rebounding'] },
    { key: 'ast', label: 'Assists / game', value: (a) => a.totals.ast / a.gp, league: 16.5, higher: true, fmt: 'd1', tags: ['passing'] },
    { key: 'stl', label: 'Steals / game', value: (a) => a.totals.stl / a.gp, league: 7.2, higher: true, fmt: 'd1', tags: ['team-defense'] },
    { key: 'blk', label: 'Blocks / game', value: (a) => a.totals.blk / a.gp, league: 4.1, higher: true, fmt: 'd1', tags: ['rim-protection'] },
  ],
  slots: [
    { id: 'pg', label: 'PG', positions: ['PG'], x: 50, y: 82 },
    { id: 'sg', label: 'SG', positions: ['SG'], x: 16, y: 62 },
    { id: 'sf', label: 'SF', positions: ['SF'], x: 84, y: 58 },
    { id: 'pf', label: 'PF', positions: ['PF'], x: 66, y: 28 },
    { id: 'c', label: 'C', positions: ['C'], x: 38, y: 22 },
  ],
  needs: [
    { key: 'reb', label: 'at least one top-3 rebounder', topN: 3, min: 1 },
    { key: 'tp', label: 'two floor spacers (top-5 3P%)', topN: 5, min: 2 },
    { key: 'blk', label: 'one rim protector (top-3 blocks)', topN: 3, min: 1 },
  ],
  rules: [
    'One starter per position: PG, SG, SF, PF, C.',
    'Spacing rule: at least two starters rank top 5 on the team in 3P%.',
    'Defense rule: at least one top-3 rebounder and one top-3 shot blocker start.',
    'If a rule fails, the lowest-scoring eligible starter is swapped for the best rule-fitting player.',
  ],
  drills: [
    drill('bk-w', 'Dynamic warm-up and form shooting', ['warmup'], 12, 'Low', ['Balls', 'Cones'], 'Lane slides, skips and carioca, then 5 makes from each block and elbow with perfect form.', 'warmup'),
    drill('bk-1', 'Closeout drill', ['team-defense', 'three-point'], 12, 'High', ['Balls', 'Cones'], 'Defender sprints from the paint to a shooter, chops feet, high hand. Shooter attacks one dribble if closeout is short.'),
    drill('bk-2', 'Shell drill', ['team-defense', 'rim-protection'], 15, 'Medium', ['Balls'], '4-on-4 shell. Coach calls ball location; defenders jump to the ball, help, recover. Add skip passes after 3 minutes.'),
    drill('bk-3', '3-man weave', ['passing', 'finishing'], 10, 'High', ['Balls'], 'Full-court weave ending in a layup, then 2-on-1 back. No dribbles allowed. Reset on any drop.'),
    drill('bk-4', 'Free throw ladder', ['free-throws'], 10, 'Low', ['Balls'], 'Pairs shoot 1, 2, then 3 in a row; a miss drops you a rung. Finish with 2 makes after a sprint.'),
    drill('bk-5', 'Box-out war', ['rebounding'], 12, 'High', ['Balls'], '3-on-3 under the rim. Coach shoots; defense must box out and secure. Offense scores on putbacks. Winners stay.'),
    drill('bk-6', 'Pick-and-roll reads', ['passing', 'ball-security'], 15, 'Medium', ['Balls', 'Pads'], 'Handler reads hedge, drop and switch coverage. Hit the roller, the pop, or the weak-side corner. Count clean reads.'),
    drill('bk-7', 'Corner catch-and-shoot', ['three-point'], 12, 'Medium', ['Balls', 'Shooting machine'], 'Drift to the corner, feet set before the catch, 25 makes per player with a partner rebounding.'),
    drill('bk-8', 'Mikan and contact finishing', ['finishing'], 10, 'Medium', ['Balls', 'Pads'], 'Mikan series, then finishes through a pad bump from both hands. Track makes out of 20.'),
    drill('bk-9', 'Zig-zag ball pressure', ['ball-security', 'team-defense'], 12, 'High', ['Balls'], 'Handler goes full court under pressure with one-hand keep-away. Turnover means 5 push-ups for both.'),
    drill('bk-10', 'Verticality and rim drills', ['rim-protection', 'rebounding'], 10, 'Medium', ['Balls', 'Pads'], 'Bigs contest with straight arms, no fouling, then outlet in two seconds after the board.'),
    drill('bk-11', 'Advantage passing 4-on-3', ['passing', 'ball-security'], 12, 'High', ['Balls'], 'Offense must make 3 passes before a shot. Teach extra-pass and swing reads against a scrambling defense.'),
    drill('bk-s', 'Controlled 5-on-5 scrimmage', ['scrimmage'], 20, 'High', ['Balls', 'Pinnies', 'Scoreboard'], 'Situational scrimmage. Start possessions with the focus areas: e.g. side-out, late clock, free throws on every foul.', 'scrimmage'),
    drill('bk-c', 'Cool-down and FT routine', ['cooldown'], 8, 'Low', ['Mats', 'Balls'], 'Light stretch, then 10 relaxed free throws each with a breathing routine.', 'cooldown'),
  ],
  genGame: (players, { rng }) => {
    const lines: Record<string, Raw> = {};
    const sorted = [...players].sort((a, b) => b.skill - a.skill);
    sorted.forEach((p, i) => {
      if (i > 9 && rng() < 0.35) return;
      const prof = PROF[p.position] ?? PROF.SF;
      const base = i < 5 ? 29 : i < 8 ? 19 : 9;
      const min = clamp(Math.round(base + (rng() - 0.5) * 8 + p.skill * 4), 2, 40);
      const fga = Math.max(0, Math.round((min / 36) * (7 + p.skill * 9) * prof.vol + (rng() - 0.5) * 3));
      const tpa = binom(rng, fga, prof.tp);
      const two = fga - tpa;
      const zpA = binom(rng, two, prof.paint);
      const zmA = two - zpA;
      const zcA = binom(rng, tpa, 0.35);
      const zaA = tpa - zcA;
      const zpM = binom(rng, zpA, 0.5 + p.skill * 0.12 + prof.fin);
      const zmM = binom(rng, zmA, 0.33 + p.skill * 0.1);
      const zcM = binom(rng, zcA, 0.3 + p.skill * 0.12);
      const zaM = binom(rng, zaA, 0.25 + p.skill * 0.12);
      const fta = binom(rng, Math.round(fga * 0.45), 0.6);
      const ftm = binom(rng, fta, 0.58 + p.skill * 0.2);
      const tpm = zcM + zaM;
      const fgm = zpM + zmM + tpm;
      lines[p.id] = {
        min,
        pts: 2 * (zpM + zmM) + 3 * tpm + ftm,
        reb: pois(rng, (min / 36) * prof.reb * (0.7 + p.skill * 0.6)),
        ast: pois(rng, (min / 36) * prof.ast * (0.7 + p.skill * 0.6)),
        stl: pois(rng, (min / 36) * 1.1),
        blk: pois(rng, (min / 36) * prof.blk),
        tov: pois(rng, (min / 36) * (2.1 + prof.ast * 0.14)),
        fgm,
        fga,
        tpm,
        tpa,
        ftm,
        fta,
        pmn: Math.round((rng() - 0.45) * 14 + (p.skill - 0.5) * 10),
        zpA,
        zpM,
        zmA,
        zmM,
        zcA,
        zcM,
        zaA,
        zaM,
      };
    });
    const ls = Object.values(lines);
    const pf = sumKey(ls, 'pts');
    let opp = Math.max(42, pf + Math.round((rng() - 0.5) * 26));
    if (opp === pf) opp += rng() < 0.5 ? 1 : -1;
    return { lines, scoreAgainst: opp, extra: { oppReb: Math.max(20, sumKey(ls, 'reb') + Math.round((rng() - 0.45) * 12)) } };
  },
  teamScore: (ls) => sumKey(ls, 'pts'),
  tools: [
    { id: 'shots', label: 'Shot chart', desc: 'Half-court shooting splits by zone' },
    { id: 'rotation', label: 'Rotation planner', desc: 'Minutes per player across four quarters' },
  ],
};

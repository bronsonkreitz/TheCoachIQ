import type { Player, Raw } from '@/lib/types';
import { binom, clamp, pickW, pois, ri } from '@/lib/rng';
import type { SlotDef, SportConfig } from './types';
import { drill, safeDiv, sumKey } from './common';

const grp = (p: string) =>
  p === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(p) ? 'DEF' : ['CDM', 'CM', 'CAM'].includes(p) ? 'MID' : 'FWD';

const MID = ['CM', 'CDM', 'CAM'];
const s = (id: string, label: string, positions: string[], x: number, y: number): SlotDef => ({ id, label, positions, x, y });

export const FORMATIONS: Record<string, SlotDef[]> = {
  '4-3-3': [
    s('gk', 'GK', ['GK'], 6, 50),
    s('lb', 'LB', ['LB', 'CB'], 24, 14),
    s('lcb', 'CB', ['CB'], 20, 38),
    s('rcb', 'CB', ['CB'], 20, 62),
    s('rb', 'RB', ['RB', 'CB'], 24, 86),
    s('lcm', 'CM', MID, 46, 28),
    s('cdm', 'CDM', ['CDM', 'CM'], 38, 50),
    s('rcm', 'CM', MID, 46, 72),
    s('lw', 'LW', ['LW', 'ST', 'CAM'], 70, 16),
    s('st', 'ST', ['ST'], 78, 50),
    s('rw', 'RW', ['RW', 'ST', 'CAM'], 70, 84),
  ],
  '4-4-2': [
    s('gk', 'GK', ['GK'], 6, 50),
    s('lb', 'LB', ['LB', 'CB'], 24, 14),
    s('lcb', 'CB', ['CB'], 20, 38),
    s('rcb', 'CB', ['CB'], 20, 62),
    s('rb', 'RB', ['RB', 'CB'], 24, 86),
    s('lm', 'LM', ['LW', 'CM', 'CAM'], 50, 14),
    s('lcm', 'CM', MID, 44, 38),
    s('rcm', 'CM', MID, 44, 62),
    s('rm', 'RM', ['RW', 'CM', 'CAM'], 50, 86),
    s('lst', 'ST', ['ST', 'LW', 'RW'], 76, 38),
    s('rst', 'ST', ['ST', 'LW', 'RW'], 76, 62),
  ],
  '3-5-2': [
    s('gk', 'GK', ['GK'], 6, 50),
    s('lcb', 'CB', ['CB', 'LB'], 22, 26),
    s('cb', 'CB', ['CB'], 19, 50),
    s('rcb', 'CB', ['CB', 'RB'], 22, 74),
    s('lwb', 'LWB', ['LB', 'LW'], 46, 10),
    s('lcm', 'CM', MID, 44, 34),
    s('cdm', 'CDM', ['CDM', 'CM'], 36, 50),
    s('rcm', 'CM', MID, 44, 66),
    s('rwb', 'RWB', ['RB', 'RW'], 46, 90),
    s('lst', 'ST', ['ST', 'LW', 'RW', 'CAM'], 76, 38),
    s('rst', 'ST', ['ST', 'LW', 'RW', 'CAM'], 76, 62),
  ],
  '4-2-3-1': [
    s('gk', 'GK', ['GK'], 6, 50),
    s('lb', 'LB', ['LB', 'CB'], 24, 14),
    s('lcb', 'CB', ['CB'], 20, 38),
    s('rcb', 'CB', ['CB'], 20, 62),
    s('rb', 'RB', ['RB', 'CB'], 24, 86),
    s('ldm', 'CDM', ['CDM', 'CM'], 38, 38),
    s('rdm', 'CDM', ['CDM', 'CM'], 38, 62),
    s('lam', 'LW', ['LW', 'CAM', 'RW'], 62, 18),
    s('cam', 'CAM', ['CAM', 'CM'], 60, 50),
    s('ram', 'RW', ['RW', 'CAM', 'LW'], 62, 82),
    s('st', 'ST', ['ST'], 80, 50),
  ],
};

export const soccer: SportConfig = {
  id: 'soccer',
  name: 'Soccer',
  number: '02',
  accent: '146 72% 50%',
  hex: '#24db74',
  tagline: 'Formations, possession, set pieces.',
  blurb: 'Pick a shape, get a best XI that fits it, track possession and passing, and design corners with a role for every player.',
  image: 'soccer.jpg',
  surface: 'pitch',
  scoreUnit: 'Goals',
  allowDraws: true,
  defaultMode: 'tot',
  team: {
    id: 'sc-tidal',
    sport: 'soccer',
    name: 'Northgate Tidal FC',
    city: 'Northgate',
    mascot: 'Tidal',
    abbr: 'NTF',
    league: 'Atlantic Premier Youth League',
    colors: ['#24db74', '#0b1224'],
  },
  opponents: ['Ellsworth Athletic', 'Brixham Rovers', 'Cardale United', 'Wexley Town', 'Fallowmere FC', 'Ostend Park', 'Halvard City', 'Penrith Borough', 'Saltmarsh Albion', 'Kestrel Valley SC', 'Redmoor Wanderers', 'Thornbury FC', 'Lindell Harriers', 'Coldwater Rangers', 'Ashby Vale', 'Morrow Hill SC', 'Quayside FC'],
  seasonStart: '2025-09-06',
  cadenceDays: 7,
  years: ['U17', 'U18', 'U19', 'U20'],
  ageRange: [16, 20],
  size: (p) => (p === 'GK' ? [73, 77, 175, 195] : grp(p) === 'DEF' ? [70, 75, 160, 185] : [66, 72, 145, 170]),
  positions: ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'],
  positionNames: { GK: 'Goalkeeper', CB: 'Center Back', LB: 'Left Back', RB: 'Right Back', CDM: 'Defensive Mid', CM: 'Central Mid', CAM: 'Attacking Mid', LW: 'Left Wing', RW: 'Right Wing', ST: 'Striker' },
  pool: grp,
  rosterPlan: [
    { pos: 'GK', count: 2 },
    { pos: 'CB', count: 3 },
    { pos: 'LB', count: 1 },
    { pos: 'RB', count: 1 },
    { pos: 'CDM', count: 2 },
    { pos: 'CM', count: 2 },
    { pos: 'CAM', count: 2 },
    { pos: 'LW', count: 1 },
    { pos: 'RW', count: 1 },
    { pos: 'ST', count: 3 },
  ],
  rawKeys: [
    { key: 'min', label: 'MIN' },
    { key: 'g', label: 'G' },
    { key: 'a', label: 'A' },
    { key: 'sh', label: 'SH' },
    { key: 'sot', label: 'SOT' },
    { key: 'pa', label: 'PASS' },
    { key: 'pc', label: 'CMP' },
    { key: 'tkl', label: 'TKL' },
    { key: 'int', label: 'INT' },
    { key: 'yc', label: 'YC' },
    { key: 'rc', label: 'RC' },
    { key: 'sv', label: 'SV' },
    { key: 'ga', label: 'GA' },
    { key: 'cs', label: 'CS' },
  ],
  columns: [
    { key: 'g', label: 'G', fmt: 'int', higher: true, count: true, desc: 'Goals' },
    { key: 'a', label: 'A', fmt: 'int', higher: true, count: true, desc: 'Assists' },
    { key: 'sh', label: 'SH', fmt: 'int', higher: true, count: true, desc: 'Shots' },
    { key: 'sot', label: 'SOT', fmt: 'int', higher: true, count: true, desc: 'Shots on target' },
    { key: 'pcp', label: 'PASS%', fmt: 'pct', higher: true, count: false, desc: 'Pass completion' },
    { key: 'tkl', label: 'TKL', fmt: 'int', higher: true, count: true, desc: 'Tackles' },
    { key: 'int', label: 'INT', fmt: 'int', higher: true, count: true, desc: 'Interceptions' },
    { key: 'cs', label: 'CS', fmt: 'int', higher: true, count: true, desc: 'Clean sheets' },
    { key: 'min', label: 'MIN', fmt: 'int', higher: true, count: true, desc: 'Minutes' },
    { key: 'yc', label: 'YC', fmt: 'int', higher: false, count: true, desc: 'Yellow cards' },
    { key: 'rc', label: 'RC', fmt: 'int', higher: false, count: true, desc: 'Red cards' },
    { key: 'svp', label: 'SV%', fmt: 'pct', higher: true, count: false, desc: 'Save percentage' },
    { key: 'ga90', label: 'GA/90', fmt: 'd2', higher: false, count: false, desc: 'Goals against per 90' },
  ],
  derive: (t) => ({
    g: t.g || 0,
    a: t.a || 0,
    sh: t.sh || 0,
    sot: t.sot || 0,
    pcp: safeDiv(t.pc, t.pa),
    tkl: t.tkl || 0,
    int: t.int || 0,
    cs: t.cs || 0,
    min: t.min || 0,
    yc: t.yc || 0,
    rc: t.rc || 0,
    svp: (t.sv || 0) + (t.ga || 0) > 0 ? t.sv / (t.sv + t.ga) : NaN,
    ga90: t.sv != null && (t.sv || t.ga || t.cs) ? ((t.ga || 0) * 90) / (t.min || 90) : NaN,
  }),
  rosterCols: ['g', 'a', 'pcp', 'tkl', 'min'],
  weights: (p) =>
    ({
      GK: { svp: 3, ga90: 3, cs: 2, pcp: 0.5 },
      CB: { tkl: 2, int: 2.5, pcp: 1.5, yc: 0.5 },
      LB: { tkl: 2, int: 1.5, a: 1.5, pcp: 1 },
      RB: { tkl: 2, int: 1.5, a: 1.5, pcp: 1 },
      CDM: { tkl: 2, int: 2, pcp: 2 },
      CM: { pcp: 2, a: 2, tkl: 1, g: 1 },
      CAM: { a: 3, g: 2, sot: 1.5, pcp: 1 },
      LW: { g: 2.5, a: 2, sot: 1.5, sh: 1 },
      RW: { g: 2.5, a: 2, sot: 1.5, sh: 1 },
      ST: { g: 4, sot: 2, sh: 1, a: 1 },
    } as Record<string, Record<string, number>>)[p] ?? { g: 1 },
  primary: 'g',
  kpis: [
    { label: 'Goals / match', value: (a) => a.pf / a.gp, fmt: 'd2', higher: true },
    { label: 'Conceded / match', value: (a) => a.pa / a.gp, fmt: 'd2', higher: false },
    { label: 'Possession', value: (a) => (a.extra.poss || 0) / a.gp / 100, fmt: 'pct', higher: true },
    { label: 'Pass completion', value: (a) => safeDiv(a.totals.pc, a.totals.pa), fmt: 'pct', higher: true },
    { label: 'Shots on target / match', value: (a) => a.totals.sot / a.gp, fmt: 'd1', higher: true },
    { label: 'Clean sheets', value: (a) => a.games.filter((g) => g.scoreAgainst === 0).length, fmt: 'int', higher: true },
  ],
  benchmarks: [
    { key: 'gf', label: 'Goals / match', value: (a) => a.pf / a.gp, league: 1.65, higher: true, fmt: 'd2', tags: ['finishing'] },
    { key: 'ga', label: 'Conceded / match', value: (a) => a.pa / a.gp, league: 1.2, higher: false, fmt: 'd2', tags: ['defending', 'defensive-shape'] },
    { key: 'poss', label: 'Possession', value: (a) => (a.extra.poss || 0) / a.gp / 100, league: 0.52, higher: true, fmt: 'pct', tags: ['possession'] },
    { key: 'pass', label: 'Pass completion', value: (a) => safeDiv(a.totals.pc, a.totals.pa), league: 0.8, higher: true, fmt: 'pct', tags: ['possession', 'passing'] },
    { key: 'sot', label: 'Shots on target / match', value: (a) => a.totals.sot / a.gp, league: 5.2, higher: true, fmt: 'd1', tags: ['chance-creation', 'finishing'] },
    { key: 'conv', label: 'Shot conversion', value: (a) => safeDiv(a.totals.g, a.totals.sh), league: 0.12, higher: true, fmt: 'pct', tags: ['finishing'] },
    { key: 'tkl', label: 'Tackles / match', value: (a) => a.totals.tkl / a.gp, league: 17, higher: true, fmt: 'd1', tags: ['pressing', 'defending'] },
    { key: 'int', label: 'Interceptions / match', value: (a) => a.totals.int / a.gp, league: 10.5, higher: true, fmt: 'd1', tags: ['defensive-shape', 'pressing'] },
    { key: 'cards', label: 'Cards / match', value: (a) => (a.totals.yc + a.totals.rc) / a.gp, league: 1.8, higher: false, fmt: 'd2', tags: ['discipline'] },
  ],
  slots: FORMATIONS['4-3-3'],
  formations: FORMATIONS,
  needs: [
    { key: 'g', label: 'at least two top-4 goal scorers', topN: 4, min: 2 },
    { key: 'int', label: 'a top-3 ball winner (interceptions)', topN: 3, min: 1 },
  ],
  rules: [
    'Eleven starters must fit the selected formation; each slot lists the positions allowed to fill it.',
    'Attack rule: at least two top-4 goal scorers start.',
    'Shape rule: at least one top-3 interception leader starts.',
    'The next seven highest scores form the bench (subs).',
  ],
  drills: [
    drill('sc-w', 'Activation and passing gates', ['warmup'], 12, 'Low', ['Balls', 'Cones'], 'Dynamic stretching, then pairs pass through cone gates on two touches, increasing tempo every 2 minutes.', 'warmup'),
    drill('sc-1', 'Rondo 5v2', ['possession', 'passing', 'pressing'], 12, 'Medium', ['Balls', 'Cones', 'Pinnies'], '10x10 grid. Five keep the ball on two touches; defenders swap on a win. Count passes before a turnover.'),
    drill('sc-2', '1v1 defending channel', ['defending', 'discipline'], 12, 'High', ['Balls', 'Cones', 'Mini goals'], 'Defender approaches, slows, shows the attacker wide. No sliding unless the ball is loose.'),
    drill('sc-3', 'Finishing circuit', ['finishing'], 15, 'High', ['Balls', 'Goals', 'Mannequins'], 'Four stations: first-time finish, cut inside and curl, cutback, rebound. Track goals per 10 attempts.'),
    drill('sc-4', 'Pressing triggers', ['pressing', 'defensive-shape'], 15, 'High', ['Balls', 'Pinnies'], 'Press on a back pass, a heavy touch, or a pass to the full back. Win the ball within 6 seconds for a point.'),
    drill('sc-5', 'Corner routines', ['set-pieces', 'finishing'], 12, 'Low', ['Balls', 'Goals', 'Mannequins'], 'Walk then run three corner routines: near-post flick, back-post overload, short corner. Rotate takers.'),
    drill('sc-6', 'Build-up from the back', ['possession', 'passing'], 15, 'Medium', ['Balls', 'Goals', 'Pinnies'], 'GK + back four vs three pressers. Split CBs, drop the six, play through the lines into a target zone.'),
    drill('sc-7', 'Third-man runs', ['chance-creation', 'passing'], 12, 'Medium', ['Balls', 'Cones'], 'A to B, B lays off to C who plays the runner in behind. Finish on goal.'),
    drill('sc-8', 'Crossing and cutbacks', ['chance-creation', 'finishing'], 12, 'Medium', ['Balls', 'Goals'], 'Wide players attack the byline; strikers attack near post, far post and penalty spot.'),
    drill('sc-9', 'Compact block shape', ['defensive-shape', 'defending'], 12, 'Low', ['Balls', 'Cones', 'Pinnies'], 'Back four and midfield slide as a unit with the ball, keeping 10 to 15 yards between lines.'),
    drill('sc-10', 'Tackle timing', ['discipline', 'defending', 'pressing'], 10, 'Medium', ['Balls', 'Pads'], 'Timing poke and block tackles from the front and side. Foul or card-worthy contact resets the rep.'),
    drill('sc-11', 'Possession 7v7 + 2 neutrals', ['possession', 'pressing'], 15, 'High', ['Balls', 'Pinnies', 'Cones'], 'Points for 8 consecutive passes; defending team scores by winning and finding a target player.'),
    drill('sc-s', 'Small-sided scrimmage', ['scrimmage'], 20, 'High', ['Balls', 'Goals', 'Pinnies'], '8v8 on a reduced pitch. Coaches freeze play to reinforce the session focus.', 'scrimmage'),
    drill('sc-c', 'Cool-down and mobility', ['cooldown'], 8, 'Low', ['Mats'], 'Light jog, hamstring and hip mobility, foam roll calves.', 'cooldown'),
  ],
  genGame: (players, { rng }) => {
    const lines: Record<string, Raw> = {};
    const pool = [...players].sort((a, b) => b.skill - a.skill);
    const need: Record<string, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };
    const starters: Player[] = [];
    for (const p of pool) {
      const g = grp(p.position);
      if (need[g] > 0) {
        need[g] -= 1;
        starters.push(p);
      }
    }
    const rest = pool.filter((p) => !starters.includes(p) && p.position !== 'GK');
    const subs = rest.sort(() => rng() - 0.5).slice(0, 3);
    const mins = new Map<string, number>();
    starters.forEach((p) => mins.set(p.id, p.position === 'GK' ? 90 : 90));
    subs.forEach((sp) => {
      const out = pickW(rng, starters.filter((p) => p.position !== 'GK' && mins.get(p.id) === 90), () => 1);
      const m = ri(rng, 60, 80);
      mins.set(out.id, m);
      mins.set(sp.id, 90 - m);
    });
    const on = [...starters, ...subs];
    const field = on.filter((p) => p.position !== 'GK');
    for (const p of on) {
      const g = grp(p.position);
      const min = mins.get(p.id) ?? 0;
      const f = min / 90;
      const pa = pois(rng, f * ({ GK: 26, DEF: 46, MID: 56, FWD: 26 } as Record<string, number>)[g]);
      lines[p.id] = {
        min,
        g: 0,
        a: 0,
        sh: 0,
        sot: 0,
        pa,
        pc: binom(rng, pa, 0.68 + p.skill * 0.18),
        tkl: pois(rng, f * ({ GK: 0, DEF: 2.4, MID: 2.1, FWD: 0.6 } as Record<string, number>)[g]),
        int: pois(rng, f * ({ GK: 0.2, DEF: 1.7, MID: 1.1, FWD: 0.3 } as Record<string, number>)[g]),
        yc: rng() < 0.11 * f ? 1 : 0,
        rc: rng() < 0.008 ? 1 : 0,
        sv: 0,
        ga: 0,
        cs: 0,
      };
    }
    const avgSkill = on.reduce((a, p) => a + p.skill, 0) / on.length;
    const goals = pois(rng, 1.1 + avgSkill * 0.9);
    const gw: Record<string, number> = { DEF: 0.5, MID: 2, FWD: 5 };
    for (let i = 0; i < goals; i++) {
      const sc = pickW(rng, field, (p) => gw[grp(p.position)] * (p.skill + 0.3) * ((mins.get(p.id) ?? 0) / 90));
      lines[sc.id].g += 1;
      if (rng() < 0.72) {
        const as = pickW(rng, field.filter((p) => p.id !== sc.id), (p) => ({ DEF: 1, MID: 3, FWD: 2 } as Record<string, number>)[grp(p.position)] * (p.skill + 0.2));
        lines[as.id].a += 1;
      }
    }
    for (const p of field) {
      const l = lines[p.id];
      const extra = pois(rng, (l.min / 90) * ({ DEF: 0.3, MID: 1.0, FWD: 2.2 } as Record<string, number>)[grp(p.position)]);
      l.sh = l.g + extra;
      l.sot = l.g + binom(rng, extra, 0.33);
    }
    const gk = on.find((p) => p.position === 'GK');
    const conceded = pois(rng, clamp(1.3 - ((gk?.skill ?? 0.5) - 0.5) * 0.8, 0.5, 2));
    if (gk) {
      lines[gk.id].ga = conceded;
      lines[gk.id].sv = pois(rng, 3.2);
      lines[gk.id].cs = conceded === 0 ? 1 : 0;
    }
    const ls = Object.values(lines);
    const pcp = sumKey(ls, 'pc') / Math.max(1, sumKey(ls, 'pa'));
    const poss = clamp(Math.round(50 + (pcp - 0.8) * 70 + (rng() - 0.5) * 14), 34, 68);
    return { lines, scoreAgainst: conceded, extra: { poss } };
  },
  teamScore: (ls) => sumKey(ls, 'g'),
  tools: [
    { id: 'formation', label: 'Formation selector', desc: 'Best XI and fit score for every shape' },
    { id: 'possession', label: 'Possession and passing', desc: 'Possession and completion by match' },
    { id: 'setpieces', label: 'Set-piece designer', desc: 'Corners and free kicks with assigned roles' },
  ],
};

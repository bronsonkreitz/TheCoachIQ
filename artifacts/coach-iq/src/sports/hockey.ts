import type { Player, Raw } from '@/lib/types';
import { binom, clamp, pickW, pois, ri } from '@/lib/rng';
import type { SportConfig } from './types';
import { drill, safeDiv, sumKey } from './common';

const grp = (p: string) => (p === 'G' ? 'G' : p === 'D' ? 'D' : 'F');

export const hockey: SportConfig = {
  id: 'hockey',
  name: 'Hockey',
  number: '05',
  accent: '192 92% 68%',
  hex: '#5fd7f7',
  tagline: 'Line combos, shot maps, ice time.',
  blurb: 'Four forward lines, three pairs and special teams built from the numbers, plus a rink shot map and TOI tracker.',
  image: 'hockey.jpg',
  surface: 'rink',
  scoreUnit: 'Goals',
  allowDraws: false,
  defaultMode: 'tot',
  team: {
    id: 'hk-frostbacks',
    sport: 'hockey',
    name: 'Lakeshore Frostbacks',
    city: 'Lakeshore',
    mascot: 'Frostbacks',
    abbr: 'LKF',
    league: 'Northern Junior Hockey League',
    colors: ['#5fd7f7', '#0b1224'],
  },
  opponents: ['Timber Bay Wolves', 'Ironwood Moose', 'Port Calder Gulls', 'Saint Brule Voyageurs', 'Harrow Peaks', 'Cold Spring Lynx', 'Riverton Rapids', 'Bracken Hill Bears', 'Northbay Narwhals', 'Glenmoor Stags', 'Whitefish Pike', 'Kettle Falls Eagles', 'Copperton Miners', 'Fenwick Foxes', 'Maple Run Raiders', 'Dunmore Grizzlies', 'Aldergrove Owls'],
  seasonStart: '2025-10-10',
  cadenceDays: 5,
  years: ['1st yr', '2nd yr', '3rd yr', '4th yr'],
  ageRange: [17, 20],
  size: (p) => (p === 'D' ? [73, 76, 190, 210] : p === 'G' ? [73, 76, 180, 200] : [69, 74, 170, 195]),
  positions: ['C', 'LW', 'RW', 'D', 'G'],
  positionNames: { C: 'Center', LW: 'Left Wing', RW: 'Right Wing', D: 'Defense', G: 'Goaltender' },
  pool: grp,
  rosterPlan: [
    { pos: 'C', count: 4 },
    { pos: 'LW', count: 4 },
    { pos: 'RW', count: 4 },
    { pos: 'D', count: 6 },
    { pos: 'G', count: 2 },
  ],
  rawKeys: [
    { key: 'toi', label: 'TOI' },
    { key: 'g', label: 'G' },
    { key: 'a', label: 'A' },
    { key: 'sh', label: 'SOG' },
    { key: 'pim', label: 'PIM' },
    { key: 'fow', label: 'FOW' },
    { key: 'fol', label: 'FOL' },
    { key: 'hit', label: 'HIT' },
    { key: 'blk', label: 'BLK' },
    { key: 'pmn', label: '+/-' },
    { key: 'sa', label: 'SA' },
    { key: 'ga', label: 'GA' },
    { key: 'gtoi', label: 'G-TOI' },
  ],
  columns: [
    { key: 'g', label: 'G', fmt: 'int', higher: true, count: true, desc: 'Goals' },
    { key: 'a', label: 'A', fmt: 'int', higher: true, count: true, desc: 'Assists' },
    { key: 'pts', label: 'PTS', fmt: 'int', higher: true, count: true, desc: 'Points' },
    { key: 'pm', label: '+/-', fmt: 'signed', higher: true, count: true, desc: 'Plus-minus' },
    { key: 'sh', label: 'SOG', fmt: 'int', higher: true, count: true, desc: 'Shots on goal' },
    { key: 'shp', label: 'SH%', fmt: 'pct', higher: true, count: false, desc: 'Shooting percentage' },
    { key: 'pim', label: 'PIM', fmt: 'int', higher: false, count: true, desc: 'Penalty minutes' },
    { key: 'toi', label: 'TOI', fmt: 'd1', higher: true, count: false, desc: 'Average time on ice (min)' },
    { key: 'fo', label: 'FO%', fmt: 'pct', higher: true, count: false, desc: 'Faceoff win percentage' },
    { key: 'hit', label: 'HIT', fmt: 'int', higher: true, count: true, desc: 'Hits' },
    { key: 'blk', label: 'BLK', fmt: 'int', higher: true, count: true, desc: 'Blocked shots' },
    { key: 'svp', label: 'SV%', fmt: 'avg', higher: true, count: false, desc: 'Save percentage' },
    { key: 'gaa', label: 'GAA', fmt: 'd2', higher: false, count: false, desc: 'Goals against average' },
  ],
  derive: (t, gp) => ({
    g: t.g || 0,
    a: t.a || 0,
    pts: (t.g || 0) + (t.a || 0),
    pm: t.pmn || 0,
    sh: t.sh || 0,
    shp: safeDiv(t.g, t.sh),
    pim: t.pim || 0,
    toi: safeDiv(t.toi || t.gtoi, gp),
    fo: safeDiv(t.fow, (t.fow || 0) + (t.fol || 0)),
    hit: t.hit || 0,
    blk: t.blk || 0,
    svp: safeDiv((t.sa || 0) - (t.ga || 0), t.sa),
    gaa: t.gtoi ? (t.ga * 60) / t.gtoi : NaN,
  }),
  rosterCols: ['g', 'a', 'pts', 'pm', 'svp'],
  weights: (p) =>
    ({
      C: { pts: 3, g: 2, fo: 2, pm: 1, shp: 1 },
      LW: { g: 3, pts: 2.5, sh: 1.5, shp: 1, pm: 1, hit: 0.5 },
      RW: { g: 3, pts: 2.5, sh: 1.5, shp: 1, pm: 1, hit: 0.5 },
      D: { pm: 2, blk: 2, a: 1.5, toi: 1.5, hit: 1, pts: 1 },
      G: { svp: 4, gaa: 3 },
    } as Record<string, Record<string, number>>)[p] ?? { pts: 1 },
  primary: 'pts',
  kpis: [
    { label: 'Goals for / game', value: (a) => a.pf / a.gp, fmt: 'd2', higher: true },
    { label: 'Goals against / game', value: (a) => a.pa / a.gp, fmt: 'd2', higher: false },
    { label: 'Shots / game', value: (a) => a.totals.sh / a.gp, fmt: 'd1', higher: true },
    { label: 'Shooting %', value: (a) => safeDiv(a.totals.g, a.totals.sh), fmt: 'pct', higher: true },
    { label: 'Save %', value: (a) => safeDiv(a.totals.sa - a.totals.ga, a.totals.sa), fmt: 'avg', higher: true },
    { label: 'Faceoff %', value: (a) => safeDiv(a.totals.fow, a.totals.fow + a.totals.fol), fmt: 'pct', higher: true },
  ],
  benchmarks: [
    { key: 'gf', label: 'Goals / game', value: (a) => a.pf / a.gp, league: 3.1, higher: true, fmt: 'd2', tags: ['finishing'] },
    { key: 'ga', label: 'Goals against / game', value: (a) => a.pa / a.gp, league: 2.9, higher: false, fmt: 'd2', tags: ['defensive-zone', 'breakout'] },
    { key: 'sog', label: 'Shots / game', value: (a) => a.totals.sh / a.gp, league: 30.5, higher: true, fmt: 'd1', tags: ['shooting', 'rush'] },
    { key: 'shp', label: 'Shooting %', value: (a) => safeDiv(a.totals.g, a.totals.sh), league: 0.1, higher: true, fmt: 'pct', tags: ['finishing', 'shooting'] },
    { key: 'fo', label: 'Faceoff %', value: (a) => safeDiv(a.totals.fow, a.totals.fow + a.totals.fol), league: 0.5, higher: true, fmt: 'pct', tags: ['faceoffs'] },
    { key: 'sv', label: 'Save %', value: (a) => safeDiv(a.totals.sa - a.totals.ga, a.totals.sa), league: 0.906, higher: true, fmt: 'avg', tags: ['goaltending'] },
    { key: 'blk', label: 'Blocks / game', value: (a) => a.totals.blk / a.gp, league: 13.5, higher: true, fmt: 'd1', tags: ['defensive-zone'] },
    { key: 'hit', label: 'Hits / game', value: (a) => a.totals.hit / a.gp, league: 21, higher: true, fmt: 'd1', tags: ['forecheck'] },
    { key: 'pim', label: 'PIM / game', value: (a) => a.totals.pim / a.gp, league: 7.5, higher: false, fmt: 'd1', tags: ['discipline'] },
  ],
  slots: [
    { id: 'g', label: 'G', positions: ['G'], x: 8, y: 50 },
    { id: 'ld', label: 'LD', positions: ['D'], x: 30, y: 28 },
    { id: 'rd', label: 'RD', positions: ['D'], x: 30, y: 72 },
    { id: 'c', label: 'C', positions: ['C'], x: 55, y: 50 },
    { id: 'lw', label: 'LW', positions: ['LW', 'C'], x: 62, y: 20 },
    { id: 'rw', label: 'RW', positions: ['RW', 'C'], x: 62, y: 80 },
  ],
  needs: [
    { key: 'fo', label: 'a top-2 faceoff man at center or on the wing', topN: 2, min: 1 },
    { key: 'g', label: 'at least one top-4 goal scorer', topN: 4, min: 1 },
  ],
  rules: [
    'Starting unit: G, two D, C, LW, RW. Wings may be filled by a center.',
    'Faceoff rule: at least one top-2 faceoff player is on the ice for the opening draw.',
    'Scoring rule: at least one top-4 goal scorer starts.',
    'Goalies are ranked only on SV% and GAA.',
  ],
  drills: [
    drill('hk-w', 'Edge work and dynamic warm-up', ['warmup'], 10, 'Low', ['Pucks', 'Cones'], 'Crossovers, mohawks and tight turns around cones, building to full-speed laps with puck.', 'warmup'),
    drill('hk-1', '2-on-1 rush', ['rush', 'finishing', 'shooting'], 12, 'High', ['Pucks', 'Nets'], 'Two attackers vs one D from the neutral zone. Puck carrier drives the middle lane; finish within 4 seconds of the blue line.'),
    drill('hk-2', 'Breakout reps', ['breakout', 'defensive-zone'], 12, 'Medium', ['Pucks'], 'Coach rims puck; D retrieves, shoulder-checks, hits the strong-side wall winger. Rotate through reverse and wheel options.'),
    drill('hk-3', '2-1-2 forecheck', ['forecheck'], 12, 'High', ['Pucks', 'Pinnies'], 'F1 pressures the puck carrier, F2 takes away the wall, F3 high. Rotate units every 40 seconds.'),
    drill('hk-4', 'Power play flow', ['shooting', 'finishing'], 15, 'Medium', ['Pucks', 'Nets'], '5-on-4 umbrella then 1-3-1. Must touch the bumper before a one-timer; reset after a clear.'),
    drill('hk-5', 'Faceoff plays', ['faceoffs'], 10, 'Medium', ['Pucks'], 'Centers win draws back to a set D slot, wingers tie up. Run 3 set plays from offensive-zone dots.'),
    drill('hk-6', 'Goalie tracking', ['goaltending'], 12, 'Medium', ['Pucks', 'Nets'], 'Lateral pass-and-shoot series. Goalie tracks through screens, controls rebounds to corners.'),
    drill('hk-7', 'Net-front battles', ['finishing', 'defensive-zone'], 10, 'High', ['Pucks', 'Nets'], 'Point shots with one forward screening and one D clearing. Score on tips and rebounds only.'),
    drill('hk-8', 'One-timer series', ['shooting'], 10, 'Medium', ['Pucks', 'Nets'], 'Cross-ice feeds to the off-wing circle. Count shots on target out of 15.'),
    drill('hk-9', 'Shot-block lanes', ['defensive-zone'], 10, 'Medium', ['Pucks', 'Shin guards'], 'Defenders take away lanes on point shots with proper stick and body position. Low-speed, form-first.'),
    drill('hk-10', 'Stick-on-puck discipline', ['discipline', 'defensive-zone'], 10, 'Medium', ['Pucks'], '1-on-1 defending where any hook or slash ends the rep; win the puck with the stick blade and body angle.'),
    drill('hk-11', 'Neutral zone regroup', ['rush', 'breakout'], 12, 'Medium', ['Pucks'], 'D-to-D pass, forwards swing and attack with speed through the middle. Timed to enter the zone in 6 seconds.'),
    drill('hk-s', 'Small-area 3-on-3 scrimmage', ['scrimmage'], 18, 'High', ['Pucks', 'Nets', 'Pinnies'], 'Cross-ice 3-on-3 with 45-second shifts. Award bonus goals for the session focus behaviour.', 'scrimmage'),
    drill('hk-c', 'Cool-down skate and stretch', ['cooldown'], 8, 'Low', ['Mats'], 'Easy laps then hip flexor, groin and lower-back stretch.', 'cooldown'),
  ],
  genGame: (players, { rng, gi }) => {
    const lines: Record<string, Raw> = {};
    const by = (g: string) => players.filter((p) => grp(p.position) === g).sort((a, b) => b.skill - a.skill);
    const F = by('F');
    const D = by('D');
    const G = by('G');
    const fToi = [19, 16, 13, 10];
    const dToi = [23, 20, 16];
    const skaters: { p: Player; toi: number }[] = [];
    F.forEach((p, i) => skaters.push({ p, toi: fToi[Math.min(3, Math.floor(i / 3))] }));
    D.forEach((p, i) => skaters.push({ p, toi: dToi[Math.min(2, Math.floor(i / 2))] }));
    for (const { p, toi: base } of skaters) {
      const f = grp(p.position) === 'F';
      const toi = Math.round((base + (rng() - 0.5) * 3) * 10) / 10;
      const sh = pois(rng, (toi / 17) * (f ? 2.3 : 1.2) * (0.6 + p.skill * 0.8));
      const isC = p.position === 'C';
      const fo = isC ? Math.round(ri(rng, 9, 19) * (toi / 18)) : 0;
      const fow = binom(rng, fo, 0.43 + p.skill * 0.12);
      lines[p.id] = {
        toi,
        g: binom(rng, sh, 0.05 + p.skill * 0.08),
        a: 0,
        sh,
        pim: rng() < 0.22 ? (rng() < 0.15 ? 4 : 2) : 0,
        fow,
        fol: fo - fow,
        hit: pois(rng, f ? 1.6 : 2.0),
        blk: pois(rng, f ? 0.5 : 1.7),
        pmn: 0,
        sa: 0,
        ga: 0,
        gtoi: 0,
      };
    }
    const ids = Object.keys(lines);
    const pw = new Map(players.map((p) => [p.id, p]));
    for (const id of ids) {
      for (let k = 0; k < lines[id].g; k++) {
        const n = rng() < 0.1 ? 0 : rng() < 0.4 ? 1 : 2;
        const pool = ids.filter((x) => x !== id);
        const used = new Set<string>();
        for (let j = 0; j < n && pool.length; j++) {
          const a = pickW(rng, pool.filter((x) => !used.has(x)), (x) => (pw.get(x)?.skill ?? 0.3) + 0.2);
          used.add(a);
          lines[a].a += 1;
        }
      }
    }
    const goalie = (gi % 4 === 3 && G[1] ? G[1] : G[0]) ?? G[0];
    let gf = sumKey(Object.values(lines), 'g');
    let sa = ri(rng, 24, 36);
    let ga = goalie ? sa - binom(rng, sa, 0.884 + goalie.skill * 0.04) : ri(rng, 1, 5);
    if (ga === gf) {
      if (rng() < 0.55) {
        const shooter = pickW(rng, F, (p) => p.skill);
        lines[shooter.id].g += 1;
        lines[shooter.id].sh += 1;
        gf += 1;
      } else {
        ga += 1;
        sa += 1;
      }
    }
    if (goalie) lines[goalie.id] = { toi: 0, g: 0, a: 0, sh: 0, pim: 0, fow: 0, fol: 0, hit: 0, blk: 0, pmn: 0, sa, ga, gtoi: 60 };
    const diff = gf - ga;
    for (const { p } of skaters) lines[p.id].pmn = clamp(Math.round(diff * 0.35 + (rng() - 0.5) * 3 + (p.skill - 0.5) * 2), -4, 4);
    return { lines, scoreAgainst: ga, extra: { oppSh: sa } };
  },
  teamScore: (ls) => sumKey(ls, 'g'),
  tools: [
    { id: 'lines', label: 'Line combinations', desc: '4 forward lines, 3 pairs, goalie, PP and PK units' },
    { id: 'shotmap', label: 'Shot map', desc: 'Every shot on a rink diagram' },
    { id: 'icetime', label: 'Ice time tracker', desc: 'TOI per player per game' },
  ],
};

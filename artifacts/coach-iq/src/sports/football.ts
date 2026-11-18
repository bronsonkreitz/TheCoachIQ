import type { Player, Raw } from '@/lib/types';
import { binom, clamp, pickW, pois, ri } from '@/lib/rng';
import type { SlotDef, SportConfig } from './types';
import { drill, safeDiv, sumKey } from './common';

const OFF = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEF = ['DL', 'LB', 'CB', 'S'];
const unit = (p: string) => (OFF.includes(p) ? 'Offense' : DEF.includes(p) ? 'Defense' : 'Special Teams');
const pool = (p: string) => (p === 'CB' || p === 'S' ? 'DB' : p === 'K' || p === 'P' ? 'ST' : p);

const sl = (id: string, label: string, positions: string[], x: number, y: number, u: string): SlotDef => ({ id, label, positions, x, y, unit: u });

const ZERO_KEYS = ['patt', 'pcmp', 'pyd', 'ptd', 'pint', 'car', 'ryd', 'rtd', 'rec', 'recyd', 'rectd', 'tkl', 'sck', 'ff', 'dint', 'fga', 'fgm', 'xpa', 'xpm', 'pnt', 'pntyd', 'pnk'];
const blank = (): Raw => Object.fromEntries(ZERO_KEYS.map((k) => [k, 0]));

export const football: SportConfig = {
  id: 'football',
  name: 'Football',
  number: '03',
  accent: '24 96% 58%',
  hex: '#f9792b',
  tagline: 'Depth charts, play calls, film notes.',
  blurb: 'Full offense and defense from a three-deep depth chart, a 16-play call board tagged by success rate, and timestamped film notes.',
  image: 'football.jpg',
  surface: 'gridiron',
  scoreUnit: 'Points',
  allowDraws: false,
  defaultMode: 'tot',
  team: {
    id: 'fb-stormcrows',
    sport: 'football',
    name: 'Ridgeview Stormcrows',
    city: 'Ridgeview',
    mascot: 'Stormcrows',
    abbr: 'RVS',
    league: 'Tri-County Varsity Conference',
    colors: ['#f9792b', '#0b1224'],
  },
  opponents: ['Millbrook Titans', 'Cass County Bulldogs', 'Hollis Creek Mustangs', 'Pine Bluff Rangers', 'Lancaster Vale Spartans', 'Orchard Park Wildcats', 'Steel River Hornets', 'Bellmont Cardinals', 'Gray Hollow Panthers', 'Fort Ames Generals', 'Shelby Plains Chargers', 'Wren Valley Vikings', 'Eagle Pass Trojans', 'Marlow Heights Saints', 'Dover Glen Pioneers', 'Clayborne Cougars', 'Hatch Ridge Bison'],
  seasonStart: '2025-08-29',
  cadenceDays: 7,
  years: ['9th', '10th', '11th', '12th'],
  ageRange: [14, 18],
  size: (p) =>
    ({ QB: [72, 76, 185, 210], RB: [68, 72, 180, 205], WR: [69, 75, 165, 195], TE: [74, 77, 225, 245], OL: [74, 78, 260, 300], DL: [73, 77, 245, 285], LB: [71, 75, 210, 235], CB: [68, 72, 165, 185], S: [70, 73, 180, 200], K: [69, 73, 165, 185], P: [70, 74, 175, 195] } as Record<string, [number, number, number, number]>)[p] ?? [70, 75, 180, 220],
  positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
  positionNames: { QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', OL: 'Offensive Line', DL: 'Defensive Line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker', P: 'Punter' },
  pool,
  unit,
  rosterPlan: [
    { pos: 'QB', count: 2 },
    { pos: 'RB', count: 3 },
    { pos: 'WR', count: 6 },
    { pos: 'TE', count: 2 },
    { pos: 'OL', count: 7 },
    { pos: 'DL', count: 6 },
    { pos: 'LB', count: 5 },
    { pos: 'CB', count: 4 },
    { pos: 'S', count: 3 },
    { pos: 'K', count: 1 },
    { pos: 'P', count: 1 },
  ],
  rawKeys: [
    { key: 'pcmp', label: 'CMP' },
    { key: 'patt', label: 'ATT' },
    { key: 'pyd', label: 'PYD' },
    { key: 'ptd', label: 'PTD' },
    { key: 'pint', label: 'INT' },
    { key: 'car', label: 'CAR' },
    { key: 'ryd', label: 'RYD' },
    { key: 'rtd', label: 'RTD' },
    { key: 'rec', label: 'REC' },
    { key: 'recyd', label: 'RECYD' },
    { key: 'rectd', label: 'RECTD' },
    { key: 'tkl', label: 'TKL' },
    { key: 'sck', label: 'SCK' },
    { key: 'ff', label: 'FF' },
    { key: 'dint', label: 'DINT' },
    { key: 'fgm', label: 'FGM' },
    { key: 'fga', label: 'FGA' },
    { key: 'xpm', label: 'XPM' },
    { key: 'xpa', label: 'XPA' },
    { key: 'pnt', label: 'PUNT' },
    { key: 'pntyd', label: 'PNTYD' },
    { key: 'pnk', label: 'PANCK' },
  ],
  columns: [
    { key: 'pyd', label: 'Pass Yds', fmt: 'int', higher: true, count: true, desc: 'Passing yards' },
    { key: 'ptd', label: 'Pass TD', fmt: 'int', higher: true, count: true, desc: 'Passing touchdowns' },
    { key: 'pint', label: 'INT', fmt: 'int', higher: false, count: true, desc: 'Interceptions thrown' },
    { key: 'cmp', label: 'Cmp%', fmt: 'pct', higher: true, count: false, desc: 'Completion percentage' },
    { key: 'ryd', label: 'Rush Yds', fmt: 'int', higher: true, count: true, desc: 'Rushing yards' },
    { key: 'ypc', label: 'YPC', fmt: 'd1', higher: true, count: false, desc: 'Yards per carry' },
    { key: 'rtd', label: 'Rush TD', fmt: 'int', higher: true, count: true, desc: 'Rushing touchdowns' },
    { key: 'rec', label: 'Rec', fmt: 'int', higher: true, count: true, desc: 'Receptions' },
    { key: 'recyd', label: 'Rec Yds', fmt: 'int', higher: true, count: true, desc: 'Receiving yards' },
    { key: 'rectd', label: 'Rec TD', fmt: 'int', higher: true, count: true, desc: 'Receiving touchdowns' },
    { key: 'tkl', label: 'Tkl', fmt: 'int', higher: true, count: true, desc: 'Tackles' },
    { key: 'sck', label: 'Sacks', fmt: 'int', higher: true, count: true, desc: 'Sacks' },
    { key: 'ff', label: 'FF', fmt: 'int', higher: true, count: true, desc: 'Forced fumbles' },
    { key: 'dint', label: 'Def INT', fmt: 'int', higher: true, count: true, desc: 'Interceptions (defense)' },
    { key: 'fgp', label: 'FG%', fmt: 'pct', higher: true, count: false, desc: 'Field goal percentage' },
    { key: 'pavg', label: 'Punt Avg', fmt: 'd1', higher: true, count: false, desc: 'Punt average' },
    { key: 'pnk', label: 'Pancakes', fmt: 'int', higher: true, count: true, desc: 'Pancake blocks (OL)' },
  ],
  derive: (t) => ({
    pyd: t.pyd || 0,
    ptd: t.ptd || 0,
    pint: t.patt ? t.pint || 0 : NaN,
    cmp: safeDiv(t.pcmp, t.patt),
    ryd: t.ryd || 0,
    ypc: safeDiv(t.ryd, t.car),
    rtd: t.rtd || 0,
    rec: t.rec || 0,
    recyd: t.recyd || 0,
    rectd: t.rectd || 0,
    tkl: t.tkl || 0,
    sck: t.sck || 0,
    ff: t.ff || 0,
    dint: t.dint || 0,
    fgp: safeDiv(t.fgm, t.fga),
    pavg: safeDiv(t.pntyd, t.pnt),
    pnk: t.pnk || 0,
  }),
  rosterCols: ['pyd', 'ryd', 'recyd', 'tkl', 'sck'],
  weights: (p) =>
    ({
      QB: { pyd: 2, ptd: 2.5, pint: 2, cmp: 2, ryd: 0.5 },
      RB: { ryd: 3, ypc: 2.5, rtd: 2, rec: 0.5 },
      WR: { recyd: 3, rec: 2, rectd: 2 },
      TE: { rec: 2, recyd: 2, rectd: 1.5, pnk: 1 },
      OL: { pnk: 3 },
      DL: { sck: 3, tkl: 1.5, ff: 1.5 },
      LB: { tkl: 3, sck: 1.5, ff: 1, dint: 0.5 },
      CB: { dint: 3, tkl: 1.5, ff: 0.5 },
      S: { tkl: 2, dint: 2.5, ff: 1 },
      K: { fgp: 4 },
      P: { pavg: 4 },
    } as Record<string, Record<string, number>>)[p] ?? { tkl: 1 },
  primary: 'pyd',
  kpis: [
    { label: 'Points / game', value: (a) => a.pf / a.gp, fmt: 'd1', higher: true },
    { label: 'Pass yards / game', value: (a) => a.totals.pyd / a.gp, fmt: 'd1', higher: true },
    { label: 'Yards per carry', value: (a) => safeDiv(a.totals.ryd, a.totals.car), fmt: 'd1', higher: true },
    { label: 'Completion %', value: (a) => safeDiv(a.totals.pcmp, a.totals.patt), fmt: 'pct', higher: true },
    { label: 'Sacks / game', value: (a) => a.totals.sck / a.gp, fmt: 'd1', higher: true },
    { label: 'Takeaways / game', value: (a) => (a.totals.dint + a.totals.ff * 0.5) / a.gp, fmt: 'd1', higher: true },
  ],
  benchmarks: [
    { key: 'ppg', label: 'Points / game', value: (a) => a.pf / a.gp, league: 26, higher: true, fmt: 'd1', tags: ['red-zone'] },
    { key: 'pyd', label: 'Pass yards / game', value: (a) => a.totals.pyd / a.gp, league: 215, higher: true, fmt: 'd1', tags: ['passing', 'pass-pro'] },
    { key: 'cmp', label: 'Completion %', value: (a) => safeDiv(a.totals.pcmp, a.totals.patt), league: 0.62, higher: true, fmt: 'pct', tags: ['passing'] },
    { key: 'int', label: 'INTs thrown / game', value: (a) => a.totals.pint / a.gp, league: 0.75, higher: false, fmt: 'd2', tags: ['ball-security', 'passing'] },
    { key: 'ypc', label: 'Yards per carry', value: (a) => safeDiv(a.totals.ryd, a.totals.car), league: 4.4, higher: true, fmt: 'd1', tags: ['run-game'] },
    { key: 'sck', label: 'Sacks / game', value: (a) => a.totals.sck / a.gp, league: 2.4, higher: true, fmt: 'd1', tags: ['pass-rush'] },
    { key: 'take', label: 'Takeaways / game', value: (a) => (a.totals.dint + a.totals.ff * 0.5) / a.gp, league: 1.5, higher: true, fmt: 'd1', tags: ['takeaways', 'tackling'] },
    { key: 'oyd', label: 'Yards allowed / game', value: (a) => (a.extra.oppYds || 0) / a.gp, league: 320, higher: false, fmt: 'd1', tags: ['tackling', 'coverage'] },
    { key: 'fg', label: 'Field goal %', value: (a) => safeDiv(a.totals.fgm, a.totals.fga), league: 0.78, higher: true, fmt: 'pct', tags: ['kicking'] },
    { key: 'punt', label: 'Punt average', value: (a) => safeDiv(a.totals.pntyd, a.totals.pnt), league: 40.5, higher: true, fmt: 'd1', tags: ['punting', 'coverage'] },
  ],
  slots: [
    sl('qb', 'QB', ['QB'], 30, 50, 'Offense'),
    sl('rb', 'RB', ['RB'], 20, 50, 'Offense'),
    sl('wr1', 'WR', ['WR'], 44, 6, 'Offense'),
    sl('wr2', 'WR', ['WR'], 44, 94, 'Offense'),
    sl('wr3', 'WR', ['WR', 'TE', 'RB'], 40, 18, 'Offense'),
    sl('te', 'TE', ['TE'], 44, 74, 'Offense'),
    sl('lt', 'LT', ['OL'], 44, 34, 'Offense'),
    sl('lg', 'LG', ['OL'], 44, 42, 'Offense'),
    sl('oc', 'C', ['OL'], 44, 50, 'Offense'),
    sl('rg', 'RG', ['OL'], 44, 58, 'Offense'),
    sl('rt', 'RT', ['OL'], 44, 66, 'Offense'),
    sl('de1', 'DE', ['DL'], 56, 30, 'Defense'),
    sl('dt1', 'DT', ['DL'], 56, 44, 'Defense'),
    sl('dt2', 'DT', ['DL'], 56, 56, 'Defense'),
    sl('de2', 'DE', ['DL'], 56, 70, 'Defense'),
    sl('lb1', 'OLB', ['LB'], 66, 26, 'Defense'),
    sl('lb2', 'MLB', ['LB'], 66, 50, 'Defense'),
    sl('lb3', 'OLB', ['LB'], 66, 74, 'Defense'),
    sl('cb1', 'CB', ['CB'], 60, 6, 'Defense'),
    sl('cb2', 'CB', ['CB'], 60, 94, 'Defense'),
    sl('s1', 'FS', ['S', 'CB'], 82, 36, 'Defense'),
    sl('s2', 'SS', ['S', 'CB'], 78, 64, 'Defense'),
  ],
  needs: [
    { key: 'sck', label: 'a top-3 pass rusher on defense', topN: 3, min: 1 },
    { key: 'dint', label: 'a top-3 ball hawk in the secondary', topN: 3, min: 1 },
  ],
  rules: [
    'Offense: QB, RB, 3 receivers (one may be a TE or RB), TE and five offensive linemen.',
    'Defense: 4 DL, 3 LB, 2 CB and 2 safeties (a CB may play safety).',
    'Pass-rush rule: a top-3 sack leader must start. Coverage rule: a top-3 interception leader must start.',
    'Starters come from the top of the depth chart scores; injured players drop out unless the toggle is off.',
  ],
  drills: [
    drill('fb-w', 'Dynamic warm-up and ladders', ['warmup'], 12, 'Low', ['Ladders', 'Cones'], 'High knees, A-skips, lateral ladder patterns, then position-specific get-offs.', 'warmup'),
    drill('fb-1', 'Pass skeleton 7-on-7', ['passing', 'coverage'], 15, 'Medium', ['Balls', 'Pinnies', 'Cones'], 'QB, skill players and back seven. Script 12 concepts vs mixed coverages; chart completions and breakups.'),
    drill('fb-2', 'Tackling circuit', ['tackling', 'takeaways'], 12, 'High', ['Tackling dummies', 'Rolling rings', 'Pads'], 'Four stations: hawk tackle, angle tackle, roll tackle, near-hip finish. Shoulder leverage, eyes up.'),
    drill('fb-3', 'OL pass protection', ['pass-pro', 'passing'], 12, 'High', ['Shields', 'Cones'], 'Kick-slide set, punch timing and stunt pickup vs scout DL. Track wins at 3 seconds.'),
    drill('fb-4', 'Red zone situational', ['red-zone', 'passing', 'run-game'], 15, 'High', ['Balls', 'Pinnies'], 'Ball on the 15, 4 plays to score. Mix fades, bootlegs and inside zone. Defense practices compressed coverage.'),
    drill('fb-5', 'Two-minute drill', ['passing', 'red-zone', 'ball-security'], 12, 'High', ['Balls', 'Scoreboard', 'Clock'], 'Down 4 with 1:50 and one timeout. Sideline routes, spike and clock awareness.'),
    drill('fb-6', 'Special teams coverage', ['coverage', 'punting'], 12, 'Medium', ['Balls', 'Cones'], 'Punt and kickoff lanes, gunners beating jams, contain on the returner.'),
    drill('fb-7', 'Inside zone run fits', ['run-game', 'tackling'], 12, 'Medium', ['Balls', 'Shields'], 'OL combo blocks to the second level, RB presses and cuts on the first down lineman. Defense fits gaps.'),
    drill('fb-8', 'Strip and scoop', ['takeaways'], 10, 'Medium', ['Balls', 'Dummies'], 'Second defender attacks the ball with a punch or rake; recover and scoop in stride.'),
    drill('fb-9', 'Pass rush get-off', ['pass-rush'], 10, 'High', ['Get-off sticks', 'Shields'], 'React to ball movement, three-step get-off, then chop, swim and rip moves vs a bag.'),
    drill('fb-10', 'Ball security gauntlet', ['ball-security'], 10, 'Medium', ['Balls', 'Gauntlet pads'], 'Carry through the gauntlet with 5 points of pressure; QBs work two-hand pocket movement.'),
    drill('fb-11', 'Field goal operation', ['kicking'], 10, 'Low', ['Balls', 'Tees', 'Timer'], 'Snap-hold-kick under 1.3 seconds from the 20, 25, 30 and 35. Add crowd noise.'),
    drill('fb-12', 'Zone coverage drops', ['coverage', 'takeaways'], 10, 'Medium', ['Balls', 'Cones'], 'Drop to landmarks, read the QB, break on the throw and attack the ball at its highest point.'),
    drill('fb-s', 'Team period scrimmage', ['scrimmage'], 20, 'High', ['Balls', 'Pinnies', 'Chains'], 'Scripted team period built around the session focus. Coaches chart every rep.', 'scrimmage'),
    drill('fb-c', 'Cool-down and recovery', ['cooldown'], 8, 'Low', ['Mats', 'Bands'], 'Walk, band work for hips and shoulders, hydration check.', 'cooldown'),
  ],
  genGame: (players, { rng }) => {
    const lines: Record<string, Raw> = {};
    const by = (pos: string) => players.filter((p) => p.position === pos).sort((a, b) => b.skill - a.skill);
    for (const p of players) lines[p.id] = blank();
    const QB = by('QB');
    const RB = by('RB');
    const WR = by('WR');
    const TE = by('TE');
    const qb = QB[0];
    const recvs: { p: Player; w: number; ypc: number }[] = [
      ...WR.map((p, i) => ({ p, w: [5, 4, 3, 1, 0.5, 0.5][i] ?? 0.3, ypc: 13 })),
      ...TE.map((p, i) => ({ p, w: [2.5, 1][i] ?? 0.3, ypc: 10 })),
      ...RB.map((p, i) => ({ p, w: [1.5, 0.7][i] ?? 0.2, ypc: 7 })),
    ];
    if (qb && recvs.length) {
      const att = ri(rng, 24, 38);
      const cmp = binom(rng, att, 0.52 + qb.skill * 0.15);
      lines[qb.id].patt = att;
      lines[qb.id].pcmp = cmp;
      for (let i = 0; i < cmp; i++) {
        const r = pickW(rng, recvs, (x) => x.w * (x.p.skill + 0.3));
        lines[r.p.id].rec += 1;
        lines[r.p.id].recyd += Math.round(r.ypc * (0.5 + rng() * 1.1));
      }
      const ptd = Math.min(cmp, pois(rng, 1.2 + qb.skill * 0.9));
      for (let i = 0; i < ptd; i++) {
        const r = pickW(rng, recvs.filter((x) => lines[x.p.id].rec > 0), (x) => lines[x.p.id].rec);
        lines[r.p.id].rectd += 1;
      }
      lines[qb.id].ptd = ptd;
      lines[qb.id].pyd = recvs.reduce((a, x) => a + lines[x.p.id].recyd, 0);
      lines[qb.id].pint = pois(rng, clamp(1.05 - qb.skill * 0.55, 0.2, 1.2));
      const qcar = ri(rng, 2, 6);
      lines[qb.id].car = qcar;
      lines[qb.id].ryd = Math.round(qcar * (2 + rng() * 4));
    }
    RB.slice(0, 2).forEach((p, i) => {
      const car = i === 0 ? ri(rng, 13, 22) : ri(rng, 4, 9);
      lines[p.id].car = car;
      lines[p.id].ryd = Math.round(car * (3.0 + p.skill * 1.8) * (0.7 + rng() * 0.6));
    });
    const rtd = pois(rng, 1.1);
    for (let i = 0; i < rtd; i++) {
      const pool2 = [...RB.slice(0, 2), ...(qb ? [qb] : [])];
      if (!pool2.length) break;
      const r = pickW(rng, pool2, (p) => lines[p.id].car);
      lines[r.id].rtd += 1;
    }
    by('OL').slice(0, 5).forEach((p) => (lines[p.id].pnk = pois(rng, 0.6 + p.skill * 1.4)));
    const defs = players.filter((p) => DEF.includes(p.position));
    const starterIds = new Set([...by('DL').slice(0, 4), ...by('LB').slice(0, 3), ...by('CB').slice(0, 2), ...by('S').slice(0, 2)].map((p) => p.id));
    const tw: Record<string, number> = { LB: 4, S: 3, CB: 2, DL: 1.8 };
    const tackles = ri(rng, 50, 68);
    if (defs.length) {
      for (let i = 0; i < tackles; i++) {
        const d = pickW(rng, defs, (p) => tw[p.position] * (starterIds.has(p.id) ? 1 : 0.18) * (p.skill + 0.4));
        lines[d.id].tkl += 1;
      }
      const rushers = defs.filter((p) => p.position === 'DL' || p.position === 'LB');
      const sacks = pois(rng, 2.1);
      for (let i = 0; i < sacks && rushers.length; i++) {
        const d = pickW(rng, rushers, (p) => (p.position === 'DL' ? 3 : 1.4) * (starterIds.has(p.id) ? 1 : 0.2) * (p.skill + 0.2));
        lines[d.id].sck += 1;
      }
      for (let i = 0; i < pois(rng, 0.6); i++) {
        const d = pickW(rng, defs, (p) => (starterIds.has(p.id) ? 1 : 0.2) * (p.skill + 0.2));
        lines[d.id].ff += 1;
      }
      const dbs = defs.filter((p) => p.position === 'CB' || p.position === 'S');
      for (let i = 0; i < pois(rng, 0.85) && dbs.length; i++) {
        const d = pickW(rng, dbs, (p) => (starterIds.has(p.id) ? 1 : 0.2) * (p.skill + 0.2));
        lines[d.id].dint += 1;
      }
    }
    const tds = Object.values(lines).reduce((a, l) => a + l.rtd + l.rectd, 0);
    const k = by('K')[0];
    if (k) {
      const fga = ri(rng, 0, 3);
      lines[k.id].fga = fga;
      lines[k.id].fgm = binom(rng, fga, 0.66 + k.skill * 0.25);
      lines[k.id].xpa = tds;
      lines[k.id].xpm = binom(rng, tds, 0.93);
    }
    const pn = by('P')[0];
    if (pn) {
      const n = ri(rng, 2, 6);
      lines[pn.id].pnt = n;
      let yd = 0;
      for (let i = 0; i < n; i++) yd += Math.round(36 + pn.skill * 8 + (rng() - 0.5) * 14);
      lines[pn.id].pntyd = yd;
    }
    for (const id of Object.keys(lines)) if (Object.values(lines[id]).every((v) => v === 0) && rng() < 0.6) delete lines[id];
    const pf = football.teamScore(Object.values(lines));
    let opp = 7 * pois(rng, 2.3) + 3 * pois(rng, 1.0);
    if (opp === pf) opp += 3;
    return { lines, scoreAgainst: opp, extra: { oppYds: ri(rng, 240, 420) } };
  },
  teamScore: (ls) => 6 * (sumKey(ls, 'rtd') + sumKey(ls, 'rectd')) + sumKey(ls, 'xpm') + 3 * sumKey(ls, 'fgm'),
  tools: [
    { id: 'depth', label: 'Depth chart', desc: '1st, 2nd and 3rd string at every position' },
    { id: 'plays', label: 'Play call board', desc: '16 plays tagged with live success rates' },
    { id: 'film', label: 'Film notes', desc: 'Timestamped coaching notes per game' },
  ],
};

import type { Player, Raw } from '@/lib/types';
import { binom, clamp, pickW, pois, ri } from '@/lib/rng';
import type { SportConfig } from './types';
import { drill, safeDiv, sumKey } from './common';

const HIT_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const HK = ['pa', 'ab', 'h', 'd', 't', 'hr', 'rbi', 'r', 'bb', 'k', 'sb', 'ch', 'e', 'outs', 'er', 'ha', 'bba', 'kp', 'pc', 'w', 'l', 'gs'];
const blank = (): Raw => Object.fromEntries(HK.map((k) => [k, 0]));

export const baseball: SportConfig = {
  id: 'baseball',
  name: 'Baseball',
  number: '01',
  accent: '354 86% 62%',
  hex: '#f04b5c',
  tagline: 'Batting orders, pitch counts, bullpen.',
  blurb: 'Lineups that bat OBP at the top and slug in the four hole, a pitch-count tracker with rest rules, and a bullpen fatigue board.',
  image: 'baseball.jpg',
  surface: 'diamond',
  scoreUnit: 'Runs',
  allowDraws: false,
  defaultMode: 'tot',
  team: {
    id: 'bs-ironjacks',
    sport: 'baseball',
    name: 'Cedar Falls Ironjacks',
    city: 'Cedar Falls',
    mascot: 'Ironjacks',
    abbr: 'CFI',
    league: 'Prairie Valley Collegiate League',
    colors: ['#f04b5c', '#0b1224'],
  },
  opponents: ['Marion Bay Clippers', 'Ottumwa Ridge Hawks', 'Sterling Pines', 'Waverly Grays', 'Hollister Badgers', 'Clearwater Flyers', 'Fenton Express', 'Lockhart Rivermen', 'Bayliss Orioles', 'Emmet County Aces', 'Grafton Bluejays', 'Prescott Cannons', 'Wilder Lake Bucks', 'Norcross Herons', 'Juniper Valley Owls', 'Harlan Yard Dogs', 'Mapleton Mudcats'],
  seasonStart: '2026-03-06',
  cadenceDays: 3,
  years: ['Fr', 'So', 'Jr', 'Sr'],
  ageRange: [18, 22],
  size: (p) => (p === 'P' ? [72, 77, 185, 215] : p === 'C' ? [70, 74, 195, 215] : [69, 75, 175, 210]),
  positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
  positionNames: { P: 'Pitcher', C: 'Catcher', '1B': 'First Base', '2B': 'Second Base', '3B': 'Third Base', SS: 'Shortstop', LF: 'Left Field', CF: 'Center Field', RF: 'Right Field', DH: 'Designated Hitter' },
  pool: (p) => (p === 'P' ? 'P' : 'H'),
  rosterPlan: [
    { pos: 'C', count: 2 },
    { pos: '1B', count: 2 },
    { pos: '2B', count: 2 },
    { pos: '3B', count: 2 },
    { pos: 'SS', count: 2 },
    { pos: 'LF', count: 2 },
    { pos: 'CF', count: 2 },
    { pos: 'RF', count: 2 },
    { pos: 'DH', count: 2 },
    { pos: 'P', count: 9 },
  ],
  rawKeys: [
    { key: 'pa', label: 'PA' },
    { key: 'ab', label: 'AB' },
    { key: 'h', label: 'H' },
    { key: 'd', label: '2B' },
    { key: 't', label: '3B' },
    { key: 'hr', label: 'HR' },
    { key: 'r', label: 'R' },
    { key: 'rbi', label: 'RBI' },
    { key: 'bb', label: 'BB' },
    { key: 'k', label: 'K' },
    { key: 'sb', label: 'SB' },
    { key: 'ch', label: 'CH' },
    { key: 'e', label: 'E' },
    { key: 'outs', label: 'OUTS' },
    { key: 'ha', label: 'H-A' },
    { key: 'er', label: 'ER' },
    { key: 'bba', label: 'BB-A' },
    { key: 'kp', label: 'K-P' },
    { key: 'pc', label: 'PC' },
    { key: 'w', label: 'W' },
    { key: 'l', label: 'L' },
    { key: 'gs', label: 'GS' },
  ],
  columns: [
    { key: 'avg', label: 'AVG', fmt: 'avg', higher: true, count: false, desc: 'Batting average' },
    { key: 'obp', label: 'OBP', fmt: 'avg', higher: true, count: false, desc: 'On-base percentage' },
    { key: 'slg', label: 'SLG', fmt: 'avg', higher: true, count: false, desc: 'Slugging percentage' },
    { key: 'ops', label: 'OPS', fmt: 'avg', higher: true, count: false, desc: 'On-base plus slugging' },
    { key: 'hr', label: 'HR', fmt: 'int', higher: true, count: true, desc: 'Home runs' },
    { key: 'rbi', label: 'RBI', fmt: 'int', higher: true, count: true, desc: 'Runs batted in' },
    { key: 'r', label: 'R', fmt: 'int', higher: true, count: true, desc: 'Runs scored' },
    { key: 'sb', label: 'SB', fmt: 'int', higher: true, count: true, desc: 'Stolen bases' },
    { key: 'kpct', label: 'K%', fmt: 'pct', higher: false, count: false, desc: 'Strikeout rate' },
    { key: 'bbpct', label: 'BB%', fmt: 'pct', higher: true, count: false, desc: 'Walk rate' },
    { key: 'fld', label: 'FLD%', fmt: 'avg', higher: true, count: false, desc: 'Fielding percentage' },
    { key: 'e', label: 'E', fmt: 'int', higher: false, count: true, desc: 'Errors' },
    { key: 'era', label: 'ERA', fmt: 'd2', higher: false, count: false, desc: 'Earned run average' },
    { key: 'whip', label: 'WHIP', fmt: 'd2', higher: false, count: false, desc: 'Walks + hits per inning' },
    { key: 'k9', label: 'K/9', fmt: 'd1', higher: true, count: false, desc: 'Strikeouts per nine' },
    { key: 'bb9', label: 'BB/9', fmt: 'd1', higher: false, count: false, desc: 'Walks per nine' },
    { key: 'ip', label: 'IP', fmt: 'ip', higher: true, count: true, desc: 'Innings pitched' },
    { key: 'w', label: 'W', fmt: 'int', higher: true, count: true, desc: 'Wins' },
    { key: 'l', label: 'L', fmt: 'int', higher: false, count: true, desc: 'Losses' },
    { key: 'pcg', label: 'PC/G', fmt: 'd1', higher: true, count: false, desc: 'Pitches per appearance' },
  ],
  derive: (t, gp) => {
    const tb = (t.h || 0) + (t.d || 0) + 2 * (t.t || 0) + 3 * (t.hr || 0);
    const obp = safeDiv((t.h || 0) + (t.bb || 0), t.pa);
    const slg = safeDiv(tb, t.ab);
    const ip = (t.outs || 0) / 3;
    const pitched = (t.outs || 0) > 0;
    const batted = (t.pa || 0) > 0;
    return {
      avg: safeDiv(t.h, t.ab),
      obp,
      slg,
      ops: obp + slg,
      hr: batted ? t.hr || 0 : NaN,
      rbi: batted ? t.rbi || 0 : NaN,
      r: batted ? t.r || 0 : NaN,
      sb: batted ? t.sb || 0 : NaN,
      kpct: safeDiv(t.k, t.pa),
      bbpct: safeDiv(t.bb, t.pa),
      fld: safeDiv((t.ch || 0) - (t.e || 0), t.ch),
      e: t.e || 0,
      era: pitched ? ((t.er || 0) * 9) / ip : NaN,
      whip: pitched ? ((t.ha || 0) + (t.bba || 0)) / ip : NaN,
      k9: pitched ? ((t.kp || 0) * 9) / ip : NaN,
      bb9: pitched ? ((t.bba || 0) * 9) / ip : NaN,
      ip: pitched ? t.outs : NaN,
      w: pitched ? t.w || 0 : NaN,
      l: pitched ? t.l || 0 : NaN,
      pcg: pitched ? (t.pc || 0) / Math.max(1, gp) : NaN,
    };
  },
  rosterCols: ['avg', 'ops', 'hr', 'era', 'whip'],
  weights: (p) => {
    if (p === 'P') return { era: 3, whip: 2.5, k9: 2, bb9: 1.5, ip: 1 };
    const base: Record<string, number> = { obp: 2.5, slg: 2.5, avg: 1.5, kpct: 1, bbpct: 1, fld: 1.5, sb: 0.5, hr: 1, rbi: 1 };
    if (p === 'C') base.fld = 2.5;
    if (p === 'SS' || p === '2B') base.fld = 2;
    if (p === 'CF') base.sb = 1.5;
    if (p === 'DH') delete base.fld;
    return base;
  },
  primary: 'ops',
  kpis: [
    { label: 'Runs / game', value: (a) => a.pf / a.gp, fmt: 'd1', higher: true },
    { label: 'Team AVG', value: (a) => safeDiv(a.totals.h, a.totals.ab), fmt: 'avg', higher: true },
    { label: 'Team OPS', value: (a) => safeDiv(a.totals.h + a.totals.bb, a.totals.pa) + safeDiv(a.totals.h + a.totals.d + 2 * a.totals.t + 3 * a.totals.hr, a.totals.ab), fmt: 'avg', higher: true },
    { label: 'Team ERA', value: (a) => (a.totals.er * 27) / a.totals.outs, fmt: 'd2', higher: false },
    { label: 'WHIP', value: (a) => ((a.totals.ha + a.totals.bba) * 3) / a.totals.outs, fmt: 'd2', higher: false },
    { label: 'Fielding %', value: (a) => safeDiv(a.totals.ch - a.totals.e, a.totals.ch), fmt: 'avg', higher: true },
  ],
  benchmarks: [
    { key: 'rpg', label: 'Runs / game', value: (a) => a.pf / a.gp, league: 5.2, higher: true, fmt: 'd1', tags: ['contact', 'power'] },
    { key: 'avg', label: 'Team AVG', value: (a) => safeDiv(a.totals.h, a.totals.ab), league: 0.268, higher: true, fmt: 'avg', tags: ['contact'] },
    { key: 'obp', label: 'Team OBP', value: (a) => safeDiv(a.totals.h + a.totals.bb, a.totals.pa), league: 0.338, higher: true, fmt: 'avg', tags: ['plate-discipline'] },
    { key: 'slg', label: 'Team SLG', value: (a) => safeDiv(a.totals.h + a.totals.d + 2 * a.totals.t + 3 * a.totals.hr, a.totals.ab), league: 0.405, higher: true, fmt: 'avg', tags: ['power'] },
    { key: 'kpct', label: 'Strikeout rate', value: (a) => safeDiv(a.totals.k, a.totals.pa), league: 0.205, higher: false, fmt: 'pct', tags: ['contact', 'plate-discipline'] },
    { key: 'sb', label: 'Steals / game', value: (a) => a.totals.sb / a.gp, league: 1.1, higher: true, fmt: 'd2', tags: ['baserunning'] },
    { key: 'era', label: 'Team ERA', value: (a) => (a.totals.er * 27) / a.totals.outs, league: 4.25, higher: false, fmt: 'd2', tags: ['pitching'] },
    { key: 'bb9', label: 'Walks / 9', value: (a) => (a.totals.bba * 27) / a.totals.outs, league: 3.4, higher: false, fmt: 'd2', tags: ['pitching-command'] },
    { key: 'k9', label: 'Strikeouts / 9', value: (a) => (a.totals.kp * 27) / a.totals.outs, league: 8.4, higher: true, fmt: 'd1', tags: ['pitching'] },
    { key: 'fld', label: 'Fielding %', value: (a) => safeDiv(a.totals.ch - a.totals.e, a.totals.ch), league: 0.972, higher: true, fmt: 'avg', tags: ['fielding'] },
  ],
  slots: [
    { id: 'p', label: 'SP', positions: ['P'], x: 50, y: 60 },
    { id: 'c', label: 'C', positions: ['C'], x: 50, y: 90 },
    { id: '1b', label: '1B', positions: ['1B'], x: 70, y: 56 },
    { id: '2b', label: '2B', positions: ['2B', 'SS'], x: 61, y: 40 },
    { id: 'ss', label: 'SS', positions: ['SS', '2B'], x: 39, y: 40 },
    { id: '3b', label: '3B', positions: ['3B'], x: 30, y: 56 },
    { id: 'lf', label: 'LF', positions: ['LF', 'CF', 'RF'], x: 18, y: 22 },
    { id: 'cf', label: 'CF', positions: ['CF'], x: 50, y: 10 },
    { id: 'rf', label: 'RF', positions: ['RF', 'CF', 'LF'], x: 82, y: 22 },
    { id: 'dh', label: 'DH', positions: HIT_POS, x: 88, y: 88 },
  ],
  needs: [
    { key: 'obp', label: 'a top-3 OBP bat for the leadoff spot', topN: 3, min: 1 },
    { key: 'slg', label: 'two top-4 sluggers for the heart of the order', topN: 4, min: 2 },
  ],
  rules: [
    'Nine batters (C, 1B, 2B, SS, 3B, LF, CF, RF, DH) plus one starting pitcher.',
    'Middle infielders may cover 2B or SS; outfielders may cover any outfield spot; the DH can be any hitter.',
    'Table-setter rule: a top-3 OBP bat must start. Power rule: two top-4 SLG bats must start.',
    'Pitchers are scored only on ERA, WHIP, K/9, BB/9 and innings.',
  ],
  drills: [
    drill('bs-w', 'Throwing progression', ['warmup'], 12, 'Low', ['Balls', 'Bands'], 'Arm-care bands, then long toss in four distances. Finish with quick-transfer partner throws.', 'warmup'),
    drill('bs-1', 'Soft toss', ['contact'], 10, 'Low', ['Balls', 'Nets', 'Bats'], 'Short-side soft toss into a net: 3 rounds of 10 focusing on hands inside and a level path.'),
    drill('bs-2', 'Live BP', ['contact', 'power', 'plate-discipline'], 20, 'High', ['Balls', 'L-screen', 'Helmets'], 'Live arms vs hitters in 6-pitch at-bats. Chart hard-hit balls, chase rate and two-strike outcomes.'),
    drill('bs-3', 'Infield relay', ['fielding'], 12, 'Medium', ['Balls', 'Gloves'], 'Outfield hits the cutoff, infielders line up the throw to home or third. Rotate every 5 reps.'),
    drill('bs-4', 'Bunt defense', ['fielding'], 10, 'Medium', ['Balls'], 'Wheel play and standard bunt coverage. Pitcher fields, catcher calls the base.'),
    drill('bs-5', 'Pickoff moves', ['pitching-command'], 10, 'Low', ['Balls'], 'Pitchers rehearse slide-step and pickoff to first and second with the infield. Vary holds.'),
    drill('bs-6', 'Baserunning leads', ['baserunning'], 12, 'Medium', ['Bases', 'Stopwatch'], 'Primary and secondary leads, reading pitcher first move, steal jumps timed to second base.'),
    drill('bs-7', 'Two-strike approach', ['contact', 'plate-discipline'], 12, 'Medium', ['Balls', 'Pitching machine'], 'Choke up, widen stance, fight off tough pitches. Hitters must put 7 of 10 in play.'),
    drill('bs-8', 'Bullpen command ladder', ['pitching-command', 'pitching'], 15, 'Medium', ['Balls', 'Targets'], '30-pitch bullpen hitting glove-side, arm-side and down targets. Advance only after 3 of 4 hits.'),
    drill('bs-9', 'Pitch recognition', ['plate-discipline'], 10, 'Low', ['Machine', 'Colored balls'], 'Call spin and location before the ball crosses half-way. Swing only at called strikes.'),
    drill('bs-10', 'Gap power tee work', ['power'], 12, 'Medium', ['Tees', 'Balls', 'Bats'], 'High tee and inside tee for lift and pull-side power. Chart line drives to the gaps.'),
    drill('bs-11', 'Strikeout pitch sequencing', ['pitching'], 12, 'Medium', ['Balls', 'Radar gun'], 'Pitcher and catcher script putaway sequences vs left and right hitters; grade each pitch.'),
    drill('bs-s', 'Situational scrimmage', ['scrimmage'], 25, 'High', ['Full gear'], 'Inning-start situations: runner on second, no outs; bases loaded, one out. Track execution.', 'scrimmage'),
    drill('bs-c', 'Arm care cool-down', ['cooldown'], 8, 'Low', ['Bands', 'Mats'], 'Band external rotations, sleeper stretch, light jog and hip mobility.', 'cooldown'),
  ],
  genGame: (players, { rng, gi }) => {
    const lines: Record<string, Raw> = {};
    const hitters = players.filter((p) => p.position !== 'P').sort((a, b) => b.skill - a.skill);
    const pitchers = players.filter((p) => p.position === 'P').sort((a, b) => b.skill - a.skill);
    const lineup: Player[] = [];
    for (const pos of HIT_POS.slice(0, 8)) {
      const pick = hitters.find((p) => p.position === pos && !lineup.includes(p) && rng() > 0.12) ?? hitters.find((p) => p.position === pos && !lineup.includes(p)) ?? hitters.find((p) => !lineup.includes(p));
      if (pick) lineup.push(pick);
    }
    const dh = hitters.find((p) => !lineup.includes(p));
    if (dh) lineup.push(dh);
    let teamRuns = 0;
    for (const p of lineup) {
      const l = blank();
      const pa = 4 + (rng() < 0.4 ? 1 : 0);
      l.pa = pa;
      for (let i = 0; i < pa; i++) {
        const x = rng();
        const pBB = 0.06 + p.skill * 0.06;
        const pK = 0.27 - p.skill * 0.1;
        const pH = 0.19 + p.skill * 0.1;
        if (x < pBB) {
          l.bb++;
          if (rng() < 0.3) l.r++;
          if (rng() < 0.07 + p.skill * 0.06) l.sb++;
        } else if (x < pBB + pK) {
          l.ab++;
          l.k++;
        } else if (x < pBB + pK + pH) {
          l.ab++;
          l.h++;
          const y = rng();
          const pHR = 0.05 + p.skill * 0.11;
          if (y < pHR) {
            l.hr++;
            l.r++;
            l.rbi++;
          } else if (y < pHR + 0.02) {
            l.t++;
            if (rng() < 0.7) l.r++;
          } else if (y < pHR + 0.24) {
            l.d++;
            if (rng() < 0.5) l.r++;
          } else {
            if (rng() < 0.32) l.r++;
            if (rng() < 0.07 + p.skill * 0.06) l.sb++;
          }
        } else {
          l.ab++;
        }
      }
      l.ch = ri(rng, p.position === 'C' ? 6 : p.position === '1B' ? 7 : 1, p.position === 'C' ? 10 : p.position === '1B' ? 11 : 6);
      l.e = binom(rng, l.ch, clamp(0.028 - p.skill * 0.018, 0.004, 0.05));
      lines[p.id] = l;
      teamRuns += l.r;
    }
    let rbiToGive = teamRuns - lineup.reduce((a, p) => a + lines[p.id].hr, 0);
    while (rbiToGive-- > 0) {
      const b = pickW(rng, lineup, (p) => lines[p.id].h * 2 + 0.3);
      lines[b.id].rbi++;
    }
    // Pitching
    const starters = pitchers.slice(0, 4);
    const relievers = pitchers.slice(4);
    const sp = starters.length ? starters[gi % starters.length] : pitchers[0];
    const staff: { p: Player; outs: number; gs: number }[] = [];
    if (sp) {
      const o = clamp(Math.round(15 + sp.skill * 9 + (rng() - 0.5) * 6), 9, 24);
      staff.push({ p: sp, outs: o, gs: 1 });
      let left = 27 - o;
      const pen = [...relievers].sort(() => rng() - 0.5);
      let i = 0;
      while (left > 0 && pen[i]) {
        const o2 = i === pen.length - 1 ? left : Math.min(left, ri(rng, 3, 6));
        staff.push({ p: pen[i], outs: o2, gs: 0 });
        left -= o2;
        i++;
      }
      if (left > 0) staff[0].outs += left;
    }
    let oppRuns = 0;
    for (const s of staff) {
      const l = blank();
      const f = s.outs / 27;
      l.outs = s.outs;
      l.er = pois(rng, f * (6.4 - s.p.skill * 3.4));
      l.ha = pois(rng, f * (10.6 - s.p.skill * 3));
      l.bba = pois(rng, f * (4.8 - s.p.skill * 2.2));
      l.kp = pois(rng, f * (6 + s.p.skill * 5));
      l.pc = Math.round((s.outs / 3) * 15 + l.ha * 2 + l.bba * 4 + (rng() - 0.5) * 8);
      l.gs = s.gs;
      lines[s.p.id] = l;
      oppRuns += l.er;
    }
    if (oppRuns === teamRuns) {
      if (rng() < 0.5 && staff.length) {
        lines[staff[staff.length - 1].p.id].er++;
        lines[staff[staff.length - 1].p.id].ha++;
        oppRuns++;
      } else if (lineup.length > 1) {
        const scorer = pickW(rng, lineup, (p) => lines[p.id].h + lines[p.id].bb + 0.2);
        const driver = pickW(rng, lineup.filter((p) => p !== scorer), (p) => lines[p.id].h + 0.3);
        lines[scorer.id].r++;
        lines[driver.id].rbi++;
        teamRuns++;
      }
    }
    if (staff.length) {
      const dec = staff[0].outs >= 15 ? staff[0] : staff[1] ?? staff[0];
      lines[dec.p.id][teamRuns > oppRuns ? 'w' : 'l'] = 1;
    }
    return { lines, scoreAgainst: oppRuns, extra: {} };
  },
  teamScore: (ls) => sumKey(ls, 'r'),
  tools: [
    { id: 'order', label: 'Batting order builder', desc: 'OBP at the top, slug in the cleanup spot' },
    { id: 'pitchcount', label: 'Pitch count tracker', desc: 'Pitches per outing and required rest days' },
    { id: 'bullpen', label: 'Bullpen planner', desc: 'Availability and fatigue for every arm' },
  ],
};

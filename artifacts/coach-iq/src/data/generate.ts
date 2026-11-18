/**
 * Builds the fictional demo season for a sport. Deterministic (seeded), so the same
 * team appears on every fresh load. Team scores are always the sum of player lines.
 */
import type { Game, Player, SportState, Status, Upcoming } from '@/lib/types';
import { clamp, hashStr, mulberry32, ri } from '@/lib/rng';
import type { SportConfig } from '@/sports/types';

export const DATA_VERSION = 3;

const FIRST = ['Mateo', 'Jalen', 'Theo', 'Andre', 'Kai', 'Silas', 'Rowan', 'Dario', 'Emeka', 'Callum', 'Nico', 'Tobias', 'Isaiah', 'Rafael', 'Quinn', 'Desmond', 'Luca', 'Malik', 'Owen', 'Bastian', 'Ezra', 'Marcus', 'Tavian', 'Felix', 'Joaquin', 'Darnell', 'Kenji', 'Ibrahim', 'Cole', 'Elias', 'Amari', 'Soren', 'Wes', 'Javier', 'Reid', 'Nolan', 'Kofi', 'Hugo', 'Tristan', 'Dante', 'Mason', 'Leo', 'Arlo', 'Cyrus', 'Bryce', 'Omar', 'Zane', 'Adrian', 'Micah', 'Grady'];
const LAST = ['Okafor', 'Lindqvist', 'Marchetti', 'Delacroix', 'Achterberg', 'Nakamura', 'Ferreira', 'Whitlock', 'Abernathy', 'Castellanos', 'Brandt', 'Oyelaran', 'Hollis', 'Kowalczyk', 'Valdez', 'Sorensen', 'Prescott', 'Mbeki', 'Tanaka', 'Rourke', 'Esposito', 'Halvorsen', 'Ibarra', 'Quarles', 'Vance', 'Mercado', 'Dunleavy', 'Asante', 'Pelletier', 'Strand', 'Okonkwo', 'Galloway', 'Reyes', 'Lambert', 'Fairchild', 'Novak', 'Barros', 'Kincaid', 'Ellery', 'Mwangi', 'Tolbert', 'Saari', 'Crowe', 'Ashby', 'Petrakis', 'Underwood', 'Adeyemi', 'Hargrove', 'Villanueva', 'Brennan'];

const NOTES = [
  'Great communicator in drills. Keep building leadership reps.',
  'Watch fatigue in the back half of games.',
  'Film session booked: footwork on the first step.',
  'Coachable. Responds well to specific, short cues.',
];

function addDays(iso: string, d: number) {
  const dt = new Date(`${iso}T12:00:00`);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

export function buildSport(cfg: SportConfig): SportState {
  const rng = mulberry32(hashStr(`${cfg.id}-coachiq-v${DATA_VERSION}`));
  const usedNames = new Set<string>();
  const usedNums = new Set<number>();
  const players: Player[] = [];
  let idx = 0;
  for (const { pos, count } of cfg.rosterPlan) {
    for (let i = 0; i < count; i++) {
      let name = '';
      do name = `${FIRST[ri(rng, 0, FIRST.length - 1)]} ${LAST[ri(rng, 0, LAST.length - 1)]}`;
      while (usedNames.has(name));
      usedNames.add(name);
      let num = 0;
      do num = ri(rng, 1, 99);
      while (usedNums.has(num));
      usedNums.add(num);
      const [h0, h1, w0, w1] = cfg.size(pos);
      const inches = ri(rng, h0, h1);
      const yearIdx = ri(rng, 0, cfg.years.length - 1);
      players.push({
        id: `${cfg.id.slice(0, 2)}-p${++idx}`,
        teamId: cfg.team.id,
        name,
        number: num,
        position: pos,
        status: 'Active',
        age: clamp(cfg.ageRange[0] + yearIdx + ri(rng, 0, 1), cfg.ageRange[0], cfg.ageRange[1]),
        height: `${Math.floor(inches / 12)}'${inches % 12}"`,
        weight: ri(rng, w0, w1),
        year: cfg.years[yearIdx],
        notes: rng() < 0.35 ? NOTES[ri(rng, 0, NOTES.length - 1)] : '',
        skill: clamp(0.3 + rng() * 0.55 + (i === 0 ? 0.1 : 0) - i * 0.04, 0.08, 0.97),
        gameStats: [],
      });
    }
  }
  // A few injuries and day-to-day players so availability matters.
  const statusPick = [...players].sort(() => rng() - 0.5);
  const setStatus = (p: Player | undefined, s: Status) => p && (p.status = s);
  setStatus(statusPick[0], 'Injured');
  setStatus(statusPick[1], 'Injured');
  setStatus(statusPick[2], 'Questionable');
  if (players.length > 20) setStatus(statusPick[3], 'Questionable');

  const n = 12;
  const games: Game[] = [];
  const opps = [...cfg.opponents];
  for (let gi = 0; gi < n; gi++) {
    const avail = players.filter((p) => !(p.status === 'Injured' && gi >= n - 3));
    const res = cfg.genGame(avail, { rng, gi });
    const id = `${cfg.id.slice(0, 2)}-g${gi + 1}`;
    for (const [pid, s] of Object.entries(res.lines)) players.find((p) => p.id === pid)?.gameStats.push({ gameId: id, s });
    games.push({
      id,
      teamId: cfg.team.id,
      date: addDays(cfg.seasonStart, gi * cfg.cadenceDays + (gi % 3 === 2 ? 1 : 0)),
      opponent: opps[gi % opps.length],
      homeAway: gi % 2 === 0 ? 'Home' : 'Away',
      scoreFor: cfg.teamScore(Object.values(res.lines)),
      scoreAgainst: res.scoreAgainst,
      extra: res.extra,
    });
  }
  const last = games[games.length - 1].date;
  const upcoming: Upcoming[] = Array.from({ length: 5 }, (_, i) => ({
    id: `${cfg.id.slice(0, 2)}-u${i + 1}`,
    date: addDays(last, (i + 1) * cfg.cadenceDays),
    opponent: opps[(n + i) % opps.length],
    homeAway: (n + i) % 2 === 0 ? 'Home' : 'Away',
  }));
  return { version: DATA_VERSION, team: cfg.team, players, games, upcoming, lineups: [], plans: [], tools: {} };
}

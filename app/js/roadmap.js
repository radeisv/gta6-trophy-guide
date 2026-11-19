// Platinum Engine — the roadmap to the platinum and the missable list.
// Stage 1: story playthrough (12). Stage 2: side and activities (30).
// Stage 3: collectibles and sets (8). Stage 4: cleanup to platinum (5).
import { isEarned, getCounter } from './state.js';
import { isSpoilerHidden } from './filters.js';

export const STAGES = [
  { stage: 1, title: 'Stage 1 — Story Playthrough', note: 'Chapters 1–4, the final mission and the six named story missions. 12 trophies. Warning: meditate at Jason\'s home in Chapter 1 for Positive Mental Attitude before the chapter closes — it is the one missable moment in the game.' },
  { stage: 2, title: 'Stage 2 — Side & Activities', note: 'Stranger strand finales, partner moments, heists, races, ranges and one-off moments. 30 trophies.' },
  { stage: 3, title: 'Stage 3 — Collectibles & Sets', note: 'Meditation spots, cards, WAiNK spots, vehicles, areas, Scooter registrations, Bret\'s animal and the stranger strands. 8 trophies.' },
  { stage: 4, title: 'Stage 4 — Cleanup to Platinum', note: '100% completion, the money grind, the garages, then the platinum itself. 5 trophies.' }
];

// The roadmap table's Source column: the source that carries the fact the
// row leans on. A masked row shows nothing but the hidden status, so its
// source is the hidden/visible cross-check (S4). A row whose requirement
// leans on a PowerPyx fact — the 42 Shooting Range challenges, the 250
// unique stunts, the 14 drone race locations, the 18 meditation spots, or
// a trigger PowerPyx marks "not yet known" — cites PowerPyx (S1).
// Every other row's requirement comes from the official description
// itself, so it cites Exophase + PSNProfiles (S2).
const POWERPYX_IDS = [15, 17, 18, 28, 44, 45, 49, 50, 51];

export function primarySource(trophy, state) {
  if (state && isSpoilerHidden(trophy, state)) return 'S4 planetgta6';
  if (POWERPYX_IDS.indexOf(trophy.id) !== -1) return 'S1 PowerPyx';
  return 'S2 Exophase + PSNProfiles';
}

// One row per trophy for the dense roadmap table: name, missable flag,
// the guide's Roadmap line, and the primary source.
export function roadmapRows(trophies, state) {
  return trophies.slice().sort(function (a, b) {
    if (a.roadmapStage !== b.roadmapStage) return a.roadmapStage - b.roadmapStage;
    return a.id - b.id;
  }).map(function (t) {
    const m = t.guide.match(/Roadmap:\s*([^\.]*)/);
    return {
      trophy: t,
      missable: t.missable ? 'Yes' : 'No',
      key: m ? m[1].trim() : '',
      source: primarySource(t, state)
    };
  });
}

export function stageTrophies(trophies, stage) {
  return trophies.filter(function (t) { return t.roadmapStage === stage; });
}

export function stageProgress(trophies, stage, state) {
  const list = stageTrophies(trophies, stage);
  const earned = list.filter(function (t) { return isEarned(state, t.id); }).length;
  return { total: list.length, earned: earned, pct: list.length ? Math.round((earned / list.length) * 100) : 0 };
}

export function missableTrophies(trophies) {
  return trophies.filter(function (t) { return Boolean(t.missable); });
}

export function totalProgress(trophies, state) {
  const earned = trophies.filter(function (t) { return isEarned(state, t.id); }).length;
  const byGrade = {};
  ['platinum', 'gold', 'silver', 'bronze'].forEach(function (g) {
    const total = trophies.filter(function (t) { return t.grade === g; }).length;
    const got = trophies.filter(function (t) { return t.grade === g && isEarned(state, t.id); }).length;
    byGrade[g] = { total: total, earned: got };
  });
  return { total: trophies.length, earned: earned, pct: trophies.length ? Math.round((earned / trophies.length) * 100) : 0, byGrade: byGrade };
}

// Next up: the first unearned trophy of the earliest unfinished stage.
export function nextUp(trophies, state) {
  for (let s = 1; s <= 4; s++) {
    const open = stageTrophies(trophies, s).find(function (t) { return !isEarned(state, t.id); });
    if (open) return { trophy: open, stage: s };
  }
  return null;
}

export function counterLabel(trophy, state) {
  if (!trophy.count) return '';
  const got = getCounter(state, trophy.id);
  return got + ' / ' + trophy.count;
}

// Platinum Engine — the roadmap to the platinum and the missable list.
// Stage 1: story playthrough. Stage 2: missable checkpoints. Stage 3:
// collectibles and challenges. Stage 4: cleanup to platinum.
import { isEarned, getCounter } from './state.js';

export const STAGES = [
  { stage: 1, title: 'Stage 1 — Story Playthrough', note: 'Chapters 1–4, the final mission, the named story missions and the five stranger strand finales. 17 trophies.' },
  { stage: 2, title: 'Stage 2 — Missable Checkpoints', note: 'Partner moments, heists and story events to do while the story is open. 17 trophies.' },
  { stage: 3, title: 'Stage 3 — Collectibles & Challenges', note: 'Everything PSN counts: stunts, ranges, races, cards, spots and strands. 17 trophies.' },
  { stage: 4, title: 'Stage 4 — Cleanup to Platinum', note: '100% completion, the money grind, then the platinum itself. 4 trophies.' }
];

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

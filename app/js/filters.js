// Platinum Engine — instant search, kind filters, and the spoiler rule.
// Spoiler rule: a hidden trophy that is not earned yet shows a masked name and
// description while spoilers are on. Once it is earned, or spoilers are off,
// its real name and description show.
import { isEarned } from './state.js';

export const FILTERS = ['all', 'story', 'missable', 'collectibles', 'activities', 'earned', 'unearned'];

export function isSpoilerHidden(trophy, state) {
  return Boolean(state.spoilers) && Boolean(trophy.hidden) && !isEarned(state, trophy.id);
}

export function displayName(trophy, state) {
  return isSpoilerHidden(trophy, state) ? 'Hidden trophy — earn it to reveal' : trophy.name;
}

export function displayDescription(trophy, state) {
  return isSpoilerHidden(trophy, state) ? 'This trophy is hidden on PlayStation until earned. Turn spoilers off, or earn it, to see its official description.' : trophy.description;
}

export function matchesFilter(trophy, filter, state) {
  if (filter === 'all') return true;
  if (filter === 'story') return trophy.category === 'story';
  if (filter === 'missable') return Boolean(trophy.missable);
  if (filter === 'collectibles') return trophy.category === 'collectibles';
  if (filter === 'activities') return trophy.category === 'activities';
  if (filter === 'earned') return isEarned(state, trophy.id);
  if (filter === 'unearned') return !isEarned(state, trophy.id);
  return true;
}

export function matchesSearch(trophy, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return trophy.name.toLowerCase().indexOf(q) !== -1 ||
    trophy.description.toLowerCase().indexOf(q) !== -1 ||
    trophy.guide.toLowerCase().indexOf(q) !== -1;
}

export function visibleTrophies(trophies, filter, query, state) {
  return trophies.filter(function (t) {
    return matchesFilter(t, filter, state) && matchesSearch(t, query);
  });
}

// Custom medal icons, drawn as inline SVG — original art, no game artwork.
export function medalSvg(grade) {
  const colors = { platinum: '#d8e1ea', gold: '#d4af5a', silver: '#c3c9cf', bronze: '#c98b5e' };
  const fill = colors[grade] || colors.bronze;
  const label = grade.charAt(0).toUpperCase();
  return '<svg class="medal" viewBox="0 0 48 48" aria-hidden="true">' +
    '<circle cx="24" cy="20" r="14" fill="' + fill + '"/>' +
    '<circle cx="24" cy="20" r="10" fill="none" stroke="#00000044" stroke-width="2"/>' +
    '<text x="24" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="#1d2129">' + label + '</text>' +
    '<path d="M18 32h12l2 10H16l2-10z" fill="' + fill + '"/>' +
    '</svg>';
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

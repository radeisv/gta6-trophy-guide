// Platinum Engine — instant search, kind filters, and the spoiler rule.
// Spoiler rule: a hidden trophy that is not earned yet shows a masked name and
// description while spoilers are on. Once it is earned, or spoilers are off,
// its real name and description show.
import { isEarned } from './state.js';

export const FILTERS = ['all', 'story', 'missable', 'collectibles', 'activities', 'online', 'earned', 'unearned'];

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
  if (filter === 'online') return false; // No online trophies exist: all 55 are offline, single-player.
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

// Original 3D trophy icons, drawn as inline SVG — no game artwork, no files.
// Each grade is a different cup: platinum is tall with laurel leaves and a
// sparkle, gold is wide and bright, silver is slim, bronze is short and
// sturdy. A small emblem marks the category: a star for story, a gem for
// collectibles, a bolt for activities. Every icon gets unique gradient ids
// so 55 copies can share one page.
let iconUid = 0;

const GRADE_PALETTE = {
  platinum: ['#ffffff', '#dfe9f2', '#9db1c4', '#f2f7fb', '#b7c8d8'],
  gold: ['#fff6b8', '#ffd94a', '#b8860b', '#ffec8a', '#e0aa2e'],
  silver: ['#ffffff', '#d7dde2', '#96a0aa', '#eef1f3', '#b3bcc4'],
  bronze: ['#ffc890', '#c47a3d', '#6e4218', '#e8a05c', '#96582a']
};

const GRADE_CUP = {
  platinum: {
    bowl: 'M20 6h24v8a12 12 0 0 1-24 0z', rim: { x: 18, y: 4, w: 28 },
    handles: ['M20 10C12 10 11 20 19 22', 'M44 10c8 0 9 10 1 12'],
    stem: 'M29 24h6v12h-6z', foot: 'M22 36h20l4 8H18z',
    highlight: { cx: 27, cy: 12, rx: 5, ry: 3 }, laurel: true, sparkle: true
  },
  gold: {
    bowl: 'M14 8h36v6a18 12 0 0 1-36 0z', rim: { x: 12, y: 6, w: 40 },
    handles: ['M14 12C6 12 5 22 13 24', 'M50 12c8 0 9 10 1 12'],
    stem: 'M28 22h8v10h-8z', foot: 'M18 32h28l5 9H13z',
    highlight: { cx: 26, cy: 13, rx: 7, ry: 3.5 }, laurel: false, sparkle: false
  },
  silver: {
    bowl: 'M24 4h16v12a8 10 0 0 1-16 0z', rim: { x: 22, y: 2, w: 20 },
    handles: ['M24 8c-6 0-7 8-1 10', 'M40 8c6 0 7 8 1 10'],
    stem: 'M30 22h4v16h-4z', foot: 'M24 38h16l3 7H21z',
    highlight: { cx: 29, cy: 10, rx: 3.5, ry: 3 }, laurel: false, sparkle: false
  },
  bronze: {
    bowl: 'M16 14h32v6a16 10 0 0 1-32 0z', rim: { x: 14, y: 12, w: 36 },
    handles: ['M16 18c-7 0-8 8-1 10', 'M48 18c7 0 8 8 1 10'],
    stem: 'M27 24h10v7h-10z', foot: 'M18 31h28l4 9H14z',
    highlight: { cx: 27, cy: 18, rx: 6, ry: 3 }, laurel: false, sparkle: false
  }
};

const CATEGORY_EMBLEM = {
  story: { shape: 'M50 44.6l1.7 3.6 3.9.5-2.9 2.7.8 3.9-3.5-1.9-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z', fill: '#ffb454' },
  collectibles: { shape: 'M50 44.5l5 5.5-5 5.5-5-5.5z', fill: '#5ec8c0' },
  activities: { shape: 'M52.5 44l-6.5 7h3.6l-2 5.5 6.5-7h-3.6z', fill: '#b78cff' }
};

function laurelLeaves(pal) {
  const leaf = function (cx, cy, rot) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="2" ry="4.2" fill="' + pal[2] + '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"/>';
  };
  return leaf(13.5, 11, -30) + leaf(11.5, 17, -55) + leaf(13, 23, -80) +
    leaf(50.5, 11, 30) + leaf(52.5, 17, 55) + leaf(51, 23, 80);
}

export function trophySvg(grade, category) {
  const uid = ++iconUid;
  const g = 'tg' + uid;
  const pal = GRADE_PALETTE[grade] || GRADE_PALETTE.bronze;
  const cup = GRADE_CUP[grade] || GRADE_CUP.bronze;
  const emblem = CATEGORY_EMBLEM[category] || CATEGORY_EMBLEM.activities;
  const h = cup.highlight;
  return '<svg class="trophy-icon" viewBox="0 0 64 64" aria-hidden="true">' +
    '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="' + pal[0] + '"/>' +
    '<stop offset="0.35" stop-color="' + pal[1] + '"/>' +
    '<stop offset="0.55" stop-color="' + pal[2] + '"/>' +
    '<stop offset="0.78" stop-color="' + pal[3] + '"/>' +
    '<stop offset="1" stop-color="' + pal[4] + '"/></linearGradient></defs>' +
    '<ellipse cx="32" cy="53" rx="19" ry="3.5" fill="#000" opacity="0.35"/>' +
    '<path d="' + cup.bowl + '" fill="url(#' + g + ')"/>' +
    '<rect x="' + cup.rim.x + '" y="' + cup.rim.y + '" width="' + cup.rim.w + '" height="4" rx="2" fill="url(#' + g + ')"/>' +
    '<path d="' + cup.handles[0] + '" fill="none" stroke="url(#' + g + ')" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="' + cup.handles[1] + '" fill="none" stroke="url(#' + g + ')" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="' + cup.stem + '" fill="url(#' + g + ')"/>' +
    '<path d="' + cup.foot + '" fill="url(#' + g + ')"/>' +
    '<ellipse cx="' + h.cx + '" cy="' + h.cy + '" rx="' + h.rx + '" ry="' + h.ry + '" fill="#fff" opacity="0.5" transform="rotate(-20 ' + h.cx + ' ' + h.cy + ')"/>' +
    (cup.laurel ? laurelLeaves(pal) : '') +
    (cup.sparkle ? '<path d="M52 3l1.6 3.9L57.5 8.5l-3.9 1.6L52 14l-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#fff" opacity="0.9"/>' : '') +
    '<circle cx="50" cy="50" r="9" fill="#10141b" stroke="#ffffff40" stroke-width="1"/>' +
    '<path d="' + emblem.shape + '" fill="' + emblem.fill + '"/>' +
    '</svg>';
}

// A hidden trophy that is not earned yet shows a muted silhouette with a
// question mark while spoilers are on, instead of its real cup.
export function maskedSvg() {
  return '<svg class="trophy-icon masked" viewBox="0 0 64 64" aria-hidden="true">' +
    '<ellipse cx="32" cy="53" rx="19" ry="3.5" fill="#000" opacity="0.35"/>' +
    '<path d="M20 8h24v8a12 12 0 0 1-24 0z" fill="#3a4150"/>' +
    '<path d="M20 12c-8 0-9 10-1 12M44 12c8 0 9 10 1 12" fill="none" stroke="#3a4150" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M29 26h6v10h-6z" fill="#3a4150"/>' +
    '<path d="M22 36h20l4 8H18z" fill="#3a4150"/>' +
    '<text x="32" y="23" text-anchor="middle" font-size="15" font-weight="bold" fill="#a8b0bd">?</text>' +
    '</svg>';
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// Platinum Engine — saved progress in localStorage, plus export and import.
// The state is one JSON object: earned trophy ids, PSN counters, notes, and settings.
export const STORAGE_KEY = 'platinum-engine-gta6-v1';

export function defaultState() {
  return { earned: [], counters: {}, notes: {}, spoilers: true, theme: 'dark', filter: 'all', selected: 17, sort: 'roadmap' };
}

export function loadState() {
  const fallback = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter(function (n) { return typeof n === 'number'; }) : [],
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      spoilers: parsed.spoilers !== false,
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      filter: typeof parsed.filter === 'string' ? parsed.filter : 'all',
      selected: typeof parsed.selected === 'number' ? parsed.selected : 17,
      sort: ['roadmap', 'name', 'grade', 'stage'].indexOf(parsed.sort) !== -1 ? parsed.sort : 'roadmap'
    };
  } catch (err) {
    return fallback;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Storage full or blocked: the tracker still works for this session.
  }
}

export function isEarned(state, id) {
  return state.earned.indexOf(id) !== -1;
}

export function toggleEarned(state, id) {
  const at = state.earned.indexOf(id);
  if (at === -1) state.earned.push(id);
  else state.earned.splice(at, 1);
  saveState(state);
  return state;
}

export function setCounter(state, id, value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  state.counters[id] = n;
  saveState(state);
  return n;
}

export function getCounter(state, id) {
  const n = Number(state.counters[id]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setNote(state, id, text) {
  state.notes[id] = String(text || '');
  saveState(state);
}

export function getNote(state, id) {
  return typeof state.notes[id] === 'string' ? state.notes[id] : '';
}

export function exportProgress(state) {
  return JSON.stringify({ app: 'platinum-engine-gta6', version: 1, exportedAt: new Date().toISOString(), earned: state.earned, counters: state.counters, notes: state.notes }, null, 2);
}

export function downloadExport(state) {
  const blob = new Blob([exportProgress(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Validate an imported file and merge it into the state. Returns an error string or null.
export function importProgress(state, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return 'That file is not valid JSON.';
  }
  if (!parsed || typeof parsed !== 'object') return 'That file holds no progress object.';
  const earned = Array.isArray(parsed.earned) ? parsed.earned : (Array.isArray(parsed) ? parsed : null);
  if (!earned) return 'No earned list found in that file.';
  const clean = earned.filter(function (n) { return typeof n === 'number' && n >= 1 && n <= 55; });
  state.earned = clean;
  if (parsed.counters && typeof parsed.counters === 'object') {
    Object.keys(parsed.counters).forEach(function (k) {
      const v = Math.max(0, Math.floor(Number(parsed.counters[k]) || 0));
      if (v > 0) state.counters[k] = v;
    });
  }
  if (parsed.notes && typeof parsed.notes === 'object') {
    Object.keys(parsed.notes).forEach(function (k) {
      if (typeof parsed.notes[k] === 'string') state.notes[k] = parsed.notes[k];
    });
  }
  saveState(state);
  return null;
}

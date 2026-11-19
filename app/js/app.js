// Platinum Engine — boot: load the trophy data, render the tracker, wire the UI.
// The only network call in the app is this one fetch of the local data file.
import { loadState, saveState, isEarned, toggleEarned, getCounter, setCounter, getNote, setNote, exportProgress, downloadExport, importProgress } from './state.js';
import { visibleTrophies, displayName, displayDescription, isSpoilerHidden, medalSvg, gradeLabel } from './filters.js';
import { STAGES, stageTrophies, stageProgress, missableTrophies, totalProgress, nextUp, counterLabel } from './roadmap.js';

const params = new URLSearchParams(window.location.search);
const state = loadState();
let trophies = [];
let query = '';

const $ = function (id) { return document.getElementById(id); };

// Clear a container safely: if focus sits inside it (for example a counter
// input whose change just fired), blur first — removing a focused node
// during its own event throws in Chromium.
function clearChildren(el) {
  if (el.contains(document.activeElement)) document.activeElement.blur();
  el.replaceChildren();
}

function trophyById(id) {
  return trophies.find(function (t) { return t.id === id; });
}

function renderProgress() {
  const p = totalProgress(trophies, state);
  $('progressText').textContent = p.earned + ' / ' + p.total + ' earned';
  $('progressPct').textContent = p.pct + '% to Platinum';
  $('progressBar').style.width = p.pct + '%';
  const g = p.byGrade;
  $('gradeCounts').textContent = 'Platinum ' + g.platinum.earned + '/' + g.platinum.total +
    ' · Gold ' + g.gold.earned + '/' + g.gold.total +
    ' · Silver ' + g.silver.earned + '/' + g.silver.total +
    ' · Bronze ' + g.bronze.earned + '/' + g.bronze.total;
}

function renderList() {
  const list = $('trophyList');
  clearChildren(list);
  const visible = visibleTrophies(trophies, state.filter, query, state);
  $('listMeta').textContent = visible.length + ' of ' + trophies.length + ' trophies' +
    (state.filter !== 'all' ? ' · filter: ' + state.filter : '') +
    (query ? ' · search: "' + query + '"' : '');
  visible.forEach(function (t) {
    const li = document.createElement('li');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'trophy-row' + (state.selected === t.id ? ' selected' : '');
    row.addEventListener('click', function () { selectTrophy(t.id); });

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(state, t.id);
    box.setAttribute('aria-label', 'Earned: ' + t.name);
    box.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleEarned(state, t.id);
      renderAll();
    });
    row.appendChild(box);

    const medal = document.createElement('span');
    medal.innerHTML = medalSvg(t.grade);
    row.appendChild(medal);

    const main = document.createElement('span');
    main.className = 'row-main';
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = displayName(t, state);
    main.appendChild(name);
    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.style.display = 'block';
    desc.textContent = displayDescription(t, state);
    main.appendChild(desc);
    const tags = document.createElement('span');
    tags.className = 'row-tags';
    tags.style.display = 'flex';
    const gradeTag = document.createElement('span');
    gradeTag.className = 'tag grade-' + t.grade;
    gradeTag.textContent = gradeLabel(t.grade);
    tags.appendChild(gradeTag);
    const catTag = document.createElement('span');
    catTag.className = 'tag';
    catTag.textContent = t.category;
    tags.appendChild(catTag);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'Missable';
      tags.appendChild(m);
    }
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'tag hidden-tag';
      h.textContent = 'Hidden';
      tags.appendChild(h);
    }
    main.appendChild(tags);
    row.appendChild(main);

    if (t.count) {
      const counter = document.createElement('span');
      counter.className = 'counter';
      counter.textContent = counterLabel(t, state);
      row.appendChild(counter);
    }
    li.appendChild(row);
    list.appendChild(li);
  });
}

function renderDetail() {
  const panel = $('detailPanel');
  clearChildren(panel);
  const t = trophyById(state.selected) || trophies[0];
  if (!t) return;
  const hidden = isSpoilerHidden(t, state);

  const head = document.createElement('div');
  head.className = 'detail-head';
  const medal = document.createElement('span');
  medal.innerHTML = medalSvg(t.grade);
  head.appendChild(medal);
  const headText = document.createElement('div');
  const name = document.createElement('h2');
  name.className = 'detail-name';
  name.textContent = displayName(t, state);
  headText.appendChild(name);
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = 'Official description: ' + displayDescription(t, state);
  headText.appendChild(desc);
  head.appendChild(headText);
  panel.appendChild(head);

  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  [['grade-' + t.grade, gradeLabel(t.grade)], ['', t.category], ['', 'Stage ' + t.roadmapStage], ['', t.estimatedTime]].forEach(function (pair) {
    const tag = document.createElement('span');
    tag.className = 'tag ' + pair[0];
    tag.textContent = pair[1];
    meta.appendChild(tag);
  });
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = 'Missable';
    meta.appendChild(m);
  }
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'tag hidden-tag';
    h.textContent = 'Hidden on PlayStation';
    meta.appendChild(h);
  }
  panel.appendChild(meta);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'hidden-note';
    note.textContent = 'Spoilers are on and this trophy is still hidden. Earn it in-game (tick it off in the list) or turn spoilers off to read its guide and sources.';
    panel.appendChild(note);
    return;
  }

  if (t.missable) {
    const banner = document.createElement('p');
    banner.className = 'missable-banner';
    banner.textContent = 'Missable — finish this at the right story moment, or replay the mission. See the guide below.';
    panel.appendChild(banner);
  }

  const guideLabel = document.createElement('p');
  guideLabel.className = 'detail-guide-label';
  guideLabel.textContent = 'Guide';
  panel.appendChild(guideLabel);
  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.textContent = t.guide;
  panel.appendChild(guide);

  const srcLabel = document.createElement('p');
  srcLabel.className = 'detail-sources-label';
  srcLabel.textContent = 'Sources — open only when you follow them';
  panel.appendChild(srcLabel);
  const srcs = document.createElement('div');
  srcs.className = 'detail-sources';
  t.sources.forEach(function (s) {
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    srcs.appendChild(a);
  });
  panel.appendChild(srcs);

  if (t.count) {
    const counterRow = document.createElement('div');
    counterRow.className = 'detail-counter';
    const label = document.createElement('span');
    label.textContent = 'PSN target ' + getCounter(state, t.id) + ' / ' + t.count;
    counterRow.appendChild(label);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(t.count);
    input.value = String(getCounter(state, t.id));
    input.setAttribute('aria-label', 'Progress count for ' + t.name);
    input.addEventListener('change', function () {
      setCounter(state, t.id, input.value);
      renderAll();
    });
    counterRow.appendChild(input);
    panel.appendChild(counterRow);
  }

  const noteWrap = document.createElement('div');
  noteWrap.className = 'detail-note';
  const noteLabel = document.createElement('label');
  noteLabel.textContent = 'Your notes';
  noteWrap.appendChild(noteLabel);
  const noteArea = document.createElement('textarea');
  noteArea.value = getNote(state, t.id);
  noteArea.placeholder = 'Where did you find it? What worked?';
  noteArea.addEventListener('change', function () {
    setNote(state, t.id, noteArea.value);
  });
  noteWrap.appendChild(noteArea);
  panel.appendChild(noteWrap);
}

function renderRoadmap() {
  const box = $('roadmapContainer');
  clearChildren(box);
  STAGES.forEach(function (stage) {
    const card = document.createElement('div');
    card.className = 'stage-card';
    const title = document.createElement('h3');
    title.textContent = stage.title;
    card.appendChild(title);
    const note = document.createElement('p');
    note.textContent = stage.note;
    card.appendChild(note);
    const prog = stageProgress(trophies, stage.stage, state);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.className = 'bar-fill small';
    fill.style.width = prog.pct + '%';
    bar.appendChild(fill);
    card.appendChild(bar);
    const count = document.createElement('p');
    count.textContent = prog.earned + ' / ' + prog.total + ' earned · ' + prog.pct + '%';
    card.appendChild(count);
    const ul = document.createElement('ul');
    ul.className = 'stage-list';
    const stageList = stageTrophies(trophies, stage.stage);
    const shown = stageList.slice(0, 8);
    const rest = stageList.length - shown.length;
    shown.forEach(function (t) {
      const li = document.createElement('li');
      if (isEarned(state, t.id)) li.className = 'earned';
      const nm = document.createElement('span');
      nm.textContent = (isEarned(state, t.id) ? '✓ ' : '○ ') + displayName(t, state);
      li.appendChild(nm);
      if (t.count) {
        const c = document.createElement('span');
        c.className = 'stage-count';
        c.textContent = counterLabel(t, state);
        li.appendChild(c);
      }
      ul.appendChild(li);
    });
    if (rest > 0) {
      const more = document.createElement('li');
      more.textContent = '…and ' + rest + ' more in this stage — see the Tracker tab.';
      ul.appendChild(more);
    }
    card.appendChild(ul);
    box.appendChild(card);
  });
  const next = nextUp(trophies, state);
  if (next) {
    const hint = document.createElement('p');
    hint.className = 'section-intro';
    hint.textContent = 'Next up: ' + displayName(next.trophy, state) + ' (Stage ' + next.stage + ').';
    box.appendChild(hint);
  }
}

function renderMissables() {
  const box = $('missablesContainer');
  clearChildren(box);
  missableTrophies(trophies).forEach(function (t) {
    const card = document.createElement('div');
    card.className = 'miss-card';
    const nm = document.createElement('p');
    nm.className = 'row-name';
    nm.textContent = (isEarned(state, t.id) ? '✓ ' : '') + displayName(t, state);
    card.appendChild(nm);
    const ds = document.createElement('p');
    ds.className = 'row-desc';
    ds.textContent = displayDescription(t, state);
    card.appendChild(ds);
    const tag = document.createElement('span');
    tag.className = 'tag missable';
    tag.textContent = 'Stage ' + t.roadmapStage + ' · ' + t.estimatedTime;
    card.appendChild(tag);
    if (isEarned(state, t.id)) {
      const done = document.createElement('span');
      done.className = 'done';
      done.textContent = ' Earned';
      card.appendChild(done);
    }
    box.appendChild(card);
  });
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function selectTrophy(id) {
  state.selected = id;
  saveState(state);
  renderList();
  renderDetail();
}

function showView(view) {
  document.querySelectorAll('.tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.view === view);
  });
  $('view-tracker').hidden = view !== 'tracker';
  $('view-roadmap').hidden = view !== 'roadmap';
  $('view-missables').hidden = view !== 'missables';
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  $('themeToggle').textContent = state.theme === 'dark' ? 'Light theme' : 'Dark theme';
}

function openDataPanel() {
  $('exportText').value = exportProgress(state);
  $('importMsg').textContent = '';
  $('dataPanel').hidden = false;
}

async function boot() {
  const res = await fetch('data/trophies.json');
  const doc = await res.json();
  trophies = doc.trophies || doc;

  // Demo seed for screenshots: ?seed=13 marks the first 13 trophies earned.
  const seed = Number(params.get('seed'));
  if (Number.isFinite(seed) && seed > 0) {
    state.earned = trophies.slice(0, seed).map(function (t) { return t.id; });
    saveState(state);
  }
  const trophyParam = Number(params.get('trophy'));
  if (Number.isFinite(trophyParam) && trophyById(trophyParam)) state.selected = trophyParam;
  if (params.get('spoilers') === 'on') state.spoilers = true;
  if (params.get('spoilers') === 'off') state.spoilers = false;

  $('spoilerToggle').checked = state.spoilers;
  document.querySelectorAll('.filter').forEach(function (b) {
    b.classList.toggle('active', b.dataset.filter === state.filter);
  });
  applyTheme();
  renderAll();

  const view = params.get('view');
  if (view === 'roadmap' || view === 'missables' || view === 'tracker') showView(view);
  if (params.get('export') === '1') openDataPanel();

  $('searchInput').addEventListener('input', function (ev) {
    query = ev.target.value;
    renderList();
  });
  document.querySelectorAll('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      state.filter = b.dataset.filter;
      saveState(state);
      document.querySelectorAll('.filter').forEach(function (x) {
        x.classList.toggle('active', x === b);
      });
      renderList();
    });
  });
  $('spoilerToggle').addEventListener('change', function (ev) {
    state.spoilers = ev.target.checked;
    saveState(state);
    renderAll();
  });
  $('themeToggle').addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState(state);
    applyTheme();
  });
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showView(b.dataset.view); });
  });
  $('exportBtn').addEventListener('click', openDataPanel);
  $('downloadBtn').addEventListener('click', function () { downloadExport(state); });
  $('copyBtn').addEventListener('click', function () {
    $('exportText').select();
    document.execCommand('copy');
  });
  $('closeDataBtn').addEventListener('click', function () { $('dataPanel').hidden = true; });
  $('dataPanel').addEventListener('click', function (ev) {
    if (ev.target === $('dataPanel')) $('dataPanel').hidden = true;
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') $('dataPanel').hidden = true;
  });
  $('applyImportBtn').addEventListener('click', function () {
    const err = importProgress(state, $('importText').value);
    const msg = $('importMsg');
    if (err) {
      msg.textContent = err;
      msg.classList.add('error');
    } else {
      msg.textContent = 'Imported ' + state.earned.length + ' earned trophies.';
      msg.classList.remove('error');
      $('exportText').value = exportProgress(state);
      renderAll();
    }
  });
  $('importInput').addEventListener('change', async function (ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const text = await file.text();
    const err = importProgress(state, text);
    if (!err) {
      openDataPanel();
      $('importMsg').textContent = 'Imported ' + state.earned.length + ' earned trophies.';
      renderAll();
    }
  });
}

boot();

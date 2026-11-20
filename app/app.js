// Leonida Legend — GTA 6 trophy tracker.
// Plain ES module, no network, no build step. Progress lives in localStorage.
const DIFF_LABELS = { 1: 'Easy', 2: 'Straightforward', 3: 'Moderate', 4: 'Hard', 5: 'Marathon' };
const STORAGE_KEY = 'leonida-legend-progress-v1';
const STAGES = [
  { n: 1, title: 'Stage 1 — First steps in Leonida', blurb: 'Opening missions, Chapter 1 and the first activities.' },
  { n: 2, title: 'Stage 2 — The story deepens', blurb: 'Chapters 2 and 3 plus the first character finales.' },
  { n: 3, title: 'Stage 3 — Vice City opens up', blurb: 'Chapter 4, airport work and the wider map.' },
  { n: 4, title: 'Stage 4 — Grinds and golds', blurb: 'Stunts, ranges, races and challenge hunting.' },
  { n: 5, title: 'Stage 5 — Collectibles and the map', blurb: 'Cards, WAiNK spots, vehicles and every corner of Leonida.' },
  { n: 6, title: 'Stage 6 — Endgame and platinum', blurb: 'The finale, 100% completion and the cleanup list.' },
];

let trophies = [];
let earned = new Set(readStored());
let demoEarned = new Set();
const filters = { q: '', grade: 'all', kind: 'all', sort: 'default', diff: 'all', hideEarned: false, spoilers: true };

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id) => Number.isInteger(id)) : [];
  } catch (e) {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isEarned(t) {
  return earned.has(t.id) || demoEarned.has(t.id);
}

function fmtTime(mins) {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `~${m}m`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

function totalMinutes(list) {
  return list.reduce((sum, t) => sum + (t.est_minutes || 0), 0);
}

function guideHidden(t) {
  return filters.spoilers && t.hidden && !isEarned(t);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function renderProgress() {
  const done = trophies.filter(isEarned).length;
  const total = trophies.length;
  document.getElementById('progress-fill').style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
  document.getElementById('progress-text').textContent = `${done} / ${total} earned`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && isEarned(t)).length;
    return `${g[0].toUpperCase() + g.slice(1)} ${got}/${all}`;
  });
  document.getElementById('grade-stats').textContent = byGrade.join('  ·  ');
  const left = totalMinutes(trophies.filter((t) => !isEarned(t)));
  const full = totalMinutes(trophies);
  document.getElementById('time-left').textContent =
    `${fmtTime(left)} of trophy work left · full run ${fmtTime(full)}`;
}

function cardEl(t) {
  const card = el('article', `card grade-${t.grade}${isEarned(t) ? ' earned' : ''}`);
  const head = el('div', 'card-head');
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'card-check';
  check.checked = isEarned(t);
  check.setAttribute('aria-label', `Mark ${t.name} earned`);
  check.addEventListener('change', () => {
    if (check.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    render();
  });
  head.appendChild(check);
  head.appendChild(el('h3', 'card-name', t.name));
  head.appendChild(el('span', 'grade-pill', t.grade));
  card.appendChild(head);

  card.appendChild(el('p', 'card-desc', t.description));

  if (guideHidden(t)) {
    card.appendChild(el('p', 'spoiler-note', 'Hidden trophy — guide hidden until earned or spoilers are shown.'));
  } else {
    card.appendChild(el('p', 'card-guide', t.guide));
    const steps = el('ol', 'card-steps');
    t.steps.forEach((s) => steps.appendChild(el('li', null, s)));
    card.appendChild(steps);
  }

  const pill = el('span', 'time-pill', `EST ${fmtTime(t.est_minutes)} · ${DIFF_LABELS[t.difficulty] || 'Moderate'} ${t.difficulty}/5`);
  card.appendChild(pill);
  if (t.count_note) card.appendChild(el('span', 'count-flag', t.count_note));
  if (t.kind === 'missable') card.appendChild(el('span', 'missable-badge', 'Missable'));

  const src = el('p', 'card-sources', 'Sources: ');
  t.sources.forEach((name, i) => {
    if (i > 0) src.appendChild(document.createTextNode(', '));
    src.appendChild(el('span', null, name));
  });
  card.appendChild(src);
  return card;
}

function applyFilters(list) {
  const q = filters.q.trim().toLowerCase();
  return list.filter((t) => {
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.diff !== 'all' && String(t.difficulty) !== filters.diff) return false;
    if (filters.hideEarned && isEarned(t)) return false;
    if (q) {
      const hay = `${t.name} ${t.guide} ${(t.steps || []).join(' ')} ${DIFF_LABELS[t.difficulty] || ''} ${t.kind} ${t.grade}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filters.sort === 'quickest') return (a.est_minutes || 0) - (b.est_minutes || 0);
    if (filters.sort === 'longest') return (b.est_minutes || 0) - (a.est_minutes || 0);
    return a.stage - b.stage || a.id - b.id;
  });
}

function renderCards() {
  const box = document.getElementById('cards');
  box.replaceChildren();
  const shown = applyFilters(trophies);
  shown.forEach((t) => box.appendChild(cardEl(t)));
  document.getElementById('empty').hidden = shown.length !== 0;
  document.getElementById('count').textContent = `Showing ${shown.length} of ${trophies.length} trophies`;
}

function renderRoadmap() {
  const box = document.getElementById('roadmap');
  box.replaceChildren();
  for (const stage of STAGES) {
    const items = trophies.filter((t) => t.stage === stage.n).sort((a, b) => a.id - b.id);
    const done = items.filter(isEarned).length;
    const left = totalMinutes(items.filter((t) => !isEarned(t)));
    const wrap = el('div', 'stage');
    wrap.appendChild(el('h3', null, stage.title));
    wrap.appendChild(el('p', 'stage-meta', `${stage.blurb} ${done}/${items.length} earned · ${fmtTime(left)} left`));
    const list = el('ul', 'stage-list');
    items.forEach((t) => {
      const name = guideHidden(t) ? 'Hidden trophy (story)' : t.name;
      const li = el('li', isEarned(t) ? 'done' : null, `${name} — ${fmtTime(t.est_minutes)} · ${DIFF_LABELS[t.difficulty] || 'Moderate'} ${t.difficulty}/5`);
      list.appendChild(li);
    });
    wrap.appendChild(list);
    box.appendChild(wrap);
  }
}

function render() {
  renderProgress();
  renderCards();
  renderRoadmap();
}

function setTab(name) {
  const checklist = name === 'checklist';
  document.getElementById('tab-checklist').classList.toggle('active', checklist);
  document.getElementById('tab-roadmap').classList.toggle('active', !checklist);
  document.getElementById('tab-checklist').setAttribute('aria-selected', String(checklist));
  document.getElementById('tab-roadmap').setAttribute('aria-selected', String(!checklist));
  document.getElementById('view-checklist').hidden = !checklist;
  document.getElementById('view-roadmap').hidden = checklist;
}

function wireToolbar() {
  document.getElementById('search').addEventListener('input', (e) => {
    filters.q = e.target.value;
    renderCards();
  });
  document.getElementById('grade-filter').addEventListener('change', (e) => {
    filters.grade = e.target.value;
    renderCards();
  });
  document.getElementById('sort').addEventListener('change', (e) => {
    filters.sort = e.target.value;
    renderCards();
  });
  document.getElementById('diff-filter').addEventListener('change', (e) => {
    filters.diff = e.target.value;
    renderCards();
  });
  document.getElementById('hide-earned').addEventListener('change', (e) => {
    filters.hideEarned = e.target.checked;
    renderCards();
  });
  document.getElementById('spoiler-toggle').addEventListener('change', (e) => {
    filters.spoilers = e.target.checked;
    render();
  });
  document.querySelectorAll('#kind-chips .kind-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.kind = btn.dataset.kind;
      document.querySelectorAll('#kind-chips .kind-chip').forEach((b) =>
        b.classList.toggle('active', b === btn));
      renderCards();
    });
  });
  document.getElementById('tab-checklist').addEventListener('click', () => setTab('checklist'));
  document.getElementById('tab-roadmap').addEventListener('click', () => setTab('roadmap'));
}

function wireTools() {
  const msg = document.getElementById('tool-msg');
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = { app: 'leonida-legend', exported_at: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leonida-legend-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
    msg.textContent = `Exported ${earned.size} earned trophies.`;
  });
  const fileInput = document.getElementById('import-file');
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const ids = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(ids)) throw new Error('bad file');
        const valid = new Set(trophies.map((t) => t.id));
        const kept = ids.filter((id) => valid.has(id));
        earned = new Set(kept);
        save();
        render();
        msg.textContent = `Imported ${kept.length} earned trophies.`;
      } catch (e) {
        msg.textContent = 'Import failed: that file is not a Leonida Legend progress export.';
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress? This clears every earned tick.')) return;
    earned = new Set();
    save();
    render();
    msg.textContent = 'Progress reset.';
  });
}

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'roadmap') setTab('roadmap');
  const kind = params.get('kind');
  if (kind && ['story', 'activities', 'collectibles', 'missable'].includes(kind)) {
    filters.kind = kind;
    document.querySelectorAll('#kind-chips .kind-chip').forEach((b) =>
      b.classList.toggle('active', b.dataset.kind === kind));
  }
  if (params.get('spoiler') === 'off') {
    filters.spoilers = false;
    document.getElementById('spoiler-toggle').checked = false;
  }
  if (params.get('demo') === '1') {
    // Demo ticks for screenshots: a few early trophies, in-memory only, never saved.
    demoEarned = new Set([2, 8, 16, 21]);
  }
}

async function init() {
  const res = await fetch('data/trophies.json');
  const data = await res.json();
  trophies = Array.isArray(data) ? data : data.trophies;
  wireToolbar();
  wireTools();
  applyUrlParams();
  render();
}

init();

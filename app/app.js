// Leonida Legend — GTA 6 trophy tracker.
// Plain static app: fetch data/trophies.json once, keep ticks in localStorage,
// export/import as JSON. No network requests at run time beyond that local file.
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoiler';

const $ = (id) => document.getElementById(id);
const listEl = $('list'), roadmapEl = $('roadmap');
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let kindFilter = 'all';
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byName = new Map(trophies.map((t) => [t.name, t]));

const STAGES = [
  { n: 1, title: 'First: the one missable', text: 'Do Lucia’s Chapter 1 balcony meditation before Chapter 1 ends — it vanishes afterwards and there is no mission replay. Make a manual Chapter 1 save first.' },
  { n: 2, title: 'Play the story', text: 'Chapters 1–4, the final mission, and the named story missions. All unmissable — just play them in order.' },
  { n: 3, title: 'Stranger strands', text: 'Eight stranger mission strands, ending with a finale each (Andy, Kenton, Billy, Randy, Tyrone, Bret). Do the Chapter 3 strand “Race Against Yago” while Chapter 3 is current — it is time-sensitive.' },
  { n: 4, title: 'Activities & skills', text: 'Races, stunts, shooting range, drone races, heists, vaults, robberies, wanted-level feats and the long-haul counters. The bulk of the post-story grind.' },
  { n: 5, title: 'Collectibles & exploration', text: 'Cards, WAiNK spots, vehicles, garages and every area of Leonida. Pick these up as you travel; finish the stragglers last.' },
  { n: 6, title: 'Cleanup & 100%', text: '70 of 80 Challenges, 200 of 277 vehicles, all 8 bank vaults, 300 stunts — the 100% checklist that ends with the platinum.' },
];
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities' };

function save() { localStorage.setItem(KEY, JSON.stringify([...earned])); }

function gradeBadge(t) {
  const s = document.createElement('span');
  s.className = `grade grade-${t.grade}`;
  s.textContent = t.grade;
  return s;
}
function kindBadge(t) {
  const s = document.createElement('span');
  s.className = 'kind';
  s.textContent = KIND_LABEL[t.kind] ?? t.kind;
  return s;
}

function card(t) {
  const spoilerOn = $('spoiler').checked;
  const isEarned = earned.has(t.name);
  const hiddenNow = spoilerOn && t.hidden && !isEarned;
  const el = document.createElement('article');
  el.className = 'card' + (isEarned ? ' earned' : '');

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', `Mark ${hiddenNow ? 'hidden story trophy' : t.name} earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name); else earned.delete(t.name);
    save(); render();
  });
  head.append(box);
  const title = document.createElement('h3');
  title.textContent = hiddenNow ? 'Hidden story trophy' : t.name;
  head.append(title, gradeBadge(t), kindBadge(t));
  if (t.missable && t.kind !== 'missable') {
    const b = document.createElement('span'); b.className = 'badge missable'; b.textContent = 'MISSABLE';
    head.append(b);
  }
  if (t.at_risk) {
    const b = document.createElement('span'); b.className = 'badge atrisk'; b.textContent = 'TIME-SENSITIVE';
    b.title = t.at_risk; head.append(b);
  }
  if (t.unconfirmed) {
    const b = document.createElement('span'); b.className = 'badge unconf'; b.textContent = 'COUNT UNCONFIRMED';
    b.title = 'This count comes from launch-week lists and has not been independently re-verified.';
    head.append(b);
  }
  el.append(head);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = hiddenNow ? 'Complete this story moment to reveal it.' : t.description;
  el.append(desc);

  if (hiddenNow) {
    const p = document.createElement('p');
    p.className = 'guide hidden-note';
    p.textContent = 'Guide hidden until earned — turn off “Hide story spoilers” to read it now.';
    el.append(p);
  } else {
    const g = document.createElement('p');
    g.className = 'guide';
    g.textContent = t.guide;
    el.append(g);
    if (t.steps && t.steps.length) {
      const ol = document.createElement('ol');
      ol.className = 'steps';
      for (const s of t.steps) { const li = document.createElement('li'); li.textContent = s; ol.append(li); }
      el.append(ol);
    }
    const src = document.createElement('p');
    src.className = 'sources';
    src.textContent = 'Source: ';
    t.sources.forEach((s, i) => {
      if (i) src.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = s.url; a.textContent = s.name; a.target = '_blank'; a.rel = 'noopener';
      src.append(a);
    });
    el.append(src);
  }
  return el;
}

function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const g = $('grade').value;
  return trophies.filter((t) => {
    if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
    if (g !== 'all' && t.grade !== g) return false;
    if ($('earnedonly').checked && !earned.has(t.name)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
}

function render() {
  $('spoiler').checked = localStorage.getItem(SPOILER_KEY) === '1';
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  $('totals').textContent = `${n} of ${total} trophies earned · ${pct}% to the platinum`;
  $('barfill').style.width = `${pct}%`;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? [0, 0];
    byGrade[t.grade][1]++;
    if (earned.has(t.name)) byGrade[t.grade][0]++;
  }
  $('stats').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${byGrade[g][0]}/${byGrade[g][1]} ${g}`).join(' · ')
    + ' · est. ~200 h to platinum';

  const shown = visibleTrophies();
  listEl.replaceChildren();
  for (const t of shown) listEl.append(card(t));
  $('count').textContent = shown.length === total
    ? `Showing all ${total} trophies.`
    : `Showing ${shown.length} of ${total} trophies.`;

  roadmapEl.replaceChildren();
  for (const st of STAGES) {
    const sec = document.createElement('section');
    sec.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = `Stage ${st.n} — ${st.title}`;
    const p = document.createElement('p');
    p.className = 'stage-text'; p.textContent = st.text;
    sec.append(h, p);
    const items = trophies.filter((t) => t.stage === st.n);
    const done = items.filter((t) => earned.has(t.name)).length;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = `${done}/${items.length} earned in this stage`;
    sec.append(meta);
    for (const t of items) sec.append(card(t));
    roadmapEl.append(sec);
  }
}

document.querySelectorAll('#kinds .chip').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#kinds .chip').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    kindFilter = b.dataset.kind;
    render();
  });
});
$('search').addEventListener('input', render);
$('grade').addEventListener('change', render);
$('earnedonly').addEventListener('change', render);
$('spoiler').addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, $('spoiler').checked ? '1' : '0');
  render();
});
$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const next = new Set((names ?? []).filter((n) => byName.has(n)));
    earned = next; save(); render();
  } catch { alert('That file is not valid trophy progress JSON.'); }
  e.target.value = '';
});
$('reset').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) { earned = new Set(); save(); render(); }
});
function showTab(which) {
  $('tab-checklist').classList.toggle('active', which === 'checklist');
  $('tab-roadmap').classList.toggle('active', which === 'roadmap');
  $('view-checklist').hidden = which !== 'checklist';
  $('view-roadmap').hidden = which !== 'roadmap';
}
$('tab-checklist').addEventListener('click', () => showTab('checklist'));
$('tab-roadmap').addEventListener('click', () => showTab('roadmap'));

render();

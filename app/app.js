// Leonida Legend — GTA 6 Trophy Guide & Tracker.
// Plain ES module, no dependencies, no network at run time: it fetches only
// data/trophies.json from its own folder and keeps progress in localStorage.

const DATA_URL = "data/trophies.json";
const EARNED_KEY = "leonida-legend-earned-v1";
const SPOILER_KEY = "leonida-legend-spoiler-v1";

const DIFFICULTY_LABELS = {
  1: "Easy",
  2: "Steady",
  3: "Demanding",
  4: "Hard",
  5: "Marathon",
};

const STAGES = [
  { n: 1, name: "Welcome to Leonida", note: "Chapters 1–2 and your first jobs. Do the missable meditation trophy here, before Chapter 1 ends." },
  { n: 2, name: "Vice City, Baby", note: "Chapters 3–4 — the story moves into Vice City proper." },
  { n: 3, name: "Endgame", note: "Final missions, character finales, and 100% completion." },
  { n: 4, name: "Side Hustles", note: "The big activity grind: races, challenges, combat feats, and money jobs." },
  { n: 5, name: "Money, Property & Collections", note: "Collectible sets, exploration, and the property hunt." },
  { n: 6, name: "Leonida Legend", note: "The platinum — it pops automatically with your 54th trophy." },
];

const params = new URLSearchParams(location.search);
const demoMode = params.get("demo") === "1";

let trophies = [];
let earned = new Set();
let spoilerOn = true;
let activeKind = "all";

const $ = (id) => document.getElementById(id);

function loadEarned() {
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    if (raw) earned = new Set(JSON.parse(raw));
  } catch (_) {
    earned = new Set();
  }
  if (demoMode) {
    // Demo ticks a spread of trophies in memory only, for screenshots.
    [2, 3, 8, 16, 21, 44, 46].forEach((id) => earned.add(id));
  }
}

function saveEarned() {
  if (demoMode) return;
  try {
    localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
  } catch (_) {
    /* storage unavailable (file:// or private mode) — progress lives in memory */
  }
}

function loadSpoiler() {
  if (params.get("spoiler") === "off") return false;
  try {
    const raw = localStorage.getItem(SPOILER_KEY);
    if (raw !== null) return raw === "1";
  } catch (_) {
    /* ignore */
  }
  return true;
}

function saveSpoiler() {
  if (demoMode) return;
  try {
    localStorage.setItem(SPOILER_KEY, spoilerOn ? "1" : "0");
  } catch (_) {
    /* ignore */
  }
}

function fmtMinutes(mins) {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return m + "m";
  if (m === 0) return h + "h";
  return h + "h " + m + "m";
}

function timePill(t) {
  if (t.est_minutes <= 0) return "PLATINUM · " + DIFFICULTY_LABELS[t.difficulty] + " " + t.difficulty + "/5";
  return "EST ~" + fmtMinutes(t.est_minutes) + " · " + DIFFICULTY_LABELS[t.difficulty] + " " + t.difficulty + "/5";
}

function spoilerHidden(t) {
  return spoilerOn && t.hidden && !earned.has(t.id);
}

function updateHero() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.id)).length;
  $("progress-fill").style.width = total ? (100 * done / total) + "%" : "0%";
  $("progress-line").textContent = done + " / " + total + " earned (" + (total ? Math.round(100 * done / total) : 0) + "%)";
  const grades = ["platinum", "gold", "silver", "bronze"];
  $("grade-stats").textContent = grades
    .map((g) => {
      const all = trophies.filter((t) => t.grade === g).length;
      const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
      return g + " " + got + "/" + all;
    })
    .join(" · ");
  const remaining = trophies.filter((t) => !earned.has(t.id)).reduce((s, t) => s + t.est_minutes, 0);
  const full = trophies.reduce((s, t) => s + t.est_minutes, 0);
  $("time-line").textContent = "~" + fmtMinutes(remaining) + " of trophy work left · full run ~" + fmtMinutes(full);
}

function cardElement(t) {
  const card = document.createElement("article");
  card.className = "card grade-" + t.grade + (earned.has(t.id) ? " earned" : "");
  card.dataset.trophyId = String(t.id);

  const top = document.createElement("div");
  top.className = "card-top";
  const tick = document.createElement("input");
  tick.type = "checkbox";
  tick.checked = earned.has(t.id);
  tick.setAttribute("aria-label", "Mark " + t.name + " earned");
  tick.addEventListener("change", () => {
    if (tick.checked) earned.add(t.id); else earned.delete(t.id);
    saveEarned();
    renderAll();
  });
  const name = document.createElement("h3");
  name.className = "card-name";
  name.textContent = spoilerHidden(t) ? "Hidden trophy" : t.name;
  top.append(tick, name);
  card.append(top);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = spoilerHidden(t) ? "A hidden trophy — its name and description stay secret until you earn it (or turn spoilers off)." : t.description;
  card.append(desc);

  const badges = document.createElement("div");
  badges.className = "badges";
  const gradeBadge = document.createElement("span");
  gradeBadge.className = "badge grade-" + t.grade;
  gradeBadge.textContent = t.grade;
  badges.append(gradeBadge);
  const kindBadge = document.createElement("span");
  kindBadge.className = "badge";
  kindBadge.textContent = t.kind;
  badges.append(kindBadge);
  if (t.hidden) {
    const hb = document.createElement("span");
    hb.className = "badge hidden-badge";
    hb.textContent = "hidden";
    badges.append(hb);
  }
  if (t.missable) {
    const mb = document.createElement("span");
    mb.className = "badge missable";
    mb.textContent = "MISSABLE";
    badges.append(mb);
  }
  if (t.count_unconfirmed) {
    const ub = document.createElement("span");
    ub.className = "badge unconfirmed";
    ub.textContent = "COUNT UNCONFIRMED";
    badges.append(ub);
  }
  card.append(badges);

  const pill = document.createElement("span");
  pill.className = "time-pill";
  pill.textContent = timePill(t);
  card.append(pill);

  if (spoilerHidden(t)) {
    const note = document.createElement("p");
    note.className = "card-guide spoiler-hidden";
    note.textContent = "Guide hidden — earn this trophy, or switch “Hide spoilers” off above.";
    card.append(note);
  } else {
    const guide = document.createElement("div");
    guide.className = "card-guide";
    const p = document.createElement("p");
    p.textContent = t.guide;
    guide.append(p);
    if (t.steps && t.steps.length) {
      const ol = document.createElement("ol");
      t.steps.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        ol.append(li);
      });
      guide.append(ol);
    }
    card.append(guide);
    const src = document.createElement("p");
    src.className = "card-sources";
    src.textContent = "Sources: " + (t.sources || ["Exophase", "PSNProfiles"]).join(" · ");
    card.append(src);
  }
  return card;
}

function visibleTrophies() {
  const q = $("search").value.trim().toLowerCase();
  const grade = $("grade-filter").value;
  const diff = $("difficulty-filter").value;
  const sort = $("sort").value;
  const hideEarned = $("hide-earned").checked;
  let list = trophies.filter((t) => {
    if (activeKind !== "all" && t.kind !== activeKind) return false;
    if (grade !== "all" && t.grade !== grade) return false;
    if (diff !== "all" && String(t.difficulty) !== diff) return false;
    if (hideEarned && earned.has(t.id)) return false;
    if (q) {
      const hay = (t.name + " " + t.description + " " + t.guide + " " + DIFFICULTY_LABELS[t.difficulty] + " " + t.kind).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (sort === "quickest") list = [...list].sort((a, b) => a.est_minutes - b.est_minutes);
  if (sort === "longest") list = [...list].sort((a, b) => b.est_minutes - a.est_minutes);
  return list;
}

function renderCards() {
  const list = visibleTrophies();
  const box = $("cards");
  box.innerHTML = "";
  list.forEach((t) => box.append(cardElement(t)));
  $("count-line").textContent = list.length === trophies.length
    ? "Showing all " + list.length + " trophies."
    : "Showing " + list.length + " of " + trophies.length + " trophies.";
}

function renderRoadmap() {
  const box = $("stages");
  box.innerHTML = "";
  STAGES.forEach((stage) => {
    const members = trophies.filter((t) => t.stage === stage.n);
    const remaining = members.filter((t) => !earned.has(t.id)).reduce((s, t) => s + t.est_minutes, 0);
    const done = members.filter((t) => earned.has(t.id)).length;
    const section = document.createElement("section");
    section.className = "stage";
    const h = document.createElement("h2");
    h.textContent = "Stage " + stage.n + " — " + stage.name;
    section.append(h);
    const meta = document.createElement("p");
    meta.className = "stage-meta";
    meta.textContent = done + "/" + members.length + " earned · ~" + fmtMinutes(remaining) + " left";
    section.append(meta);
    const note = document.createElement("p");
    note.textContent = stage.note;
    section.append(note);
    const ul = document.createElement("ul");
    ul.className = "stage-list";
    members.forEach((t) => {
      const li = document.createElement("li");
      if (earned.has(t.id)) li.className = "done";
      const tick = document.createElement("span");
      tick.textContent = earned.has(t.id) ? "☑" : "☐";
      const name = document.createElement("span");
      name.textContent = spoilerHidden(t) ? "Hidden trophy" : t.name;
      const time = document.createElement("span");
      time.className = "stage-time";
      time.textContent = t.est_minutes > 0 ? "~" + fmtMinutes(t.est_minutes) : "—";
      li.append(tick, name, time);
      ul.append(li);
    });
    section.append(ul);
    box.append(section);
  });
}

function renderAll() {
  updateHero();
  renderCards();
  renderRoadmap();
}

function switchTab(tab) {
  const checklist = tab === "checklist";
  $("tab-checklist").classList.toggle("active", checklist);
  $("tab-roadmap").classList.toggle("active", !checklist);
  $("tab-checklist").setAttribute("aria-selected", String(checklist));
  $("tab-roadmap").setAttribute("aria-selected", String(!checklist));
  $("view-checklist").classList.toggle("hidden", !checklist);
  $("view-roadmap").classList.toggle("hidden", checklist);
}

function exportProgress() {
  const data = { game: "Grand Theft Auto VI", earned: [...earned].sort((a, b) => a - b), exported_at: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "leonida-legend-progress.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error("no earned list");
      const valid = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((id) => valid.has(Number(id))).map(Number));
      saveEarned();
      renderAll();
      alert("Imported " + earned.size + " earned trophies.");
    } catch (e) {
      alert("Could not import that file: " + e.message);
    }
  };
  reader.readAsText(file);
}

async function init() {
  const res = await fetch(DATA_URL);
  const data = await res.json();
  trophies = data.trophies || data;
  loadEarned();
  spoilerOn = loadSpoiler();
  $("spoiler").checked = spoilerOn;

  if (params.get("tab") === "roadmap") switchTab("roadmap");
  if (params.get("kind")) {
    const k = params.get("kind");
    if (["story", "activities", "collectibles", "missable"].includes(k)) {
      activeKind = k;
      document.querySelectorAll("#kind-chips .chip").forEach((c) => c.classList.toggle("active", c.dataset.kind === k));
    }
  }

  $("search").addEventListener("input", renderCards);
  $("grade-filter").addEventListener("change", renderCards);
  $("difficulty-filter").addEventListener("change", renderCards);
  $("sort").addEventListener("change", renderCards);
  $("hide-earned").addEventListener("change", renderCards);
  $("spoiler").addEventListener("change", (e) => {
    spoilerOn = e.target.checked;
    saveSpoiler();
    renderAll();
  });
  document.querySelectorAll("#kind-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeKind = chip.dataset.kind;
      document.querySelectorAll("#kind-chips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderCards();
    });
  });
  $("tab-checklist").addEventListener("click", () => switchTab("checklist"));
  $("tab-roadmap").addEventListener("click", () => switchTab("roadmap"));
  $("export-btn").addEventListener("click", exportProgress);
  $("import-file").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = "";
  });
  $("reset-btn").addEventListener("click", () => {
    if (confirm("Reset all progress? This clears every ticked trophy.")) {
      earned = new Set();
      saveEarned();
      renderAll();
    }
  });

  renderAll();
}

init();

// Leonida Legend — checklist, tracker and roadmap for GTA VI's 55 trophies.
// Loads app/data/trophies.json, keeps progress in localStorage, renders the
// checklist and the roadmap tab, and handles search, filters, sort, spoiler
// mode, export, import and reset. No network requests beyond its own files.

import { difficultyLabel, formatMinutes, totalMinutes, remainingMinutes } from "./src/time.js";
import { renderRoadmap } from "./src/roadmap.js";

const STORAGE_KEY = "leonida-legend-earned-v1";
const DEMO_EARNED = [2, 3, 4, 8, 10, 21, 37, 44, 46, 48, 53, 55];

const state = {
  trophies: [],
  earned: new Set(),
  grade: "all",
  kind: "all",
  sort: "default",
  difficulty: "any",
  hideEarned: false,
  spoiler: true,
  query: "",
  demo: false,
};

const $ = (id) => document.getElementById(id);

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function saveEarned() {
  if (state.demo) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

function gradeWord(g) {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function kindWord(k) {
  return k === "missable" ? "Missable" : k.charAt(0).toUpperCase() + k.slice(1);
}

function matches(t) {
  if (state.grade !== "all" && t.grade !== state.grade) return false;
  if (state.kind !== "all" && t.kind !== state.kind) return false;
  if (state.difficulty !== "any" && String(t.difficulty) !== state.difficulty) return false;
  if (state.hideEarned && state.earned.has(t.id)) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    const hay = (t.name + " " + t.guide + " " + difficultyLabel(t.difficulty) + " " + t.source).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sorted(list) {
  const arr = [...list];
  if (state.sort === "quickest") arr.sort((a, b) => a.est_minutes - b.est_minutes || a.id - b.id);
  else if (state.sort === "longest") arr.sort((a, b) => b.est_minutes - a.est_minutes || a.id - b.id);
  else arr.sort((a, b) => a.stage - b.stage || a.id - b.id);
  return arr;
}

function makeCard(t) {
  const card = document.createElement("article");
  card.className = "card grade-" + t.grade;
  if (state.earned.has(t.id)) card.classList.add("earned");
  const hiddenStory = state.spoiler && t.kind === "story" && !state.earned.has(t.id);
  if (hiddenStory) card.classList.add("spoiler-hidden");

  const top = document.createElement("div");
  top.className = "card-top";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "card-check";
  check.checked = state.earned.has(t.id);
  check.setAttribute("aria-label", "Mark " + t.name + " as earned");
  check.addEventListener("change", () => {
    if (check.checked) state.earned.add(t.id);
    else state.earned.delete(t.id);
    saveEarned();
    renderAll();
  });
  const name = document.createElement("h3");
  name.className = "card-name";
  name.textContent = t.name;
  top.appendChild(check);
  top.appendChild(name);
  card.appendChild(top);

  if (hiddenStory) {
    const note = document.createElement("p");
    note.className = "spoiler-note";
    note.textContent = "Hidden story trophy — earn it to reveal its name and guide.";
    card.appendChild(note);
    const pill = document.createElement("span");
    pill.className = "time-pill";
    pill.textContent = "EST " + formatMinutes(t.est_minutes) + " · " + difficultyLabel(t.difficulty) + " " + t.difficulty + "/5";
    card.appendChild(pill);
    return card;
  }

  const badges = document.createElement("div");
  badges.className = "badges";
  const gradeBadge = document.createElement("span");
  gradeBadge.className = "badge grade-" + t.grade;
  gradeBadge.textContent = gradeWord(t.grade);
  const kindBadge = document.createElement("span");
  kindBadge.className = "badge kind";
  kindBadge.textContent = kindWord(t.kind);
  badges.appendChild(gradeBadge);
  badges.appendChild(kindBadge);
  if (t.missable) {
    const m = document.createElement("span");
    m.className = "badge missable";
    m.textContent = "Missable";
    badges.appendChild(m);
  }
  card.appendChild(badges);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = t.description;
  card.appendChild(desc);

  const pill = document.createElement("span");
  pill.className = "time-pill";
  pill.textContent = "EST " + formatMinutes(t.est_minutes) + " · " + difficultyLabel(t.difficulty) + " " + t.difficulty + "/5";
  card.appendChild(pill);

  const guide = document.createElement("p");
  guide.className = "card-guide";
  guide.textContent = t.guide;
  card.appendChild(guide);

  const src = document.createElement("p");
  src.className = "card-source";
  src.innerHTML = "";
  src.textContent = "Source: ";
  const strong = document.createElement("strong");
  strong.textContent = t.source;
  src.appendChild(strong);
  card.appendChild(src);

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Steps (" + t.steps.length + ")";
  details.appendChild(summary);
  const ol = document.createElement("ol");
  for (const step of t.steps) {
    const li = document.createElement("li");
    li.textContent = step;
    ol.appendChild(li);
  }
  details.appendChild(ol);
  card.appendChild(details);
  return card;
}

function renderCards() {
  const box = $("cards");
  box.innerHTML = "";
  const shown = sorted(state.trophies.filter(matches));
  $("result-count").textContent = "Showing " + shown.length + " of " + state.trophies.length + " trophies";
  if (shown.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-note";
    p.textContent = "No trophies match these filters. Loosen the search or clear a filter.";
    box.appendChild(p);
    return;
  }
  for (const t of shown) box.appendChild(makeCard(t));
}

function renderProgress() {
  const total = state.trophies.length;
  const earnedCount = state.earned.size;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  $("progress-fill").style.width = pct + "%";
  $("progress-count").textContent = earnedCount + " / " + total + " earned";
  const left = remainingMinutes(state.trophies, state.earned);
  const full = totalMinutes(state.trophies);
  $("time-left").textContent = left === 0
    ? "All trophies earned — Leonida Legend!"
    : formatMinutes(left) + " of trophy work left · full run " + formatMinutes(full);
  const grades = ["platinum", "gold", "silver", "bronze"];
  $("grade-stats").textContent = grades
    .map((g) => {
      const inGrade = state.trophies.filter((t) => t.grade === g);
      const got = inGrade.filter((t) => state.earned.has(t.id)).length;
      return gradeWord(g) + " " + got + "/" + inGrade.length;
    })
    .join(" · ");
}

function renderAll() {
  renderProgress();
  renderCards();
  renderRoadmap($("roadmap"), state.trophies, state.earned);
}

function setTab(which) {
  const checklist = which === "checklist";
  $("tab-checklist").classList.toggle("active", checklist);
  $("tab-roadmap").classList.toggle("active", !checklist);
  $("tab-checklist").setAttribute("aria-selected", String(checklist));
  $("tab-roadmap").setAttribute("aria-selected", String(!checklist));
  $("view-checklist").classList.toggle("hidden", !checklist);
  $("view-roadmap").classList.toggle("hidden", checklist);
}

function wireFilters() {
  $("search").addEventListener("input", (e) => { state.query = e.target.value.trim(); renderCards(); });
  $("grade-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-grade]");
    if (!btn) return;
    state.grade = btn.dataset.grade;
    [...$("grade-filters").children].forEach((b) => b.classList.toggle("active", b === btn));
    renderCards();
  });
  $("kind-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-kind]");
    if (!btn) return;
    state.kind = btn.dataset.kind;
    [...$("kind-filters").children].forEach((b) => b.classList.toggle("active", b === btn));
    renderCards();
  });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderCards(); });
  $("difficulty-filter").addEventListener("change", (e) => { state.difficulty = e.target.value; renderCards(); });
  $("earned-only").addEventListener("change", (e) => { state.hideEarned = e.target.checked; renderCards(); });
  $("spoiler").addEventListener("change", (e) => { state.spoiler = e.target.checked; renderCards(); });
  $("tab-checklist").addEventListener("click", () => setTab("checklist"));
  $("tab-roadmap").addEventListener("click", () => setTab("roadmap"));
}

function wireTools() {
  $("export-btn").addEventListener("click", () => {
    const data = { app: "leonida-legend", earned: [...state.earned].sort((a, b) => a - b), exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leonida-legend-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ids = Array.isArray(data.earned) ? data.earned : data;
      const valid = new Set(state.trophies.map((t) => t.id));
      state.earned = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      saveEarned();
      renderAll();
    } catch {
      alert("That file is not a valid Leonida Legend progress export.");
    }
    e.target.value = "";
  });
  $("reset-btn").addEventListener("click", () => {
    if (!confirm("Reset all earned trophies? This clears your saved progress.")) return;
    state.earned = new Set();
    saveEarned();
    renderAll();
  });
}

// Screenshot helpers: ?tab=roadmap, ?kind=missable, ?grade=silver,
// ?spoiler=off and ?demo=1 (pre-ticks 12 trophies in memory only).
function applyParams() {
  const params = new URLSearchParams(location.search);
  if (params.get("tab") === "roadmap") setTab("roadmap");
  const kind = params.get("kind");
  if (kind) {
    state.kind = kind;
    [...$("kind-filters").children].forEach((b) => b.classList.toggle("active", b.dataset.kind === kind));
  }
  const grade = params.get("grade");
  if (grade) {
    state.grade = grade;
    [...$("grade-filters").children].forEach((b) => b.classList.toggle("active", b.dataset.grade === grade));
  }
  if (params.get("spoiler") === "off") {
    state.spoiler = false;
    $("spoiler").checked = false;
  }
  if (params.get("demo") === "1") {
    state.demo = true;
    state.earned = new Set(DEMO_EARNED);
  }
}

async function init() {
  const res = await fetch("./data/trophies.json");
  const data = await res.json();
  state.trophies = data.trophies;
  state.earned = loadEarned();
  wireFilters();
  wireTools();
  applyParams();
  renderAll();
}

init();

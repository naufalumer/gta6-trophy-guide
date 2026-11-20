// Leonida Legend — GTA 6 Trophy Guide & Tracker
// Plain ES module, no network at run time. Progress lives in localStorage.

const STORE_KEY = "leonida-legend-progress-v1";
const PANELS = ["heli", "couple", "bike", "car", "city", "gunman", "gator", "flamingo", "boat"];
const DIFF_LABEL = { 1: "Quick", 2: "Easy", 3: "Moderate", 4: "Hard", 5: "Marathon" };
const STAGE_NAMES = {
  1: "Stage 1 — First Steps",
  2: "Stage 2 — The Story, Part One",
  3: "Stage 3 — The Story, Part Two",
  4: "Stage 4 — The Open World Grind",
  5: "Stage 5 — Collectibles & Completion",
  6: "Stage 6 — The Finale",
};
const SOURCE_LINKS = {
  Exophase: "https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/",
  PSNProfiles: "https://psnprofiles.com/trophies/grand-theft-auto-vi",
  OutputLag: "https://outputlag.com/",
  PlanetGTA6: "https://planetgta6.com/",
};

const state = {
  trophies: [],
  earned: new Set(),
  search: "",
  grade: "all",
  kind: "all",
  difficulty: "all",
  sort: "default",
  earnedOnly: false,
  spoiler: true,
  tab: "checklist",
};

const $ = (sel) => document.querySelector(sel);

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

function fmtMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function remainingMinutes() {
  return state.trophies
    .filter((t) => !state.earned.has(t.id))
    .reduce((sum, t) => sum + (t.est_minutes || 0), 0);
}

function totalMinutes() {
  return state.trophies.reduce((sum, t) => sum + (t.est_minutes || 0), 0);
}

function renderHero() {
  const grid = $("#heroGrid");
  grid.innerHTML = PANELS.map(
    (p) => `<img src="panels/${p}.jpg" alt="GTA-style cover panel: ${p}" loading="lazy">`,
  ).join("");
}

function renderProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  $("#progressText").textContent = `${done} / ${total} earned`;
  $("#progressFill").style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
  $("#timeLeft").textContent =
    `~${fmtMinutes(remainingMinutes())} of trophy work left · full run ~${fmtMinutes(totalMinutes())}`;
  const byGrade = {};
  for (const t of state.trophies) {
    byGrade[t.grade] = byGrade[t.grade] || { got: 0, all: 0 };
    byGrade[t.grade].all += 1;
    if (state.earned.has(t.id)) byGrade[t.grade].got += 1;
  }
  $("#gradeStats").innerHTML = ["platinum", "gold", "silver", "bronze"]
    .map((g) => `<span><b>${byGrade[g]?.got ?? 0}/${byGrade[g]?.all ?? 0}</b> ${g}</span>`)
    .join("");
}

function trophyVisible(t) {
  const q = state.search.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${DIFF_LABEL[t.difficulty] || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (state.grade !== "all" && t.grade !== state.grade) return false;
  if (state.kind !== "all" && t.kind !== state.kind) return false;
  if (state.difficulty !== "all" && String(t.difficulty) !== state.difficulty) return false;
  if (state.earnedOnly && state.earned.has(t.id)) return false;
  return true;
}

function sortedTrophies(list) {
  const arr = [...list];
  if (state.sort === "quickest") arr.sort((a, b) => a.est_minutes - b.est_minutes);
  if (state.sort === "longest") arr.sort((a, b) => b.est_minutes - a.est_minutes);
  return arr;
}

function cardHtml(t) {
  const earned = state.earned.has(t.id);
  const veiled = state.spoiler && t.hidden && !earned;
  const name = veiled ? "??? Hidden Trophy" : t.name;
  const desc = veiled
    ? "A hidden trophy — earn it (or switch spoiler-safe off) to reveal it."
    : t.description;
  const missable = t.kind === "missable"
    ? `<span class="missable-badge">Missable</span>` : "";
  return `<article class="card grade-${t.grade}${earned ? " earned" : ""}" data-id="${t.id}" tabindex="0" role="button" aria-label="${name}">
    <div class="card-top"><h3 class="card-name">${name}</h3><span class="card-check">${earned ? "✓" : "○"}</span></div>
    <span class="grade-pill ${t.grade}">${t.grade}</span>${missable}
    <p class="card-desc">${desc}</p>
    <span class="time-pill">EST ~${fmtMinutes(t.est_minutes)} · ${DIFF_LABEL[t.difficulty]} ${t.difficulty}/5</span>
    <p class="card-kind">${t.kind}${t.hidden ? " · hidden" : ""}</p>
  </article>`;
}

function renderCards() {
  const list = sortedTrophies(state.trophies.filter(trophyVisible));
  $("#cardGrid").innerHTML = list.map(cardHtml).join("");
  $("#emptyNote").hidden = list.length > 0;
}

function renderRoadmap() {
  const wrap = $("#roadmapStages");
  wrap.innerHTML = [1, 2, 3, 4, 5, 6].map((stage) => {
    const items = state.trophies.filter((t) => t.stage === stage);
    const left = items
      .filter((t) => !state.earned.has(t.id))
      .reduce((s, t) => s + (t.est_minutes || 0), 0);
    const rows = items.map((t) => {
      const done = state.earned.has(t.id);
      return `<li class="${done ? "done" : ""}">${done ? "✓ " : "○ "}${t.name} <span class="mini-grade">(${t.grade}, ~${fmtMinutes(t.est_minutes)})</span></li>`;
    }).join("");
    return `<div class="stage"><h3>${STAGE_NAMES[stage]}</h3>
      <p class="stage-time">${items.filter((t) => state.earned.has(t.id)).length}/${items.length} done · ~${fmtMinutes(left)} left</p>
      <ul class="stage-list">${rows}</ul></div>`;
  }).join("");
}

function openDetail(id) {
  const t = state.trophies.find((x) => x.id === id);
  if (!t) return;
  const veiled = state.spoiler && t.hidden && !state.earned.has(id);
  const srcLink = SOURCE_LINKS[t.source] || "#";
  const steps = (t.steps || []).map((s) => `<li>${s}</li>`).join("");
  $("#detailBody").innerHTML = `
    <span class="grade-pill ${t.grade}">${t.grade}</span>
    ${t.kind === "missable" ? `<span class="missable-badge">Missable</span>` : ""}
    <h2>${veiled ? "??? Hidden Trophy" : t.name}</h2>
    <p>${veiled ? "A hidden trophy — earn it (or switch spoiler-safe off) to reveal its guide." : t.description}</p>
    <p><span class="time-pill">EST ~${fmtMinutes(t.est_minutes)} · ${DIFF_LABEL[t.difficulty]} ${t.difficulty}/5</span></p>
    ${veiled ? "" : `<h3>Guide</h3><p>${t.guide}</p><h3>Steps</h3><ol>${steps}</ol>`}
    <p class="source-line">Source: <a href="${srcLink}" target="_blank" rel="noopener">${t.source}</a> — cross-checked against the official trophy list. Full sources in the footer.</p>
    <button id="detailToggle" class="chip">${state.earned.has(id) ? "Mark as not earned" : "Mark as earned"}</button>`;
  $("#detailPanel").hidden = false;
  $("#detailToggle").addEventListener("click", () => {
    toggleEarned(id);
    openDetail(id);
  });
}

function closeDetail() {
  $("#detailPanel").hidden = true;
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveProgress();
  renderProgress();
  renderCards();
  renderRoadmap();
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.get("tab") === "roadmap") switchTab("roadmap");
  if (params.get("kind")) {
    const k = params.get("kind");
    if (["story", "activities", "collectibles", "missable"].includes(k)) {
      state.kind = k;
      document.querySelectorAll("#kindChips .chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.kind === k));
    }
  }
  if (params.get("spoiler") === "off") {
    state.spoiler = false;
    $("#spoilerToggle").checked = false;
  }
  if (params.get("demo") === "1" && state.earned.size === 0) {
    [2, 3, 8, 20, 21, 44, 46, 33, 36, 51, 15, 16].forEach((id) => state.earned.add(id));
    saveProgress();
  }
}

function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  document.querySelectorAll(".tabpane").forEach((p) =>
    p.classList.toggle("active", p.id === `tab-${tab}`));
}

function wireEvents() {
  $("#searchBox").addEventListener("input", (e) => { state.search = e.target.value; renderCards(); });
  $("#gradeFilter").addEventListener("change", (e) => { state.grade = e.target.value; renderCards(); });
  $("#sortControl").addEventListener("change", (e) => { state.sort = e.target.value; renderCards(); });
  $("#difficultyFilter").addEventListener("change", (e) => { state.difficulty = e.target.value; renderCards(); });
  $("#earnedOnly").addEventListener("change", (e) => { state.earnedOnly = e.target.checked; renderCards(); });
  $("#spoilerToggle").addEventListener("change", (e) => { state.spoiler = e.target.checked; renderCards(); });
  $("#kindChips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.kind = btn.dataset.kind;
    document.querySelectorAll("#kindChips .chip").forEach((c) =>
      c.classList.toggle("active", c === btn));
    renderCards();
  });
  document.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab)));
  $("#cardGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    if (e.target.classList.contains("card-check")) {
      toggleEarned(Number(card.dataset.id));
      return;
    }
    openDetail(Number(card.dataset.id));
  });
  $("#cardGrid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const card = e.target.closest(".card");
    if (card) openDetail(Number(card.dataset.id));
  });
  $("#detailClose").addEventListener("click", closeDetail);
  $("#detailPanel").addEventListener("click", (e) => { if (e.target.id === "detailPanel") closeDetail(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });
  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leonida-legend-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error("bad file");
      state.earned = new Set(ids.filter((n) => Number.isInteger(n)));
      saveProgress();
      renderProgress();
      renderCards();
      renderRoadmap();
    } catch {
      alert("That file is not a Leonida Legend progress export.");
    }
    e.target.value = "";
  });
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Clear all earned trophies?")) return;
    state.earned = new Set();
    saveProgress();
    renderProgress();
    renderCards();
    renderRoadmap();
  });
}

async function init() {
  const res = await fetch("data/trophies.json");
  const data = await res.json();
  state.trophies = data.trophies || data;
  state.earned = loadProgress();
  renderHero();
  wireEvents();
  applyUrlParams();
  renderProgress();
  renderCards();
  renderRoadmap();
}

init();

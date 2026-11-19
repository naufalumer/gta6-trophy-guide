// Leonida Legend — GTA VI trophy checklist and platinum roadmap, offline.
// One fetch of app/data/trophies.json, ticks kept in localStorage, and the
// progress can be saved out as JSON or read back in. Nothing here phones
// home while the page runs.

const KEY_PROGRESS = "gta6-trophy-checklist";
const KEY_SPOILERS = "gta6-trophy-spoiler";
const EXPORT_NAME = "gta6-trophy-progress.json";
const GAME_TITLE = "Grand Theft Auto VI";
const HOURS_LINE = "est. ~200 h to platinum";

/* ---------- tiny DOM helpers ---------- */
function el(id) {
  return document.getElementById(id);
}

function tag(name, cls, text) {
  const node = document.createElement(name);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function extLink(label, href) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

/* ---------- saved progress ---------- */
function loadEarned() {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function storeEarned() {
  localStorage.setItem(KEY_PROGRESS, JSON.stringify([...store.earned]));
}

function spoilersHidden() {
  return localStorage.getItem(KEY_SPOILERS) === "1";
}

function setSpoilerPref(hidden) {
  localStorage.setItem(KEY_SPOILERS, hidden ? "1" : "0");
}

const store = {
  earned: loadEarned(),
  filter: "all",
  trophies: [],
  byName: new Map(),
};

/* ---------- roadmap plan ----------
   Stage 1 first: it holds the game's only confirmed missable. The rest
   follow the order the guide recommends. */
const PLAN = [
  { no: 1, title: "First: the one missable", text: "Do Lucia’s Chapter 1 balcony meditation before Chapter 1 ends — it vanishes afterwards and there is no mission replay. Make a manual Chapter 1 save first." },
  { no: 2, title: "Play the story", text: "Chapters 1–4, the final mission, and the named story missions. All unmissable — just play them in order." },
  { no: 3, title: "Stranger strands", text: "Eight stranger mission strands, ending with a finale each (Andy, Kenton, Billy, Randy, Tyrone, Bret). Do the Chapter 3 strand “Race Against Yago” while Chapter 3 is current — it is time-sensitive." },
  { no: 4, title: "Activities & skills", text: "Races, stunts, shooting range, drone races, heists, vaults, robberies, wanted-level feats and the long-haul counters. The bulk of the post-story grind." },
  { no: 5, title: "Collectibles & exploration", text: "Cards, WAiNK spots, vehicles, garages and every area of Leonida. Pick these up as you travel; finish the stragglers last." },
  { no: 6, title: "Cleanup & 100%", text: "70 of 80 Challenges, 200 of 277 vehicles, all 8 bank vaults, 300 stunts — the 100% checklist that ends with the platinum." },
];

const KIND_LABELS = {
  story: "Story",
  missable: "Missable",
  collectibles: "Collectibles",
  activities: "Activities",
};

/* ---------- card builders ---------- */
function gradeTag(trophy) {
  return tag("span", "grade grade-" + trophy.grade, trophy.grade);
}

function kindTag(trophy) {
  return tag("span", "kind", KIND_LABELS[trophy.kind] || trophy.kind);
}

function flagTag(cls, text, title) {
  const pill = tag("span", "badge " + cls, text);
  if (title) pill.title = title;
  return pill;
}

function buildCard(trophy) {
  const got = store.earned.has(trophy.name);
  const hidden = spoilersHidden() && trophy.hidden && !got;
  const article = tag("article", "card" + (got ? " earned" : ""));

  const head = tag("div", "card-head");
  const tick = document.createElement("input");
  tick.type = "checkbox";
  tick.checked = got;
  tick.setAttribute("aria-label", "Mark " + (hidden ? "hidden story trophy" : trophy.name) + " earned");
  tick.addEventListener("change", () => {
    if (tick.checked) store.earned.add(trophy.name);
    else store.earned.delete(trophy.name);
    storeEarned();
    renderAll();
  });
  head.append(tick);
  head.append(tag("h3", null, hidden ? "Hidden story trophy" : trophy.name));
  head.append(gradeTag(trophy));
  head.append(kindTag(trophy));
  if (trophy.missable && trophy.kind !== "missable") head.append(flagTag("missable", "MISSABLE"));
  if (trophy.at_risk) head.append(flagTag("atrisk", "TIME-SENSITIVE", trophy.at_risk));
  if (trophy.unconfirmed) head.append(flagTag("unconf", "COUNT UNCONFIRMED", "This count comes from launch-week lists and has not been independently re-verified."));
  article.append(head);

  article.append(tag("p", "desc", hidden ? "Complete this story moment to reveal it." : trophy.description));

  if (hidden) {
    article.append(tag("p", "guide hidden-note", "Guide hidden until earned — turn off “Hide story spoilers” to read it now."));
    return article;
  }

  article.append(tag("p", "guide", trophy.guide));
  if (trophy.steps && trophy.steps.length > 0) {
    const steps = tag("ol", "steps");
    trophy.steps.forEach((step) => steps.append(tag("li", null, step)));
    article.append(steps);
  }
  const sources = tag("p", "sources", "Source: ");
  trophy.sources.forEach((source, i) => {
    if (i > 0) sources.append(document.createTextNode(" · "));
    sources.append(extLink(source.name, source.url));
  });
  article.append(sources);
  return article;
}

/* ---------- filtering ---------- */
function visible(trophy) {
  const query = el("search").value.trim().toLowerCase();
  const grade = el("grade").value;
  if (store.filter !== "all" && trophy.kind !== store.filter) return false;
  if (grade !== "all" && trophy.grade !== grade) return false;
  if (el("earnedonly").checked && !store.earned.has(trophy.name)) return false;
  if (!query) return true;
  const haystacks = [trophy.name, trophy.description, trophy.guide];
  return haystacks.some((field) => field.toLowerCase().includes(query));
}

/* ---------- rendering ---------- */
function renderTotals() {
  const total = store.trophies.length;
  const got = store.earned.size;
  const pct = Math.round((got / total) * 100);
  el("totals").textContent = got + " of " + total + " trophies earned · " + pct + "% to the platinum";
  el("barfill").style.width = pct + "%";
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  store.trophies.forEach((trophy) => {
    counts[trophy.grade][1] += 1;
    if (store.earned.has(trophy.name)) counts[trophy.grade][0] += 1;
  });
  el("stats").textContent =
    ["platinum", "gold", "silver", "bronze"]
      .map((grade) => counts[grade][0] + "/" + counts[grade][1] + " " + grade)
      .join(" · ") + " · " + HOURS_LINE;
}

function renderList() {
  const shown = store.trophies.filter(visible);
  const list = el("list");
  list.replaceChildren();
  shown.forEach((trophy) => list.append(buildCard(trophy)));
  const total = store.trophies.length;
  el("count").textContent =
    shown.length === total
      ? "Showing all " + total + " trophies."
      : "Showing " + shown.length + " of " + total + " trophies.";
}

function renderRoadmap() {
  const road = el("roadmap");
  road.replaceChildren();
  PLAN.forEach(({ no, title, text }) => {
    const section = tag("section", "stage");
    section.append(tag("h3", null, "Stage " + no + " — " + title));
    section.append(tag("p", "stage-text", text));
    const inStage = store.trophies.filter((t) => t.stage === no);
    const done = inStage.filter((t) => store.earned.has(t.name)).length;
    section.append(tag("p", "stage-meta", done + "/" + inStage.length + " earned in this stage"));
    inStage.forEach((trophy) => section.append(buildCard(trophy)));
    road.append(section);
  });
}

function renderAll() {
  el("spoiler").checked = spoilersHidden();
  renderTotals();
  renderList();
  renderRoadmap();
}

/* ---------- wiring ---------- */
function bindChips() {
  const chips = document.querySelectorAll("#kinds .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((other) => other.classList.remove("active"));
      chip.classList.add("active");
      store.filter = chip.dataset.kind;
      renderAll();
    });
  });
}

function bindControls() {
  el("search").addEventListener("input", renderAll);
  el("grade").addEventListener("change", renderAll);
  el("earnedonly").addEventListener("change", renderAll);
  el("spoiler").addEventListener("change", () => {
    setSpoilerPref(el("spoiler").checked);
    renderAll();
  });
}

function saveFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bindProgressIO() {
  el("export").addEventListener("click", () => {
    saveFile(EXPORT_NAME, { game: GAME_TITLE, earned: [...store.earned] });
  });
  el("import").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const names = Array.isArray(parsed) ? parsed : parsed.earned;
      const next = new Set((names || []).filter((name) => store.byName.has(name)));
      store.earned = next;
      storeEarned();
      renderAll();
    } catch {
      alert("That file is not valid trophy progress JSON.");
    }
    event.target.value = "";
  });
  el("reset").addEventListener("click", () => {
    if (confirm("Clear all earned ticks?")) {
      store.earned = new Set();
      storeEarned();
      renderAll();
    }
  });
}

function showTab(which) {
  const checklist = which === "checklist";
  el("tab-checklist").classList.toggle("active", checklist);
  el("tab-roadmap").classList.toggle("active", !checklist);
  el("view-checklist").hidden = !checklist;
  el("view-roadmap").hidden = checklist;
}

function bindTabs() {
  el("tab-checklist").addEventListener("click", () => showTab("checklist"));
  el("tab-roadmap").addEventListener("click", () => showTab("roadmap"));
}

/* ---------- boot ---------- */
async function start() {
  const response = await fetch("data/trophies.json");
  const doc = await response.json();
  store.trophies = doc.trophies;
  store.byName = new Map(store.trophies.map((t) => [t.name, t]));
  bindChips();
  bindControls();
  bindProgressIO();
  bindTabs();
  renderAll();
}

start();

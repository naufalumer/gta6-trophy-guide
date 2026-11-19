// Leonida Legend — Grand Theft Auto VI trophy checklist and platinum roadmap.
// The page is static: it fetches app/data/trophies.json once, keeps earned
// ticks in localStorage, and exports or imports that progress as a JSON file.
// It makes no network request while it runs.

const STORE_PROGRESS = "gta6-trophy-checklist";
const STORE_SPOILERS = "gta6-trophy-spoiler";
const EXPORT_FILE = "gta6-trophy-progress.json";
const GAME_NAME = "Grand Theft Auto VI";
const HOURS_NOTE = "est. ~200 h to platinum";

/* ------------------------------------------------------------------ */
/* Small DOM helpers                                                   */
/* ------------------------------------------------------------------ */
function byId(id) {
  return document.getElementById(id);
}

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function linkEl(name, url) {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = name;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

/* ------------------------------------------------------------------ */
/* Stored progress                                                     */
/* ------------------------------------------------------------------ */
function readProgress() {
  try {
    const raw = localStorage.getItem(STORE_PROGRESS);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORE_PROGRESS, JSON.stringify([...state.earned]));
}

function spoilersOn() {
  return localStorage.getItem(STORE_SPOILERS) === "1";
}

function setSpoilersHidden(on) {
  localStorage.setItem(STORE_SPOILERS, on ? "1" : "0");
}

const state = {
  earned: readProgress(),
  kind: "all",
  trophies: [],
  lookup: new Map(),
};

/* ------------------------------------------------------------------ */
/* Roadmap copy. Stage 1 holds the game's only confirmed missable, so  */
/* it comes first; the rest follow the order the guide recommends.      */
/* ------------------------------------------------------------------ */
const ROADMAP = [
  [1, "First: the one missable", "Do Lucia’s Chapter 1 balcony meditation before Chapter 1 ends — it vanishes afterwards and there is no mission replay. Make a manual Chapter 1 save first."],
  [2, "Play the story", "Chapters 1–4, the final mission, and the named story missions. All unmissable — just play them in order."],
  [3, "Stranger strands", "Eight stranger mission strands, ending with a finale each (Andy, Kenton, Billy, Randy, Tyrone, Bret). Do the Chapter 3 strand “Race Against Yago” while Chapter 3 is current — it is time-sensitive."],
  [4, "Activities & skills", "Races, stunts, shooting range, drone races, heists, vaults, robberies, wanted-level feats and the long-haul counters. The bulk of the post-story grind."],
  [5, "Collectibles & exploration", "Cards, WAiNK spots, vehicles, garages and every area of Leonida. Pick these up as you travel; finish the stragglers last."],
  [6, "Cleanup & 100%", "70 of 80 Challenges, 200 of 277 vehicles, all 8 bank vaults, 300 stunts — the 100% checklist that ends with the platinum."],
];

const KIND_NAMES = {
  story: "Story",
  missable: "Missable",
  collectibles: "Collectibles",
  activities: "Activities",
};

/* ------------------------------------------------------------------ */
/* Card builders                                                       */
/* ------------------------------------------------------------------ */
function gradePill(trophy) {
  return makeEl("span", "grade grade-" + trophy.grade, trophy.grade);
}

function kindPill(trophy) {
  const label = KIND_NAMES[trophy.kind] || trophy.kind;
  return makeEl("span", "kind", label);
}

function flagPill(className, text, title) {
  const pill = makeEl("span", "badge " + className, text);
  if (title) pill.title = title;
  return pill;
}

function trophyCard(trophy) {
  const got = state.earned.has(trophy.name);
  const concealed = spoilersOn() && trophy.hidden && !got;
  const article = makeEl("article", "card" + (got ? " earned" : ""));

  const head = makeEl("div", "card-head");
  const tick = document.createElement("input");
  tick.type = "checkbox";
  tick.checked = got;
  tick.setAttribute("aria-label", "Mark " + (concealed ? "hidden story trophy" : trophy.name) + " earned");
  tick.addEventListener("change", () => {
    if (tick.checked) state.earned.add(trophy.name);
    else state.earned.delete(trophy.name);
    saveProgress();
    paint();
  });
  head.append(tick);
  head.append(makeEl("h3", null, concealed ? "Hidden story trophy" : trophy.name));
  head.append(gradePill(trophy), kindPill(trophy));
  if (trophy.missable && trophy.kind !== "missable") {
    head.append(flagPill("missable", "MISSABLE"));
  }
  if (trophy.at_risk) {
    head.append(flagPill("atrisk", "TIME-SENSITIVE", trophy.at_risk));
  }
  if (trophy.unconfirmed) {
    head.append(flagPill("unconf", "COUNT UNCONFIRMED", "This count comes from launch-week lists and has not been independently re-verified."));
  }
  article.append(head);

  article.append(makeEl("p", "desc", concealed ? "Complete this story moment to reveal it." : trophy.description));

  if (concealed) {
    article.append(makeEl("p", "guide hidden-note", "Guide hidden until earned — turn off “Hide story spoilers” to read it now."));
    return article;
  }

  article.append(makeEl("p", "guide", trophy.guide));
  if (trophy.steps && trophy.steps.length > 0) {
    const steps = makeEl("ol", "steps");
    for (const step of trophy.steps) steps.append(makeEl("li", null, step));
    article.append(steps);
  }
  const sources = makeEl("p", "sources", "Source: ");
  trophy.sources.forEach((source, i) => {
    if (i > 0) sources.append(document.createTextNode(" · "));
    sources.append(linkEl(source.name, source.url));
  });
  article.append(sources);
  return article;
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */
function trophyMatches(trophy) {
  const query = byId("search").value.trim().toLowerCase();
  const grade = byId("grade").value;
  if (state.kind !== "all" && trophy.kind !== state.kind) return false;
  if (grade !== "all" && trophy.grade !== grade) return false;
  if (byId("earnedonly").checked && !state.earned.has(trophy.name)) return false;
  if (!query) return true;
  return [trophy.name, trophy.description, trophy.guide].some((field) =>
    field.toLowerCase().includes(query),
  );
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */
function paintTotals() {
  const total = state.trophies.length;
  const got = state.earned.size;
  const pct = Math.round((got / total) * 100);
  byId("totals").textContent = got + " of " + total + " trophies earned · " + pct + "% to the platinum";
  byId("barfill").style.width = pct + "%";
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const trophy of state.trophies) {
    counts[trophy.grade][1] += 1;
    if (state.earned.has(trophy.name)) counts[trophy.grade][0] += 1;
  }
  byId("stats").textContent =
    ["platinum", "gold", "silver", "bronze"]
      .map((grade) => counts[grade][0] + "/" + counts[grade][1] + " " + grade)
      .join(" · ") + " · " + HOURS_NOTE;
}

function paintList() {
  const shown = state.trophies.filter(trophyMatches);
  const list = byId("list");
  list.replaceChildren();
  for (const trophy of shown) list.append(trophyCard(trophy));
  const total = state.trophies.length;
  byId("count").textContent =
    shown.length === total
      ? "Showing all " + total + " trophies."
      : "Showing " + shown.length + " of " + total + " trophies.";
}

function paintRoadmap() {
  const road = byId("roadmap");
  road.replaceChildren();
  for (const [no, heading, body] of ROADMAP) {
    const section = makeEl("section", "stage");
    section.append(makeEl("h3", null, "Stage " + no + " — " + heading));
    section.append(makeEl("p", "stage-text", body));
    const inStage = state.trophies.filter((t) => t.stage === no);
    const done = inStage.filter((t) => state.earned.has(t.name)).length;
    section.append(makeEl("p", "stage-meta", done + "/" + inStage.length + " earned in this stage"));
    for (const trophy of inStage) section.append(trophyCard(trophy));
    road.append(section);
  }
}

function paint() {
  byId("spoiler").checked = spoilersOn();
  paintTotals();
  paintList();
  paintRoadmap();
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */
function wireChips() {
  const chips = document.querySelectorAll("#kinds .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((other) => other.classList.remove("active"));
      chip.classList.add("active");
      state.kind = chip.dataset.kind;
      paint();
    });
  });
}

function wireControls() {
  byId("search").addEventListener("input", paint);
  byId("grade").addEventListener("change", paint);
  byId("earnedonly").addEventListener("change", paint);
  byId("spoiler").addEventListener("change", () => {
    setSpoilersHidden(byId("spoiler").checked);
    paint();
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function wireExportImport() {
  byId("export").addEventListener("click", () => {
    downloadJson(EXPORT_FILE, { game: GAME_NAME, earned: [...state.earned] });
  });
  byId("import").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const names = Array.isArray(parsed) ? parsed : parsed.earned;
      const next = new Set((names || []).filter((name) => state.lookup.has(name)));
      state.earned = next;
      saveProgress();
      paint();
    } catch {
      alert("That file is not valid trophy progress JSON.");
    }
    event.target.value = "";
  });
  byId("reset").addEventListener("click", () => {
    if (confirm("Clear all earned ticks?")) {
      state.earned = new Set();
      saveProgress();
      paint();
    }
  });
}

function switchTab(which) {
  const checklist = which === "checklist";
  byId("tab-checklist").classList.toggle("active", checklist);
  byId("tab-roadmap").classList.toggle("active", !checklist);
  byId("view-checklist").hidden = !checklist;
  byId("view-roadmap").hidden = checklist;
}

function wireTabs() {
  byId("tab-checklist").addEventListener("click", () => switchTab("checklist"));
  byId("tab-roadmap").addEventListener("click", () => switchTab("roadmap"));
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
async function boot() {
  const response = await fetch("data/trophies.json");
  const doc = await response.json();
  state.trophies = doc.trophies;
  state.lookup = new Map(state.trophies.map((t) => [t.name, t]));
  wireChips();
  wireControls();
  wireExportImport();
  wireTabs();
  paint();
}

boot();

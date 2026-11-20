// Roadmap tab: the six stages to the platinum, in play order. One job:
// turn the trophy list into stage groups with per-stage remaining time.

import { formatMinutes, remainingMinutes } from "./time.js";

export const STAGES = [
  { n: 1, title: "Stage 1 · First Playthrough", note: "Story Chapters 1–4 and the finale. Do the Chapter 1 balcony meditation here — it is the only missable trophy." },
  { n: 2, title: "Stage 2 · Story Missions", note: "Named story missions and story moments, in the order they appear." },
  { n: 3, title: "Stage 3 · Strangers & Side Stories", note: "Stranger strands and the side characters' final missions." },
  { n: 4, title: "Stage 4 · Activities & Skills", note: "Races, the range, stunts, challenges and the skill trophies." },
  { n: 5, title: "Stage 5 · Mayhem & Money", note: "Robberies, chaos and the money trophies." },
  { n: 6, title: "Stage 6 · Collectibles & Completion", note: "Cards, WAiNK spots, vehicles, exploration — then 100% and the platinum." },
];

export function renderRoadmap(container, trophies, earnedIds) {
  container.innerHTML = "";
  for (const stage of STAGES) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const earnedHere = members.filter((t) => earnedIds.has(t.id)).length;
    const left = remainingMinutes(members, earnedIds);
    const block = document.createElement("div");
    block.className = "stage";
    const title = document.createElement("h3");
    title.className = "stage-title";
    title.textContent = stage.title;
    const meta = document.createElement("p");
    meta.className = "stage-meta";
    meta.innerHTML = "";
    meta.textContent = stage.note + " ";
    const timeSpan = document.createElement("span");
    timeSpan.className = "stage-time";
    timeSpan.textContent = earnedHere + "/" + members.length + " earned · " + formatMinutes(left) + " left";
    meta.appendChild(timeSpan);
    const list = document.createElement("ol");
    list.className = "stage-list";
    for (const t of members) {
      const li = document.createElement("li");
      if (earnedIds.has(t.id)) li.className = "done";
      li.textContent = t.name + " — " + formatMinutes(t.est_minutes) + (t.missable ? " · MISSABLE" : "");
      list.appendChild(li);
    }
    block.appendChild(title);
    block.appendChild(meta);
    block.appendChild(list);
    container.appendChild(block);
  }
}

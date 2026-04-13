import { getState } from "./state.js";
import { dom } from "./dom.js";

export function renderStandings() {
  const { standings } = getState();
  dom.standingsBody.innerHTML = "";

  standings.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.team.name}</td>
      <td>${entry.points}</td>
    `;
    dom.standingsBody.appendChild(row);
  });
}

export function renderStats() {
  const { currentStatType, scorers, assists } = getState();

  const source =
    currentStatType === "goals" ? scorers : assists;

  dom.statsBody.innerHTML = "";

  source.slice(0, 15).forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${entry.player.firstname}</td>`;
    dom.statsBody.appendChild(row);
  });
}

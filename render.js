import { dom } from "./dom.js";
import { fetchTeamPlayers, classifyError } from "./api.js";
import {
  getStatType,
  getTopStatPlayers,
  getFilteredPlayers,
  getSortedStandings,
  getSquadByPosition,
  getAllPlayers,
  setCurrentTeamEntry,
  setSearchQuery,
  getCachedTeamPlayers,
  normalizeAndCacheTeamPlayers,
} from "./state.js";
import { SearchResults } from "./components/SearchResults.js";

// four UI states: loading, error, empty, success

export function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `
      <tr>
        <td colspan="6" class="loading-cell">
          <div class="loading-spinner"></div>
          <p>Loading data…</p>
        </td>
      </tr>`;
  }
}

// showRetry is driven by the message map. only renders the retry button when true
export function showError(elementId, { message, showRetry }, onRetry) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `
    <tr>
      <td colspan="6" class="error-cell">
        <p class="error-message">${message}</p>
        ${showRetry ? '<button class="retry-button">Retry</button>' : ""}
      </td>
    </tr>`;

  // only attach retry handler if showRetry is true and callback exists
  if (showRetry && onRetry) {
    const btn = el.querySelector(".retry-button");
    if (btn) btn.addEventListener("click", onRetry);
  }
}

function showEmpty(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">
          <p>${message}</p>
        </td>
      </tr>`;
  }
}

// standings

export function renderStandings() {
  const standings = getSortedStandings();

  // empty state
  if (standings.length === 0) {
    showEmpty("standings-body", "No standings data available.");
    return;
  }

  // success state
  dom.standingsBody.innerHTML = "";

  standings.forEach((entry) => {
    const team = entry.team;
    const stats = entry.all;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="team-cell">
          <span class="rank-badge">${entry.rank}</span>
          <img src="${team.logo}" alt="${team.name}" class="team-logo" width="24" height="24" />
          <strong>${team.name}</strong>
        </div>
      </td>
      <td>${stats.played}</td>
      <td>${stats.win}</td>
      <td>${stats.draw}</td>
      <td>${stats.lose}</td>
      <td><strong>${entry.points}</strong></td>`;
    row.style.cursor = "pointer";
    row.addEventListener("click", () => openTeamModal(entry));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openTeamModal(entry);
    });
    row.tabIndex = 0;
    dom.standingsBody.appendChild(row);
  });
}

// stats (top scorers / assists)

export function renderStats() {
  const currentStatType = getStatType();
  const source = getTopStatPlayers(); // selector — derived data

  dom.statsTitle.textContent =
    currentStatType === "goals" ? "Top Scorers" : "Top Assist Leaders";
  dom.statColumn.textContent =
    currentStatType === "goals" ? "Goals" : "Assists";

  // empty state
  if (source.length === 0) {
    showEmpty("stats-body", "No player stats available.");
    return;
  }

  // success state
  dom.statsBody.innerHTML = "";

  source.forEach((entry) => {
    const p = entry.player;
    const s = entry.statistics[0];
    const value =
      currentStatType === "goals" ? s.goals.total || 0 : s.goals.assists || 0;
    const fullName = `${p.firstname} ${p.lastname}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="player-cell">
          <img src="${p.photo}" alt="${fullName}" class="player-photo" width="32" height="32" />
          <strong>${fullName}</strong>
        </div>
      </td>
      <td>
        <div class="team-cell-sm">
          <img src="${s.team.logo}" alt="${s.team.name}" class="team-logo-sm" width="18" height="18" />
          ${s.team.name}
        </div>
      </td>
      <td><strong>${value}</strong></td>`;
    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
      const allPlayers = getAllPlayers();
      const playerObj = allPlayers.find((pl) => pl.id === p.id) || {
        id: p.id,
        name: fullName,
        photo: p.photo,
        age: p.age,
        nationality: p.nationality,
        position: s.games.position,
        teamId: s.team.id,
        teamName: s.team.name,
        teamLogo: s.team.logo,
        goals: s.goals.total || 0,
        assists: s.goals.assists || 0,
        appearances: s.games.appearences || 0,
        rating: s.games.rating ? parseFloat(s.games.rating).toFixed(2) : null,
      };
      openPlayerView(playerObj, null);
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") row.click();
    });
    row.tabIndex = 0;
    dom.statsBody.appendChild(row);
  });
}

// search

export function handleSearch(event) {
  event.preventDefault();

  const query = dom.siteSearch.value;
  setSearchQuery(query);

  const matched = getFilteredPlayers();

  SearchResults({
    container: dom.searchResults,
    results: matched,
    query,
    onSelect: (playerId) => {
      const allPlayers = getAllPlayers();
      const player = allPlayers.find((p) => p.id === playerId);

      openPlayerView(player, null);

      dom.siteSearch.value = "";
      setSearchQuery("");
      dom.searchResults.classList.remove("active");
    },
  });
}

export function clearSearchResults() {
  setSearchQuery("");

  SearchResults({
    container: dom.searchResults,
    results: [],
    query: "",
    onSelect: () => {},
  });
}

// team modal

async function openTeamModal(entry) {
  setCurrentTeamEntry(entry);
  const team = entry.team;
  const stats = entry.all;

  dom.modalTitle.innerHTML = `
    <img src="${team.logo}" alt="${team.name}" class="modal-team-logo" width="36" height="36" />
    ${team.name}`;

  dom.modalBackBtn.hidden = true;

  dom.modalContent.innerHTML = `
    <div class="team-stats-grid">
      <div class="stat-box"><span class="stat-number">${entry.rank}</span><span class="stat-desc">Position</span></div>
      <div class="stat-box"><span class="stat-number">${entry.points}</span><span class="stat-desc">Points</span></div>
      <div class="stat-box"><span class="stat-number">${entry.goalsDiff}</span><span class="stat-desc">Goal Diff</span></div>
      <div class="stat-box"><span class="stat-number">${stats.goals.for}</span><span class="stat-desc">Goals For</span></div>
      <div class="stat-box"><span class="stat-number">${stats.goals.against}</span><span class="stat-desc">Goals Agst</span></div>
    </div>
    <p><strong>Record:</strong> ${stats.win}W – ${stats.draw}D – ${stats.lose}L</p>
    <p><strong>Form:</strong> <span class="form-display">${renderForm(entry.form)}</span></p>
    ${entry.description ? `<p><strong>Status:</strong> ${entry.description}</p>` : ""}
    <hr class="section-divider" />
    <h3>Squad</h3>
    <div id="squad-container" class="squad-loading">
      <div class="loading-spinner"></div>
      <p>Loading squad…</p>
    </div>`;

  dom.modal.removeAttribute("hidden");
  dom.closeModalBtn.focus();

  try {
    let cached = getCachedTeamPlayers(team.id);
    if (!cached) {
      const raw = await fetchTeamPlayers(team.id);
      cached = normalizeAndCacheTeamPlayers(team.id, raw);
    }
    renderSquad(cached, entry);
  } catch (err) {
    const { message, showRetry } = classifyError(err);
    const container = document.getElementById("squad-container");
    container.className = "";
    container.innerHTML = `<p class="error-message">${message}</p>`;
    if (showRetry) {
      const btn = document.createElement("button");
      btn.className = "retry-button";
      btn.textContent = "Retry";
      btn.addEventListener("click", () => openTeamModal(entry));
      container.appendChild(btn);
    }
  }
}

function renderSquad(players, teamEntry) {
  const container = document.getElementById("squad-container");

  // empty state
  if (!players.length) {
    container.className = "";
    container.innerHTML = '<p class="no-data">No squad data available.</p>';
    return;
  }

  // success state. use selector for grouped/sorted data
  const groups = getSquadByPosition(teamEntry.team.id);
  if (!groups) return;

  let html = "";
  for (const [position, list] of Object.entries(groups)) {
    if (!list.length) continue;
    html += `<div class="position-group"><h4>${position}s</h4><div class="players-grid">`;
    list.forEach((p) => {
      const badge =
        p.appearances > 0
          ? `<span class="app-badge">${p.appearances} app</span>`
          : `<span class="app-badge dim">0 app</span>`;
      html += `
        <div class="player-card" data-player-id="${p.id}" tabindex="0">
          <img src="${p.photo}" alt="${p.name}" class="card-player-photo" width="48" height="48" />
          <div class="card-info">
            <span class="card-name">${p.name}</span>
            ${badge}
          </div>
        </div>`;
    });
    html += "</div></div>";
  }

  container.className = "";
  container.innerHTML = html;

  container.querySelectorAll(".player-card").forEach((card) => {
    const handler = () => {
      const pid = parseInt(card.dataset.playerId);
      const player = players.find((pl) => pl.id === pid);
      if (player) openPlayerView(player, teamEntry);
    };
    card.addEventListener("click", handler);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handler();
    });
  });
}

// player view

function openPlayerView(player, fromTeamEntry) {
  dom.modalTitle.textContent = "Player Details";

  if (fromTeamEntry) {
    dom.modalBackBtn.hidden = false;
    dom.modalBackBtn.textContent = `← Back to ${fromTeamEntry.team.name}`;
    dom.modalBackBtn.onclick = () => openTeamModal(fromTeamEntry);
  } else {
    dom.modalBackBtn.hidden = true;
  }

  const statsHTML = buildPositionStats(player);

  dom.modalContent.innerHTML = `
    <div class="player-detail-header">
      <img src="${player.photo}" alt="${player.name}" class="detail-player-photo" width="80" height="80" />
      <div>
        <h3>${player.name}${player.captain ? ' <span class="captain-badge">C</span>' : ""}</h3>
        <p class="player-meta">
          ${player.position || ""}${player.age ? " · Age " + player.age : ""}${player.nationality ? " · " + player.nationality : ""}
        </p>
        ${player.height || player.weight ? `<p class="player-meta">${player.height ? player.height + " cm" : ""}${player.height && player.weight ? " · " : ""}${player.weight ? player.weight + " kg" : ""}</p>` : ""}
      </div>
    </div>
    <div class="player-detail-team">
      ${player.teamLogo ? `<img src="${player.teamLogo}" alt="${player.teamName}" width="20" height="20" />` : ""}
      <span>${player.teamName}</span>
    </div>
    ${statsHTML}`;

  dom.modal.removeAttribute("hidden");
  dom.closeModalBtn.focus();
}

// position-specific stats

function buildPositionStats(player) {
  const pos = player.position;

  if (player.appearances === undefined && player.minutes === undefined) {
    const rows = [];
    if (player.appearances != null)
      rows.push(statBox(player.appearances, "Appearances"));
    if (player.goals != null) rows.push(statBox(player.goals, "Goals"));
    if (player.assists != null) rows.push(statBox(player.assists, "Assists"));
    if (player.rating != null) rows.push(statBox(player.rating, "Rating"));
    if (rows.length === 0)
      return '<p class="no-data">No detailed stats available.</p>';
    return `<div class="player-stats-grid">${rows.join("")}</div>`;
  }

  let html = "";

  html += `<h4 class="stats-section-title">Overview</h4>`;
  html += '<div class="player-stats-grid">';
  html += statBox(player.appearances, "Apps");
  html += statBox(player.lineups, "Starts");
  html += statBox(formatMinutes(player.minutes), "Minutes");
  html += statBox(player.rating || "–", "Rating");
  html += "</div>";

  if (pos === "Goalkeeper") {
    html += `<h4 class="stats-section-title">Goalkeeping</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.conceded, "Conceded");
    html += statBox(player.saves, "Saves");
    html += statBox(player.penSaved, "Pen Saved");
    html += statBox(player.goals, "Goals");
    html += "</div>";
  } else if (pos === "Defender") {
    html += `<h4 class="stats-section-title">Defending</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.tackles, "Tackles");
    html += statBox(player.interceptions, "Intercept.");
    html += statBox(player.blocks, "Blocks");
    html += statBox(duelsPercent(player), "Duels Won");
    html += "</div>";
    html += `<h4 class="stats-section-title">Attack</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.goals, "Goals");
    html += statBox(player.assists, "Assists");
    html += statBox(player.keyPasses, "Key Passes");
    html += statBox(
      player.passAccuracy ? player.passAccuracy + "%" : "–",
      "Pass Acc.",
    );
    html += "</div>";
  } else if (pos === "Midfielder") {
    html += `<h4 class="stats-section-title">Attack</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.goals, "Goals");
    html += statBox(player.assists, "Assists");
    html += statBox(player.keyPasses, "Key Passes");
    html += statBox(player.shotsOn + "/" + player.shotsTotal, "Shots (on)");
    html += "</div>";
    html += `<h4 class="stats-section-title">Passing & Dribbling</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.passesTotal, "Passes");
    html += statBox(
      player.passAccuracy ? player.passAccuracy + "%" : "–",
      "Pass Acc.",
    );
    html += statBox(
      player.dribblesSuccess + "/" + player.dribblesAttempted,
      "Dribbles",
    );
    html += statBox(duelsPercent(player), "Duels Won");
    html += "</div>";
    html += `<h4 class="stats-section-title">Defending</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.tackles, "Tackles");
    html += statBox(player.interceptions, "Intercept.");
    html += statBox(player.foulsCommitted, "Fouls");
    html += "</div>";
  } else {
    html += `<h4 class="stats-section-title">Attack</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.goals, "Goals");
    html += statBox(player.assists, "Assists");
    html += statBox(player.shotsOn + "/" + player.shotsTotal, "Shots (on)");
    html += statBox(
      player.penScored + "/" + (player.penScored + player.penMissed),
      "Penalties",
    );
    html += "</div>";
    html += `<h4 class="stats-section-title">Creativity</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.keyPasses, "Key Passes");
    html += statBox(
      player.dribblesSuccess + "/" + player.dribblesAttempted,
      "Dribbles",
    );
    html += statBox(player.passesTotal, "Passes");
    html += statBox(player.foulsDrawn, "Fouls Won");
    html += "</div>";
  }

  html += `<h4 class="stats-section-title">Discipline</h4>`;
  html += '<div class="player-stats-grid">';
  html += statBox(player.yellowCards, "Yellows");
  html += statBox(player.redCards, "Reds");
  html += statBox(player.foulsCommitted, "Fouls");
  html += statBox(player.foulsDrawn, "Fouls Won");
  html += "</div>";

  return html;
}

// helpers

function statBox(value, label) {
  return `<div class="stat-box"><span class="stat-number">${value}</span><span class="stat-desc">${label}</span></div>`;
}

function formatMinutes(mins) {
  if (!mins) return "0";
  if (mins >= 1000) return (mins / 1000).toFixed(1) + "k";
  return mins;
}

function duelsPercent(player) {
  if (!player.duelsTotal) return "0%";
  return Math.round((player.duelsWon / player.duelsTotal) * 100) + "%";
}

function renderForm(form) {
  if (!form) return "";
  return form
    .split("")
    .map((ch) => {
      const cls = ch === "W" ? "form-w" : ch === "D" ? "form-d" : "form-l";
      return `<span class="form-badge ${cls}">${ch}</span>`;
    })
    .join("");
}

// modal close

export function closeModal() {
  dom.modal.setAttribute("hidden", "");
  setCurrentTeamEntry(null);
}

export function handleOutsideClick(event) {
  if (event.target === dom.modal) {
    closeModal();
  }
}

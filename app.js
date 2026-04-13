// api configuration
const API_KEY = CONFIG.API_KEY;
const API_HOST = "https://v3.football.api-sports.io";
const LEAGUE_ID = 39; // premier league
const SEASON = 2024; // latest available on free plan (2024-25)

// state
let currentStatType = "goals";
let allPlayers = []; // merged list from top scorers + assists (for search)
let standingsData = [];
let topScorersData = [];
let topAssistsData = [];
let currentTeamEntry = null; // tracks which team modal is open (for back nav)
let teamPlayersCache = {}; // teamId -> array of normalised player objects

// cache to avoid burning API calls on repeat visits
const cache = {};

// api service
async function apiFetch(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_HOST}/${endpoint}?${queryString}`;

  if (cache[url]) return cache[url];

  const response = await fetch(url, {
    method: "GET",
    headers: { "x-apisports-key": API_KEY },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${Object.values(data.errors).join(", ")}`);
  }

  cache[url] = data;
  return data;
}

// data fetchers

async function fetchStandings() {
  const data = await apiFetch("standings", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response?.[0]?.league?.standings?.[0] || [];
}

async function fetchTopScorers() {
  const data = await apiFetch("players/topscorers", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response || [];
}

async function fetchTopAssists() {
  const data = await apiFetch("players/topassists", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response || [];
}

/**
 * fetch all players for a team with full season stats.
 * handles pagination automatically (~2 calls per team).
 * returns an array of normalised player objects.
 */
async function fetchTeamPlayers(teamId) {
  if (teamPlayersCache[teamId]) return teamPlayersCache[teamId];

  const allEntries = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await apiFetch("players", {
      team: teamId,
      season: SEASON,
      league: LEAGUE_ID,
      page,
    });
    allEntries.push(...(data.response || []));
    totalPages = data.paging?.total || 1;
    page++;
  }

  // normalise into a flat array
  const players = allEntries
    .map((entry) => {
      const p = entry.player;
      // find the premier league statistics entry
      const s =
        entry.statistics.find((st) => st.league.id === LEAGUE_ID) ||
        entry.statistics[0];
      if (!s) return null;

      return {
        id: p.id,
        name: `${p.firstname} ${p.lastname}`,
        photo: p.photo,
        age: p.age,
        nationality: p.nationality,
        height: p.height,
        weight: p.weight,
        position: s.games.position,
        number: s.games.number,
        teamId: s.team.id,
        teamName: s.team.name,
        teamLogo: s.team.logo,
        captain: s.games.captain,
        // games
        appearances: s.games.appearences || 0,
        lineups: s.games.lineups || 0,
        minutes: s.games.minutes || 0,
        rating: s.games.rating ? parseFloat(s.games.rating).toFixed(2) : null,
        // goals
        goals: s.goals.total || 0,
        assists: s.goals.assists || 0,
        conceded: s.goals.conceded || 0,
        saves: s.goals.saves || 0,
        // shots
        shotsTotal: s.shots.total || 0,
        shotsOn: s.shots.on || 0,
        // passes
        passesTotal: s.passes.total || 0,
        keyPasses: s.passes.key || 0,
        passAccuracy: s.passes.accuracy || null,
        // tackles
        tackles: s.tackles.total || 0,
        blocks: s.tackles.blocks || 0,
        interceptions: s.tackles.interceptions || 0,
        // duels
        duelsTotal: s.duels.total || 0,
        duelsWon: s.duels.won || 0,
        // dribbles
        dribblesAttempted: s.dribbles.attempts || 0,
        dribblesSuccess: s.dribbles.success || 0,
        // fouls
        foulsDrawn: s.fouls.drawn || 0,
        foulsCommitted: s.fouls.committed || 0,
        // cards
        yellowCards: s.cards.yellow || 0,
        yellowRed: s.cards.yellowred || 0,
        redCards: s.cards.red || 0,
        // penalties
        penScored: s.penalty.scored || 0,
        penMissed: s.penalty.missed || 0,
        penSaved: s.penalty.saved || 0,
        // substitutes
        subIn: s.substitutes.in || 0,
        subOut: s.substitutes.out || 0,
        bench: s.substitutes.bench || 0,
      };
    })
    .filter(Boolean);

  teamPlayersCache[teamId] = players;
  return players;
}

// loading / error helpers

function showLoading(elementId) {
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

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `
      <tr>
        <td colspan="6" class="error-cell">
          <p class="error-message">${message}</p>
          <button onclick="loadAllData()" class="retry-button">Retry</button>
        </td>
      </tr>`;
  }
}

// ─── INITIALIZATION ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  attachEventListeners();
  loadAllData();
});

async function loadAllData() {
  showLoading("standings-body");
  showLoading("stats-body");

  try {
    standingsData = await fetchStandings();
    renderStandings();
  } catch (err) {
    console.error("Failed to load standings:", err);
    showError("standings-body", "Failed to load standings. " + err.message);
  }

  try {
    const [scorers, assists] = await Promise.all([
      fetchTopScorers(),
      fetchTopAssists(),
    ]);
    topScorersData = scorers;
    topAssistsData = assists;
    buildAllPlayers();
    renderStats();
  } catch (err) {
    console.error("Failed to load player stats:", err);
    showError("stats-body", "Failed to load player stats. " + err.message);
  }
}

// build a flat searchable list from top scorers + top assists
function buildAllPlayers() {
  const map = new Map();

  const extract = (entry) => {
    const p = entry.player;
    const s = entry.statistics[0];
    return {
      id: p.id,
      name: `${p.firstname} ${p.lastname}`,
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
  };

  topScorersData.forEach((e) => {
    map.set(e.player.id, extract(e));
  });
  topAssistsData.forEach((e) => {
    const existing = map.get(e.player.id);
    if (existing) {
      const s = e.statistics[0];
      existing.assists = Math.max(existing.assists, s.goals.assists || 0);
    } else {
      map.set(e.player.id, extract(e));
    }
  });

  allPlayers = Array.from(map.values());
}

// standings rendering

function renderStandings() {
  const tbody = document.getElementById("standings-body");
  tbody.innerHTML = "";

  standingsData.forEach((entry) => {
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
    tbody.appendChild(row);
  });
}

// stats rendering

function renderStats() {
  const tbody = document.getElementById("stats-body");
  const title = document.getElementById("stats-title");
  const columnHeader = document.getElementById("stat-column");
  tbody.innerHTML = "";

  const source = currentStatType === "goals" ? topScorersData : topAssistsData;
  title.textContent =
    currentStatType === "goals" ? "Top Scorers" : "Top Assist Leaders";
  columnHeader.textContent = currentStatType === "goals" ? "Goals" : "Assists";

  source.slice(0, 15).forEach((entry) => {
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
      // build a basic player object for the standalone player view
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
    tbody.appendChild(row);
  });
}

// single modal — team view

async function openTeamModal(entry) {
  currentTeamEntry = entry;
  const team = entry.team;
  const stats = entry.all;
  const modal = document.getElementById("detail-modal");
  const content = document.getElementById("modal-dynamic-content");
  const backBtn = document.getElementById("modal-back-btn");

  document.getElementById("modal-title").innerHTML = `
    <img src="${team.logo}" alt="${team.name}" class="modal-team-logo" width="36" height="36" />
    ${team.name}`;

  backBtn.hidden = true;

  content.innerHTML = `
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

  modal.removeAttribute("hidden");
  document.getElementById("close-modal").focus();

  // fetch full squad with stats
  try {
    const players = await fetchTeamPlayers(team.id);
    renderSquad(players, entry);
  } catch (err) {
    document.getElementById("squad-container").innerHTML =
      `<p class="error-message">⚠ Could not load squad. ${err.message}</p>`;
  }
}

function renderSquad(players, teamEntry) {
  const container = document.getElementById("squad-container");
  if (!players.length) {
    container.innerHTML = '<p class="no-data">No squad data available.</p>';
    return;
  }

  // group by position
  const groups = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [] };
  players.forEach((p) => {
    const pos = p.position || "Attacker";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  });

  // sort each group: most appearances first
  Object.values(groups).forEach((arr) =>
    arr.sort((a, b) => b.appearances - a.appearances),
  );

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

  // click handlers
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

// single modal - player view

function openPlayerView(player, fromTeamEntry) {
  const modal = document.getElementById("detail-modal");
  const content = document.getElementById("modal-dynamic-content");
  const backBtn = document.getElementById("modal-back-btn");

  document.getElementById("modal-title").textContent = "Player Details";

  if (fromTeamEntry) {
    backBtn.hidden = false;
    backBtn.textContent = `← Back to ${fromTeamEntry.team.name}`;
    backBtn.onclick = () => openTeamModal(fromTeamEntry);
  } else {
    backBtn.hidden = true;
  }

  // build the position-specific stats HTML
  const statsHTML = buildPositionStats(player);

  content.innerHTML = `
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

  modal.removeAttribute("hidden");
  document.getElementById("close-modal").focus();
}

/**
 * build position-specific stat cards.
 * shows relevant stats based on the player's position.
 */
function buildPositionStats(player) {
  const pos = player.position;

  // if we don't have detailed stats (e.g player from search with only basic data)
  if (player.appearances === undefined && player.minutes === undefined) {
    // fallback - show whatever we have
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

  // section 1: overview (all positions)
  html += `<h4 class="stats-section-title">Overview</h4>`;
  html += '<div class="player-stats-grid">';
  html += statBox(player.appearances, "Apps");
  html += statBox(player.lineups, "Starts");
  html += statBox(formatMinutes(player.minutes), "Minutes");
  html += statBox(player.rating || "–", "Rating");
  html += "</div>";

  if (pos === "Goalkeeper") {
    // goalkeeper-specific
    html += `<h4 class="stats-section-title">Goalkeeping</h4>`;
    html += '<div class="player-stats-grid">';
    html += statBox(player.conceded, "Conceded");
    html += statBox(player.saves, "Saves");
    html += statBox(player.penSaved, "Pen Saved");
    html += statBox(player.goals, "Goals");
    html += "</div>";
  } else if (pos === "Defender") {
    // defender-specific
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
    // midfielder-specific
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
    // attacker-specific
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

  // cards (all positions)
  html += `<h4 class="stats-section-title">Discipline</h4>`;
  html += '<div class="player-stats-grid">';
  html += statBox(player.yellowCards, "Yellows");
  html += statBox(player.redCards, "Reds");
  html += statBox(player.foulsCommitted, "Fouls");
  html += statBox(player.foulsDrawn, "Fouls Won");
  html += "</div>";

  return html;
}

// stat helpers

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

// toggle stat type

function toggleStatType() {
  currentStatType = currentStatType === "goals" ? "assists" : "goals";
  const button = document.getElementById("toggle-stat");
  const label = button.querySelector(".stat-label");

  if (currentStatType === "goals") {
    label.textContent = "Top Scorers";
    button.setAttribute("aria-pressed", "false");
  } else {
    label.textContent = "Top Assists";
    button.setAttribute("aria-pressed", "true");
  }

  renderStats();
}

// search

function handleSearch(event) {
  event.preventDefault();
  const searchTerm = document
    .getElementById("site-search")
    .value.toLowerCase()
    .trim();
  const resultsDiv = document.getElementById("search-results");

  if (!searchTerm) {
    resultsDiv.classList.remove("active");
    return;
  }

  const matched = allPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm),
  );

  if (matched.length > 0) {
    resultsDiv.className = "search-results active found";
    let html = '<div class="results-list">';
    matched.forEach((player) => {
      html += `
        <div class="result-item" data-player-id="${player.id}">
          <div class="result-name">${player.name}</div>
          <div class="result-team">${player.teamName}</div>
        </div>`;
    });
    html += "</div>";
    resultsDiv.innerHTML = html;

    document.querySelectorAll(".result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const pid = parseInt(item.dataset.playerId);
        const player = allPlayers.find((p) => p.id === pid);
        openPlayerView(player, null);
        document.getElementById("site-search").value = "";
        resultsDiv.classList.remove("active");
      });
    });
  } else {
    resultsDiv.className = "search-results active not-found";
    resultsDiv.innerHTML = `<div class="no-results">No players found for "<strong>${searchTerm}</strong>"</div>`;
  }
}

function clearSearchResults() {
  const resultsDiv = document.getElementById("search-results");
  resultsDiv.classList.remove("active");
  resultsDiv.innerHTML = "";
}

// modal close

function closeModal() {
  document.getElementById("detail-modal").setAttribute("hidden", "");
  currentTeamEntry = null;
}

function handleOutsideClick(event) {
  if (event.target === document.getElementById("detail-modal")) {
    closeModal();
  }
}

// event listeners

function attachEventListeners() {
  document
    .getElementById("toggle-stat")
    .addEventListener("click", toggleStatType);
  document
    .getElementById("search-form")
    .addEventListener("submit", handleSearch);
  document.getElementById("site-search").addEventListener("input", () => {
    if (document.getElementById("site-search").value === "")
      clearSearchResults();
  });

  document.getElementById("close-modal").addEventListener("click", closeModal);
  document
    .getElementById("detail-modal")
    .addEventListener("click", handleOutsideClick);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

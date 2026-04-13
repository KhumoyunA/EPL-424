import { LEAGUE_ID } from "./api.js";

// single state object — no DOM references, no rendering logic
const state = {
  currentStatType: "goals", // "goals" | "assists"
  searchQuery: "",
  standings: [],
  topScorers: [],
  topAssists: [],
  allPlayers: [],
  currentTeamEntry: null,
  teamPlayersCache: {},
};

// setters

export function setStandings(data) {
  state.standings = data;
}

export function setTopData(scorers, assists) {
  state.topScorers = scorers;
  state.topAssists = assists;
}

export function setSearchQuery(query) {
  state.searchQuery = query;
}

export function toggleStatType() {
  state.currentStatType =
    state.currentStatType === "goals" ? "assists" : "goals";
}

export function getStatType() {
  return state.currentStatType;
}

export function setCurrentTeamEntry(entry) {
  state.currentTeamEntry = entry;
}

export function getCurrentTeamEntry() {
  return state.currentTeamEntry;
}

export function getAllPlayers() {
  return state.allPlayers;
}

export function getCachedTeamPlayers(teamId) {
  return state.teamPlayersCache[teamId] || null;
}

export function cacheTeamPlayers(teamId, players) {
  state.teamPlayersCache[teamId] = players;
}

function normalizePlayer(entry) {
  const p = entry.player;
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
    appearances: s.games.appearences || 0,
    lineups: s.games.lineups || 0,
    minutes: s.games.minutes || 0,
    rating: s.games.rating ? parseFloat(s.games.rating).toFixed(2) : null,
    goals: s.goals.total || 0,
    assists: s.goals.assists || 0,
    conceded: s.goals.conceded || 0,
    saves: s.goals.saves || 0,
    shotsTotal: s.shots.total || 0,
    shotsOn: s.shots.on || 0,
    passesTotal: s.passes.total || 0,
    keyPasses: s.passes.key || 0,
    passAccuracy: s.passes.accuracy || null,
    tackles: s.tackles.total || 0,
    blocks: s.tackles.blocks || 0,
    interceptions: s.tackles.interceptions || 0,
    duelsTotal: s.duels.total || 0,
    duelsWon: s.duels.won || 0,
    dribblesAttempted: s.dribbles.attempts || 0,
    dribblesSuccess: s.dribbles.success || 0,
    foulsDrawn: s.fouls.drawn || 0,
    foulsCommitted: s.fouls.committed || 0,
    yellowCards: s.cards.yellow || 0,
    yellowRed: s.cards.yellowred || 0,
    redCards: s.cards.red || 0,
    penScored: s.penalty.scored || 0,
    penMissed: s.penalty.missed || 0,
    penSaved: s.penalty.saved || 0,
    subIn: s.substitutes.in || 0,
    subOut: s.substitutes.out || 0,
    bench: s.substitutes.bench || 0,
  };
}

// build searchable player list from top scorers + assists
export function buildAllPlayers() {
  const map = new Map();

  state.topScorers.forEach((e) => map.set(e.player.id, normalizePlayer(e)));
  state.topAssists.forEach((e) => {
    const existing = map.get(e.player.id);
    if (existing) {
      const s = e.statistics[0];
      existing.assists = Math.max(existing.assists, s.goals.assists || 0);
    } else {
      map.set(e.player.id, normalizePlayer(e));
    }
  });

  state.allPlayers = Array.from(map.values()).filter(Boolean);
}

// normalize raw team entries and cache
export function normalizeAndCacheTeamPlayers(teamId, rawEntries) {
  const players = rawEntries.map(normalizePlayer).filter(Boolean);
  state.teamPlayersCache[teamId] = players;
  return players;
}

// selectos

// returns top 15 players for the current stat type
export function getTopStatPlayers() {
  const source =
    state.currentStatType === "goals" ? state.topScorers : state.topAssists;
  return source.slice(0, 15);
}

// returns true if stats data has been loaded
export function hasStatsData() {
  return state.topScorers.length > 0 || state.topAssists.length > 0;
}

// returns allPlayers filtered by the current search query
export function getFilteredPlayers() {
  const query = state.searchQuery.toLowerCase().trim();
  if (!query) return [];
  return state.allPlayers.filter((p) => p.name.toLowerCase().includes(query));
}

// returns standings sorted by rank (already sorted from API)
export function getSortedStandings() {
  return state.standings;
}

// returns cached squad grouped by position, sorted by appearances
export function getSquadByPosition(teamId) {
  const players = state.teamPlayersCache[teamId];
  if (!players) return null;

  const groups = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [] };
  players.forEach((p) => {
    const pos = p.position || "Attacker";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  });

  // sort each group by appearances descending
  Object.values(groups).forEach((arr) =>
    arr.sort((a, b) => b.appearances - a.appearances),
  );

  return groups;
}

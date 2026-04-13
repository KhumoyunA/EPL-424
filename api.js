const API_HOST = "https://v3.football.api-sports.io";
const LEAGUE_ID = 39;
const SEASON = 2024;

const cache = {};

async function apiFetch(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_HOST}/${endpoint}?${queryString}`;

  if (cache[url]) return cache[url];

  const response = await fetch(url, {
    headers: { "x-apisports-key": CONFIG.API_KEY },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(Object.values(data.errors).join(", "));
  }

  cache[url] = data;
  return data;
}

export async function fetchStandings() {
  const data = await apiFetch("standings", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response?.[0]?.league?.standings?.[0] || [];
}

export async function fetchTopScorers() {
  const data = await apiFetch("players/topscorers", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response || [];
}

export async function fetchTopAssists() {
  const data = await apiFetch("players/topassists", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  return data.response || [];
}

export async function fetchTeamPlayers(teamId) {
  let page = 1;
  let totalPages = 1;
  const all = [];

  while (page <= totalPages) {
    const data = await apiFetch("players", {
      team: teamId,
      season: SEASON,
      league: LEAGUE_ID,
      page,
    });
    all.push(...(data.response || []));
    totalPages = data.paging?.total || 1;
    page++;
  }

  return all;
}

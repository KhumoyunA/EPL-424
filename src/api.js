import { CONFIG } from "../config.js";

const API_HOST = "https://v3.football.api-sports.io";
const LEAGUE_ID = 39;
const SEASON = 2024;

const cache = {};

// maps error conditions to user-facing messages and recovery behavior
const MESSAGE_MAP = [
  {
    test: (err) => err.name === "AbortError",
    message: "Request timed out. The server took too long to respond.",
    showRetry: true,
  },
  {
    test: (err) => err instanceof TypeError,
    message: "Network error. Please check your internet connection.",
    showRetry: true,
  },
  {
    test: (err) => err.status === 403,
    message: "Access denied. Your API key may be invalid or expired.",
    showRetry: false,
  },
  {
    test: (err) => err.status === 429,
    message:
      "API Rate limit exceeded. You have used all 100 daily API requests.",
    showRetry: false,
  },
  {
    test: (err) => err.status >= 500,
    message: "The API server is experiencing issues. Try again later.",
    showRetry: true,
  },
  {
    test: (err) => err.status >= 400,
    message: "Bad request. The API rejected the request.",
    showRetry: false,
  },
  {
    // fallback
    test: () => true,
    message: "Something went wrong while loading data.",
    showRetry: true,
  },
];

// classify an error using the message map
// returns { message: string, showRetry: boolean }
export function classifyError(err) {
  const match = MESSAGE_MAP.find((entry) => entry.test(err));
  return { message: match.message, showRetry: match.showRetry };
}

// core fetch wrapper with timeout
async function apiFetch(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_HOST}/${endpoint}?${queryString}`;

  if (cache[url]) return cache[url];

  // timeout with AbortController (8 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": CONFIG.API_KEY },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${Object.values(data.errors).join(", ")}`);
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

  return allEntries;
}

export { LEAGUE_ID };

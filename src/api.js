import { CONFIG } from "../config.js";

const API_HOST = "https://v3.football.api-sports.io";
const LEAGUE_ID = 39;
const SEASON = 2024;

const cache = {};

// localStorage key prefix
const STORAGE_PREFIX = "epl_cache_";

// save data + timestamp to localStorage
function persistToStorage(key, data) {
  try {
    const entry = { data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

// load cached data from localStorage
// returns { data, timestamp } or null
export function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// tracks successful API calls so we can distinguish
// a real network error from a CORS-blocked 429
let successfulRequests = 0;

// maps error conditions to user-facing messages and recovery behavior
const MESSAGE_MAP = [
  {
    test: (err) => err.name === "AbortError",
    message: "Request timed out. The server took too long to respond.",
    showRetry: true,
  },
  {
    // CORS-blocked 429: if prior requests succeeded, the network is fine
    // but the API is returning a 429 without CORS headers
    test: (err) => err instanceof TypeError && successfulRequests > 0,
    message: "API rate limit likely exceeded. The server blocked the request.",
    showRetry: false,
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
    // API-body errors like "You have reached the request limit for the day"
    test: (err) => err.message && err.message.startsWith("API error:"),
    // message resolved dynamically in classifyError
    message: null,
    showRetry: false,
  },
  {
    // fallback for any unrecognized error
    test: () => true,
    message: "Something went wrong while loading data.",
    showRetry: true,
  },
];

// map API-body error text to user-friendly messages
function friendlyApiMessage(rawMessage) {
  const text = rawMessage.replace("API error: ", "").toLowerCase();

  if (text.includes("request limit") || text.includes("rate limit")) {
    return "Daily API request limit reached. Data may be outdated.";
  }
  if (text.includes("token") || text.includes("key")) {
    return "API authentication failed. Please check the API key.";
  }
  if (text.includes("league") || text.includes("season")) {
    return "The requested league or season data is not available.";
  }
  return "The API returned an error. Please try again later.";
}

// classify an error using the message map
// returns { message: string, showRetry: boolean }
export function classifyError(err) {
  const match = MESSAGE_MAP.find((entry) => entry.test(err));
  const message = match.message || friendlyApiMessage(err.message);
  return { message, showRetry: match.showRetry };
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

  successfulRequests++;
  cache[url] = data;
  return data;
}

export async function fetchStandings() {
  const data = await apiFetch("standings", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  const result = data.response?.[0]?.league?.standings?.[0] || [];
  persistToStorage("standings", result);
  return result;
}

export async function fetchTopScorers() {
  const data = await apiFetch("players/topscorers", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  const result = data.response || [];
  persistToStorage("topscorers", result);
  return result;
}

export async function fetchTopAssists() {
  const data = await apiFetch("players/topassists", {
    league: LEAGUE_ID,
    season: SEASON,
  });
  const result = data.response || [];
  persistToStorage("topassists", result);
  return result;
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

  persistToStorage("team_players_" + teamId, allEntries);
  return allEntries;
}

export { LEAGUE_ID };

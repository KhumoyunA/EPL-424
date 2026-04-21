import {
  fetchStandings,
  fetchTopScorers,
  fetchTopAssists,
  classifyError,
  loadFromStorage,
} from "./api.js";
import { setStandings, setTopData, buildAllPlayers } from "./state.js";
import {
  showLoading,
  showError,
  renderStandings,
  renderStats,
  updateStatusBar,
  renderStaleNotice,
} from "./render.js";
import { attachEventListeners } from "./events.js";
import { dom } from "./dom.js";

async function loadAllData() {
  showLoading("standings-body");
  showLoading("stats-body");

  let freshTimestamp = null;

  // load standings
  try {
    const standings = await fetchStandings();
    setStandings(standings);
    renderStandings();
    freshTimestamp = Date.now();
  } catch (err) {
    console.error("Failed to load standings:", err);
    const classified = classifyError(err);

    // attempt cache fallback
    const cached = loadFromStorage("standings");
    if (cached && cached.data && cached.data.length > 0) {
      setStandings(cached.data);
      renderStandings();
      freshTimestamp = cached.timestamp;
      renderStaleNotice(".standings-section", classified.message);
    } else {
      showError(
        "standings-body",
        classified,
        classified.showRetry ? loadAllData : null,
      );
    }
  }

  // load stats (scorers + assists)
  try {
    const [scorers, assists] = await Promise.all([
      fetchTopScorers(),
      fetchTopAssists(),
    ]);
    setTopData(scorers, assists);
    buildAllPlayers();
    renderStats();
    dom.toggleBtn.disabled = false;
    if (!freshTimestamp) freshTimestamp = Date.now();
  } catch (err) {
    const classified = classifyError(err);

    // attempt cache fallback
    const cachedScorers = loadFromStorage("topscorers");
    const cachedAssists = loadFromStorage("topassists");
    if (
      cachedScorers &&
      cachedScorers.data &&
      cachedAssists &&
      cachedAssists.data
    ) {
      setTopData(cachedScorers.data, cachedAssists.data);
      buildAllPlayers();
      renderStats();
      dom.toggleBtn.disabled = false;
      freshTimestamp = freshTimestamp || cachedScorers.timestamp;
      renderStaleNotice(".stats-section", classified.message);
    } else {
      dom.toggleBtn.disabled = true;
      showError(
        "stats-body",
        classified,
        classified.showRetry ? loadAllData : null,
      );
    }
  }

  // update the status bar with timestamp
  if (freshTimestamp) {
    updateStatusBar(freshTimestamp);
  }
}

function init() {
  attachEventListeners();
  loadAllData();
}

document.addEventListener("DOMContentLoaded", init);


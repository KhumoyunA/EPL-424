import {
  fetchStandings,
  fetchTopScorers,
  fetchTopAssists,
  classifyError,
} from "./api.js";
import { setStandings, setTopData, buildAllPlayers } from "./state.js";
import {
  showLoading,
  showError,
  renderStandings,
  renderStats,
} from "./render.js";
import { attachEventListeners } from "./events.js";

async function loadAllData() {
  showLoading("standings-body");
  showLoading("stats-body");

  try {
    const standings = await fetchStandings();
    setStandings(standings);
    renderStandings();
  } catch (err) {
    console.error("Failed to load standings:", err);
    const classified = classifyError(err);
    // showRetry drives the retry button. Only shown when message map says so
    showError(
      "standings-body",
      classified,
      classified.showRetry ? loadAllData : null,
    );
  }

  try {
    const [scorers, assists] = await Promise.all([
      fetchTopScorers(),
      fetchTopAssists(),
    ]);
    setTopData(scorers, assists);
    buildAllPlayers();
    renderStats();
  } catch (err) {
    console.error("Failed to load player stats:", err);
    const classified = classifyError(err);
    showError(
      "stats-body",
      classified,
      classified.showRetry ? loadAllData : null,
    );
  }
}

function init() {
  attachEventListeners();
  loadAllData();
}

document.addEventListener("DOMContentLoaded", init);

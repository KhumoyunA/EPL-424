import {
  fetchStandings,
  fetchTopScorers,
  fetchTopAssists,
} from "./api.js";

import { setState, buildPlayers } from "./state.js";
import { renderStandings, renderStats } from "./render.js";
import { attachEvents } from "./events.js";

async function init() {
  attachEvents();

  try {
    const standings = await fetchStandings();
    setState({ standings });
    renderStandings();
  } catch (e) {
    console.error(e);
  }

  try {
    const [scorers, assists] = await Promise.all([
      fetchTopScorers(),
      fetchTopAssists(),
    ]);

    setState({ scorers, assists });
    buildPlayers();
    renderStats();
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);

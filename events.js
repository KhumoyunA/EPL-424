import { setState, getState } from "./state.js";
import { renderStats } from "./render.js";

export function attachEvents() {
  document
    .getElementById("toggle-stat")
    .addEventListener("click", () => {
      const { currentStatType } = getState();
      setState({
        currentStatType:
          currentStatType === "goals" ? "assists" : "goals",
      });
      renderStats();
    });
}

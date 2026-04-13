// Component: SearchResults
// Input: { container, results, query, onSelect }
// Output: DOM nodes mounted inside `container`
// Events: onSelect(playerId) — called when user clicks a result
// Dependencies: none

export function SearchResults({ container, results, query, onSelect }) {
  if (!container) return;

  // Component owns its subtree
  container.replaceChildren();

  // empty query → hide
  if (!query.trim()) {
    container.className = "search-results";
    return;
  }

  // no results → empty state
  if (results.length === 0) {
    container.className = "search-results active not-found";

    const div = document.createElement("div");
    div.className = "no-results";
    div.innerHTML = `No players found for "<strong>${query}</strong>"`;

    container.appendChild(div);
    return;
  }

  // success state
  container.className = "search-results active found";

  const list = document.createElement("div");
  list.className = "results-list";

  results.forEach((player) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.playerId = player.id;

    item.innerHTML = `
      <div class="result-name">${player.name}</div>
      <div class="result-team">${player.teamName}</div>
    `;

    item.addEventListener("click", () => {
      onSelect(player.id);
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}

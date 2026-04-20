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

  if (results.length === 0) {
    container.className = "search-results active not-found";

    const div = document.createElement("div");
    div.className = "no-results";
    
    div.appendChild(document.createTextNode('No players found for "'));
    const strong = document.createElement("strong");
    strong.textContent = query;
    div.appendChild(strong);
    div.appendChild(document.createTextNode('"'));

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
    item.tabIndex = 0;

    const nameDiv = document.createElement("div");
    nameDiv.className = "result-name";
    nameDiv.textContent = player.name;

    const teamDiv = document.createElement("div");
    teamDiv.className = "result-team";
    teamDiv.textContent = player.teamName;

    item.appendChild(nameDiv);
    item.appendChild(teamDiv);

    const handleSelect = () => onSelect(player.id);

    item.addEventListener("click", handleSelect);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}

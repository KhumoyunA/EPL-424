import { dom } from "./dom.js";
import { fetchTeamPlayers, classifyError } from "./api.js";
import {
  getStatType,
  getTopStatPlayers,
  getFilteredPlayers,
  getSortedStandings,
  getSquadByPosition,
  getAllPlayers,
  setCurrentTeamEntry,
  setSearchQuery,
  getCachedTeamPlayers,
  normalizeAndCacheTeamPlayers,
} from "./state.js";
import { SearchResults } from "./components/SearchResults.js";

// helper to safely create DOM elements and mitigate XSS
function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.keys(props).forEach((key) => {
    if (key === "className") {
      el.className = props[key];
    } else if (key === "dataset") {
      Object.assign(el.dataset, props[key]);
    } else if (key === "style") {
      Object.assign(el.style, props[key]);
    } else {
      el[key] = props[key];
    }
  });
  if (children) {
    children.forEach((child) => {
      if (child == null) return;
      if (typeof child === "string" || typeof child === "number") {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
  }
  return el;
}

let _triggerElement = null;

export function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.replaceChildren(
      createElement("tr", {}, [
        createElement("td", { colSpan: 6, className: "loading-cell" }, [
          createElement("div", { className: "loading-spinner" }),
          createElement("p", {}, ["Loading data…"]),
        ]),
      ]),
    );
  }
}

export function showError(elementId, { message, showRetry }, onRetry) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const tdChildren = [
    createElement("p", { className: "error-message" }, [message]),
  ];

  if (showRetry) {
    const btn = createElement("button", { className: "retry-button" }, [
      "Retry",
    ]);
    if (onRetry) btn.addEventListener("click", onRetry);
    tdChildren.push(btn);
  }

  el.replaceChildren(
    createElement("tr", {}, [
      createElement("td", { colSpan: 6, className: "error-cell" }, tdChildren),
    ]),
  );
}

function showEmpty(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.replaceChildren(
      createElement("tr", {}, [
        createElement("td", { colSpan: 6, className: "empty-cell" }, [
          createElement("p", {}, [message]),
        ]),
      ]),
    );
  }
}

export function renderStandings() {
  const standings = getSortedStandings();

  if (standings.length === 0) {
    showEmpty("standings-body", "No standings data available.");
    return;
  }

  const rows = standings.map((entry) => {
    const team = entry.team;
    const stats = entry.all;

    const row = createElement(
      "tr",
      { style: { cursor: "pointer" }, tabIndex: 0 },
      [
        createElement("td", {}, [
          createElement("div", { className: "team-cell" }, [
            createElement("span", { className: "rank-badge" }, [entry.rank]),
            createElement("img", {
              src: team.logo,
              alt: team.name,
              className: "team-logo",
              width: 24,
              height: 24,
            }),
            createElement("strong", {}, [team.name]),
          ]),
        ]),
        createElement("td", {}, [stats.played]),
        createElement("td", {}, [stats.win]),
        createElement("td", {}, [stats.draw]),
        createElement("td", {}, [stats.lose]),
        createElement("td", {}, [createElement("strong", {}, [entry.points])]),
      ],
    );

    row.setAttribute("aria-label", `View ${team.name} details`);
    row.setAttribute("role", "button");
    const openModal = () => {
      _triggerElement = row;
      openTeamModal(entry);
    };
    row.addEventListener("click", openModal);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal();
      }
    });

    return row;
  });

  dom.standingsBody.replaceChildren(...rows);
}

export function renderStats() {
  const currentStatType = getStatType();
  const source = getTopStatPlayers();

  dom.statsTitle.textContent =
    currentStatType === "goals" ? "Top Scorers" : "Top Assist Leaders";
  dom.statColumn.textContent =
    currentStatType === "goals" ? "Goals" : "Assists";

  if (source.length === 0) {
    showEmpty("stats-body", "No player stats available.");
    return;
  }

  const rows = source.map((entry) => {
    const p = entry.player;
    const s = entry.statistics[0];
    const value =
      currentStatType === "goals" ? s.goals.total || 0 : s.goals.assists || 0;
    const fullName = `${p.firstname} ${p.lastname}`;

    const row = createElement(
      "tr",
      { style: { cursor: "pointer" }, tabIndex: 0 },
      [
        createElement("td", {}, [
          createElement("div", { className: "player-cell" }, [
            createElement("img", {
              src: p.photo,
              alt: fullName,
              className: "player-photo",
              width: 32,
              height: 32,
            }),
            createElement("strong", {}, [fullName]),
          ]),
        ]),
        createElement("td", {}, [
          createElement("div", { className: "team-cell-sm" }, [
            createElement("img", {
              src: s.team.logo,
              alt: s.team.name,
              className: "team-logo-sm",
              width: 18,
              height: 18,
            }),
            " ",
            s.team.name,
          ]),
        ]),
        createElement("td", {}, [createElement("strong", {}, [value])]),
      ],
    );

    row.setAttribute("aria-label", `View ${fullName} stats`);
    row.setAttribute("role", "button");

    const openPlayer = () => {
      _triggerElement = row;
      const allPlayers = getAllPlayers();
      const playerObj = allPlayers.find((pl) => pl.id === p.id) || {
        id: p.id,
        name: fullName,
        photo: p.photo,
        age: p.age,
        nationality: p.nationality,
        position: s.games.position,
        teamId: s.team.id,
        teamName: s.team.name,
        teamLogo: s.team.logo,
        goals: s.goals.total || 0,
        assists: s.goals.assists || 0,
        appearances: s.games.appearences || 0,
        rating: s.games.rating ? parseFloat(s.games.rating).toFixed(2) : null,
      };
      openPlayerView(playerObj, null);
    };

    row.addEventListener("click", openPlayer);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPlayer();
      }
    });

    return row;
  });

  dom.statsBody.replaceChildren(...rows);
}

export function handleSearch(event) {
  event.preventDefault();

  const query = dom.siteSearch.value;
  setSearchQuery(query);

  const matched = getFilteredPlayers();

  SearchResults({
    container: dom.searchResults,
    results: matched,
    query,
    onSelect: (playerId) => {
      const allPlayers = getAllPlayers();
      const player = allPlayers.find((p) => p.id === playerId);

      openPlayerView(player, null);

      dom.siteSearch.value = "";
      setSearchQuery("");
      dom.searchResults.classList.remove("active");
    },
  });
}

export function clearSearchResults() {
  setSearchQuery("");

  SearchResults({
    container: dom.searchResults,
    results: [],
    query: "",
    onSelect: () => {},
  });
}

async function openTeamModal(entry) {
  setCurrentTeamEntry(entry);
  const team = entry.team;
  const stats = entry.all;

  dom.modalTitle.replaceChildren(
    createElement("img", {
      src: team.logo,
      alt: team.name,
      className: "modal-team-logo",
      width: 36,
      height: 36,
    }),
    " ",
    team.name,
  );

  dom.modalBackBtn.hidden = true;

  const contentChildren = [
    createElement("div", { className: "team-stats-grid" }, [
      statBox(entry.rank, "Position"),
      statBox(entry.points, "Points"),
      statBox(entry.goalsDiff, "Goal Diff"),
      statBox(stats.goals.for, "Goals For"),
      statBox(stats.goals.against, "Goals Agst"),
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Record: "]),
      `${stats.win}W – ${stats.draw}D – ${stats.lose}L`,
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Form: "]),
      createElement(
        "span",
        { className: "form-display" },
        renderForm(entry.form),
      ),
    ]),
  ];

  if (entry.description) {
    contentChildren.push(
      createElement("p", {}, [
        createElement("strong", {}, ["Status: "]),
        entry.description,
      ]),
    );
  }

  contentChildren.push(
    createElement("hr", { className: "section-divider" }),
    createElement("h3", {}, ["Squad"]),
    createElement(
      "div",
      { id: "squad-container", className: "squad-loading" },
      [
        createElement("div", { className: "loading-spinner" }),
        createElement("p", {}, ["Loading squad…"]),
      ],
    ),
  );

  dom.modalContent.replaceChildren(...contentChildren);

  dom.modal.removeAttribute("hidden");
  dom.closeModalBtn.focus();

  try {
    let cached = getCachedTeamPlayers(team.id);
    if (!cached) {
      const raw = await fetchTeamPlayers(team.id);
      cached = normalizeAndCacheTeamPlayers(team.id, raw);
    }
    renderSquad(cached, entry);
  } catch (err) {
    const { message, showRetry } = classifyError(err);
    const container = document.getElementById("squad-container");
    container.className = "";

    const errChildren = [
      createElement("p", { className: "error-message" }, [message]),
    ];
    if (showRetry) {
      const btn = createElement("button", { className: "retry-button" }, [
        "Retry",
      ]);
      btn.addEventListener("click", () => openTeamModal(entry));
      errChildren.push(btn);
    }

    container.replaceChildren(...errChildren);
  }
}

function renderSquad(players, teamEntry) {
  const container = document.getElementById("squad-container");

  if (!players.length) {
    container.className = "";
    container.replaceChildren(
      createElement("p", { className: "no-data" }, [
        "No squad data available.",
      ]),
    );
    return;
  }

  const groups = getSquadByPosition(teamEntry.team.id);
  if (!groups) return;

  const children = [];
  for (const [position, list] of Object.entries(groups)) {
    if (!list.length) continue;

    const playersGrid = list.map((p) => {
      const badge =
        p.appearances > 0
          ? createElement("span", { className: "app-badge" }, [
              `${p.appearances} app`,
            ])
          : createElement("span", { className: "app-badge dim" }, ["0 app"]);

      const card = createElement(
        "div",
        { className: "player-card", tabIndex: 0, dataset: { playerId: p.id } },
        [
          createElement("img", {
            src: p.photo,
            alt: p.name,
            className: "card-player-photo",
            width: 48,
            height: 48,
          }),
          createElement("div", { className: "card-info" }, [
            createElement("span", { className: "card-name" }, [p.name]),
            badge,
          ]),
        ],
      );

      const handler = () => {
        const player = players.find((pl) => pl.id === p.id);
        if (player) openPlayerView(player, teamEntry);
      };

      card.addEventListener("click", handler);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      });

      return card;
    });

    children.push(
      createElement("div", { className: "position-group" }, [
        createElement("h4", {}, [`${position}s`]),
        createElement("div", { className: "players-grid" }, playersGrid),
      ]),
    );
  }

  container.className = "";
  container.replaceChildren(...children);
}

function openPlayerView(player, fromTeamEntry) {
  dom.modalTitle.textContent = "Player Details";

  if (fromTeamEntry) {
    dom.modalBackBtn.hidden = false;
    dom.modalBackBtn.textContent = `← Back to ${fromTeamEntry.team.name}`;
    dom.modalBackBtn.onclick = () => openTeamModal(fromTeamEntry);
  } else {
    dom.modalBackBtn.hidden = true;
  }

  const metaText = [
    player.position || "",
    player.age ? " · Age " + player.age : "",
    player.nationality ? " · " + player.nationality : "",
  ].join("");

  const physText = [
    player.height ? player.height + " cm" : "",
    player.height && player.weight ? " · " : "",
    player.weight ? player.weight + " kg" : "",
  ].join("");

  const headerNameChildren = [player.name];
  if (player.captain) {
    headerNameChildren.push(
      " ",
      createElement("span", { className: "captain-badge" }, ["C"]),
    );
  }

  const headerDivChildren = [
    createElement("h3", {}, headerNameChildren),
    createElement("p", { className: "player-meta" }, [metaText]),
  ];
  if (physText.trim()) {
    headerDivChildren.push(
      createElement("p", { className: "player-meta" }, [physText]),
    );
  }

  const teamDivChildren = [];
  if (player.teamLogo) {
    teamDivChildren.push(
      createElement("img", {
        src: player.teamLogo,
        alt: player.teamName,
        width: 20,
        height: 20,
      }),
      " ",
    );
  }
  teamDivChildren.push(createElement("span", {}, [player.teamName]));

  const contentChildren = [
    createElement("div", { className: "player-detail-header" }, [
      createElement("img", {
        src: player.photo,
        alt: player.name,
        className: "detail-player-photo",
        width: 80,
        height: 80,
      }),
      createElement("div", {}, headerDivChildren),
    ]),
    createElement("div", { className: "player-detail-team" }, teamDivChildren),
    ...buildPositionStats(player),
  ];

  dom.modalContent.replaceChildren(...contentChildren);

  dom.modal.removeAttribute("hidden");
  dom.closeModalBtn.focus();
}

function buildPositionStats(player) {
  const pos = player.position;

  if (player.appearances === undefined && player.minutes === undefined) {
    const rows = [];
    if (player.appearances != null)
      rows.push(statBox(player.appearances, "Appearances"));
    if (player.goals != null) rows.push(statBox(player.goals, "Goals"));
    if (player.assists != null) rows.push(statBox(player.assists, "Assists"));
    if (player.rating != null) rows.push(statBox(player.rating, "Rating"));

    if (rows.length === 0) {
      return [
        createElement("p", { className: "no-data" }, [
          "No detailed stats available.",
        ]),
      ];
    }
    return [createElement("div", { className: "player-stats-grid" }, rows)];
  }

  const elements = [
    createElement("h4", { className: "stats-section-title" }, ["Overview"]),
    createElement("div", { className: "player-stats-grid" }, [
      statBox(player.appearances, "Apps"),
      statBox(player.lineups, "Starts"),
      statBox(formatMinutes(player.minutes), "Minutes"),
      statBox(player.rating || "–", "Rating"),
    ]),
  ];

  if (pos === "Goalkeeper") {
    elements.push(
      createElement("h4", { className: "stats-section-title" }, [
        "Goalkeeping",
      ]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.conceded, "Conceded"),
        statBox(player.saves, "Saves"),
        statBox(player.penSaved, "Pen Saved"),
        statBox(player.goals, "Goals"),
      ]),
    );
  } else if (pos === "Defender") {
    elements.push(
      createElement("h4", { className: "stats-section-title" }, ["Defending"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.tackles, "Tackles"),
        statBox(player.interceptions, "Intercept."),
        statBox(player.blocks, "Blocks"),
        statBox(duelsPercent(player), "Duels Won"),
      ]),
      createElement("h4", { className: "stats-section-title" }, ["Attack"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.goals, "Goals"),
        statBox(player.assists, "Assists"),
        statBox(player.keyPasses, "Key Passes"),
        statBox(
          player.passAccuracy ? player.passAccuracy + "%" : "–",
          "Pass Acc.",
        ),
      ]),
    );
  } else if (pos === "Midfielder") {
    elements.push(
      createElement("h4", { className: "stats-section-title" }, ["Attack"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.goals, "Goals"),
        statBox(player.assists, "Assists"),
        statBox(player.keyPasses, "Key Passes"),
        statBox(player.shotsOn + "/" + player.shotsTotal, "Shots (on)"),
      ]),
      createElement("h4", { className: "stats-section-title" }, [
        "Passing & Dribbling",
      ]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.passesTotal, "Passes"),
        statBox(
          player.passAccuracy ? player.passAccuracy + "%" : "–",
          "Pass Acc.",
        ),
        statBox(
          player.dribblesSuccess + "/" + player.dribblesAttempted,
          "Dribbles",
        ),
        statBox(duelsPercent(player), "Duels Won"),
      ]),
      createElement("h4", { className: "stats-section-title" }, ["Defending"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.tackles, "Tackles"),
        statBox(player.interceptions, "Intercept."),
        statBox(player.foulsCommitted, "Fouls"),
      ]),
    );
  } else {
    elements.push(
      createElement("h4", { className: "stats-section-title" }, ["Attack"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.goals, "Goals"),
        statBox(player.assists, "Assists"),
        statBox(player.shotsOn + "/" + player.shotsTotal, "Shots (on)"),
        statBox(
          player.penScored + "/" + (player.penScored + player.penMissed),
          "Penalties",
        ),
      ]),
      createElement("h4", { className: "stats-section-title" }, ["Creativity"]),
      createElement("div", { className: "player-stats-grid" }, [
        statBox(player.keyPasses, "Key Passes"),
        statBox(
          player.dribblesSuccess + "/" + player.dribblesAttempted,
          "Dribbles",
        ),
        statBox(player.passesTotal, "Passes"),
        statBox(player.foulsDrawn, "Fouls Won"),
      ]),
    );
  }

  elements.push(
    createElement("h4", { className: "stats-section-title" }, ["Discipline"]),
    createElement("div", { className: "player-stats-grid" }, [
      statBox(player.yellowCards, "Yellows"),
      statBox(player.redCards, "Reds"),
      statBox(player.foulsCommitted, "Fouls"),
      statBox(player.foulsDrawn, "Fouls Won"),
    ]),
  );

  return elements;
}

function statBox(value, label) {
  return createElement("div", { className: "stat-box" }, [
    createElement("span", { className: "stat-number" }, [value]),
    createElement("span", { className: "stat-desc" }, [label]),
  ]);
}

function formatMinutes(mins) {
  if (!mins) return "0";
  if (mins >= 1000) return (mins / 1000).toFixed(1) + "k";
  return mins;
}

function duelsPercent(player) {
  if (!player.duelsTotal) return "0%";
  return Math.round((player.duelsWon / player.duelsTotal) * 100) + "%";
}

function renderForm(form) {
  if (!form) return [];
  return form.split("").map((ch) => {
    const cls = ch === "W" ? "form-w" : ch === "D" ? "form-d" : "form-l";
    return createElement("span", { className: `form-badge ${cls}` }, [ch]);
  });
}

export function closeModal() {
  dom.modal.setAttribute("hidden", "");
  setCurrentTeamEntry(null);

  if (_triggerElement) {
    _triggerElement.focus();
    _triggerElement = null;
  }
}

export function handleOutsideClick(event) {
  if (event.target === dom.modal) {
    closeModal();
  }
}

export function handleFocusTrap(event) {
  if (event.key !== "Tab") return;
  if (dom.modal.hasAttribute("hidden")) return;

  const focusable = dom.modal.querySelectorAll(
    'button:not([hidden]), [href], input, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

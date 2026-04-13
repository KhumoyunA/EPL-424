const state = {
  currentStatType: "goals",
  standings: [],
  scorers: [],
  assists: [],
  players: [],
  currentTeam: null,
};

export function setState(partial) {
  Object.assign(state, partial);
}

export function getState() {
  return state;
}

export function buildPlayers() {
  const map = new Map();

  const extract = (entry) => {
    const p = entry.player;
    const s = entry.statistics[0];
    return {
      id: p.id,
      name: `${p.firstname} ${p.lastname}`,
      goals: s.goals.total || 0,
      assists: s.goals.assists || 0,
    };
  };

  state.scorers.forEach((e) => map.set(e.player.id, extract(e)));

  state.assists.forEach((e) => {
    const existing = map.get(e.player.id);
    if (existing) {
      existing.assists = Math.max(
        existing.assists,
        e.statistics[0].goals.assists || 0
      );
    } else {
      map.set(e.player.id, extract(e));
    }
  });

  state.players = Array.from(map.values());
}

// MOCK DATA
const mockTeams = [
  { id: 1, name: 'Manchester City', played: 30, wins: 25, draws: 4, losses: 1, points: 79 },
  { id: 2, name: 'Arsenal', played: 30, wins: 22, draws: 5, losses: 3, points: 71 },
  { id: 3, name: 'Liverpool', played: 30, wins: 21, draws: 3, losses: 6, points: 66 },
  { id: 4, name: 'Aston Villa', played: 30, wins: 19, draws: 4, losses: 7, points: 61 },
  { id: 5, name: 'Manchester United', played: 30, wins: 17, draws: 4, losses: 9, points: 55 },
  { id: 6, name: 'Chelsea', played: 30, wins: 15, draws: 6, losses: 9, points: 51 },
];

const mockPlayers = {
  1: [ // Manchester City
    { id: 101, name: 'Erling Haaland', goals: 28, assists: 8 },
    { id: 102, name: 'Jack Grealish', goals: 9, assists: 11 },
    { id: 103, name: 'Rodri', goals: 4, assists: 2 },
    { id: 104, name: 'Julian Alvarez', goals: 12, assists: 4 },
    { id: 105, name: 'Phil Foden', goals: 8, assists: 7 },
  ],
  2: [ // Arsenal
    { id: 201, name: 'Bukayo Saka', goals: 16, assists: 9 },
    { id: 202, name: 'Gabriel Martinelli', goals: 11, assists: 5 },
    { id: 203, name: 'Thomas Partey', goals: 3, assists: 3 },
    { id: 204, name: 'Emile Smith Rowe', goals: 5, assists: 2 },
    { id: 205, name: 'Declan Rice', goals: 1, assists: 1 },
  ],
  3: [ // Liverpool
    { id: 301, name: 'Mohamed Salah', goals: 18, assists: 13 },
    { id: 302, name: 'Luis Diaz', goals: 13, assists: 6 },
    { id: 303, name: 'Cody Gakpo', goals: 9, assists: 4 },
    { id: 304, name: 'Darwin Nunez', goals: 11, assists: 3 },
    { id: 305, name: 'Andrew Robertson', goals: 1, assists: 7 },
  ],
  4: [ // Aston Villa
    { id: 401, name: 'Ollie Watkins', goals: 19, assists: 6 },
    { id: 402, name: 'Morgan Rogers', goals: 8, assists: 4 },
    { id: 403, name: 'Jacob Ramsey', goals: 4, assists: 3 },
    { id: 404, name: 'John McGinn', goals: 5, assists: 5 },
    { id: 405, name: 'Emiliano Martinez', goals: 0, assists: 0 },
  ],
  5: [ // Manchester United
    { id: 501, name: 'Bruno Fernandes', goals: 8, assists: 12 },
    { id: 502, name: 'Marcus Rashford', goals: 14, assists: 5 },
    { id: 503, name: 'Antony', goals: 6, assists: 2 },
    { id: 504, name: 'Alejandro Garnacho', goals: 7, assists: 3 },
    { id: 505, name: 'Christian Eriksen', goals: 2, assists: 4 },
  ],
  6: [ // Chelsea
    { id: 601, name: 'Nicolas Jackson', goals: 14, assists: 5 },
    { id: 602, name: 'Moisés Caicedo', goals: 2, assists: 2 },
    { id: 603, name: 'Cole Palmer', goals: 11, assists: 8 },
    { id: 604, name: 'Conor Gallagher', goals: 5, assists: 3 },
    { id: 605, name: 'Reece James', goals: 1, assists: 4 },
  ],
};

// STATE
let currentStatType = 'goals'; // 'goals' or 'assists'
let allPlayers = [];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initializeAllPlayers();
  renderStandings();
  renderStats();
  attachEventListeners();
});

function initializeAllPlayers() {
  Object.values(mockPlayers).forEach(teamPlayers => {
    teamPlayers.forEach(player => {
      const team = mockTeams.find(t => mockPlayers[t.id].includes(player));
      if (team) {
        allPlayers.push({
          ...player,
          teamId: team.id,
          teamName: team.name,
        });
      }
    });
  });
}

// STANDINGS RENDERING
function renderStandings() {
  const tbody = document.getElementById('standings-body');
  tbody.innerHTML = '';

  mockTeams.forEach(team => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${team.name}</strong></td>
      <td>${team.played}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td><strong>${team.points}</strong></td>
    `;
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => openTeamModal(team.id));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openTeamModal(team.id);
    });
    row.tabIndex = 0;
    tbody.appendChild(row);
  });
}

// STATS RENDERING
function renderStats() {
  const tbody = document.getElementById('stats-body');
  const title = document.getElementById('stats-title');
  const columnHeader = document.getElementById('stat-column');
  
  tbody.innerHTML = '';

  // Sort players by current stat type
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    return b[currentStatType] - a[currentStatType];
  }).slice(0, 15); // Show top 15

  title.textContent = currentStatType === 'goals' ? 'Top Scorers' : 'Top Assist Leaders';
  columnHeader.textContent = currentStatType === 'goals' ? 'Goals' : 'Assists';

  sortedPlayers.forEach(player => {
    const row = document.createElement('tr');
    const statValue = currentStatType === 'goals' ? player.goals : player.assists;
    row.innerHTML = `
      <td><strong>${player.name}</strong></td>
      <td>${player.teamName}</td>
      <td>${statValue}</td>
    `;
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => openPlayerModal(player));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openPlayerModal(player);
    });
    row.tabIndex = 0;
    tbody.appendChild(row);
  });
}

// TEAM MODAL
function openTeamModal(teamId) {
  const team = mockTeams.find(t => t.id === teamId);
  const players = mockPlayers[teamId];

  document.getElementById('modal-team-name').textContent = team.name;

  const infoDiv = document.getElementById('modal-team-info');
  infoDiv.innerHTML = `
    <p><strong>Position:</strong> ${mockTeams.indexOf(team) + 1}</p>
    <p><strong>Points:</strong> ${team.points}</p>
    <p><strong>Record:</strong> ${team.wins}W - ${team.draws}D - ${team.losses}L</p>
  `;

  const playersDiv = document.getElementById('modal-players');
  playersDiv.innerHTML = '';
  players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <h3>${player.name}</h3>
      <p><strong>${player.goals}</strong> Goals</p>
      <p><strong>${player.assists}</strong> Assists</p>
    `;
    card.tabIndex = 0;
    card.addEventListener('click', () => {
      // Find the full player object from allPlayers which includes teamName
      const fullPlayer = allPlayers.find(p => p.id === player.id);
      openPlayerModal(fullPlayer);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const fullPlayer = allPlayers.find(p => p.id === player.id);
        openPlayerModal(fullPlayer);
      }
    });
    playersDiv.appendChild(card);
  });

  document.getElementById('team-modal').removeAttribute('hidden');
  document.getElementById('close-team-modal').focus();
}

// PLAYER MODAL
function openPlayerModal(player) {
  const team = mockTeams.find(t => t.id === player.teamId);
  const infoDiv = document.getElementById('modal-player-info');

  infoDiv.innerHTML = `
    <h3>${player.name}</h3>
    <p><strong>Team:</strong> ${player.teamName}</p>
    <p><strong>Goals:</strong> ${player.goals}</p>
    <p><strong>Assists:</strong> ${player.assists}</p>
    <p><strong>Total Contributions:</strong> ${player.goals + player.assists}</p>
  `;

  document.getElementById('player-modal').removeAttribute('hidden');
  document.getElementById('close-player-modal').focus();
}

// TOGGLE STAT TYPE
function toggleStatType() {
  currentStatType = currentStatType === 'goals' ? 'assists' : 'goals';
  const button = document.getElementById('toggle-stat');
  const label = button.querySelector('.stat-label');
  
  if (currentStatType === 'goals') {
    label.textContent = 'Top Scorers';
    button.setAttribute('aria-pressed', 'false');
  } else {
    label.textContent = 'Top Assists';
    button.setAttribute('aria-pressed', 'true');
  }

  renderStats();
}

// SEARCH
function handleSearch(event) {
  event.preventDefault();
  const searchTerm = document.getElementById('site-search').value.toLowerCase().trim();
  const resultsDiv = document.getElementById('search-results');

  if (!searchTerm) {
    resultsDiv.classList.remove('active');
    return;
  }

  // Find all partial matches
  const matchedPlayers = allPlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm)
  );

  if (matchedPlayers.length > 0) {
    resultsDiv.className = 'search-results active found';
    let html = '<div class="results-list">';
    
    matchedPlayers.forEach(player => {
      html += `
        <div class="result-item" data-player-id="${player.id}">
          <div class="result-name">${player.name}</div>
          <div class="result-team">${player.teamName}</div>
        </div>
      `;
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
    
    // Add click handlers to all result items
    document.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const playerId = item.dataset.playerId;
        const player = allPlayers.find(p => p.id == playerId);
        openPlayerModal(player);
        document.getElementById('site-search').value = '';
        resultsDiv.classList.remove('active');
      });
    });
  } else {
    resultsDiv.className = 'search-results active not-found';
    resultsDiv.innerHTML = `<div class="no-results">No players found for "<strong>${searchTerm}</strong>"</div>`;
  }
}

function clearSearchResults() {
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.classList.remove('active');
  resultsDiv.innerHTML = '';
}

// MODAL CLOSE HANDLERS
function closeTeamModal() {
  document.getElementById('team-modal').setAttribute('hidden', '');
}

function closePlayerModal() {
  document.getElementById('player-modal').setAttribute('hidden', '');
}

function handleOutsideClick(event, modal, closeButton) {
  if (event.target === modal) {
    if (modal.id === 'team-modal') {
      closeTeamModal();
    } else {
      closePlayerModal();
    }
  }
}

// EVENT LISTENERS
function attachEventListeners() {
  // Toggle button
  document.getElementById('toggle-stat').addEventListener('click', toggleStatType);

  // Search form
  document.getElementById('search-form').addEventListener('submit', handleSearch);
  document.getElementById('site-search').addEventListener('input', () => {
    // Clear results when user starts typing
    if (document.getElementById('site-search').value === '') {
      clearSearchResults();
    }
  });

  // Close buttons
  document.getElementById('close-team-modal').addEventListener('click', closeTeamModal);
  document.getElementById('close-player-modal').addEventListener('click', closePlayerModal);

  // Click outside modal to close
  document.getElementById('team-modal').addEventListener('click', (e) => 
    handleOutsideClick(e, document.getElementById('team-modal'))
  );
  document.getElementById('player-modal').addEventListener('click', (e) => 
    handleOutsideClick(e, document.getElementById('player-modal'))
  );

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTeamModal();
      closePlayerModal();
    }
  });
}
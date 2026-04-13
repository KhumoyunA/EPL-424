# EPL Stat Tracker

A simple, clean web application for tracking English Premier League statistics, standings, and player information.

## Reliability Checklist

Before demo day, the following checks will be run to ensure application reliability:

### Core Functionality
1. **Works on a clean browser profile** - Application loads and functions correctly with no cached data or cookies
2. **Works after refresh** - All data displays correctly and state is maintained after page refresh
3. **Search functionality returns correct results** - Searching for players by name returns all matching results with no errors

### User Interactions
4. **Toggle between goals/assists works correctly** - Button changes stat type, updates table title, and displays correct data for both views
5. **Modal open and close works** - Clicking on teams/players opens modals correctly, close button works, and Escape key closes modals
6. **Player card navigation works** - Clicking players in team modal opens player detail modal with correct information including team name

### Visual & Accessibility
7. **Keyboard focus is visible** - Tab navigation shows clear focus indicators on all interactive elements (buttons, table rows, search input)
8. **Responsive design works on mobile** - Layout reflows correctly on screens ≤768px (single column instead of two columns)

### Edge Cases & Error Handling
9. **Search with no results displays gracefully** - Searching for non-existent player shows "No players found" message without errors
10. **Works with empty search field** - Clearing search input hides results dropdown and doesn't cause errors

## Features

- **League Standings**: View teams ranked by points with detailed statistics
- **Player Statistics**: Toggle between top scorers and top assist leaders
- **Player Search**: Search for specific players with instant dropdown results
- **Team Details**: Click any team to see team information and scrollable player roster
- **Player Profiles**: Click any player to view detailed statistics including total contributions

## How to Use

1. Open `index.html` in a web browser
2. Browse the league standings on the left
3. View top statistics on the right (toggle between goals and assists)
4. Search for players using the search bar
5. Click on teams or players to see detailed information in modals
6. Use keyboard navigation (Tab) and Escape key to navigate modals
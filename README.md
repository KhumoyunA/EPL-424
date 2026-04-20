# EPL Stat Tracker

A simple, clean web application for tracking English Premier League statistics, standings, and player information.

## How to Use

1. In the terminal, enter "python3 -m http.server 4040"
2. In a web browser, enter "http://localhost:4040/index.html"

   From there the user can:
   1. Browse Premier League standings
   2. View top statistics on the right (toggle between goals and assists)
   3. Search for players using the search bar
   4. Click on teams or players to see detailed information in modals
   5. Use keyboard navigation (Tab) and Escape key to navigate modals

Alternatively, the user can install Live Server extension on VsCode and run the application using that.

## Modular Map

Refactored Structure:

    /src
     ├── components/SearchResults.js
     ├── main.js
     ├── api.js
     ├── state.js
     ├── render.js
     ├── dom.js
     └── events.js

    main.js: application bootstrap and orchestration
    Responsible for starting the application and coordinating high-level flow.
        - initializes the application on DOMContentLoaded
        - calls API funcstions to load data
        - updates state with fetched data
        - triggers render functions
        - wires together API, state, and UI

    api.js: data fetching and API layer
    Handles all communication with external football API
        - performs fetch requests
        - manages request configuation
        - implements caching to reduce duplicate API calls
        - normalizes and returns raw API data
        - throws errors for the calling layer to handle

    state.js: centralized state management
    Maintains the application's single source of truth
        - stores all shared application data (standings, players, stats,UI state)
        - provides setter functions to update state
        - provides getter access to state
        - builds derived data

    render.js: UI rendering layer
    Controls all DOM updates and rendering
        - renders standing tables
        - renders player stat tables
        - updates UI based on application's current state
        - does not directly fetch data or manage changes in state

    dom.js: DOM element references
    Centralizes access to DOM elements
        - stores references to frequently used elements
        - reduces repeated document.getElementById calls
        - improves maintainability and readability
        - acts as a signle source for DOM selectors

    events.js: event handling and user interaction
    Manages all user-driven interactions
        - attaches event listeners (clicks, keyboard events, .etc)
        - handles UI events (toggle states, search, .etc)
        - updates state in response to user actions
        - triggers re-rendering when needed

## Component Contracts

    components/SearchResults.js

    // Component: SearchResults
    // Input: { container, results, query, onSelect }
    // Output: DOM nodes mounted inside `container`
    // Events: onSelect(playerId) — called when user clicks a result
    // Dependencies: none

    We decided to extract the feature above it was the perfect candidate for component extraction due to:
            a) it being self-contained UI logic
            b) it entails DOM rendering, event binding, and state-derived data usage
            c) before extraction, did not have separation of concerns, as render & interaction were coupled

## Resilence Patterns

**Timeout**: `AbortController` handles network delays with an 8-second timeout, preventing stale requests from hanging the application. (Implemented in `src/api.js` inside the `apiFetch` wrapper).

**Structured Error Messages**: Comprehensive `MESSAGE_MAP` handles network, timeout, HTTP, and parse errors, ensuring end-users see clean UI feedback rather than generic console dumps. (Implemented in `src/api.js` via `classifyError`).

**Retry Button Mechanism**: Conditional rendering of a retry button depending on the error classification. Allows users to easily re-fetch data if a network request fails gracefully without needing to refresh the page. (Implemented in `src/render.js` within `showError` and `openTeamModal`).

## Current Feature Status

**Completed Features & Stable Status:**

- **League Standings**: View teams ranked by points with detailed statistics
- **Player Statistics**: Toggle between top scorers and top assist leaders
- **Player Search**: Search for specific players with instant dropdown results
- **Team Details**: Click any team to see team information and scrollable player roster
- **Player Profiles**: Click any player to view detailed statistics including total contributions
- **Accessibility**: Full keyboard navigation (Tab/Enter/Escape), focus traps, ARIA tagging, and outline visibility.
- **Security**: Complete DOM node creation applied throughout component rendering to prevent XSS.

## Deployment URL

**Live Project Site:** https://khumoyuna.github.io/EPL-424/

## Testing Summary

**Total Tests Conducted:** 16

**Test Pass Rate:** 100% (after patches mapping)

**Documented Bugs Resolved:** 5 critical logic/rendering errors resolved (including UI races, missing image pipelines, null fetch bounds, and cross-site scripting gaps).

## Known Limitations

As the application queries a public API via a free license wrapper natively, excessive rapid toggles might prompt HTTP 429 warnings contextually.

## Contributions

**Khumoyun**:

- Requirement 1 (Modular project structure & Module map)
- Requirement 3 (State model + selectors)
- Requirement 4 (Component extraction & Component contracts)
- Front-end structural design, CSS architecture, and HTML markup.
  **Devon**:
- Requirement 2 (Data-driven logic & four UI states)
- Requirement 5 (Resilience patterns & Error Mapping architecture)
- Managed UI Event listeners and DOM abstractions.
  **Shared**:
- Requirement 0 (Project group setup & codebase initialization)
- Requirement 7 (Updated README & Documentation write-up)

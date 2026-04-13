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

## Modular Map

Refactored Structure: 

    /src
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

    Timeout — AbortController with a reasonable timeout. Lives in api.js

    Structured error messages — different messages for network, timeout, HTTP, and parse errors. Lives in api.js


## Features

- **League Standings**: View teams ranked by points with detailed statistics
- **Player Statistics**: Toggle between top scorers and top assist leaders
- **Player Search**: Search for specific players with instant dropdown results
- **Team Details**: Click any team to see team information and scrollable player roster
- **Player Profiles**: Click any player to view detailed statistics including total contributions


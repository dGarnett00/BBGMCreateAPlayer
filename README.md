# BBGM Draft Prospect Generator

A web application for generating and managing draft prospects for the Basketball GM (BBGM) simulation game.

## Features

- Create individual draft prospects with detailed player attributes
- Import and edit existing draft classes from JSON files
- Generate random players from draft templates using an advanced 5-player mixing algorithm
- Bulk player generation capabilities
- Modern, responsive user interface
- Export functionality for use in BBGM
- Modular architecture for easy maintenance and extension

## File Structure

```plaintext
├── main.html              # Main application interface
├── scripts/
│   ├── app.js             # Application entry point
│   ├── appController.js   # Main application coordinator
│   ├── constants.js       # Application configuration and constants
│   ├── eventBus.js        # Event communication system
│   ├── playerManager.js   # Player data management and operations
│   ├── playerGenerator.js # Random player generation from drafts
│   ├── uiManager.js       # UI rendering and DOM management
│   ├── jsonFormUI.js      # Form rendering and UI components
│   ├── jsonHandler.js     # JSON import/export functionality
│   ├── playerData.js      # Player data loading utilities
│   ├── playerTransform.js # Player transformation and randomization
│   └── playerUtils.js     # Utility functions
├── styles/
│   └── style.css          # Application styling
└── Drafts/                # Sample draft data files
    ├── 25DRAFT.json
    ├── 26draft.json
    ├── 27DRAFT.json
    └── 28DRAFT.json
```

## Usage

1. Open `main.html` in a web browser.
2. Use the form to create new players or import existing draft classes.
3. Generate random players or edit existing ones.
4. Export your completed draft class for use in BBGM.

## Technologies Used

- Vanilla JavaScript (ES6 modules)
- Modern CSS with responsive design
- HTML5 with semantic markup and accessibility features

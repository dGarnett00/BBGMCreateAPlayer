// Application controller - coordinates all modules

import { APP_CONFIG, IMG_URL_OPTIONS } from './constants.js';
import PlayerManager from './playerManager.js';
import PlayerGenerator from './playerGenerator.js';
import UIManager from './uiManager.js';
import EventBus from './eventBus.js';
import { renderJsonForm, getFormData, setReadOnlyOptionsMap } from './jsonFormUI.js';
import * as jsonHandler from './jsonHandler.js';

class AppController {
  constructor() {
    this.eventBus = new EventBus();
    this.playerManager = new PlayerManager();
    this.playerGenerator = new PlayerGenerator();
    this.uiManager = new UIManager(this.playerManager, this.eventBus);
    
    this.currentPlayer = null;
    this.currentEditIdx = null;
    this.topLevelStartingSeason = APP_CONFIG.DEFAULT_STARTING_SEASON;
    
    this.init();
  }

  // Initialize the application
  init() {
    this.setupFormOptions();
    this.setupEventListeners();
    this.initializeUI();
    this.renderDefaultForm();
  }

  // Setup form dropdown options
  setupFormOptions() {
    setReadOnlyOptionsMap({ imgURL: IMG_URL_OPTIONS });
  }

  // Setup event listeners
  setupEventListeners() {
    // Player events
    this.eventBus.on('player:save', this.handleSavePlayer.bind(this));
    this.eventBus.on('player:edit', this.handleEditPlayer.bind(this));
    this.eventBus.on('player:delete', this.handleDeletePlayer.bind(this));
    this.eventBus.on('player:generateRandom', this.handleGenerateRandomPlayers.bind(this));
    
    // Players collection events
    this.eventBus.on('players:deleteSelected', this.handleDeleteSelectedPlayers.bind(this));
    this.eventBus.on('players:exportSelected', this.handleExportSelectedPlayers.bind(this));
    this.eventBus.on('players:undo', this.handleUndo.bind(this));
    this.eventBus.on('players:redo', this.handleRedo.bind(this));
    
    // Table events
    this.eventBus.on('table:sort', this.handleTableSort.bind(this));
    
    // File events
    this.eventBus.on('file:import', this.handleFileImport.bind(this));
  }

  // Initialize UI components
  initializeUI() {
    // Create starting season input
    this.uiManager.createStartingSeasonInput(
      this.topLevelStartingSeason,
      this.handleSeasonChange.bind(this)
    );

    // Create bulk generation buttons
    this.uiManager.createBulkGenerationButtons();

    // Create players table
    this.playersTable = this.uiManager.createPlayersTable();

    // Create batch action bar
    this.batchActionBar = this.uiManager.createBatchActionBar();
    document.querySelector('main').insertBefore(this.batchActionBar, this.playersTable);

    // Initialize empty table
    this.updateUI();
  }

  // Render default player form
  renderDefaultForm() {
    this.currentPlayer = this.playerManager.createDefaultPlayer();
    renderJsonForm(this.currentPlayer, this.uiManager.elements.jsonFormContainer);
  }
  // Handle saving a player
  async handleSavePlayer() {
    try {
      const playerData = getFormData(
        this.uiManager.elements.jsonFormContainer, 
        this.playerManager.createDefaultPlayer()
      );      // Always set season and draft year to match the current starting season
      if (playerData.ratings && playerData.ratings.length > 0) {
        playerData.ratings[0].season = this.topLevelStartingSeason;
      }
        if (playerData.draft) {
        playerData.draft.year = this.topLevelStartingSeason;
        // Always set round and pick to 0, and tid/originalTid to -1
        playerData.draft.round = 0;
        playerData.draft.pick = 0;
        playerData.draft.tid = -1;
        playerData.draft.originalTid = -1;
      }
      
      // Always set player's tid to 2
      playerData.tid = 2;
      
      // Ensure born.year is within 1 year of (starting season - 19)
      if (!playerData.born) {
        playerData.born = { year: this.topLevelStartingSeason - 19, loc: '' };
      } else {
        const defaultBornYear = this.topLevelStartingSeason - 19;
        const minAllowedYear = defaultBornYear - 1;
        const maxAllowedYear = defaultBornYear + 1;
        
        // If born.year is missing or outside allowed range, set to default
        if (playerData.born.year === null || playerData.born.year === undefined || 
            playerData.born.year === '' || 
            playerData.born.year < minAllowedYear || 
            playerData.born.year > maxAllowedYear) {
          playerData.born.year = defaultBornYear;
        }
      }

      if (this.currentEditIdx !== null) {
        // Update existing player
        if (this.playerManager.updatePlayer(this.currentEditIdx, playerData)) {
          this.uiManager.showAlert('Player updated successfully!');
          this.currentEditIdx = null;
        }
      } else {
        // Add new player
        if (this.playerManager.addPlayer(playerData)) {
          this.uiManager.showAlert('Player added successfully!');
        }
      }

      this.updateUI();
      this.renderDefaultForm();

    } catch (error) {
      console.error('Error saving player:', error);
      this.uiManager.showAlert('Error saving player. Please check the form data.');
    }
  }  // Handle editing a player
  handleEditPlayer(index) {
    const player = this.playerManager.getPlayer(index);
    if (player) {
      console.log("Original player data for edit:", JSON.parse(JSON.stringify(player)));
      
      // Normalize the player data to ensure all required fields exist
      const normalizedPlayer = this.playerManager.normalizePlayerForEditing(player);
      
      // Log the normalized player to help debugging
      console.log("Normalized player data for edit:", JSON.parse(JSON.stringify(normalizedPlayer)));
      
      // Handle specific deep objects that might need special treatment
      this.ensureNestedObjects(normalizedPlayer);
      
      // Now render the form with properly structured data
      renderJsonForm(normalizedPlayer, this.uiManager.elements.jsonFormContainer);
      this.currentEditIdx = index;
      
      // Scroll to the top of the form
      this.uiManager.elements.jsonFormContainer.scrollIntoView({ behavior: 'smooth' });
      
      // Log form field values for debugging
      setTimeout(() => {
        console.log("Form field values:", 
          Array.from(this.uiManager.elements.jsonFormContainer.querySelectorAll('input, select'))
            .filter(el => el.name) // Only log elements with names
            .reduce((acc, el) => {
              acc[el.name] = el.type === 'checkbox' ? el.checked : el.value;
              return acc;
            }, {})
        );
      }, 100);
    }
  }
    // Helper method to ensure all nested objects are properly initialized
  ensureNestedObjects(player) {
    // Ensure ratings array is properly structured
    if (!player.ratings || !Array.isArray(player.ratings) || player.ratings.length === 0) {
      player.ratings = [{...player.ratings[0] || {}}];
    }
      // Ensure rating fields exist with null values for numeric fields
    const ratingFields = [
      'hgt', 'stre', 'spd', 'jmp', 'endu', 'ins',
      'dnk', 'ft', 'fg', 'tp', 'diq', 'oiq',
      'drb', 'pss', 'reb', 'fuzz', 'ovr', 'pot'
    ];
    
    ratingFields.forEach(field => {
      if (player.ratings[0][field] === undefined) {
        player.ratings[0][field] = null;
      }
    });
    
    // Always set season field to match the current starting season
    player.ratings[0].season = this.topLevelStartingSeason;
    
    // Ensure string fields have empty string values
    if (player.ratings[0].pos === undefined) {
      player.ratings[0].pos = '';
    }
    
    // Ensure skills array exists
    if (!Array.isArray(player.ratings[0].skills)) {
      player.ratings[0].skills = [];
    }
      // Ensure born object is properly structured
    if (!player.born || typeof player.born !== 'object') {
      player.born = { year: this.topLevelStartingSeason - 19, loc: '' };
    } else {
      const defaultBornYear = this.topLevelStartingSeason - 19;
      const minAllowedYear = defaultBornYear - 1;
      const maxAllowedYear = defaultBornYear + 1;
      
      // If born.year is missing or outside allowed range, set to default
      if (player.born.year === null || player.born.year === undefined || 
          player.born.year === '' || 
          player.born.year < minAllowedYear || 
          player.born.year > maxAllowedYear) {
        player.born.year = defaultBornYear;
      }
    }    // Ensure draft object is properly structured
    if (!player.draft || typeof player.draft !== 'object') {
      player.draft = { 
        year: null, tid: -1, originalTid: -1, 
        round: 0, pick: 0, skills: [], pot: null, ovr: null 
      };
    }// Always set draft year to match the current starting season
    player.draft.year = this.topLevelStartingSeason;
    
    // Always set round and pick to 0, and tid/originalTid to -1
    player.draft.round = 0;
    player.draft.pick = 0;
    player.draft.tid = -1;
    player.draft.originalTid = -1;
    
    // Ensure draft.skills array exists
    if (!Array.isArray(player.draft.skills)) {
      player.draft.skills = [];
    }
    
    // Ensure face object structure matches template
    if (!player.face || typeof player.face !== 'object') {
      player.face = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE.face));
    } else {
      // Ensure teamColors is an array with 3 elements
      if (!Array.isArray(player.face.teamColors) || player.face.teamColors.length < 3) {
        player.face.teamColors = ["", "", ""];
      }
      
      // Ensure all numeric values are properly set to null instead of empty strings
      const numericFaceProperties = [
        'fatness', 
        'body.size', 
        'ear.size', 
        'smileLine.size', 
        'eye.angle', 
        'eyebrow.angle', 
        'hair.flip', 
        'mouth.flip', 
        'nose.flip', 
        'nose.size'
      ];
      
      numericFaceProperties.forEach(prop => {
        const parts = prop.split('.');
        if (parts.length === 1) {
          if (player.face[parts[0]] === undefined || player.face[parts[0]] === '') {
            player.face[parts[0]] = null;
          }
        } else if (parts.length === 2) {
          if (!player.face[parts[0]]) player.face[parts[0]] = {};
          if (player.face[parts[0]][parts[1]] === undefined || player.face[parts[0]][parts[1]] === '') {
            player.face[parts[0]][parts[1]] = null;
          }
        }
      });
    }
      // Set numeric values to null
    const numericProperties = ['hgt', 'pid', 'weight'];
    numericProperties.forEach(prop => {
      if (player[prop] === undefined || player[prop] === '') {
        player[prop] = null;
      }
    });
    
    // Always set player's tid to 2
    player.tid = 2;
    
    // Ensure injury object structure
    if (!player.injury || typeof player.injury !== 'object') {
      player.injury = { type: '', gamesRemaining: null };
    } else if (player.injury.gamesRemaining === undefined || player.injury.gamesRemaining === '') {
      player.injury.gamesRemaining = null;
    }
    
    // Ensure injuries array exists
    if (!Array.isArray(player.injuries)) {
      player.injuries = [];
    }
    
    // Ensure relatives array exists
    if (!Array.isArray(player.relatives)) {
      player.relatives = [];
    }
  }

  // Handle deleting a player
  handleDeletePlayer(index) {
    if (this.uiManager.showConfirm('Remove this player?')) {
      this.playerManager.removePlayer(index);
      this.updateUI();
      
      // Reset form if editing this player
      if (this.currentEditIdx === index) {
        this.renderDefaultForm();
        this.currentEditIdx = null;
      }
    }
  }

  // Handle generating random players
  async handleGenerateRandomPlayers(count) {
    try {
      const generatedPlayers = await this.playerGenerator.generateMultiplePlayers(count);
      
      if (generatedPlayers.length === 0) {
        this.uiManager.showAlert('Failed to generate any players.');
        return;
      }

      // Add all generated players
      let addedCount = 0;
      generatedPlayers.forEach(player => {
        if (this.playerManager.addPlayer(player)) {
          addedCount++;
        }
      });

      this.updateUI();
      
      const message = `${addedCount} random player${addedCount > 1 ? 's' : ''} generated and added!`;
      this.uiManager.showAlert(message);

    } catch (error) {
      console.error('Error generating players:', error);
      this.uiManager.showAlert(error.message || 'Failed to generate players.');
    }
  }

  // Handle deleting selected players
  handleDeleteSelectedPlayers() {
    const selectedIndices = this.uiManager.getSelectedPlayerIndices();
    
    if (selectedIndices.length === 0) {
      this.uiManager.showAlert('No players selected.');
      return;
    }

    if (this.uiManager.showConfirm(`Delete ${selectedIndices.length} selected players?`)) {
      this.playerManager.deleteSelectedPlayers(selectedIndices);
      this.updateUI();
    }
  }

  // Handle exporting selected players
  handleExportSelectedPlayers() {
    const selectedIndices = this.uiManager.getSelectedPlayerIndices();
    
    if (selectedIndices.length === 0) {
      this.uiManager.showAlert('No players selected.');
      return;
    }

    const selectedPlayers = this.playerManager.getSelectedPlayers(selectedIndices);
    const exportData = {
      version: APP_CONFIG.TOP_LEVEL_VERSION,
      startingSeason: this.topLevelStartingSeason,
      players: selectedPlayers
    };

    jsonHandler.updateJson(exportData);
    jsonHandler.exportJson();
  }

  // Handle undo operation
  handleUndo() {
    if (this.playerManager.undo()) {
      this.updateUI();
    }
  }

  // Handle redo operation
  handleRedo() {
    if (this.playerManager.redo()) {
      this.updateUI();
    }
  }

  // Handle table sorting
  handleTableSort(sortConfig) {
    this.uiManager.updatePlayersTable(this.playerManager.getAllPlayers(), sortConfig);
  }  // Handle season change
  handleSeasonChange(newSeason) {
    this.topLevelStartingSeason = newSeason;
      // Update all players' season and draft year fields to match the new season
    const allPlayers = this.playerManager.getAllPlayers();
    allPlayers.forEach(player => {
      // Update ratings.season for each player
      if (player.ratings && player.ratings.length > 0) {
        player.ratings[0].season = newSeason;
      }
        // Update draft.year for each player and ensure round and pick are always 0, and tid/originalTid are always -1
      if (player.draft) {
        player.draft.year = newSeason;
        player.draft.round = 0;
        player.draft.pick = 0;
        player.draft.tid = -1;
        player.draft.originalTid = -1;
      }
      
      // Always set player's tid to 2
      player.tid = 2;
      
      // Update born.year to maintain the relationship with the new season
      // This maintains the same age relationship even when the season changes
      if (!player.born) {
        player.born = { year: newSeason - 19, loc: '' };
      } else {
        // Calculate the previous relation to determine the new born.year
        const previousSeason = player.ratings?.[0]?.season || player.draft?.year || newSeason;
        const ageDifference = previousSeason - (player.born.year || previousSeason - 19);
        
        // Apply the same age difference to the new season, but constrain within 1 year range
        const defaultBornYear = newSeason - 19;
        const minAllowedYear = defaultBornYear - 1;
        const maxAllowedYear = defaultBornYear + 1;
        
        // Try to maintain the same age difference if possible
        const newBornYear = newSeason - ageDifference;
        
        if (newBornYear >= minAllowedYear && newBornYear <= maxAllowedYear) {
          player.born.year = newBornYear;
        } else if (newBornYear < minAllowedYear) {
          player.born.year = minAllowedYear;
        } else {
          player.born.year = maxAllowedYear;
        }
      }
    });
    
    // If the player form is currently being displayed, update it to show the new season
    if (this.currentEditIdx !== null) {
      const player = this.playerManager.getPlayer(this.currentEditIdx);
      if (player) {
        // Make sure the form reflects the updated season values
        this.ensureNestedObjects(player);
        renderJsonForm(player, this.uiManager.elements.jsonFormContainer);
      }
    } else if (this.currentPlayer) {
      // Update the form for a new player being created
      this.currentPlayer.ratings[0].season = newSeason;
      this.currentPlayer.draft.year = newSeason;
      renderJsonForm(this.currentPlayer, this.uiManager.elements.jsonFormContainer);
    }
    
    this.updateOutputJson();
  }

  // Handle file import
  async handleFileImport(file) {
    if (!file) return;

    try {
      await new Promise((resolve, reject) => {
        jsonHandler.importJson(file, (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          // Process imported data
          let importedPlayers = [];
          
          if (Array.isArray(data.players)) {
            importedPlayers = data.players;
          } else if (Array.isArray(data)) {
            importedPlayers = data;
          } else if (typeof data === 'object' && data !== null) {
            importedPlayers = [data];
          }

          // Import players
          const result = this.playerManager.importPlayers(importedPlayers);
          
          this.updateUI();

          // Show import results
          if (result.added === 0) {
            this.uiManager.showAlert('No valid or unique players were imported.');
          } else if (result.skipped > 0) {
            this.uiManager.showAlert(
              `${result.added} player(s) imported. ${result.skipped} duplicate or invalid player(s) skipped.`
            );
          } else {
            this.uiManager.showAlert(`${result.added} player(s) imported successfully!`);
          }

          resolve();
        });
      });

    } catch (error) {
      console.error('Error importing file:', error);
      this.uiManager.showAlert('Invalid JSON file or import error.');
    }
  }

  // Update all UI components
  updateUI() {
    const players = this.playerManager.getAllPlayers();
    
    // Update main players table
    this.uiManager.updatePlayersTable(players);
    
    // Update output section
    this.updateOutputJson();
    this.uiManager.renderPlayerTable(players);
    this.uiManager.updateTotalPlayersDisplay(players.length);
    this.uiManager.toggleOutputSection(players.length > 0);
  }

  // Update output JSON display
  updateOutputJson() {
    const outputData = {
      version: APP_CONFIG.TOP_LEVEL_VERSION,
      startingSeason: this.topLevelStartingSeason,
      players: this.playerManager.getAllPlayers()
    };

    this.uiManager.updateOutputJson(outputData);
  }

  // Get current application state
  getState() {
    return {
      playerCount: this.playerManager.getPlayerCount(),
      startingSeason: this.topLevelStartingSeason,
      currentEditIdx: this.currentEditIdx
    };
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.draftProspectApp = new AppController();
});

export default AppController;

// Player management and state

import { DEFAULT_PLAYER_TEMPLATE } from './constants.js';

function normalizePlayerToTemplate(player) {
  // Deep clone the template
  const normalized = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE));

  function assignFields(templateObj, playerObj) {
    for (const key in templateObj) {
      if (playerObj && Object.prototype.hasOwnProperty.call(playerObj, key)) {
        if (
          typeof templateObj[key] === 'object' &&
          templateObj[key] !== null &&
          !Array.isArray(templateObj[key])
        ) {
          assignFields(templateObj[key], playerObj[key]);
        } else if (Array.isArray(templateObj[key])) {
          // If it's an array of objects (like ratings), map each item
          if (
            Array.isArray(playerObj[key]) &&
            templateObj[key].length > 0 &&
            typeof templateObj[key][0] === 'object'
          ) {
            normalized[key] = playerObj[key].map((item) => {
              const normItem = JSON.parse(JSON.stringify(templateObj[key][0]));
              assignFields(normItem, item);
              return normItem;
            });
          } else {
            normalized[key] = playerObj[key];
          }
        } else {
          normalized[key] = playerObj[key];
        }
      }
    }
  }

  assignFields(normalized, player);
  return normalized;
}

class PlayerManager {
  constructor() {
    this.players = [];
    this.outputPlayers = [];
    this.undoStack = [];
    this.redoStack = [];
    this.currentEditIdx = null;
    this.allDraftPlayersCache = null;
  }

  // Validation
  validatePlayer(player) {
    if (!player.firstName || !player.lastName || !player.pid) {
      alert('Player must have a first name, last name, and unique pid.');
      return false;
    }
    return true;
  }

  // Check for duplicates
  isDuplicate(player, playerList = this.players) {
    return playerList.some(p => 
      p.pid === player.pid || 
      (p.firstName === player.firstName && p.lastName === player.lastName)
    );
  }

  // Add player to main collection
  addPlayer(player) {
    if (!this.validatePlayer(player)) return false;
    
    if (this.isDuplicate(player)) {
      alert('Duplicate player detected. Player not added.');
      return false;
    }
    
    this.players.push(player);
    this.pushUndoState();
    return true;
  }

  // Remove player by index
  removePlayer(idx) {
    if (idx >= 0 && idx < this.players.length) {
      this.players.splice(idx, 1);
      this.pushUndoState();
      return true;
    }
    return false;
  }

  // Update player by index
  updatePlayer(idx, updatedPlayer) {
    if (idx >= 0 && idx < this.players.length && this.validatePlayer(updatedPlayer)) {
      this.players[idx] = { ...updatedPlayer };
      this.pushUndoState();
      return true;
    }
    return false;
  }

  // Get player by index
  getPlayer(idx) {
    return this.players[idx] || null;
  }

  // Get all players
  getAllPlayers() {
    return [...this.players];
  }

  // Clear all players
  clearPlayers() {
    this.players = [];
    this.pushUndoState();
  }

  // Import players from array
  importPlayers(importedPlayers) {
    let added = 0;
    let skipped = 0;

    importedPlayers.forEach(player => {
      // Normalize every imported player to the template
      const normalizedPlayer = normalizePlayerToTemplate(player);
      if (!this.validatePlayer(normalizedPlayer)) {
        skipped++;
        return;
      }

      if (this.isDuplicate(normalizedPlayer)) {
        skipped++;
        return;
      }

      this.players.push(normalizedPlayer);
      added++;
    });

    if (added > 0) {
      this.pushUndoState();
    }

    return { added, skipped };
  }

  // Undo/Redo functionality
  pushUndoState() {
    this.undoStack.push(JSON.stringify(this.players));
    this.redoStack = [];
    
    // Limit undo stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      this.players = JSON.parse(this.undoStack[this.undoStack.length - 1]);
      return true;
    }
    return false;
  }

  redo() {
    if (this.redoStack.length > 0) {
      const state = this.redoStack.pop();
      this.undoStack.push(state);
      this.players = JSON.parse(state);
      return true;
    }
    return false;
  }

  // Batch operations
  getSelectedPlayers(selectedIndices) {
    return selectedIndices
      .filter(idx => idx >= 0 && idx < this.players.length)
      .map(idx => this.players[idx]);
  }

  deleteSelectedPlayers(selectedIndices) {
    if (selectedIndices.length === 0) return false;
    
    this.players = this.players.filter((_, idx) => !selectedIndices.includes(idx));
    this.pushUndoState();
    return true;
  }

  // Statistics
  getPlayerCount() {
    return this.players.length;
  }

  // Create default player
  createDefaultPlayer() {
    const player = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE));
    player.draft.tid = -1;
    player.draft.originalTid = -1;
    player.tid = -1;
    return player;
  }
}

export default PlayerManager;

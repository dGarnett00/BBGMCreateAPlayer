// Player management and state

import { DEFAULT_PLAYER_TEMPLATE } from './constants.js';

function normalizePlayerToTemplate(player) {
  // Deep clone the template
  const normalized = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE));
  
  // Special case handling for common fields that may be in different places
  function handleSpecialFields() {
    // ----- Handle all player basic fields -----
    
    // Handle position field which could be at player.pos, player.ratings[0].pos, or player.draft.pos
    if (!player.pos && ((player.ratings && player.ratings[0] && player.ratings[0].pos) || 
                        (player.draft && player.draft.pos))) {
      normalized.pos = player.ratings?.[0]?.pos || player.draft?.pos || '';
    }
    
    // ----- Handle all ratings fields -----
    
    // Ensure ratings array exists and has at least one element
    if (!normalized.ratings || !normalized.ratings.length) {
      normalized.ratings = [{}];
    }
    
    // Copy all possible rating fields from player.ratings[0] if it exists
    if (player.ratings && player.ratings[0]) {
      const ratingFields = [
        'stre', 'spd', 'jmp', 'endu', 'ins',
        'dnk', 'ft', 'fg', 'tp', 'oiq', 'diq',
        'drb', 'pss', 'reb', 'hgt', 'fuzz',
        'ovr', 'pos', 'pot', 'season', 'skills'
      ];
      
      ratingFields.forEach(field => {
        if (player.ratings[0][field] !== undefined) {
          // Handle empty strings for numeric fields
          if (['stre', 'spd', 'jmp', 'endu', 'ins', 'dnk', 'ft', 'fg', 'tp', 
               'oiq', 'diq', 'drb', 'pss', 'reb', 'hgt', 'fuzz', 'ovr', 
               'pot', 'season'].includes(field) && 
              player.ratings[0][field] === '') {
            normalized.ratings[0][field] = null;
          } else {
            normalized.ratings[0][field] = player.ratings[0][field];
          }
        }
      });
    }
    
    // Override/set specific ratings fields from other locations if not already set
    
    // Handle overall rating which could be at player.ovr, player.ratings[0].ovr, or player.draft.ovr
    if (normalized.ratings[0].ovr === undefined) {
      const ovr = player.ovr !== undefined ? player.ovr : (player.draft?.ovr !== undefined ? player.draft.ovr : null);
      normalized.ratings[0].ovr = (ovr === '') ? null : ovr;
    }
    
    // Handle potential rating which could be at player.pot, player.ratings[0].pot, or player.draft.pot
    if (normalized.ratings[0].pot === undefined) {
      const pot = player.pot !== undefined ? player.pot : (player.draft?.pot !== undefined ? player.draft.pot : null);
      normalized.ratings[0].pot = (pot === '') ? null : pot;
    }
    
    // Handle position in ratings which could be at player.pos, player.ratings[0].pos, or player.draft.pos
    if (!normalized.ratings[0].pos) {
      normalized.ratings[0].pos = player.pos || player.draft?.pos || '';
    }
    
    // Handle skills array which could be at player.skills, player.ratings[0].skills, or player.draft.skills
    if (!normalized.ratings[0].skills || !normalized.ratings[0].skills.length) {
      normalized.ratings[0].skills = player.skills || player.draft?.skills || [];
    }
      // ----- Handle draft object fields -----
    
    // If draft object exists in the player, copy all fields
    if (player.draft) {
      const draftFields = [
        'tid', 'originalTid', 'year', 
        'skills', 'pot', 'ovr'
      ];
      
      // Always set round and pick to 0, regardless of input values
      normalized.draft.round = 0;
      normalized.draft.pick = 0;
      
      draftFields.forEach(field => {
        if (player.draft[field] !== undefined) {
          // For numeric fields, handle empty strings
          if (['tid', 'originalTid', 'year', 'pot', 'ovr'].includes(field) && 
              player.draft[field] === '') {
            normalized.draft[field] = null;
          } else {
            normalized.draft[field] = player.draft[field];
          }
        }
      });
    }
    
    // ----- Handle born object fields -----
    
    // If born object exists in the player, copy all fields
    if (player.born) {
      if (typeof player.born === 'object') {
        Object.keys(normalized.born).forEach(key => {
          if (player.born[key] !== undefined) {
            // For year field, handle empty strings
            if (key === 'year' && player.born[key] === '') {
              normalized.born[key] = null;
            } else {
              normalized.born[key] = player.born[key];
            }
          }
        });
      } else if (typeof player.born === 'string') {
        // If born is just a string, put it in location
        normalized.born.loc = player.born;
      }
    }
    
    // ----- Handle face object fields -----
    
    // Make sure all face object parts exist
    if (!normalized.face) {
      normalized.face = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE.face));
    }
    
    // Ensure teamColors is an array with 3 elements
    if (!Array.isArray(normalized.face.teamColors) || normalized.face.teamColors.length < 3) {
      normalized.face.teamColors = ["", "", ""];
    }
    
    // If face object exists in the player, copy all fields recursively
    if (player.face) {
      // Handle fatness directly (numeric field)
      if (player.face.fatness !== undefined) {
        normalized.face.fatness = player.face.fatness === '' ? null : player.face.fatness;
      } else {
        normalized.face.fatness = null;
      }
      
      // Handle teamColors array
      if (Array.isArray(player.face.teamColors)) {
        for (let i = 0; i < Math.min(player.face.teamColors.length, 3); i++) {
          normalized.face.teamColors[i] = player.face.teamColors[i] || '';
        }
      }
      
      // Handle all nested face objects
      const faceObjects = [
        'hairBg', 'body', 'jersey', 'ear', 'head', 'eyeLine', 
        'smileLine', 'miscLine', 'facialHair', 'eye', 'eyebrow', 
        'hair', 'mouth', 'nose', 'glasses', 'accessories'
      ];
      
      faceObjects.forEach(objName => {
        if (player.face[objName] && typeof player.face[objName] === 'object') {
          // Make sure the object exists in normalized
          if (!normalized.face[objName]) {
            normalized.face[objName] = {};
          }
          
          // Copy all properties
          Object.keys(player.face[objName]).forEach(prop => {
            // For numeric properties, handle empty strings
            const numericProps = ['size', 'angle', 'flip'];
            if (numericProps.includes(prop) && player.face[objName][prop] === '') {
              normalized.face[objName][prop] = null;
            } else {
              normalized.face[objName][prop] = player.face[objName][prop];
            }
          });
          
          // Make sure id property exists
          if (normalized.face[objName].id === undefined) {
            normalized.face[objName].id = '';
          }
        }
      });
    }
    
    // ----- Handle injury object -----
    
    if (player.injury && typeof player.injury === 'object') {
      normalized.injury = {
        type: player.injury.type || '',
        gamesRemaining: player.injury.gamesRemaining === '' ? null : (player.injury.gamesRemaining ?? null)
      };
    } else {
      normalized.injury = { type: '', gamesRemaining: null };
    }
    
    // ----- Handle player numeric fields -----
    
    const numericFields = ['hgt', 'pid', 'tid', 'weight'];
    numericFields.forEach(field => {
      if (player[field] !== undefined) {
        normalized[field] = player[field] === '' ? null : player[field];
      } else {
        normalized[field] = null;
      }
    });
  }
  function assignFields(templateObj, playerObj, currentPath = '') {
    // If playerObj is null or undefined, we can't extract anything
    if (!playerObj) return;

    for (const key in templateObj) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      // Skip undefined or null values
      if (playerObj[key] === undefined || playerObj[key] === null) continue;
      
      // Check if the property exists in the player object
      if (Object.prototype.hasOwnProperty.call(playerObj, key)) {
        // Handle nested objects (recursively)
        if (
          typeof templateObj[key] === 'object' &&
          templateObj[key] !== null &&
          !Array.isArray(templateObj[key]) &&
          typeof playerObj[key] === 'object' &&
          !Array.isArray(playerObj[key])
        ) {
          // Get the reference to the correct property in the normalized object
          let target = normalized;
          const pathParts = newPath.split('.');
          
          // Navigate to the correct nested object
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!target[pathParts[i]]) {
              target[pathParts[i]] = {};
            }
            target = target[pathParts[i]];
          }
          
          // Only recurse if we have a valid object to recurse into
          const lastPart = pathParts[pathParts.length - 1];
          if (!target[lastPart]) {
            target[lastPart] = {};
          }
          
          assignFields(templateObj[key], playerObj[key], newPath);
        } 
        // Handle arrays
        else if (Array.isArray(templateObj[key])) {
          // If it's an array of objects (like ratings), map each item
          if (
            Array.isArray(playerObj[key]) &&
            templateObj[key].length > 0 &&
            typeof templateObj[key][0] === 'object'
          ) {
            // Get reference to the correct property in normalized
            let target = normalized;
            const pathParts = newPath.split('.');
            
            // Navigate to the correct nested object
            for (let i = 0; i < pathParts.length - 1; i++) {
              target = target[pathParts[i]];
            }
            
            const lastPart = pathParts[pathParts.length - 1];
            target[lastPart] = playerObj[key].map((item) => {
              const normItem = JSON.parse(JSON.stringify(templateObj[key][0]));
              // Use a new function instance for each array item to avoid path conflicts
              const nestedAssign = (tObj, pObj, path) => {
                for (const k in tObj) {
                  if (pObj && Object.prototype.hasOwnProperty.call(pObj, k)) {
                    if (
                      typeof tObj[k] === 'object' &&
                      tObj[k] !== null &&
                      !Array.isArray(tObj[k]) &&
                      typeof pObj[k] === 'object' &&
                      !Array.isArray(pObj[k])
                    ) {
                      nestedAssign(tObj[k], pObj[k], `${path}.${k}`);
                    } else {
                      tObj[k] = pObj[k];
                    }
                  }
                }
              };
              
              nestedAssign(normItem, item, '');
              return normItem;
            });
          } else {
            // Get reference to the correct property in normalized
            let target = normalized;
            const pathParts = newPath.split('.');
            
            // Navigate to the correct nested object
            for (let i = 0; i < pathParts.length - 1; i++) {
              target = target[pathParts[i]];
            }
            
            const lastPart = pathParts[pathParts.length - 1];
            target[lastPart] = playerObj[key];
          }
        } 
        // Handle simple values
        else {
          // Get reference to the correct property in normalized
          let target = normalized;
          const pathParts = newPath.split('.');
          
          // Navigate to the correct nested object
          for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]];
          }
          
          const lastPart = pathParts[pathParts.length - 1];
          target[lastPart] = playerObj[key];
        }
      }
    }
  }  // First attempt regular assignment
  assignFields(normalized, player);
  
  // Then apply special field handling
  handleSpecialFields();
  
  // Finally, do a direct field mapping for critical fields to ensure they're populated
  ensureEssentialFieldsPopulated();
  
  // Function to ensure critical fields are populated
  function ensureEssentialFieldsPopulated() {
    // Ensure required string fields have values
    normalized.firstName = player.firstName || '';
    normalized.lastName = player.lastName || '';
    normalized.pid = player.pid !== undefined ? player.pid : null;
    normalized.pos = player.pos || player.ratings?.[0]?.pos || player.draft?.pos || '';
    
    // Ratings
    if (!normalized.ratings || !normalized.ratings.length) {
      normalized.ratings = [{}];
    }
    
    // Make sure at least one rating exists
    normalized.ratings[0].ovr = normalized.ratings[0].ovr !== undefined ? normalized.ratings[0].ovr : (player.ovr !== undefined ? player.ovr : (player.draft?.ovr !== undefined ? player.draft.ovr : null));
    normalized.ratings[0].pot = normalized.ratings[0].pot !== undefined ? normalized.ratings[0].pot : (player.pot !== undefined ? player.pot : (player.draft?.pot !== undefined ? player.draft.pot : null));
    normalized.ratings[0].pos = normalized.ratings[0].pos || normalized.pos || '';
    // Handle numeric fields in ratings
    const ratingNumericFields = [
      'hgt', 'stre', 'spd', 'jmp', 'endu', 'ins',
      'dnk', 'ft', 'fg', 'tp', 'diq', 'oiq',
      'drb', 'pss', 'reb', 'fuzz', 'season'
    ];
    
    ratingNumericFields.forEach(field => {
      if (normalized.ratings[0][field] === undefined || normalized.ratings[0][field] === '') {
        normalized.ratings[0][field] = null;
      }
    });    
    // If no skills array, initialize it
    if (!Array.isArray(normalized.ratings[0].skills)) {
      normalized.ratings[0].skills = [];
    }
    
    // Double-check born structure
    if (!normalized.born || typeof normalized.born !== 'object') {
      normalized.born = { year: null, loc: '' };
    } else {
      if (normalized.born.year === undefined || normalized.born.year === '') {
        normalized.born.year = null;
      }
      if (normalized.born.loc === undefined) {
        normalized.born.loc = '';
      }
    }
      // Ensure draft structure
    if (!normalized.draft || typeof normalized.draft !== 'object') {
      normalized.draft = { 
        year: null, tid: null, originalTid: null, 
        round: 0, pick: 0, skills: [], pot: null, ovr: null 
      };
    } else {
      // Set numeric fields to null if undefined or empty
      const draftNumericFields = ['year', 'tid', 'originalTid', 'pot', 'ovr'];
      draftNumericFields.forEach(field => {
        if (normalized.draft[field] === undefined || normalized.draft[field] === '') {
          normalized.draft[field] = null;
        }
      });
      
      // Always set round and pick to 0, regardless of input values
      normalized.draft.round = 0;
      normalized.draft.pick = 0;
    }
    
    // Copy over values to draft if they exist elsewhere
    if (normalized.draft.pot === null && normalized.ratings[0].pot !== null) {
      normalized.draft.pot = normalized.ratings[0].pot;
    }
    if (normalized.draft.ovr === null && normalized.ratings[0].ovr !== null) {
      normalized.draft.ovr = normalized.ratings[0].ovr;
    }
    
    // Set main player numeric fields
    const playerNumericFields = ['hgt', 'pid', 'tid', 'weight'];
    playerNumericFields.forEach(field => {
      if (normalized[field] === undefined || normalized[field] === '') {
        normalized[field] = null;
      }
    });
    
    // Ensure injury has correct structure
    if (!normalized.injury || typeof normalized.injury !== 'object') {
      normalized.injury = { type: '', gamesRemaining: null };
    } else if (normalized.injury.gamesRemaining === undefined || normalized.injury.gamesRemaining === '') {
      normalized.injury.gamesRemaining = null;
    }
    
    // Double check face object structure
    if (!normalized.face || typeof normalized.face !== 'object') {
      normalized.face = JSON.parse(JSON.stringify(DEFAULT_PLAYER_TEMPLATE.face));
    } else {
      // Ensure teamColors is properly structured
      if (!Array.isArray(normalized.face.teamColors) || normalized.face.teamColors.length < 3) {
        normalized.face.teamColors = ["", "", ""];
      }
      
      // Ensure all numeric face properties are properly set
      const faceObjectsWithNumericProps = {
        body: ['size'],
        ear: ['size'],
        smileLine: ['size'],
        eye: ['angle'],
        eyebrow: ['angle'],
        hair: ['flip'],
        mouth: ['flip'],
        nose: ['flip', 'size']
      };
      
      // Set fatness property (direct numeric property)
      if (normalized.face.fatness === undefined || normalized.face.fatness === '') {
        normalized.face.fatness = null;
      }
      
      // Handle all nested face objects
      Object.keys(faceObjectsWithNumericProps).forEach(objName => {
        if (!normalized.face[objName] || typeof normalized.face[objName] !== 'object') {
          normalized.face[objName] = {};
        }
        
        // Set string properties if undefined
        if (normalized.face[objName].id === undefined) {
          normalized.face[objName].id = '';
        }
        
        // Set numeric properties if needed
        faceObjectsWithNumericProps[objName].forEach(prop => {
          if (normalized.face[objName][prop] === undefined || normalized.face[objName][prop] === '') {
            normalized.face[objName][prop] = null;
          }
        });
        
        // Set color properties if needed
        if (objName === 'body' || objName === 'hair') {
          if (normalized.face[objName].color === undefined) {
            normalized.face[objName].color = '';
          }
        }
      });
      
      // Ensure other face objects exist with id property
      const simpleIdObjects = ['hairBg', 'jersey', 'head', 'eyeLine', 'miscLine', 'facialHair', 'glasses', 'accessories'];
      simpleIdObjects.forEach(objName => {
        if (!normalized.face[objName] || typeof normalized.face[objName] !== 'object') {
          normalized.face[objName] = { id: '' };
        } else if (normalized.face[objName].id === undefined) {
          normalized.face[objName].id = '';
        }
      });
    }
    
    console.log('Normalized player structure:', JSON.stringify(normalized, null, 2));  }
  
  // Log the result
  console.log('Normalized player structure:', JSON.stringify(normalized, null, 2));
  
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

  // Expose normalizePlayerToTemplate as a public method
  normalizePlayerToTemplate(player) {
    return normalizePlayerToTemplate(player);
  }

  // Add a public method to normalize a player for editing
  normalizePlayerForEditing(player) {
    // Use the same normalization function that's used for importing
    return normalizePlayerToTemplate(player);
  }
}

export default PlayerManager;

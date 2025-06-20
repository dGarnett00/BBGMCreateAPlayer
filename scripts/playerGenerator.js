// Player generation from draft files

import { DRAFT_FILES, APP_CONFIG } from './constants.js';
import { mixPlayers } from './playerTransform.js';

class PlayerGenerator {
  constructor() {
    this.draftPlayersCache = null;
  }

  // Load all draft players from files
  async loadAllDraftPlayers() {
    if (this.draftPlayersCache) {
      return this.draftPlayersCache;
    }

    const allPlayers = [];
    
    for (const file of DRAFT_FILES) {
      try {
        const response = await fetch(file);
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (Array.isArray(data.players)) {
          allPlayers.push(...data.players);
        } else if (Array.isArray(data)) {
          allPlayers.push(...data);
        }
      } catch (error) {
        console.warn(`Failed to load draft file: ${file}`, error);
      }
    }

    this.draftPlayersCache = allPlayers;
    return allPlayers;
  }

  // Generate a single random player from draft files
  async generateRandomPlayer() {
    const allPlayers = await this.loadAllDraftPlayers();
    
    if (allPlayers.length < APP_CONFIG.MIN_PLAYERS_FOR_GENERATION) {
      throw new Error('Not enough players in draft files to generate a random player.');
    }

    return this.createMergedPlayer(allPlayers);
  }

  // Generate multiple random players
  async generateMultiplePlayers(count) {
    const allPlayers = await this.loadAllDraftPlayers();
    
    if (allPlayers.length < APP_CONFIG.MIN_PLAYERS_FOR_GENERATION) {
      throw new Error('Not enough players in draft files to generate players.');
    }

    const generatedPlayers = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const player = this.createMergedPlayer(allPlayers);
        if (player) {
          generatedPlayers.push(player);
        }
      } catch (error) {
        console.warn(`Failed to generate player ${i + 1}:`, error);
      }
    }

    return generatedPlayers;
  }
  // Create a merged player from random selection
  createMergedPlayer(sourcePlayersArray) {
    if (sourcePlayersArray.length < APP_CONFIG.MIN_PLAYERS_FOR_GENERATION) {
      return null;
    }

    // Select 5 random players to mix
    const selectedPlayers = this.selectRandomPlayers(sourcePlayersArray, 5);
    
    // Use the new mixPlayers function to create a merged player
    const mergedPlayer = mixPlayers(...selectedPlayers);

    // Randomize key identifying fields
    this.randomizePlayerIdentity(mergedPlayer, selectedPlayers);
    
    // Set draft-specific properties
    this.setDraftProperties(mergedPlayer);

    return mergedPlayer;
  }
  // Select random players without duplicates
  selectRandomPlayers(playersArray, count) {
    const selected = [];
    const usedIndices = new Set();

    while (selected.length < count && usedIndices.size < playersArray.length) {
      const randomIndex = Math.floor(Math.random() * playersArray.length);
      
      if (!usedIndices.has(randomIndex)) {
        selected.push(playersArray[randomIndex]);
        usedIndices.add(randomIndex);
      }
    }

    return selected;
  }

  // Randomize player identity fields
  randomizePlayerIdentity(player, sourcePlayersArray) {
    // Random first name, last name, and image
    const randomSource1 = sourcePlayersArray[Math.floor(Math.random() * sourcePlayersArray.length)];
    const randomSource2 = sourcePlayersArray[Math.floor(Math.random() * sourcePlayersArray.length)];
    const randomSource3 = sourcePlayersArray[Math.floor(Math.random() * sourcePlayersArray.length)];

    player.firstName = randomSource1.firstName;
    player.lastName = randomSource2.lastName;
    player.imgURL = randomSource3.imgURL;

    // Generate unique player ID
    player.pid = Math.floor(Math.random() * 1000000);
  }

  // Set draft-specific properties
  setDraftProperties(player) {
    const currentYear = new Date().getFullYear();
    
    player.draft.year = currentYear;
    player.draft.tid = -1;
    player.draft.originalTid = -1;
    player.draft.round = 0;
    player.draft.pick = 0;
    
    player.injury = { type: 'Healthy', gamesRemaining: 0 };
    player.injuries = [];
    player.tid = -2;

    // Update ratings
    if (player.ratings && player.ratings.length > 0) {
      player.ratings.forEach(rating => {
        rating.season = currentYear;
        rating.pos = player.pos;
        rating.ovr = player.draft.ovr;
        rating.pot = player.draft.pot;
      });
    }
  }

  // Clear cache to force reload
  clearCache() {
    this.draftPlayersCache = null;
  }
}

export default PlayerGenerator;

// Player transformation and randomization utilities

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Mix multiple players by randomly picking fields from each
export function mixPlayers(...players) {
  if (players.length === 0) return null;
  if (players.length === 1) return deepClone(players[0]);
  
  // Start with the first player as base
  const result = deepClone(players[0]);
  
  // Get all keys from all players
  const allKeys = new Set();
  players.forEach(player => {
    Object.keys(player).forEach(key => allKeys.add(key));
  });
  
  for (const key of allKeys) {
    // Get all valid values for this key from all players
    const validValues = players
      .map(player => player[key])
      .filter(value => value !== undefined && value !== null);
    
    if (validValues.length === 0) continue;
    
    if (typeof validValues[0] === "object" && validValues[0] !== null && !Array.isArray(validValues[0])) {
      // Handle nested objects - recursively mix them
      const nestedObjects = validValues.filter(val => typeof val === "object" && !Array.isArray(val));
      if (nestedObjects.length > 0) {
        result[key] = mixPlayers(...nestedObjects);
      }
    } else if (Array.isArray(validValues[0])) {
      // Handle arrays
      if (key === "ratings" && validValues.every(val => Array.isArray(val) && val.length > 0)) {
        // Special handling for ratings array - mix the first rating object
        const ratingObjects = validValues.map(val => val[0]).filter(rating => rating);
        if (ratingObjects.length > 0) {
          result[key] = [mixPlayers(...ratingObjects)];
        }
      } else if (key === "skills" || key === "teamColors") {
        // For skills and teamColors, randomly pick one array
        result[key] = rand(validValues);
      } else {
        // For other arrays, randomly pick one
        result[key] = deepClone(rand(validValues));
      }
    } else {
      // Handle primitive values - randomly pick one
      result[key] = rand(validValues);
    }
  }
  
  return result;
}

export function ensurePotAtLeastOvr(player) {
  if (player && Array.isArray(player.ratings)) {
    player.ratings.forEach(rating => {
      if (
        rating &&
        typeof rating.ovr === "number" &&
        typeof rating.pot === "number" &&
        rating.pot < rating.ovr
      ) {
        rating.pot = rating.ovr;
      }
      
      if (
        rating &&
        !isNaN(Number(rating.ovr)) &&
        !isNaN(Number(rating.pot)) &&
        Number(rating.pot) < Number(rating.ovr)
      ) {
        rating.pot = rating.ovr;
      }
    });
  }
}

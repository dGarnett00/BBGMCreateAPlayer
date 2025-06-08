// Player randomization 
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Mix two players by randomly picking fields from each
export function mixPlayers(playerA, playerB) {
    const result = {};
    for (const key of Object.keys(playerA)) {
        if (typeof playerA[key] === "object" && playerA[key] !== null && playerB[key]) {
            if (Array.isArray(playerA[key])) {
                if (key === "ratings" && playerA[key].length && playerB[key].length) {
                    result[key] = [mixPlayers(playerA[key][0], playerB[key][0])];
                } else if (key === "skills" || key === "teamColors") {
                    result[key] = rand([playerA[key], playerB[key]]);
                } else {
                    result[key] = deepClone(rand([playerA[key], playerB[key]]));
                }
            } else {
                result[key] = mixPlayers(playerA[key], playerB[key]);
            }
        } else {
            result[key] = rand([playerA[key], playerB[key]]);
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

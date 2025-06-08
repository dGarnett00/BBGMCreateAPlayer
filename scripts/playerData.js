// things for loading player data.
export async function loadAllDraftplayers() {
    const draftFiles = [
        "25DRAFT.json",
        "26draft.json",
        "27DRAFT.json",
        "28DRAFT.json",
    ];
    const basePath = "drafts/"
    const allPlayers = [];
    for (const file of draftFiles) {
        try {
            const res = await fetch(basePath + file);
            if (!res.ok) continue 
            const data = await res.json();
            if (Array.isArray(data)) {
                allPlayers.push(...data);
            }   else if (Array.isArray(data.players)) {
                allPlayers.push(...data.players);
            }   else if (typeof data === "object"){
                allPlayers.push(data);
            }
        } catch (e) {
            // ignore errors for bad files
        }
    }
    return allPlayers;  
}
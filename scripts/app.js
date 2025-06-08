import * as jsonHandler from './jsonHandler.js';
import { renderJsonForm, getFormData, setReadOnlyOptionsMap } from './jsonFormUI.js';
import {
    loadAllDraftPlayers,
    deepClone,
    rand,
    mixPlayers,
    ensurePotAtLeastOvr
} from './playerUtils.js';

// --- UI and event logic only below ---

const defaultPlayer = {
  "born": { "year": "", "loc": "" },
  "college": "",
  "draft": {
    "year": "",
    "tid": "",
    "originalTid": "",
    "round": "",
    "pick": "",
    "skills": [],
    "pot": "",
    "ovr": ""
  },
  "face": {
    "fatness": "",
    "teamColors": [],
    "hairBg": { "id": "" },
    "body": { "id": "", "color": "", "size": "" },
    "jersey": { "id": "" },
    "ear": { "id": "", "size": "" },
    "head": { "id": "", "shave": "" },
    "eyeLine": { "id": "" },
    "smileLine": { "id": "", "size": "" },
    "miscLine": { "id": "" },
    "facialHair": { "id": "" },
    "eye": { "id": "", "angle": "" },
    "eyebrow": { "id": "", "angle": "" },
    "hair": { "id": "", "color": "", "flip": "" },
    "mouth": { "id": "", "flip": "" },
    "nose": { "id": "", "flip": "", "size": "" },
    "glasses": { "id": "" },
    "accessories": { "id": "" }
  },
  "firstName": "",
  "hgt": "",
  "imgURL": "",
  "injury": { "type": "", "gamesRemaining": "" },
  "injuries": [],
  "lastName": "",
  "pid": "",
  "pos": "",
  "ratings": [
    {
      "hgt": "",
      "stre": "",
      "spd": "",
      "jmp": "",
      "endu": "",
      "ins": "",
      "dnk": "",
      "ft": "",
      "fg": "",
      "tp": "",
      "diq": "",
      "oiq": "",
      "drb": "",
      "pss": "",
      "reb": "",
      "season": "",
      "pos": "",
      "fuzz": "",
      "skills": [],
      "ovr": "",
      "pot": ""
    }
  ],
  "relatives": [],
  "tid": "",
  "weight": ""
};

const TOP_LEVEL_VERSION = 67;
let topLevelStartingSeason = 2025;

const jsonFormContainer = document.getElementById('jsonFormContainer');
const saveBtn = document.getElementById('saveJsonBtn');
const outputSection = document.getElementById('outputSection');
const outputJson = document.getElementById('outputJson');
const exportBtn = document.getElementById('exportJsonBtn');
const generateRandomPlayerBtn = document.getElementById('generateRandomPlayerBtn');
let allPlayers = [];

// --- Add editable startingSeason input ---
const startingSeasonWrapper = document.createElement('div');
startingSeasonWrapper.style.margin = "1em 0";
startingSeasonWrapper.style.display = "flex";
startingSeasonWrapper.style.alignItems = "center";
startingSeasonWrapper.style.gap = "0.7em";

const startingSeasonLabel = document.createElement('label');
startingSeasonLabel.textContent = "Starting Season:";
startingSeasonLabel.setAttribute('for', 'startingSeasonInput');
startingSeasonLabel.style.fontWeight = "bold";
startingSeasonLabel.style.color = "#b0c4de";

const startingSeasonInput = document.createElement('input');
startingSeasonInput.type = "number";
startingSeasonInput.id = "startingSeasonInput";
startingSeasonInput.value = topLevelStartingSeason;
startingSeasonInput.min = 1900;
startingSeasonInput.max = 3000;
startingSeasonInput.style.width = "7em";
startingSeasonInput.style.borderRadius = "5px";
startingSeasonInput.style.border = "1px solid #444";
startingSeasonInput.style.padding = "0.4em 0.7em";
startingSeasonInput.style.background = "#181a1b";
startingSeasonInput.style.color = "#e0e6ed";

startingSeasonWrapper.appendChild(startingSeasonLabel);
startingSeasonWrapper.appendChild(startingSeasonInput);

// Insert the starting season input above the form
jsonFormContainer.parentNode.insertBefore(startingSeasonWrapper, jsonFormContainer);

// Disable input after first edit until export
let startingSeasonLocked = false;
startingSeasonInput.addEventListener('change', () => {
    if (!startingSeasonLocked) {
        topLevelStartingSeason = Number(startingSeasonInput.value) || 2025;
        startingSeasonInput.disabled = true;
        startingSeasonLocked = true;
    }
});

// Render default player form on load
let currentPlayer = structuredClone(defaultPlayer);
renderJsonForm(currentPlayer, jsonFormContainer);

// Save button logic (append to allPlayers and show combined JSON)
saveBtn.addEventListener('click', () => {
    const updatedPlayer = getFormData(jsonFormContainer);
    allPlayers.push(updatedPlayer);
    const outputObj = {
        version: TOP_LEVEL_VERSION,
        startingSeason: topLevelStartingSeason,
        players: allPlayers
    };
    outputJson.textContent = JSON.stringify(outputObj, null, 2);
    outputSection.style.display = 'block';
    currentPlayer = structuredClone(defaultPlayer);
    renderJsonForm(currentPlayer, jsonFormContainer);
});

// --- Import/export and edit logic ---

const jsonInput = document.getElementById('jsonInput');

// Add a section to select and edit uploaded players
const editSection = document.createElement('section');
editSection.className = 'card';
editSection.style.display = 'none';
editSection.style.marginTop = '2rem';

const editTitle = document.createElement('h2');
editTitle.textContent = 'Edit Uploaded Players';
editSection.appendChild(editTitle);

const playerSelect = document.createElement('select');
playerSelect.id = 'playerSelect';
playerSelect.style.marginBottom = '1rem';
editSection.appendChild(playerSelect);

const editFormContainer = document.createElement('div');
editFormContainer.id = 'editFormContainer';
editSection.appendChild(editFormContainer);

const updateBtn = document.createElement('button');
updateBtn.textContent = 'Update Player';
updateBtn.className = 'primary-btn';
updateBtn.style.marginTop = '1rem';
editSection.appendChild(updateBtn);

document.querySelector('main').insertBefore(editSection, document.getElementById('outputSection').nextSibling);

let uploadedPlayers = [];
let uploadedJsonObj = null;

// When a user uploads a JSON file, show the edit section if players are found
jsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        jsonHandler.importJson(file, (err, data) => {
            if (err) {
                alert('Invalid JSON file.');
            } else {
                // Detect players array
                let players = [];
                if (Array.isArray(data.players)) {
                    players = data.players;
                    uploadedJsonObj = data;
                } else if (Array.isArray(data)) {
                    players = data;
                    uploadedJsonObj = { players: data };
                } else {
                    players = [data];
                    uploadedJsonObj = { players: [data] };
                }
                uploadedPlayers = players;

                // Populate select dropdown
                playerSelect.innerHTML = '';
                players.forEach((p, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = (p.firstName || '') + ' ' + (p.lastName || '') + ' (Player ' + (i + 1) + ')';
                    playerSelect.appendChild(opt);
                });

                // Show edit section if players found
                if (players.length > 0) {
                    editSection.style.display = '';
                    renderJsonForm(players[0], editFormContainer);
                } else {
                    editSection.style.display = 'none';
                }

                // If the imported file is an array, use as players; if object, use its players
                if (Array.isArray(data.players)) {
                    allPlayers = data.players;
                } else if (Array.isArray(data)) {
                    allPlayers = data;
                } else {
                    allPlayers = [data];
                }
                renderJsonForm(structuredClone(defaultPlayer), jsonFormContainer);
                exportBtn.style.display = 'inline-block';
                const outputObj = {
                    version: TOP_LEVEL_VERSION,
                    startingSeason: topLevelStartingSeason,
                    players: allPlayers
                };
                outputJson.textContent = JSON.stringify(outputObj, null, 2);
                outputSection.style.display = 'block';
            }
        });
    }
});

// When a different player is selected, show their data in the form
playerSelect.addEventListener('change', (e) => {
    const idx = Number(e.target.value);
    if (uploadedPlayers[idx]) {
        renderJsonForm(uploadedPlayers[idx], editFormContainer);
    }
});

// When the user clicks "Update Player", update the player in memory
updateBtn.addEventListener('click', () => {
    const idx = Number(playerSelect.value);
    if (uploadedPlayers[idx]) {
        const updated = getFormData(editFormContainer);
        uploadedPlayers[idx] = updated;
        uploadedJsonObj.players[idx] = updated;
        alert('Player updated!');
    }
});

// Optionally, update export logic to export the edited uploaded players if present
exportBtn.addEventListener('click', () => {
    let exportObj;
    if (uploadedPlayers.length > 0) {
        exportObj = {
            ...uploadedJsonObj,
            players: uploadedPlayers
        };
    } else {
        exportObj = {
            version: TOP_LEVEL_VERSION,
            startingSeason: topLevelStartingSeason,
            players: allPlayers
        };
    }
    jsonHandler.updateJson(exportObj);
    jsonHandler.exportJson();
});

// Set imgURL dropdown options for the form (applies to all player forms, including edit)
// This ensures the dropdown is available in both the main and edit player forms.
const imgUrlOptions = [
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4697268.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4576060.png&w=350&h=254",
  "https://i.imgur.com/H3Cltya.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5093267.png&w=350&h=254",
  "https://i.imgur.com/hU5wUiY.png",
  "https://ak-static.cms.nba.com/wp-content/uploads/headshots/gleague/260x190/1641831.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4700818.png&w=350&h=254",
  "https://i.imgur.com/2mMAc4z.png",
  "https://i.imgur.com/b9Sd6IX.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4898371.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4602025.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4591259.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4703530.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5239561.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5061568.png&w=350&h=254",
  "https://i.imgur.com/BP651IC.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5243213.png&w=350&h=254",
  "https://i.imgur.com/tdGHH5h.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5214640.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4896372.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4781746.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5108024.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4433281.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5124612.png&w=350&h=254",
  "https://i.imgur.com/Z3RMBGF.png",
  "https://ak-static.cms.nba.com/wp-content/uploads/headshots/gleague/260x190/1641891.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702528.png&w=350&h=254",
  "https://i.imgur.com/NW3ZXXV.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5144091.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5061575.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5023693.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4903027.png&w=350&h=254",
  "https://i.imgur.com/EcdUOQK.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5041939.png&w=350&h=254",
  "https://i.imgur.com/j7fdmCa.png",
  "https://i.imgur.com/ZTGjVgW.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5105977.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4700852.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5060631.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5061603.png&w=350&h=254",
  "https://i.imgur.com/37fiz2F.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5203685.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4593043.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869780.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5037873.png&w=350&h=254",
  "https://i.imgur.com/TZSgdQR.png",
  "https://i.imgur.com/9MJMl77.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4433569.png&w=350&h=254",
  "https://i.imgur.com/hDhouCD.png",
  "https://ak-static.cms.nba.com/wp-content/uploads/headshots/gleague/260x190/1641825.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5239590.png&w=350&h=254",
  "https://ak-static.cms.nba.com/wp-content/uploads/headshots/gleague/260x190/1641823.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5144126.png&w=350&h=254",
  "https://i.imgur.com/Pqjy88e.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4431718.png&w=350&h=254",
  "https://i.imgur.com/mSZymfM.png",
  "https://i.imgur.com/jf7x4V5.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4697270.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5107173.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4606840.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702745.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702384.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4432185.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702656.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702670.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5106035.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4702352.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683933.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4433629.png&w=350&h=254",
  "https://i.imgur.com/F2Hu8t5.png",
  "https://i.imgur.com/RUZmDVz.png",
  "https://i.imgur.com/1U6Gy2T.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5175737.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174952.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4684269.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5105794.png&w=350&h=254",
  "https://i.imgur.com/FaH0pPl.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5105571.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5037878.png&w=350&h=254",
  "https://i.imgur.com/V0tLI62.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5060700.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4432749.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4937074.png&w=350&h=254",
  "https://i.imgur.com/paYAI5Q.png",
  "https://i.imgur.com/3TtXDz6.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4872744.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5105529.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4872739.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683697.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5061585.png&w=350&h=254",
  "https://i.imgur.com/gTK17Lf.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683767.png&w=350&h=254",
  "https://i.imgur.com/Kl0mz5t.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5175007.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4917149.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4712836.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869766.png&w=350&h=254",
  "https://i.imgur.com/kgSyvcM.png",
  "https://i.imgur.com/YN1lszg.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5107169.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174665.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174984.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869739.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5106288.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4872740.png&w=350&h=254",
  "https://i.imgur.com/5fU6zRT.png",
  "https://i.imgur.com/9yEoOlY.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5125192.png&w=350&h=254",
  "https://i.imgur.com/JO96HjF.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4711304.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5075626.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4700527.png&w=350&h=254",
  "https://ak-static.cms.nba.com/wp-content/uploads/headshots/gleague/260x190/1631395.png",
  "https://i.imgur.com/b7xQsrs.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5238195.png&w=350&h=254",
  "https://i.imgur.com/ZuLqnap.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4896365.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873184.png&w=350&h=254",
  "https://i.imgur.com/ApnPkmf.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5107804.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4698719.png&w=350&h=254",
  "https://i.imgur.com/D7gDV3a.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5106283.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683785.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174955.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873180.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5175037.png&w=350&h=254",
  "https://i.imgur.com/LGkUBiO.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4684843.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174982.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5106059.png&w=350&h=254",
  "https://i.imgur.com/spGdBjD.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873181.png&w=350&h=254",
  "https://i.imgur.com/ogkottA.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5105603.png&w=350&h=254",
  "https://i.imgur.com/IgWzKIw.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4845358.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4684270.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5037880.png&w=350&h=254",
  "https://i.imgur.com/LVYDgmd.png",
  "https://i.imgur.com/if3Emjo.png",
  "https://i.imgur.com/cFGPbNn.png",
  "https://i.imgur.com/HeLJM5r.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5143604.png&w=350&h=254",
  "https://i.imgur.com/y2A1gxA.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174582.png&w=350&h=254",
  "https://i.imgur.com/NWxROA3.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174983.png&w=350&h=254",
  "https://i.imgur.com/4VOy7tj.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5142322.png&w=350&h=254",
  "https://i.imgur.com/AoYToDM.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5033017.png&w=350&h=254",
  "https://i.imgur.com/DvZMMpH.png",
  "https://i.imgur.com/aGgYzHH.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4711256.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4848637.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873187.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4711279.png&w=350&h=254",
  "https://i.imgur.com/Ojd0pUA.png",
  "https://i.imgur.com/n8Xt2Zj.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5214642.png&w=350&h=254",
  "https://i.imgur.com/qDJGqmp.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174657.png&w=350&h=254",
  "https://i.imgur.com/2rSztIi.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4711306.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5240524.png&w=350&h=254",
  "https://i.imgur.com/macjHIh.png",
  "https://i.imgur.com/wYYOvYc.png",
  "https://i.imgur.com/zeLR2iy.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5101656.png&w=350&h=254",
  "https://i.imgur.com/iElj2Cm.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5060706.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5174954.png&w=350&h=254",
  "https://i.imgur.com/1UZ4twN.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4433285.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683777.png&w=350&h=254",
  "https://i.imgur.com/3SahVcz.png",
  "https://i.imgur.com/GzPC0lf.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683761.png&w=350&h=254",
  "https://i.imgur.com/URiLZwK.png",
  "https://i.imgur.com/JbGrfcI.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4685647.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4685683.png&w=350&h=254",
  "https://i.imgur.com/60fd1Vs.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683769.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5101845.png&w=350&h=254",
  "https://i.imgur.com/EcjrooZ.png",
  "https://i.imgur.com/DsgHlRV.png",
  "https://i.imgur.com/Kx709pm.png",
  "https://i.imgur.com/QN8ltbt.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869764.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4683779.png&w=350&h=254",
  "https://i.imgur.com/BgxjIeU.png",
  "https://i.imgur.com/CTkpfpU.png",
  "https://i.imgur.com/g22N6cm.png",
  "https://i.imgur.com/Fw2KQbl.png",
  "https://i.imgur.com/Aa23wFs.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4432737.png&w=350&h=254",
  "https://i.imgur.com/bGBUb4a.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5077373.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5238208.png&w=350&h=254",
  "https://i.imgur.com/OKyUCDI.png",
  "https://i.imgur.com/ecLTjpc.png",
  "https://i.imgur.com/BjWgdFo.png",
  "https://i.imgur.com/QB5LxRA.png",
  "https://i.imgur.com/9R6zeQf.png",
  "https://i.imgur.com/juaE30J.png",
  "https://i.imgur.com/dNYwyM8.png",
  "https://i.imgur.com/AkAmJJG.png",
  "https://i.imgur.com/kxx8qmN.png",
  "https://i.imgur.com/drSSxAs.png",
  "https://i.imgur.com/tjRwn2g.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873089.png&w=350&h=254",
  "https://i.imgur.com/dU2X7Jj.png",
  "https://i.imgur.com/5hMgelh.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4915060.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5243212.png&w=350&h=254",
  "https://i.imgur.com/s4WlZxZ.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4873090.png&w=350&h=254",
  "https://i.imgur.com/W3NYuRU.png",
  "https://i.imgur.com/AcFfI6F.png",
  "https://i.imgur.com/KWQCpAx.png",
  "https://i.imgur.com/Be0gYuL.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4711255.png&w=350&h=254",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5060701.png&w=350&h=254",
  "https://i.imgur.com/7n2ar9T.png",
  "https://i.imgur.com/6pTn3Js.png",
  "https://i.imgur.com/kTC7GYL.png",
  "https://i.imgur.com/OQyyP75.png",
  "https://i.imgur.com/poxKOCw.png",
  "https://i.imgur.com/TtiicGG.png",
  "https://i.imgur.com/1n4oRH6.png",
  "https://i.imgur.com/VvgapmD.png",
  "https://i.imgur.com/vOrQZpY.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869777.png&w=350&h=254",
  "https://i.imgur.com/ebt3be9.png",
  "https://i.imgur.com/xuBk4TM.png",
  "https://i.imgur.com/3XuLTr6.png",
  "https://i.imgur.com/UcyG3HY.png",
  "https://i.imgur.com/8Hk1hCw.png",
  "https://i.imgur.com/7yxl6GK.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5095155.png&w=350&h=254",
  "https://i.imgur.com/AqOlNcr.png",
  "https://i.imgur.com/GvH5iXb.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/4869770.png&w=350&h=254",
  "https://i.imgur.com/28KTpb9.png",
  "https://a.espncdn.com/combiner/i?img=/i/headshots/mens-college-basketball/players/full/5044426.png&w=350&h=254",
  "https://i.imgur.com/CVrKMak.png",
  "https://i.imgur.com/aD1LxoV.png",
  "https://i.imgur.com/eH9Enbf.png",
  "https://i.imgur.com/duxREAB.png",
  "https://i.imgur.com/67BMfdy.png",
  "https://i.imgur.com/UMwbgPt.png",
  "https://i.imgur.com/LBomgXc.png",
  "https://i.imgur.com/rzF8N86.png",
  "https://i.imgur.com/1SJjlm0.png",
  "https://i.imgur.com/MEu2tn7.png",
  "https://i.imgur.com/HaAmp3J.png",
  "https://i.imgur.com/bfsX1fA.png",
  "https://i.imgur.com/YbXswdX.png",
  "https://i.imgur.com/cmcAKh3.png"
];
setReadOnlyOptionsMap({ imgURL: imgUrlOptions });

// Utility to get all players from all draft files
async function getAllDraftPlayers() {
    const draftFiles = [
        'Drafts/25DRAFT.json',
        'Drafts/26draft.json',
        'Drafts/27DRAFT.json',
        'Drafts/28DRAFT.json'
    ];
    let allPlayers = [];
    for (const file of draftFiles) {
        try {
            const res = await fetch(file);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.players)) {
                    allPlayers = allPlayers.concat(data.players);
                }
            }
        } catch (e) {
            // Ignore file errors
        }
    }
    return allPlayers;
}

// Utility to deep merge 10 random players into a new player
function generateRandomPlayerFromDrafts(players) {
    if (players.length < 10) return null;
    const selected = [];
    const used = new Set();
    while (selected.length < 10) {
        const idx = Math.floor(Math.random() * players.length);
        if (!used.has(idx)) {
            selected.push(players[idx]);
            used.add(idx);
        }
    }
    // Merge logic: take random values from each
    const base = JSON.parse(JSON.stringify(selected[0]));
    for (let i = 1; i < selected.length; i++) {
        const p = selected[i];
        for (const key in p) {
            if (typeof p[key] === 'object' && p[key] !== null && !Array.isArray(p[key])) {
                for (const subKey in p[key]) {
                    if (Math.random() < 0.5) base[key][subKey] = p[key][subKey];
                }
            } else if (Array.isArray(p[key])) {
                if (Math.random() < 0.5) base[key] = JSON.parse(JSON.stringify(p[key]));
            } else {
                if (Math.random() < 0.5) base[key] = p[key];
            }
        }
    }
    base.firstName = selected[Math.floor(Math.random() * selected.length)].firstName;
    base.lastName = selected[Math.floor(Math.random() * selected.length)].lastName;
    base.imgURL = selected[Math.floor(Math.random() * selected.length)].imgURL;
    base.draft.year = new Date().getFullYear();
    base.draft.tid = -1;
    base.draft.originalTid = -1;
    base.draft.round = 0;
    base.draft.pick = 0;
    base.injury = { type: 'Healthy', gamesRemaining: 0 };
    base.injuries = [];
    base.tid = -2;
    base.pid = Math.floor(Math.random() * 1000000);
    base.ratings.forEach(r => {
        r.season = new Date().getFullYear();
        r.pos = base.pos;
        r.ovr = base.draft.ovr;
        r.pot = base.draft.pot;
    });
    return base;
}

let generatedPlayers = [];

generateRandomPlayerBtn.addEventListener('click', async () => {
    // Only fetch all draft players once, then reuse
    if (!window._allDraftPlayersCache) {
        window._allDraftPlayersCache = await getAllDraftPlayers();
    }
    const allDraftPlayers = window._allDraftPlayersCache;
    if (allDraftPlayers.length < 10) {
        alert('Not enough players in draft files to generate a random player.');
        return;
    }
    const newPlayer = generateRandomPlayerFromDrafts(allDraftPlayers);
    if (!newPlayer) {
        alert('Failed to generate player.');
        return;
    }
    renderJsonForm(newPlayer, jsonFormContainer);
    // Add the generated player to the output JSON (append to list)
    generatedPlayers.push(newPlayer);
    const outputObj = {
        version: TOP_LEVEL_VERSION,
        startingSeason: topLevelStartingSeason,
        players: generatedPlayers
    };
    outputJson.textContent = JSON.stringify(outputObj, null, 2);
    outputSection.style.display = 'block';
    alert('Random player generated and added to output! You can now edit and save.');
});
// Handles importing, editing, and exporting JSON files

let currentJson = {};

export function importJson(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            currentJson = JSON.parse(e.target.result);
            callback(null, currentJson);
        } catch (err) {
            callback(err, null);
        }
    };
    reader.readAsText(file);
}

export function updateJson(newJson) {
    currentJson = newJson;
}

export function exportJson(filename = "data.json") {
    const dataStr = JSON.stringify(currentJson, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
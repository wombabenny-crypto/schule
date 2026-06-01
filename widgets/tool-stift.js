// tool-stift.js
let drawing = false;
let current = null;
function updatePenSettings(colorValue, isNeon) {
    App.penSettings.color = colorValue;
    if (colorValue === "#000000" || colorValue === "#000") {
        App.penSettings.glow = false;
    } else {
        App.penSettings.glow = isNeon;
    }
    console.log("Farbe:", App.penSettings.color, "Glanz:", App.penSettings.glow);
    App.render(); // Wichtig: Damit die Änderung sofort sichtbar wird!
}
App.handlers.down.push((e) => {
    if (App.mode !== 'pen') return;
    
    App.saveState();
    drawing = true;
    
    // Der Strich übernimmt beim Erstellen die aktuellen Einstellungen
    current = { 
        m: 'pen', 
        c: App.penSettings.color, 
        // Hier speichern wir fest, ob dieser Strich leuchten soll oder nicht
        glow: App.penSettings.glow, 
		size: App.penSettings.size,
        type: App.penSettings.type, 
        p: [{x: e.offsetX, y: e.offsetY}] 
    };
    
    App.strokes.push(current);
});

App.handlers.move.push((e) => {
    if (!drawing || App.mode !== 'pen') return;
    
    // Den Punkt zum aktuellen Strich hinzufügen
    current.p.push({x: e.offsetX, y: e.offsetY});
    
    // Neu rendern, damit wir den Strich beim Zeichnen sofort sehen
    App.render();
});

App.handlers.up.push(() => { 
    drawing = false; 
    current = null; // Sicherstellen, dass der Stift nach dem Loslassen "sauber" ist
});
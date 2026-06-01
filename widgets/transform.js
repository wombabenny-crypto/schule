// --- TRANSFORM.JS ---
window.App = window.App || {};
App.selectedGroup = App.selectedGroup || [];
App.isScalingGroup = false;

window.getGroupBounds = () => {
    if (App.selectedGroup.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    App.selectedGroup.forEach(obj => {
        if (obj.x !== undefined) {
            minX = Math.min(minX, obj.x); minY = Math.min(minY, obj.y);
            maxX = Math.max(maxX, obj.x + 100); maxY = Math.max(maxY, obj.y + 40);
        } else if (obj.p) {
            obj.p.forEach(pt => {
                minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
            });
        }
    });
    return { x: minX - 10, y: minY - 10, w: (maxX - minX) + 20, h: (maxY - minY) + 20 };
};

App.handlers.down.push((e) => {
    if (App.mode !== 'transform') return;
    const bounds = getGroupBounds();
    
    // Prüfen auf Anfasser
    if (bounds) {
        const hX = bounds.x + bounds.w, hY = bounds.y + bounds.h;
        if (Math.hypot(e.offsetX - hX, e.offsetY - hY) < 30) {
            App.isScalingGroup = true;
            App.initialGroupState = JSON.parse(JSON.stringify(App.selectedGroup));
            return;
        }
        // Wenn Klick IN der Gruppe, aber nicht Anfasser: Nicht löschen!
        if (e.offsetX >= bounds.x && e.offsetX <= bounds.x + bounds.w &&
            e.offsetY >= bounds.y && e.offsetY <= bounds.y + bounds.h) return;
    }

    // Nur bei Klick ins Leere neu auswählen
    App.selectedGroup = [];
    App.selectionBox = { x: e.offsetX, y: e.offsetY, w: 0, h: 0 };
});

App.handlers.move.push((e) => {
    if (App.mode !== 'transform') return;
    
    // 1. Skalieren
    if (App.isScalingGroup && App.initialGroupState) {
        const bounds = getGroupBounds();
        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;
        const dist = Math.hypot(e.offsetX - centerX, e.offsetY - centerY);
        const initDist = Math.hypot((bounds.x + bounds.w) - centerX, (bounds.y + bounds.h) - centerY);
        const factor = dist / initDist;
        
        App.selectedGroup.forEach((obj, i) => {
            const init = App.initialGroupState[i];
            if (obj.p) obj.p.forEach((pt, j) => { pt.x = centerX + (init.p[j].x - centerX) * factor; pt.y = centerY + (init.p[j].y - centerY) * factor; });
            else { obj.x = centerX + (init.x - centerX) * factor; obj.y = centerY + (init.y - centerY) * factor; }
        });
        App.render();
    } 
    // 2. Rechteck zeichnen
    else if (App.selectionBox) {
        App.selectionBox.w = e.offsetX - App.selectionBox.x;
        App.selectionBox.h = e.offsetY - App.selectionBox.y;
        App.render();
    }
});

App.handlers.up.push(() => {
    if (App.mode !== 'transform') return;
    if (App.selectionBox) {
        const b = { x: Math.min(App.selectionBox.x, App.selectionBox.x+App.selectionBox.w), y: Math.min(App.selectionBox.y, App.selectionBox.y+App.selectionBox.h), w: Math.abs(App.selectionBox.w), h: Math.abs(App.selectionBox.h) };
        App.selectedGroup = [...App.strokes, ...App.texts].filter(obj => {
            // Wir prüfen, ob das Objekt einen Text-Inhalt (v) hat. 
            // Wenn ja (Text), ignorieren wir es für die Selektion.
            if (obj.v !== undefined) return false;
			// Nur Striche (und später Bilder) werden zugelassen:
            if (obj.p) return obj.p.some(pt => pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h);
            
            // Falls du später Bilder einfügst, kannst du hier einfach "else if (obj.type === 'image')" ergänzen
            return false;
			
			
        });
    }
    App.selectionBox = null;
    App.isScalingGroup = false;
    App.render();
});
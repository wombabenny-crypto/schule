window.App = window.App || {}; 
window.App.handlers = window.App.handlers || { down: [], move: [], up: [] };
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const drawMultiLine = (text, x, y, defaultColor, cursorIndex = -1) => {
    // 1. Sicherstellen, dass 'text' ein Objekt ist
    const t = (typeof text === 'string') ? { v: text } : text;
    
    // 2. Styles
	// Nutze die Farbe aus den Settings, falls vorhanden
    const textColor = t.color || defaultColor;
	// --- HIER kommt dein Glanz-Code rein ---
    if (t.glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = textColor;
    } else {
        ctx.shadowBlur = 0;
    }
    const isBold = t.bold ? "bold " : "";
    const isItalic = t.italic ? "italic " : "";
    const size = t.fontSize || 30;
    
    ctx.font = `${isBold}${isItalic}${size}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";
	// FÜR FARBVERLÄUFE:
    if (textColor === 'gradient') {
        let grad = ctx.createLinearGradient(x, y, x + 200, y);
        grad.addColorStop(0, 'red');
        grad.addColorStop(0.5, 'blue');
        grad.addColorStop(1, 'green');
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = textColor;
    }
    // 3. Inhalt vorbereiten
    let content = t.v || ""; 
    if (cursorIndex >= 0) {
        content = content.slice(0, cursorIndex) + "|" + content.slice(cursorIndex);
    }

    const lines = content.split('\n');
    
    lines.forEach((line, i) => {
        const lineWidth = ctx.measureText(line).width;
        let drawX = x;
        if (t.align === 'center') drawX -= lineWidth / 2;
        if (t.align === 'right') drawX -= lineWidth;

        ctx.fillText(line, drawX, y + (i * size));

        if (t.underline) {
            ctx.beginPath();
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 2;
            ctx.moveTo(drawX, y + (i * size) + size); 
            ctx.lineTo(drawX + lineWidth, y + (i * size) + size);
            ctx.stroke();
        }
    });
};

// Berechnet, bei welchem Index der Cursor bei einem Klick ist
const getCursorIndexAtClick = (text, x, y, clickX, clickY) => {
    ctx.font = "bold 30px Arial";
    const lines = text.split('\n');
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineY = y + (i * 35);
        // Prüfen, ob der Klick vertikal in dieser Zeile ist
        if (clickY >= lineY - 25 && clickY <= lineY + 10) {
            // Jetzt finden wir das Zeichen in der Zeile
            for (let j = 0; j <= lines[i].length; j++) {
                const charWidth = ctx.measureText(lines[i].slice(0, j)).width;
                if (clickX <= x + charWidth + 5) return currentIndex + j;
            }
            return currentIndex + lines[i].length;
        }
        currentIndex += lines[i].length + 1; // +1 für den Zeilenumbruch
    }
    return text.length;
}

const App = {
    strokes: [],
    texts: [],
	images: [],
    history: [],
    mode: 'pen',
    tempText: "",
	currentTextSettings: {
		fontSize: 30,
		bold: false,
		italic: false,
		underline: false,
		align: 'left',
		color: '#000000',
		glow: false
	},	
    cursorIndex: 0,
    textPosition: null,
    selectedObject: null,
    dragOffset: { x: 0, y: 0 },
    penSettings: { color: '#000000', type: 'pen', glow: false, size: 2 },
    handlers: { down: [], move: [], up: [] },
    
    tools: {
        stift: { draw: (ctx, x, y, color) => { } },
        glitter: { draw: (ctx, x, y, color) => { } }
    },

    saveState: function() {
        this.history.push(JSON.stringify({ 
            strokes: JSON.parse(JSON.stringify(this.strokes)), 
            texts: JSON.parse(JSON.stringify(this.texts)), 
			images: JSON.parse(JSON.stringify(this.images))
        }));
        if (this.history.length > 30) this.history.shift();
    },
	
    finishText: function() {
        if (this.tempText.length > 0 && this.textPosition) {
            this.texts.push({
                v: this.tempText, 
                x: this.textPosition.x, 
                y: this.textPosition.y,
				// Hier speichern wir die aktuellen Einstellungen in den Text:
				fontSize: this.currentTextSettings.fontSize,
				bold: this.currentTextSettings.bold,
				italic: this.currentTextSettings.italic,
				underline: this.currentTextSettings.underline,
				align: this.currentTextSettings.align,
				color: this.currentTextSettings.color, 
				glow: this.currentTextSettings.glow     
            });
        }
        this.tempText = "";
        this.textPosition = null;
        this.cursorIndex = 0;
    },

    init: function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.render();
    },

    render: function(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
		//Bilder zuerst (HintergrundEbene)
		if (App.images) {
			App.images.forEach(img => {
				// Prüfe, ob 'img.src' existiert und nicht 'undefined' ist
				if (img.src && img.src !== 'undefined') {
					const imageObj = new Image();
					imageObj.src = img.src;
					// Nur zeichnen, wenn das Bild erfolgreich geladen werden konnte
					ctx.drawImage(imageObj, img.x, img.y, img.w, img.h);
					// Optional: Ein kleiner Rahmen, wenn es ausgewählt ist
					// Rahmen und Anfasser nur zeichnen, wenn das Bild ausgewählt ist
                if (App.selectedObject === img) {
                    // Gestrichelter Auswahlrahmen
                    ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.strokeRect(img.x - 2, img.y - 2, img.w + 4, img.h + 4);
                    ctx.setLineDash([]); // Zurücksetzen

                    // Runder Resize-Anfasser unten rechts
                    ctx.beginPath();
                    ctx.arc(img.x + img.w + 2, img.y + img.h + 2, 8, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = '#3498db';
                    ctx.stroke();
                }
				}
			});
		}
        // Standard-Strich-Zeichnung (ohne Schatten-Konfiguration pro Stroke)
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        this.strokes.forEach(stroke => {
            // Wenn der Modus 'move' ist, schalten wir Effekte beim Verschieben KOMPLETT aus
            // Das sorgt für flüssiges Verschieben!
            const isMoving = (App.mode === 'move' && App.selectedObject === stroke);

            if (!isMoving && stroke.glow) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = stroke.c;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.strokeStyle = stroke.c;
            ctx.lineWidth = stroke.size || 2;
            
            if (stroke.p && stroke.p.length > 0) {
                ctx.moveTo(stroke.p[0].x, stroke.p[0].y);
                stroke.p.forEach(pt => ctx.lineTo(pt.x, pt.y));
                ctx.stroke();
            }
        });

        // Schatten danach zurücksetzen
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        this.texts.forEach(text => {
			// Wir übergeben das gesamte Text-Objekt 'text' (inklusive .color und .glow)
			// Das 'text.color || "#000"' ist ein Fallback, falls ein alter Text noch keine Farbe hat
			drawMultiLine(text, text.x, text.y, text.color || "#000000");
		});

        if (App.mode === 'text-lasso' && typeof lassoPoints !== 'undefined' && lassoPoints.length > 0) {
            ctx.strokeStyle = '#9b59b6';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (App.mode === 'text-keyboard' && App.textPosition) {
            const pos = App.textPosition;
            const lines = (App.tempText + "|").split('\n');
            const padding = 10;
            let maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
            
            ctx.fillStyle = "#fff8ff";
            ctx.strokeStyle = "blue";
            
            drawMultiLine({
				v: App.tempText, 
				fontSize: App.currentTextSettings.fontSize,
				bold: App.currentTextSettings.bold,
				italic: App.currentTextSettings.italic,
				underline: App.currentTextSettings.underline,
				align: App.currentTextSettings.align,
				color: App.penSettings.color,  // <-- NEU: Farbe aus den Pen-Settings
				glow: App.penSettings.glow     // <-- NEU: Glanz aus den Pen-Settings
			}, pos.x, pos.y, "blue", App.cursorIndex);
        }
		// 1. Zeichne das Auswahl-Rechteck (während des Ziehens)
        if (App.mode === 'transform' && App.selectionBox) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(App.selectionBox.x, App.selectionBox.y, App.selectionBox.w, App.selectionBox.h);
            ctx.setLineDash([]);
        }

        // 2. Zeichne die Auswahl-Box um die Gruppe (nach dem Loslassen)
        if (App.mode === 'transform' && App.selectedGroup && App.selectedGroup.length > 0) {
            // Nutze window.getGroupBounds, falls es global definiert ist
            const bounds = (typeof window.getGroupBounds === 'function') ? window.getGroupBounds() : null;
            
            if (bounds) {
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                
                // Anfasser (Quadrat) unten rechts für die Skalierung
                ctx.fillStyle = '#3498db';
                ctx.fillRect(bounds.x + bounds.w - 5, bounds.y + bounds.h - 5, 10, 10);
            }
        }
		
		// Zeichne einen Radierer-Cursor, wenn der Modus 'eraser-normal' ist
		if (App.mode === 'eraser-normal' && App.mousePos) {
			ctx.beginPath();
			ctx.arc(App.mousePos.x, App.mousePos.y, 10, 0, Math.PI * 2); // 10px Radius
			ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		
    }
};

// Funktion zum Ein-/Ausklappen
function toggleTextMenu() {
    const menu = document.getElementById('text-menu');
    menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'flex' : 'none';
}
 
//Lösch Funktionalität
function clearAll() {
    App.strokes = [];
    App.texts = [];
    App.images = [];
    App.selectedObject = null;
    App.render();
}
// Funktion zum Ändern der Stile
function updateStyle(prop, value) {
    if (prop === 'align') {
        App.currentTextSettings.align = value;
    } else {
        // Toggle (an/aus) bei F, K, U
        App.currentTextSettings[prop] = !App.currentTextSettings[prop];
    }
	// Optische Rückmeldung: Buttons hervorheben
    const buttons = document.querySelectorAll('#text-menu button');
    // Hier könntest du eine Klasse 'active' hinzufügen, 
    // um die Buttons blau einzufärben, wenn sie aktiv sind.
    buttons.forEach(btn => {
        // Logik: Prüfe ob die Eigenschaft in App.currentTextSettings true ist
        // (Das ist eine Vereinfachung, müsste bei Align etwas komplexer sein)
    });
	App.render();
}
function updateTextMenuVisibility() {
    const menu = document.getElementById('text-menu');
    if (menu) { // Sicherheitsabfrage, falls das Div mal fehlt
        if (App.mode === 'text-keyboard') {
            menu.style.display = 'flex';
        } else {
            menu.style.display = 'none';
        }
    }
}
function updateTextSettings(colorValue) {
    App.currentTextSettings.color = colorValue;
    App.currentTextSettings.glow = (colorValue !== "#000000"); // Beispiel-Logik
    App.render();
}

App.handlers.down.push((e) => {
    // 1. Text-Keyboard Modus
    if (App.mode === 'text-keyboard') {
        const input = document.getElementById('hidden-input');
        if(input) input.focus();
        if (App.textPosition) {
            const dx = e.offsetX - App.textPosition.x;
            const dy = e.offsetY - App.textPosition.y;
            if (dy > -30 && dy < (App.tempText.split('\n').length * 35)) {
                App.cursorIndex = getCursorIndexAtClick(App.tempText, App.textPosition.x, App.textPosition.y, e.offsetX, e.offsetY);
                App.render();
                return;
            }
        }
        const foundIndex = App.texts.findIndex(t => Math.hypot(t.x - e.offsetX, t.y - e.offsetY) < 50);
        if (foundIndex !== -1) {
            App.finishText();
            const found = App.texts.splice(foundIndex, 1)[0];
            App.tempText = found.v;
            App.textPosition = { x: found.x, y: found.y };
            App.cursorIndex = found.v.length;
            App.currentTextSettings = {
                fontSize: found.fontSize || 30,
                bold: found.bold || false,
                italic: found.italic || false,
                underline: found.underline || false,
                align: found.align || 'left',
                color: found.color || '#000000',
                glow: found.glow || false
            };
            App.render();
        } else {
            App.finishText();
            App.textPosition = { x: e.offsetX, y: e.offsetY };
            App.tempText = "";
            App.cursorIndex = 0;
            App.currentTextSettings = {
                fontSize: 30,
                bold: false,
                italic: false,
                underline: false,
                align: 'left',
                color: App.penSettings.color,
                glow: App.penSettings.glow
            };
        }
        App.render();
        return;
    }

	if (App.mode === 'move' || App.mode === 'transform') {
    // 1. Zuerst prüfen: Klicke ich auf das bereits ausgewählte Objekt?
    // (Damit wir es ziehen können, ohne dass es durch "neue Suche" verloren geht)
    let found = null;
    
    // Prüfen, ob wir auf den Anfasser oder das Bild selbst klicken
    if (App.selectedObject) {
        const s = App.selectedObject;
        // Ist der Klick innerhalb des Bildes oder auf dem Resize-Anfasser?
        const isInside = (s.src && e.offsetX >= s.x && e.offsetX <= s.x + s.w && e.offsetY >= s.y && e.offsetY <= s.y + s.h);
        
        // Wenn ja, behalten wir es als "found"
        if (isInside) found = s;
    }

    // 2. Wenn wir nichts (oder nicht auf das alte) geklickt haben, suchen wir neu
    if (!found) {
        found = [...App.images, ...App.texts, ...App.strokes].reverse().find(s => {
            if (s.src !== undefined) return Math.hypot(s.x + s.w/2 - e.offsetX, s.y + s.h/2 - e.offsetY) < 100;
            if (s.v !== undefined) return Math.hypot(s.x - e.offsetX, s.y - e.offsetY) < 50;
            if (s.p) return s.p.some(pt => Math.hypot(pt.x - e.offsetX, pt.y - e.offsetY) < 30);
            return false;
        });
    }

    // 3. Aktion ausführen
    if (found) {
		App.saveState();
        App.selectedObject = found;
        App.dragOffset = { 
            x: e.offsetX - (found.x || (found.p ? found.p[0].x : 0)), 
            y: e.offsetY - (found.y || (found.p ? found.p[0].y : 0)) 
        };
        
        // Resize-Logik
        if (App.mode === 'transform' && found.src !== undefined) {
            const distToCorner = Math.hypot((found.x + found.w) - e.offsetX, (found.y + found.h) - e.offsetY);
            if (distToCorner < 40) {
                App.isResizing = true;
                return; // WICHTIG: Hier stoppen
            }
        }
    } else {
        // Leerer Klick: Alles abwählen
        App.selectedObject = null;
        App.isResizing = false;
    }
    App.render();
}
});


App.handlers.move.push((e) => {
    // Wenn die linke Maustaste NICHT gedrückt ist, soll nichts bewegt werden
    if (e.buttons !== 1) {
        App.isResizing = false; // Sicherheit: Resize beenden
        return; 
    }
	// --- NEU: SKALIERUNGS-LOGIK ---
    if (App.mode === 'transform' && App.isResizing && App.selectedObject && App.selectedObject.src !== undefined) {
        // Berechne neue Breite/Höhe basierend auf Mausposition
        App.selectedObject.w = Math.max(20, e.offsetX - App.selectedObject.x);
        App.selectedObject.h = Math.max(20, e.offsetY - App.selectedObject.y);
        App.render();
        return; // Wir skalieren, also nicht mehr verschieben
    }
	
	if (App.mode === 'move' && App.selectedObject) {
		if (App.selectedObject.src !== undefined) {
			// Bild verschieben
			App.selectedObject.x = e.offsetX - App.dragOffset.x;
			App.selectedObject.y = e.offsetY - App.dragOffset.y;
		} else if (App.selectedObject.p) {
			// Striche verschieben
            const dx = e.offsetX - App.dragOffset.x - App.selectedObject.p[0].x;
            const dy = e.offsetY - App.dragOffset.y - App.selectedObject.p[0].y;
            App.selectedObject.p.forEach(pt => { pt.x += dx; pt.y += dy; });
            App.dragOffset.x += dx;
            App.dragOffset.y += dy;
        } else {
			// Text verschieben
            App.selectedObject.x = e.offsetX - App.dragOffset.x;
            App.selectedObject.y = e.offsetY - App.dragOffset.y;
        }
        App.render();
    }
	// 2. NEU: Echter Radierer (löscht Punkte aus Strichen und Textobjekte)
    // Wir prüfen 'e.buttons === 1', damit er nur radiert, wenn die Maustaste gedrückt ist!
    // Falls der Radierer aktiv ist und die Maustaste gedrückt wird
    if (App.mode === 'eraser-normal' && e.buttons === 1) {
        const r = eraserSize;
	App.images = App.images.filter(img => 
    Math.hypot((img.x + img.w/2) - e.offsetX, (img.y + img.h/2) - e.offsetY) > eraserSize
	);
    let newStrokes = [];

    App.strokes.forEach(s => {
        let currentSegment = [];
        s.p.forEach(pt => {
            const dist = Math.sqrt(Math.pow(pt.x - e.offsetX, 2) + Math.pow(pt.y - e.offsetY, 2));
            
            if (dist > r) {
                // Punkt ist außerhalb: gehört zum aktuellen Segment
                currentSegment.push(pt);
            } else {
                // Punkt ist im Radierer: Strich wird hier unterbrochen
                if (currentSegment.length > 0) {
                    newStrokes.push({ ...s, p: currentSegment });
                    currentSegment = [];
                }
            }
        });
        // Restliches Segment hinzufügen
        if (currentSegment.length > 0) {
            newStrokes.push({ ...s, p: currentSegment });
        }
    });

    App.strokes = newStrokes;
    
    // Texte löschen
    App.texts = App.texts.filter(t => Math.sqrt(Math.pow(t.x - e.offsetX, 2) + Math.pow(t.y - e.offsetY, 2)) > r + 10);
    
    App.render();
    }
});

App.handlers.up.push(() => { 
	//App.selectedObject = null; 
	App.isResizing = false;
	App.images.forEach(img => img.isDragging = false);
});

canvas.onpointerdown = (e) => App.handlers.down.forEach(fn => fn(e));
canvas.onpointermove = (e) => App.handlers.move.forEach(fn => fn(e));
canvas.onpointerup = () => App.handlers.up.forEach(fn => fn());

window.addEventListener('keydown', (e) => {
    // 1. ESC-Taste: Modus auf 'pen' zurücksetzen und Aktionen abbrechen
    if (e.key === 'Escape') {
        e.preventDefault();
        
        // Den Modus auf 'pen' setzen (oder was auch immer dein Standard ist)
        window.setMode('pen');
        
        // Optional: Falls du gerade ein Auswahl-Rechteck ziehst, abbrechen
        App.selectionBox = null;
        
        // Optional: Falls du gerade ein Objekt verschiebst, loslassen
        App.selectedObject = null;
        
        // Optional: Falls Text markiert oder im Bearbeitungsmodus
        if (App.mode === 'text-keyboard') App.finishText();
        
        App.render();
        console.log("Aktion abgebrochen, Modus: Pen");
        return;
    }
	if (App.mode !== 'text-lasso' && App.mode !== 'text-keyboard') return;
    if (["Alt", "Control", "Shift", "Meta"].includes(e.key)) return;
    e.preventDefault();

    if (e.key === 'Enter' && e.ctrlKey) {
        App.finishText();
        window.setMode('pen');
    } else if (e.key === 'Enter') {
        App.tempText = App.tempText.slice(0, App.cursorIndex) + "\n" + App.tempText.slice(App.cursorIndex);
        App.cursorIndex++;
    } else if (e.key === 'Backspace') {
        if (App.cursorIndex > 0) {
            App.tempText = App.tempText.slice(0, App.cursorIndex - 1) + App.tempText.slice(App.cursorIndex);
            App.cursorIndex--;
        }
    } else if (e.key === 'ArrowLeft') {
        if (App.cursorIndex > 0) App.cursorIndex--;
    } else if (e.key === 'ArrowRight') {
        if (App.cursorIndex < App.tempText.length) App.cursorIndex++;
    } else if (e.key.length === 1) {
        App.tempText = App.tempText.slice(0, App.cursorIndex) + e.key + App.tempText.slice(App.cursorIndex);
        App.cursorIndex++;
    } else if (e.key === 'ArrowUp') {
        const prevNewline = App.tempText.lastIndexOf('\n', App.cursorIndex - 1);
        if (prevNewline !== -1) {
            App.cursorIndex = Math.min(prevNewline, App.cursorIndex - 1);
        }
    } else if (e.key === 'ArrowDown') {
        // Sicherstellen, dass App.tempText existiert
		if (App.tempText !== undefined) {
			const nextNewline = App.tempText.indexOf('\n', App.cursorIndex);
			if (nextNewline !== -1) {
				App.cursorIndex = Math.min(nextNewline + 1, App.tempText.length);
			}
		}
    }
    
    App.render();
});

window.addEventListener('resize', () => App.init());

window.setMode = (mode) => {
    // 1. Speichern, falls wir Text bearbeiten
    if (App.mode === 'text-keyboard') App.finishText();
    
    // 2. Modus setzen & Basics aufräumen
    App.mode = mode;
    App.selectedObject = null;
    App.selectedGroup = [];
    App.selectionBox = null;
    
    // 3. UI-Elemente referenzieren
    const penBar = document.getElementById('pen-settings-bar'); // Der neue Pill-Container
    const eraserSlider = document.getElementById('eraser-size');
    const eraserBtn = document.getElementById('eraser-btn');
    const textMenu = document.getElementById('text-menu');

    // --- LOGIK: Menüs ein-/ausblenden ---
    
    // Stift-Menü (Pill-Bar) anzeigen, wenn Pen oder Glitter aktiv
    const isPen = (mode === 'pen' || mode === 'glitter');
    penBar.style.display = isPen ? 'flex' : 'none';
    
    // Radierer-Slider (einfach eingeblendet, falls Modus aktiv)
    const isEraser = (mode === 'eraser-normal');
    eraserSlider.style.display = isEraser ? 'block' : 'none';
    
    // Text-Menü (Pill-Bar)
    textMenu.style.display = (mode === 'text-keyboard') ? 'flex' : 'none';
    
    // 4. Button-Highlights bereinigen
    document.querySelectorAll('.t-btn').forEach(btn => {
        btn.style.border = '1px solid #eee';
        btn.style.backgroundColor = '#f9f9f9';
    });

    // Aktiven Button hervorheben
    // Für Radierer und Pen/Glitter/Keyboard die IDs abgleichen
    const activeBtn = document.getElementById('btn-' + mode);
    if (activeBtn) {
        activeBtn.style.border = '3px solid #3498db';
        activeBtn.style.backgroundColor = '#ebf5fb';
    } else if (isEraser) {
        eraserBtn.style.border = '3px solid #3498db';
        eraserBtn.style.backgroundColor = '#ebf5fb';
    }

    // 5. Fokus für Tastatur
    if (mode === 'text-keyboard') {
        document.getElementById('hidden-input').focus();
    } else {
        document.activeElement.blur();
    }

    App.render();
};

App.init();

document.addEventListener('DOMContentLoaded', () => {
    const uploadInput = document.getElementById('image-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', window.handleImageUpload);
    }
});
// Nach dem App.init() Aufruf:
// Einmalig beim Laden prüfen, ob das Overlay zum aktuellen Modus passt
window.addEventListener('load', () => {
    window.setMode(App.mode); 
});
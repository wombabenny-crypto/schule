window.App = window.App || {}; 
window.App.handlers = window.App.handlers || { down: [], move: [], up: [] };
let clickCount = 0;
let clickTimer = null;

let eraserSize = 20;

function handleEraserClick() {
    const btn = document.getElementById('eraser-btn');
    const slider = document.getElementById('eraser-size');
	
	// Radierer-Modus aktivieren
    window.setMode('eraser-normal');
	
    // Alle Buttons von der Markierung befreien (optional)
    document.querySelectorAll('.t-btn').forEach(b => b.style.border = "none");
    btn.style.border = "2px solid #3498db";
    btn.style.borderRadius = "8px";
	
	// Slider einblenden
    slider.style.display = 'block';
	
    // Radierer aktivieren
    window.setMode('eraser-normal');
    
    // Optische Markierung: Button blau umranden
    btn.style.border = "2px solid #3498db";
    btn.style.borderRadius = "8px";
}

function updateEraserSize(val) {
    eraserSize = parseInt(val);
}
App.handlers.up.push(() => {
    if (App.mode === 'eraser-lasso') {
        // Lösche alle Objekte, die das Lasso berührt hat
        App.strokes = App.strokes.filter(s => !isObjectHitByLasso(s));
        App.texts = App.texts.filter(t => !isObjectHitByLasso(t));
		App.images = App.images.filter(img => 
		Math.sqrt(Math.pow((img.x + img.w/2) - e.offsetX, 2) + Math.pow((img.y + img.h/2) - e.offsetY, 2)) > r + 20
		);
        App.render();
    }
});
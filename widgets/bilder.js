window.App = window.App || {}; 
window.App.handlers = window.App.handlers || { down: [], move: [], up: [] };
window.handleImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

	// Sicherstellen, dass das Array existiert
    if (!App.images) {
        App.images = [];
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Definiere eine maximale Breite/Höhe, z.B. 200 Pixel
			const MAX_SIZE = 200;
			let width = img.width;
			let height = img.height;
			
			// Falls das Bild zu groß ist, skalieren wir es proportional
			if (width > MAX_SIZE || height > MAX_SIZE) {
				const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
				width *= ratio;
				height *= ratio;
			}
	
			// Bild in das App-Objekt einfügen
            App.images.push({
                x: 50, 
                y: 50, 
                w: width, 
                h: height, 
                src: e.target.result,
				
            });
            App.render();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};
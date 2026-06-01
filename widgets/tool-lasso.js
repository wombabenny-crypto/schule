let lassoPoints = [];

// Stift-Handler ignorieren, wenn Lasso aktiv ist
App.handlers.down.push((e) => {
    if (App.mode !== 'text-lasso') return;
    document.getElementById('pop').style.display = 'none';
    lassoPoints = [{x: e.offsetX, y: e.offsetY}];
});

App.handlers.move.push((e) => {
    if (App.mode !== 'text-lasso' || lassoPoints.length === 0) return;
    lassoPoints.push({x: e.offsetX, y: e.offsetY});
    App.render(); // Zeichnet das Canvas neu
    
    // Lasso-Linie kurzzeitig visualisieren
    ctx.strokeStyle = '#9b59b6';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
});

App.handlers.up.push(async () => {
    if (App.mode !== 'text-lasso' || lassoPoints.length < 5) { lassoPoints = []; App.render(); return; }
    
    const minX = Math.min(...lassoPoints.map(p => p.x)), maxX = Math.max(...lassoPoints.map(p => p.x));
    const minY = Math.min(...lassoPoints.map(p => p.y)), maxY = Math.max(...lassoPoints.map(p => p.y));
    
    // Suche alle Striche, deren Punkte innerhalb der Lasso-Box liegen
    const targets = App.strokes.filter(s => s.p.some(pt => pt.x > minX && pt.x < maxX && pt.y > minY && pt.y < maxY));
    
    if (targets.length > 0) {
        const ink = targets.map(s => [s.p.map(p => Math.round(p.x)), s.p.map(p => Math.round(p.y)), s.p.map((_, i) => i * 15)]);
        const res = await fetch('https://www.google.com/inputtools/request?ime=handwriting&app=autodraw&cs=1&oe=utf-8', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({requests: [{ink: ink, language: "de"}]})
        });
        const data = await res.json();
        if(data[0] === 'SUCCESS') {
            const pop = document.getElementById('pop');
            pop.innerHTML = ''; pop.style.display = 'flex';
            pop.style.left = (minX + 20) + "px"; pop.style.top = (minY + 20) + "px";
            data[1][0][1].slice(0, 3).forEach(w => {
                const d = document.createElement('div'); d.innerText = w; d.className = 'opt';
                d.onclick = () => { 
                    App.saveState(); 
                    App.strokes = App.strokes.filter(s => !targets.includes(s)); 
                    App.texts.push({v: w, x: minX, y: minY + 30}); 
                    pop.style.display = 'none'; 
                    App.render(); 
                };
                pop.appendChild(d);
            });
        }
    }
    lassoPoints = []; 
    App.render();
});
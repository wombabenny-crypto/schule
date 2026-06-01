// tool-undo.js
document.getElementById('bUndo').onclick = () => {
    if (App.history.length > 0) {
        const lastState = JSON.parse(App.history.pop());
        App.strokes = lastState.strokes;
        App.texts = lastState.texts;
		App.images = lastState.images || [];
        App.render();
    }
};
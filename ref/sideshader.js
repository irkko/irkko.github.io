(() => {

/* -------------------------------
   Side Shader - Independent Canvas
---------------------------------*/


const ctx = sideCanvas.getContext('2d');

let cellSize = 18; // fallback, can be dynamically set
let gridCols, gridRows;
let allCells = [];

let spawnStartTime = 0;
    const SPAWN_DURATION = 2500; // ramp-up effect


/* -------------------------------
   Zone Definitions
---------------------------------*/
const SideZone = {
    name: 'side',
    fadeDuration: 5000,
    minFill: 1000,
    maxFill: 3000,
    activeRatio: 0.10,
    color1Var: '--bg-cell-color',
    color2Var: '--bg-extra',
};

/* -------------------------------
   Square Sizes
---------------------------------*/
const SQUARE_SIZES = [
    { size: 1, weight: 0.4 },
    { size: 2, weight: 0.3 },
    { size: 3, weight: 0.2 },
    { size: 4, weight: 0.1 },
    { size: 5, weight: 0.1 },
];

    function getSideColCount(gridCols) {
        if (window.innerWidth >= 1024) return Math.floor(gridCols * 0.18);
        if (window.innerWidth >= 768) return Math.floor(gridCols * 0.12);
        if (window.innerWidth >= 500) return Math.floor(gridCols * 0.08);
        return Math.max(1, Math.floor(gridCols * 0.05));
    }

function pickSquareSize() {
    const r = Math.random();
    let acc = 0;
    for (const s of SQUARE_SIZES) {
        acc += s.weight;
        if (r <= acc) return s.size;
    }
    return 1;
}
    function getSquareCells(anchor, size) {
        const cells = [];

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const row = anchor.row + dy;
                const col = anchor.col + dx;

                const cell = allCells.find(c => c.row === row && c.col === col);
                if (cell) cells.push(cell);
            }
        }

        return cells;
    }


/* -------------------------------
   Cell Class
---------------------------------*/
class Cell {
    constructor(row, col, zone) {
        this.row = row;
        this.col = col;
        this.zone = zone;
        this.x = col * cellSize;
        this.y = row * cellSize;
        this.colorMix = 0;
        this.targetColorMix = 0;
        this.isActive = false;
        this.fadeStartTime = 0;
        this.fillEndTime = 0;
    }

    startInversion() {
        this.isActive = true;
        this.targetColorMix = 1;
        this.fadeStartTime = Date.now();

        const duration =
            this.zone.minFill +
            Math.random() * (this.zone.maxFill - this.zone.minFill);

        const size = 1; // all squares same for simplicity
        const sizeFactor = 1 + size * 0.15;
        this.fillEndTime = Date.now() + this.zone.fadeDuration + duration * sizeFactor;
    }

    update() {
        if (!this.isActive) return;
        const now = Date.now();
        const fade = this.zone.fadeDuration;

        // Fade to color2
        if (this.targetColorMix === 1 && this.colorMix < 1) {
            const elapsed = now - this.fadeStartTime;
            this.colorMix = Math.min(elapsed / fade, 1);
        }

        // Hold at color2
        if (this.colorMix === 1 && now >= this.fillEndTime && this.targetColorMix === 1) {
            this.targetColorMix = 0;
            this.fadeStartTime = now;
        }

        // Fade back
        if (this.targetColorMix === 0 && this.colorMix > 0) {
            const elapsed = now - this.fadeStartTime;
            this.colorMix = Math.max(1 - elapsed / fade, 0);
            if (this.colorMix === 0) this.isActive = false;
        }
    }

    draw() {
        const root = getComputedStyle(document.documentElement);
        const raw1 = root.getPropertyValue(this.zone.color1Var).trim();
        const raw2 = root.getPropertyValue(this.zone.color2Var).trim();

        const c1 = parseColor(raw1);
        const c2 = parseColor(raw2);

        const t = this.colorMix;

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        const a = c1.a + (c2.a - c1.a) * t;

        if (c1.a <= 0.001 && c2.a <= 0.001) return;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fillRect(this.x, this.y, cellSize, cellSize);
    }
}

/* -------------------------------
   Color Parser
---------------------------------*/
function parseColor(color) {
    if (!color || color === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    if (color.startsWith('#')) {
        let hex = color.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 1 };
    }

    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] ? parseFloat(match[4]) : 1 };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
}

/* -------------------------------
   Grid Init
---------------------------------*/
function initSideGrid() {
    allCells = [];
    gridCols = Math.ceil(sideCanvas.width / cellSize);
    gridRows = Math.ceil(sideCanvas.height / cellSize);

    const sideColCount = getSideColCount(gridCols);

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const inLeft = col < sideColCount;
            const inRight = col >= gridCols - sideColCount;

            if (!inLeft && !inRight) continue; // skip center

            const cell = new Cell(row, col, SideZone);
            allCells.push(cell);
        }
    }

    spawnStartTime = Date.now();

}

/* -------------------------------
   Activation
---------------------------------*/
    function activateSideCells(count) {
        const candidates = allCells.filter(c => !c.isActive);
        let spawned = 0;

        while (spawned < count && candidates.length > 0) {
            const index = Math.floor(Math.random() * candidates.length);
            const anchor = candidates.splice(index, 1)[0];

            if (anchor.isActive) continue;

            const size = pickSquareSize();
            const square = getSquareCells(anchor, size);

            if (square.length === 0) continue;

            square.forEach(cell => {
                cell.size = size; // important for duration scaling
                cell.startInversion();
            });

            spawned++;
        }
    }


/* -------------------------------
   Draw & Animate
---------------------------------*/
    function drawSideGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        allCells.forEach(c => c.update());
        allCells.forEach(c => c.draw());

        maintainSideDensity();
    }


function animateSide() {
    drawSideGrid();
    requestAnimationFrame(animateSide);
    }


    function maintainSideDensity() {
        const now = Date.now();

        const elapsed = now - spawnStartTime;
        const rampRatio = Math.min(elapsed / SPAWN_DURATION, 1);

        const active = allCells.filter(c => c.isActive).length;
        const targetActive = Math.floor(
            allCells.length * SideZone.activeRatio * rampRatio
        );

        const deficit = targetActive - active;

        if (deficit > 0) {
            activateSideCells(deficit);
        }
    }

/* -------------------------------
   Resize
---------------------------------*/
function resizeSideCanvas() {
    layoutVars = getLayoutVars(); // reuse your layoutVars getter
    sideCanvas.width = window.innerWidth;
    sideCanvas.height = window.innerHeight;
    initSideGrid();
}

window.addEventListener('resize', resizeSideCanvas);
resizeSideCanvas();
    animateSide();


    console.log(
        'gridCols:',
        gridCols,
        'sideWidthPercent:',
        layoutVars.sideWidthPercent,
        'computed sideColCount:',
        Math.floor(layoutVars.sideWidthPercent * gridCols)
    );
}) ();
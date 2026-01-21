/* -------------------------------
   Shader: Header + Sides (Color Blinking)
---------------------------------*/

const canvas = document.getElementById('shaderCanvas');
const ctx = canvas.getContext('2d');

let cellSize = window.layout.cellSize;
let gridCols, gridRows;
let allCells = [];

let spawnStartTime = 0;
const SPAWN_DURATION = 5000; // 5 seconds


/* -------------------------------
   Layout
---------------------------------*/
let layoutVars = getLayoutVars();
let sideColCount = 0;

/* -------------------------------
   Zone Definitions
---------------------------------*/
const HeaderZone = {
    name: 'header',
    fadeDuration: 2000,
    minFill: 2000,
    maxFill: 5000,
    activeRatio: 0.10,
    color1Var: '--header-cell-color',
    color2Var: '--header-extra',
    /*zIndex: 1, // Draw order */
};

const SideZone = {
    name: 'side',
    fadeDuration: 2000,
    minFill: 500,
    maxFill: 1500,
    activeRatio: 0.10,
    color1Var: '--sides-cell-color',
    color2Var: '--sides-extra',
    /* zIndex: 2, // Draw order   */
};

const SQUARE_SIZES = [
    { size: 1, weight: 0.45 },
    { size: 2, weight: 0.35 },
    { size: 3, weight: 0.15 },
    { size: 4, weight: 0.05 },
];


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

            if (row < 0 || row >= gridRows) continue;
            if (col < 0 || col >= gridCols) continue;

            const cell = allCells[row * gridCols + col];
            if (cell) cells.push(cell);
        }
    }
    return cells;
}


/* -------------------------------
   Cell
---------------------------------*/
class Cell {
    constructor(row, col, zone) {
        this.row = row;
        this.col = col;
        this.zone = zone;
        this.x = col * cellSize;
        this.y = row * cellSize;
        this.colorMix = 0; // 0 = color1, 1 = color2
        this.targetColorMix = 0;
        this.isActive = false;
        this.fadeStartTime = 0;
        this.fillEndTime = 0;


    }



    startInversion() {
        if (!this.isRoot) return;

        this.isActive = true;
        this.targetColorMix = 1;
        this.fadeStartTime = Date.now();

        const startTime = this.fadeStartTime;

        const duration =
            this.zone.minFill +
            Math.random() * (this.zone.maxFill - this.zone.minFill);

        const size = this.size || 1; // fallback safety

        // ⬇️ PASTE STARTS HERE
        const sizeFactor = 1 + size * 0.15;
        this.fillEndTime =
            startTime + this.zone.fadeDuration + duration * sizeFactor;
        // ⬆️ PASTE ENDS HERE
    }


    update() {
        if (!this.zone || !this.isActive) return;

        const now = Date.now();
        const fade = this.zone.fadeDuration;

        // Fade to color2
        if (this.targetColorMix === 1 && this.colorMix < 1) {
            const elapsed = now - this.fadeStartTime;
            this.colorMix = Math.min(elapsed / fade, 1);
        }

        // Hold at color2, then switch target
        if (this.colorMix === 1 && now >= this.fillEndTime && this.targetColorMix === 1) {
            this.targetColorMix = 0;
            this.fadeStartTime = now;
        }

        // Fade back to color1
        if (this.targetColorMix === 0 && this.colorMix > 0) {
            const elapsed = now - this.fadeStartTime;
            this.colorMix = Math.max(1 - elapsed / fade, 0);

            // Deactivate when back to color1
            if (this.colorMix === 0) {
                this.isActive = false;
            }
        }
    }

    draw() {
        if (!this.zone) return;

        const root = getComputedStyle(document.documentElement);

        const raw1 = root.getPropertyValue(this.zone.color1Var).trim();
        const raw2 = root.getPropertyValue(this.zone.color2Var).trim();

        // Parse colors (fallback = transparent)
        const c1 = parseColor(raw1) || { r: 0, g: 0, b: 0, a: 0 };
        const c2 = parseColor(raw2) || { r: 0, g: 0, b: 0, a: 0 };

        const t = this.colorMix; // 0 → color1, 1 → color2

        // Use color1 alpha as-is, don’t force 0 for inactive
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        const a = c1.a + (c2.a - c1.a) * t;

        // Only skip fully transparent if BOTH colors are fully transparent
        if (c1.a <= 0.001 && c2.a <= 0.001) return;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fillRect(this.x, this.y, cellSize, cellSize);

    }

}

/* -------------------------------
   Color Utilities
---------------------------------*/
function parseColor(color) {
    if (!color || color === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    // Hex color
    if (color.startsWith('#')) {
        let hex = color.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255,
            a: 1
        };
    }

    // RGB/RGBA
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
        };
    }

    return null;
}

/* -------------------------------
   Zone Assignment
---------------------------------*/
function getZoneForCell(row, col) {
    if (row < layoutVars.headerRows) {
        return HeaderZone;
    }
    const inLeft = col < sideColCount;
    const inRight = col >= gridCols - sideColCount;
    if (inLeft || inRight) {
        return SideZone;
    }
    return null;
}

/* -------------------------------
   Grid Init
---------------------------------*/
function initGrid() {
    allCells = [];
    gridCols = Math.ceil(canvas.width / cellSize);
    gridRows = Math.ceil(canvas.height / cellSize);

    sideColCount = Math.floor(layoutVars.sideWidthPercent * gridCols);

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const zone = getZoneForCell(row, col);
            const cell = new Cell(row, col, zone);

            // start all inactive
            cell.colorMix = 0;
            cell.targetColorMix = 0;
            cell.isActive = false;

            allCells.push(cell);
        }
    }

    HeaderZone.cells = allCells.filter(c => c.zone === HeaderZone);
    SideZone.cells = allCells.filter(c => c.zone === SideZone);

    HeaderZone.targetActive = Math.floor(HeaderZone.cells.length * HeaderZone.activeRatio);
    SideZone.targetActive = Math.floor(SideZone.cells.length * SideZone.activeRatio);

    // 👇 Reset spawn timer
    spawnStartTime = Date.now();

    maintainZoneDensity(HeaderZone);
    maintainZoneDensity(SideZone);
}


/* -------------------------------
   Activation
---------------------------------*/
function activateZone(zone, count) {
    const candidates = zone.cells.filter(c => !c.isActive);

    let spawned = 0;

    while (spawned < count && candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        const anchor = candidates.splice(index, 1)[0];

        if (anchor.isActive) continue;

        const size = pickSquareSize();
        const square = getSquareCells(anchor, size);

        // Allow spawn if AT LEAST ONE cell is in the zone
        if (!square.some(c => c.zone === zone)) continue;

        const startTime = Date.now();
        const duration =
            zone.minFill + Math.random() * (zone.maxFill - zone.minFill);

        square.forEach(cell => {
            //  FORCE zone inheritance so it renders
            cell.zone = zone;

            cell.isActive = true;
            cell.targetColorMix = 1;
            cell.fadeStartTime = startTime;
            cell.fillEndTime = startTime + zone.fadeDuration + duration;
        });

        spawned++;
    }
}


/* -------------------------------
   Draw & Animate
---------------------------------*/
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update all cells
    allCells.forEach(c => c.update());

    // Draw by z-index order
    const zones = [HeaderZone, SideZone].sort((a, b) => a.zIndex - b.zIndex);
    allCells.forEach(c => c.draw());

    maintainZoneDensity(HeaderZone);
    maintainZoneDensity(SideZone);
}

function maintainZoneDensity(zone) {
    const active = zone.cells.filter(c => c.isActive).length;
    const now = Date.now();

    const elapsed = now - spawnStartTime;
    const rampRatio = Math.min(elapsed / SPAWN_DURATION, 1);

    const target = Math.floor(zone.targetActive * rampRatio);
    const deficit = target - active;

    if (deficit > 0) {
        activateZone(zone, deficit);
    }
}


function animate() {
    drawGrid();
    requestAnimationFrame(animate);
}

/* -------------------------------
   Resize
---------------------------------*/
function resizeCanvas() {
    layoutVars = getLayoutVars();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initGrid();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animate();
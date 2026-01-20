/* -------------------------------
   Shader for header & sides
---------------------------------*/

const canvas = document.getElementById('shaderCanvas');
const ctx = canvas.getContext('2d');

// let cellSize = 24;

let cellSize = window.layout.cellSize; // always 24



let gridCols, gridRows;
let allCells = [];
let largeSquares = [];

// Shader parameters (tweakable)
const FADE_DURATION = 200;
const MIN_FILL_DURATION = 2000;
const MAX_FILL_DURATION = 5000;
const MIN_ACTIVE_CELLS = 40;
const MAX_ACTIVE_CELLS = 50;
const TOP_BG_RATIO = 0.05;      // % background allowed in top rows
const SQUARE_2x2_CHANCE = 0.3;
const SQUARE_3x3_CHANCE = 0.2;
const SQUARE_4x4_CHANCE = 0.1;

// Layout vars from layout.js
let layoutVars = getLayoutVars();
let topZoneRowCount = 0;
let sideColCount = 0;
let centerStartCol = 0;
let centerEndCol = 0;

/* -------------------------------
   Cell Class
---------------------------------*/
class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.x = col * cellSize;
        this.y = row * cellSize;
        this.alpha = 0;
        this.targetAlpha = 0;
        this.isActive = false;
        this.fadeStartTime = 0;
        this.fillEndTime = 0;
    }

    startInversion() {
        this.isActive = true;
        this.targetAlpha = this.alpha > 0.5 ? 0 : 1;
        this.fadeStartTime = Date.now();
        const duration = MIN_FILL_DURATION + Math.random() * (MAX_FILL_DURATION - MIN_FILL_DURATION);
        this.fillEndTime = this.fadeStartTime + FADE_DURATION + duration;
    }

    update() {
        const now = Date.now();
        if (this.targetAlpha === 1 && this.alpha < 1) {
            this.alpha = Math.min(1, (now - this.fadeStartTime) / FADE_DURATION);
        }
        if (this.isActive && now >= this.fillEndTime && this.alpha === this.targetAlpha) {
            this.targetAlpha = this.targetAlpha === 1 ? 0 : 1;
            this.fadeStartTime = now;
        }
        if (this.targetAlpha === 0 && this.alpha > 0) {
            this.alpha = Math.max(0, 1 - (now - this.fadeStartTime) / FADE_DURATION);
            if (this.alpha === 0) this.isActive = false;
        }
    }

    draw() {
        if (this.alpha > 0) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cell-fill-color');
            ctx.globalAlpha = this.alpha;
            ctx.fillRect(this.x, this.y, cellSize, cellSize);
            ctx.globalAlpha = 1;
        }
    }
}


class BigSquare {
    constructor(cells) {
        this.cells = cells;
        this.leader = cells[0];
    }

    startInversion() {
        this.leader.startInversion();
    }

    update() {
        const alpha = this.leader.alpha;
        this.cells.forEach(c => {
            c.alpha = alpha;
            c.targetAlpha = this.leader.targetAlpha;
            c.isActive = this.leader.isActive;
        });
    }

    draw() {
        this.cells.forEach(c => c.draw());
    }
}




/* -------------------------------
   Layout-dependent helpers
---------------------------------*/
function isInActiveZone(row, col) {
    // 1. Header rows: everything is active
    if (row < layoutVars.headerRows) {
        return true;
    }

    // 2. Below header: only side columns are active
    const inLeftSide = col < sideColCount;
    const inRightSide = col >= gridCols - sideColCount;

    return inLeftSide || inRightSide;
}

function getCellAt(row, col) {
    if (row < 0 || col < 0 || row >= gridRows || col >= gridCols) return null;
    return allCells[row * gridCols + col];
}

/* -------------------------------
   Grid Init & Activation
---------------------------------*/
function initGrid() {
    allCells = [];
    largeSquares = [];
    gridCols = Math.ceil(canvas.width / cellSize);
    gridRows = Math.ceil(canvas.height / cellSize);

    topZoneRowCount = layoutVars.headerRows;

    const panelRowCount = 1;

    sideColCount = Math.floor(layoutVars.sideWidthPercent * gridCols);
    const centerColCount = Math.floor(layoutVars.centerWidthPercent * gridCols);
    centerStartCol = Math.floor((gridCols - centerColCount) / 2);
    centerEndCol = centerStartCol + centerColCount;

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const cell = new Cell(row, col);

            // Header fully filled
            if (row <= topZoneRowCount) {
                cell.alpha = 1;
                cell.targetAlpha = 1;
            }




            allCells.push(cell);
        }
    }

    activateRandomElements(MIN_ACTIVE_CELLS);
}

function tryCreateBigSquare(size) {
    // pick a random cell as anchor
    const anchor = allCells[Math.floor(Math.random() * allCells.length)];
    if (!isInActiveZone(anchor.row, anchor.col)) return;

    const cells = [];

    for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
            const c = getCellAt(anchor.row + dy, anchor.col + dx);
            if (c) cells.push(c);
        }
    }

    // Require at least ONE cell in active zone
    const hasValidCell = cells.some(c => isInActiveZone(c.row, c.col));
    if (!hasValidCell) return;

    // Prevent overlap with active cells
    if (cells.some(c => c.isActive)) return;

    const square = new BigSquare(cells);
    largeSquares.push(square);
    square.startInversion();
}



function activateRandomElements(count) {
    for (let i = 0; i < count; i++) {

        // --- BIG SQUARE CHANCE ---
        const r = Math.random();

        if (r < SQUARE_4x4_CHANCE) {
            tryCreateBigSquare(4);
            continue;
        }

        if (r < SQUARE_4x4_CHANCE + SQUARE_3x3_CHANCE) {
            tryCreateBigSquare(3);
            continue;
        }

        if (r < SQUARE_4x4_CHANCE + SQUARE_3x3_CHANCE + SQUARE_2x2_CHANCE) {
            tryCreateBigSquare(2);
            continue;
        }
        // ------------------------

        const inactive = allCells.filter(
            c => isInActiveZone(c.row, c.col) && !c.isActive
        );

        if (inactive.length === 0) return;

        const cell = inactive[Math.floor(Math.random() * inactive.length)];
        cell.startInversion();
    }
}



/* -------------------------------
   Draw & Animate
---------------------------------*/
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allCells.forEach(c => c.update());
    largeSquares.forEach(sq => sq.update());

    allCells.forEach(c => c.draw());
    largeSquares.forEach(sq => sq.draw());

    // maintain min active cells
    const activeCount = allCells.filter(c => c.isActive).length;
    if (activeCount < MIN_ACTIVE_CELLS) {
        activateRandomElements(MIN_ACTIVE_CELLS - activeCount);
    }
}

function animate() {
    drawGrid();
    requestAnimationFrame(animate);
}

/* -------------------------------
   Canvas Resizing
---------------------------------*/
function resizeCanvas() {
    layoutVars = getLayoutVars();
    /*cellSize = getCellSize(); // THIS LINE IS CRITICAL*/

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initGrid();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animate();

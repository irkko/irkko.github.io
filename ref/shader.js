/* -------------------------------
   Shader: Header + Sides (Color Blinking)
---------------------------------*/

const canvas = document.getElementById('shaderCanvas');
const ctx = canvas.getContext('2d');

let cellSize = window.layout.cellSize;
let gridCols, gridRows;
let allCells = [];

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
    fadeDuration: 1600,
    minFill: 2000,
    maxFill: 5000,
    activeRatio: 0.10,
    color1Var: '--header-cell-color',
    color2Var: '--header-extra',
    /*zIndex: 1, // Draw order */
};

const SideZone = {
    name: 'side',
    fadeDuration: 1600,
    minFill: 500,
    maxFill: 1500,
    activeRatio: 0.10,
    color1Var: '--sides-cell-color',
    color2Var: '--sides-extra',
   /* zIndex: 2, // Draw order   */
};

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
        if (!this.zone) return;
        this.isActive = true;
        this.targetColorMix = 1;
        this.fadeStartTime = Date.now();
        const duration = this.zone.minFill + Math.random() * (this.zone.maxFill - this.zone.minFill);
        this.fillEndTime = this.fadeStartTime + this.zone.fadeDuration + duration;
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

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        const a = c1.a + (c2.a - c1.a) * t;

        // Skip fully transparent draw
        if (a <= 0.001) return;

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

            // Header cells start at color1, NOT active
            if (zone === HeaderZone) {
                cell.colorMix = 0;
                cell.targetColorMix = 0;
                cell.isActive = false;
            }

            allCells.push(cell);
        }
    }

    HeaderZone.cells = allCells.filter(c => c.zone === HeaderZone);
    SideZone.cells = allCells.filter(c => c.zone === SideZone);

    HeaderZone.targetActive = Math.floor(HeaderZone.cells.length * HeaderZone.activeRatio);
    SideZone.targetActive = Math.floor(SideZone.cells.length * SideZone.activeRatio);

    maintainZoneDensity(HeaderZone);
    maintainZoneDensity(SideZone);
}

/* -------------------------------
   Activation
---------------------------------*/
function activateZone(zone, count) {
    const candidates = zone.cells.filter(c => !c.isActive);
    for (let i = 0; i < count && candidates.length > 0; i++) {
        const index = Math.floor(Math.random() * candidates.length);
        const cell = candidates.splice(index, 1)[0];
        cell.startInversion();
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
    zones.forEach(zone => {
        zone.cells.forEach(c => c.draw());
    });
    
    maintainZoneDensity(HeaderZone);
    maintainZoneDensity(SideZone);
}

function maintainZoneDensity(zone) {
    const active = zone.cells.filter(c => c.isActive).length;
    const deficit = zone.targetActive - active;
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
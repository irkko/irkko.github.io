/* -------------------------------
   Layout Variables (fixed)
---------------------------------*/
window.layout = {
    cellSize: 18,       // <-- fixed cell size
    headerRows: 6,      // number of rows in header
    sideWidthPercent: 0.1,
    centerWidthPercent: 0.85
};

// Set CSS variables once on load
function setCSSVars() {
    const root = document.documentElement;
    root.style.setProperty('--cell-size', `${window.layout.cellSize}px`);
    root.style.setProperty('--header-height', `${window.layout.cellSize * window.layout.headerRows}px`);
    root.style.setProperty('--header-rows', `${window.layout.headerRows}`);
}

setCSSVars();

// Grab values from CSS variables (for shader.js and layout)
function getLayoutVars() {
    const root = getComputedStyle(document.documentElement);
    return {
        cellSize: window.layout.cellSize, // fixed
        headerRows: window.layout.headerRows,
        headerHeight: parseFloat(root.getPropertyValue('--header-height')),
        sideWidthPercent: window.layout.sideWidthPercent,
        centerWidthPercent: window.layout.centerWidthPercent
    };
}

// Side panel elements
const leftSide = document.querySelector('.side.left');
const rightSide = document.querySelector('.side.right');
const header = document.getElementById('header');
const content = document.getElementById('content');

// Layout application
function resizeLayout() {
    const layout = getLayoutVars();

    // Header
    header.style.height = `${layout.headerHeight}px`;
    content.style.marginTop = `${layout.headerHeight}px`;

    // Sides
    const sideWidth = Math.floor(layout.sideWidthPercent * window.innerWidth);
    leftSide.style.width = `${sideWidth}px`;
    rightSide.style.width = `${sideWidth}px`;
    leftSide.style.height = `${window.innerHeight}px`;
    rightSide.style.height = `${window.innerHeight}px`;
}

window.addEventListener('resize', resizeLayout);
resizeLayout();

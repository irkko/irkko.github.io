/* -------------------------------
   Layout Variables
---------------------------------*/
window.layout = {
    cellSize: 12,
    headerRows: 10,
};

function updateCellSize() {
    if (window.innerWidth < 768) {
        // smaller devices → scale proportionally
        cellSize = Math.floor(24 * (window.innerWidth / 768));
    } else {
        // desktop
        cellSize = 24;
    }

    const headerHeightPx = layout.headerRows * cellSize;

    document.documentElement.style.setProperty(
        '--header-height',
        `${headerHeightPx}px`
    );
}




const headerRows = 6; // number of rows in header
function updateHeaderHeight() {
    const headerHeight = layout.headerRows * layout.cellSize;
    document.documentElement.style.setProperty(
        '--header-height',
        `${headerHeight}px`
    );
}

function onResize() {
    updateCellSize();
    updateHeaderHeight();
    resizeCanvas(); // your shader grid
}

window.addEventListener('resize', onResize);
onResize(); // initial call




// Grab values from CSS variables
function getLayoutVars() {
    const root = getComputedStyle(document.documentElement);
    return {
        headerHeight: parseFloat(root.getPropertyValue('--header-height')) * window.innerHeight / 100,
        sideWidthPercent: parseFloat(root.getPropertyValue('--side-width-percent')), // 0-1
        centerWidthPercent: parseFloat(root.getPropertyValue('--center-width-percent'))
    };
}

// Side panel elements
const leftSide = document.querySelector('.side.left');
const rightSide = document.querySelector('.side.right');
const header = document.getElementById('header');
const content = document.getElementById('content');

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

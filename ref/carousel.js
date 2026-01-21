/* -------------------------------
   Carousel Functionality
---------------------------------*/

const carousels = {};

function initCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const images = carousel.querySelectorAll('img');
    const dotsContainer = document.getElementById(carouselId.replace('carousel', 'dots'));

    carousels[carouselId] = {
        element: carousel,
        images: images,
        currentIndex: 0,
        imageCount: images.length
    };

    // Create dots
    if (dotsContainer) {
        for (let i = 0; i < images.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(carouselId, i));
            dotsContainer.appendChild(dot);
        }
    }

    // Set initial position
    updateCarouselPosition(carouselId);
}

function updateCarouselPosition(carouselId) {
    const data = carousels[carouselId];
    if (!data) return;

    const offset = -data.currentIndex * 100;
    data.element.style.transform = `translateX(${offset}%)`;

    // Update dots
    const dotsContainer = document.getElementById(carouselId.replace('carousel', 'dots'));
    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === data.currentIndex);
        });
    }
}

function moveCarousel(carouselId, direction) {
    const data = carousels[carouselId];
    if (!data) return;

    data.currentIndex += direction;

    // Wrap around
    if (data.currentIndex < 0) {
        data.currentIndex = data.imageCount - 1;
    } else if (data.currentIndex >= data.imageCount) {
        data.currentIndex = 0;
    }

    updateCarouselPosition(carouselId);
}

function goToSlide(carouselId, index) {
    const data = carousels[carouselId];
    if (!data) return;

    data.currentIndex = index;
    updateCarouselPosition(carouselId);
}

// Auto-initialize all carousels on load
document.addEventListener('DOMContentLoaded', () => {
    const carouselElements = document.querySelectorAll('.carousel');
    carouselElements.forEach(carousel => {
        initCarousel(carousel.id);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const focusedCarousel = document.activeElement.closest('.carousel-container');
        if (!focusedCarousel) return;

        const carouselId = focusedCarousel.querySelector('.carousel').id;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moveCarousel(carouselId, -1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            moveCarousel(carouselId, 1);
        }
    });
});
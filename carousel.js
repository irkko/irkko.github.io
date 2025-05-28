const carousel = document.querySelector('.image-carousel');
const imagesContainer = carousel.querySelector('.carousel-images');
const images = imagesContainer.querySelectorAll('img');
const prevBtn = carousel.querySelector('.carousel-btn.prev');
const nextBtn = carousel.querySelector('.carousel-btn.next');

let currentIndex = 0;

function updateCarousel() {
  const offset = -currentIndex * 100;
  imagesContainer.style.transform = `translateX(${offset}%)`;
}

prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateCarousel();
});

nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % images.length;
  updateCarousel();
});
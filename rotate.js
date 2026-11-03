// Photo pool: add or swap filenames here to change what rotates through the grid.
const PHOTOS = [
  "assets/photo-1.svg", "assets/photo-2.svg", "assets/photo-3.svg", "assets/photo-4.svg",
  "assets/photo-5.svg", "assets/photo-6.svg", "assets/photo-7.svg", "assets/photo-8.svg",
];
const slots = [...document.querySelectorAll(".photos img")];
PHOTOS.forEach(src => { new Image().src = src; });

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  slots.forEach((img, i) => {
    const tick = () => {
      const shown = slots.map(s => s.getAttribute("src"));
      const options = PHOTOS.filter(p => !shown.includes(p));
      if (options.length) img.src = options[Math.floor(Math.random() * options.length)];
      setTimeout(tick, 13000 + Math.random() * 4000);
    };
    setTimeout(tick, 3000 + i * 3500); // staggered start
  });
}

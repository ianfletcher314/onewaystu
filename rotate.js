// Photo pool: add or swap filenames here to change what rotates through the grid.
const PHOTOS = [
  "assets/photos/IMG_2575.jpg",
  "assets/photos/IMG_2697.jpg",
  "assets/photos/IMG_3003.jpg",
  "assets/photos/IMG_3296.jpg",
  "assets/photos/IMG_3602.jpg",
  "assets/photos/IMG_3604.jpg",
  "assets/photos/IMG_4001.jpg",
  "assets/photos/IMG_4094.jpg",
  "assets/photos/IMG_5027.jpg",
  "assets/photos/IMG_5084.jpg",
  "assets/photos/IMG_5802.jpg",
  "assets/photos/IMG_5809.jpg",
  "assets/photos/IMG_5812.jpg",
  "assets/photos/IMG_5816.jpg",
  "assets/photos/IMG_6190.jpg",
  "assets/photos/IMG_6191.jpg",
  "assets/photos/IMG_6215.jpg",
  "assets/photos/IMG_6232.jpg",
  "assets/photos/IMG_6320.jpg",
  "assets/photos/IMG_6321.jpg",
  "assets/photos/IMG_6322.jpg",
  "assets/photos/IMG_6323.jpg",
  "assets/photos/IMG_6324.jpg",
  "assets/photos/IMG_6326.jpg",
];
const slots = [...document.querySelectorAll(".photos img")];
PHOTOS.forEach(src => { new Image().src = src; });

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Brutalist swap: a black slab with an orange edge slams across in hard steps,
  // the photo changes while it covers the frame, then the slab exits the same way.
  const swap = (img, src) => {
    const fig = img.closest("figure");
    const done = () => { fig.classList.remove("cover", "uncover"); };
    fig.addEventListener("animationend", function onCover() {
      fig.removeEventListener("animationend", onCover);
      img.src = src;
      fig.classList.replace("cover", "uncover");
      fig.addEventListener("animationend", done, { once: true });
    }, { once: true });
    fig.classList.add("cover");
  };
  slots.forEach((img, i) => {
    const tick = () => {
      const shown = slots.map(s => s.getAttribute("src"));
      const options = PHOTOS.filter(p => !shown.includes(p));
      if (options.length) {
        const src = options[Math.floor(Math.random() * options.length)];
        const pre = new Image();
        pre.onload = () => swap(img, src);
        pre.src = src;
      }
      setTimeout(tick, 13000 + Math.random() * 4000);
    };
    setTimeout(tick, 3000 + i * 3500); // staggered start
  });
}

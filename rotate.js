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
  // Brutalist swap: one arrow from the ONE WAY sign shoots across the frame in
  // hard steps, leaving the new photo behind it.
  const STEPS = 10, STEP_MS = 50, AW = 0.5; // AW = arrow width as a fraction of the frame
  const NS = "http://www.w3.org/2000/svg";
  const swap = (img, src) => {
    const fig = img.closest("figure");
    const next = document.createElement("img");
    next.src = src; next.alt = img.alt; next.className = "reveal";
    const arrow = document.createElementNS(NS, "svg");
    arrow.setAttribute("viewBox", "-6 -6 172 138");
    arrow.setAttribute("class", "arrow");
    arrow.style.width = AW * 100 + "%";
    arrow.innerHTML = '<polygon points="0,34 100,34 100,0 160,63 100,126 100,92 0,92" fill="#fff" stroke="#000" stroke-width="8" stroke-linejoin="miter"/>' +
      '<text x="50" y="63" text-anchor="middle" dominant-baseline="central" font-family="Archivo Black, sans-serif" font-size="36" fill="#000">ONE</text>';
    fig.append(next, arrow);
    let k = 0;
    const frame = () => {
      const p = ++k / STEPS;
      const x = -AW + p * (1 + AW);         // arrow's left edge, in frame widths
      const tip = Math.min(1, x + AW);      // new photo shows up to the arrow tip
      arrow.style.left = x * 100 + "%";
      next.style.clipPath = `inset(0 ${(1 - tip) * 100}% 0 0)`;
      if (k < STEPS) setTimeout(frame, STEP_MS);
      else { img.src = src; next.remove(); arrow.remove(); }
    };
    arrow.style.left = -AW * 100 + "%";
    next.style.clipPath = "inset(0 100% 0 0)";
    setTimeout(frame, STEP_MS);
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

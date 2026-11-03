// Scroll beat: a synthesized 808 trap loop that fades in while the page scrolls and
// fades out when scrolling stops. Browsers only allow sound after a tap/click, so it
// stays off until the visitor presses the SOUND button once.
(() => {
  const BPM = 140, STEP = 60 / BPM / 4;          // 16th-note length in seconds
  const VOLUME = 0.55, FADE_IN = 0.18, FADE_OUT = 0.22, IDLE_MS = 350;

  // 2-bar pattern, 16 steps per bar
  const KICK  = [[0, 6, 10], [0, 5, 10, 14]];
  const CLAP  = [[8], [8]];
  const HAT   = [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14, 15]];

  const btn = document.createElement("button");
  btn.className = "sound-toggle"; btn.type = "button";
  btn.setAttribute("aria-pressed", "false");
  btn.textContent = "SOUND: OFF";
  document.body.appendChild(btn);

  let ctx, master, noise, timer, nextTime = 0, step = 0, on = false, lastScroll = 0, idleT;

  const makeNoise = c => {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  const softClip = (() => {
    const n = 1024, a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(2.2 * x); }
    return a;
  })();

  function kick(c, out, t) {                      // 808: sine with a fast pitch drop, long decay
    const o = c.createOscillator(), g = c.createGain(), sh = c.createWaveShaper();
    sh.curve = softClip;
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    o.connect(sh); sh.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.7);
  }
  function hat(c, out, t, buf) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = "highpass"; f.frequency.value = 7500;
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + 0.06);
  }
  function clap(c, out, t, buf) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.012, 0.026].forEach(d => { g.gain.setValueAtTime(0.7, t + d); g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.01); });
    g.gain.setValueAtTime(0.7, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + 0.25);
  }
  function playStep(c, out, buf, i, t) {
    const bar = Math.floor(i / 16) % 2, s = i % 16;
    if (KICK[bar].includes(s)) kick(c, out, t);
    if (CLAP[bar].includes(s)) clap(c, out, t, buf);
    if (HAT[bar].includes(s)) hat(c, out, t, buf);
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) { playStep(ctx, master, noise, step, nextTime); nextTime += STEP; step = (step + 1) % 32; }
  }
  function start() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(comp); comp.connect(ctx.destination);
      noise = makeNoise(ctx);
    }
    ctx.resume();
    nextTime = ctx.currentTime + 0.05; step = 0;
    clearInterval(timer); timer = setInterval(tick, 25);
  }
  function stop() {
    clearInterval(timer); clearTimeout(idleT);
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }
  function onScroll() {
    if (!on || !ctx) return;
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, FADE_IN);
    clearTimeout(idleT);
    idleT = setTimeout(() => master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT), IDLE_MS);
  }

  btn.addEventListener("click", () => {
    on = !on;
    btn.textContent = on ? "SOUND: ON" : "SOUND: OFF";
    btn.setAttribute("aria-pressed", String(on));
    if (on) { start(); onScroll(); } else stop();
  });
  ["scroll", "wheel", "touchmove"].forEach(e => addEventListener(e, onScroll, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (document.hidden && on) { stop(); } else if (!document.hidden && on) start(); });

  window.__beat = { playStep, makeNoise, STEP };   // exposed for offline testing
})();

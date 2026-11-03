// Scroll beat: a synthesized loop that fades in while the page scrolls and fades out
// when scrolling stops. Browsers only allow sound after a tap/click, so it stays off
// until the visitor presses the SOUND button once. The BEAT button switches style.
(() => {
  const VOLUME = 0.55, FADE_IN = 0.18, FADE_OUT = 0.22, IDLE_MS = 350;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);          // MIDI note -> frequency

  const curve = k => { const n = 1024, a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(k * x); } return a; };
  const SOFT = curve(2.2), HARD = curve(40);

  const noiseBuf = c => { const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };

  // ---- voices ----
  function tone(c, out, t, { type = "sine", f0, f1, drop = 0.1, peak = 1, dur = 0.3, shaper, lp }) {
    const o = c.createOscillator(), g = c.createGain(); let node = o;
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + drop);
    if (shaper) { const s = c.createWaveShaper(); s.curve = shaper; node.connect(s); node = s; }
    if (lp) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; node.connect(f); node = f; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    node.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(c, out, t, buf, { type, freq, q = 0.7, peak, dur }) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.02);
  }
  const hat = (c, o, t, b, open) => burst(c, o, t, b, { type: "highpass", freq: 7500, peak: open ? 0.3 : 0.26, dur: open ? 0.22 : 0.045 });
  const clap = (c, o, t, b) => { const f = c.createBiquadFilter(), g = c.createGain(), s = c.createBufferSource();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.012, 0.026].forEach(d => { g.gain.setValueAtTime(0.7, t + d); g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.01); });
    g.gain.setValueAtTime(0.7, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + 0.25); };

  // pitched cowbell: two detuned squares through a band-pass, the sound of the phonk lead
  function cowbell(c, out, t, midi, peak = 0.3) {
    const f = hz(midi), bp = c.createBiquadFilter(), g = c.createGain();
    bp.type = "bandpass"; bp.frequency.value = f * 2.2; bp.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    [f, f * 1.4815].forEach(freq => { const o = c.createOscillator(); o.type = "square"; o.frequency.value = freq;
      o.connect(bp); o.start(t); o.stop(t + 0.25); });
    bp.connect(g); g.connect(out);
  }

  // ---- styles: 2 bars x 16 sixteenth-note steps ----
  const has = (a, s) => a.includes(s);
  const STYLES = {
    rock: { bpm: 120, label: "ROCK", play(c, out, buf, bar, s, t) {
      const KICK = [[0, 8, 10], [0, 6, 8]][bar], SNARE = [[4, 12], [4, 12, 13, 14, 15]][bar];
      if (has(KICK, s)) { tone(c, out, t, { f0: 130, f1: 55, drop: 0.05, peak: 1, dur: 0.28, shaper: SOFT });
                          burst(c, out, t, buf, { type: "lowpass", freq: 3000, peak: 0.4, dur: 0.012 }); }
      if (has(SNARE, s)) { burst(c, out, t, buf, { type: "bandpass", freq: 2200, q: 0.6, peak: 0.85, dur: 0.18 });
                           tone(c, out, t, { type: "triangle", f0: 200, f1: 130, drop: 0.08, peak: 0.5, dur: 0.12 }); }
      if (s % 2 === 0 && !(bar === 1 && s >= 12)) hat(c, out, t, buf, s === 14 && bar === 0);
      if (bar === 0 && s === 0) burst(c, out, t, buf, { type: "highpass", freq: 5000, peak: 0.28, dur: 1.1 }); // crash
      // fuzz bass, two octaves down from the original: eighth notes on E in bar 1, a semitone up (F) in bar 2
      if (s % 2 === 0) { const n = (bar === 0 ? 40 : 41) - 24;
        tone(c, out, t, { type: "sawtooth", f0: hz(n), peak: 0.25, dur: 0.22, shaper: HARD, lp: 1800 }); }
    } },
    trap: { bpm: 140, label: "TRAP", play(c, out, buf, bar, s, t) {
      if (has([[0, 6, 10], [0, 6, 10, 14]][bar], s)) tone(c, out, t, { f0: 150, f1: 48, drop: 0.1, peak: 1, dur: 0.65, shaper: SOFT });
      if (s === 8) clap(c, out, t, buf);
      if (has([[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14, 15]][bar], s)) hat(c, out, t, buf, false);
    } },
  };
  // ---- sampler: build-your-own pattern (one bar of 16 steps) ----
  const BASS808 = curve(5);
  const cfg = { bpm: 130, swing: 0, wonk: 0, note: 29 };          // swing / wonk are 0..1
  const V = {
    kick:  (c, o, t, b) => { tone(c, o, t, { f0: 150, f1: 55, drop: 0.05, peak: 1, dur: 0.3, shaper: SOFT });
                             burst(c, o, t, b, { type: "lowpass", freq: 3200, peak: 0.38, dur: 0.012 }); },
    bass:  (c, o, t, b, note = cfg.note) => tone(c, o, t, { f0: hz(note) * 2, f1: hz(note), drop: 0.07, peak: 0.85, dur: 0.55, shaper: BASS808 }),
    snare: (c, o, t, b) => { burst(c, o, t, b, { type: "bandpass", freq: 2200, q: 0.6, peak: 0.85, dur: 0.17 });
                             tone(c, o, t, { type: "triangle", f0: 200, f1: 130, drop: 0.08, peak: 0.5, dur: 0.12 }); },
    clap:  (c, o, t, b) => clap(c, o, t, b),
    hat:   (c, o, t, b) => hat(c, o, t, b, false),
    ohat:  (c, o, t, b) => hat(c, o, t, b, true),
    cowlo: (c, o, t) => cowbell(c, o, t, 77, 0.28),
    cowhi: (c, o, t) => cowbell(c, o, t, 80, 0.28),
    tom:   (c, o, t) => tone(c, o, t, { f0: 115, f1: 85, drop: 0.06, peak: 0.5, dur: 0.12 }),
  };
  const ROWS = [["kick", "KICK"], ["bass", "808"], ["snare", "SNARE"], ["clap", "CLAP"], ["hat", "HAT"],
                ["ohat", "OPEN HAT"], ["cowlo", "COW LO"], ["cowhi", "COW HI"], ["tom", "TOM"]];
  const NOTES = [[26, "D1"], [28, "E1"], [29, "F1"], [31, "G1"], [33, "A1"], [36, "C2"]];
  const evens = [0, 2, 4, 6, 8, 10, 12, 14], all = [...Array(16).keys()];
  const PRESETS = {
    ROCK:  { bpm: 120, swing: 0,   wonk: 0.1, note: 28, rows: { kick: [0, 8, 10], snare: [4, 12], hat: evens, ohat: [14], bass: evens } },
    TRAP:  { bpm: 140, swing: 0.1, wonk: 0,   note: 29, rows: { kick: [0, 6, 10], clap: [8], hat: evens, bass: [0, 6, 10] } },
    PHONK: { bpm: 118, swing: 0.3, wonk: 0.7, note: 29, rows: { kick: [0, 8, 10], bass: [0], snare: [3, 6, 12, 14],
                                                                cowlo: [0, 3, 8], cowhi: [6, 14], tom: [2, 7, 10, 15] } },
  };
  const PRESET_NAMES = ["PHONK", "ROCK", "TRAP"], PRESET_OF = { phonk: "PHONK", rock: "ROCK", trap: "TRAP" };
  const FEEL = [0, 14, -6, 24, 4, -8, 20, 10, 0, 18, -10, 28, 6, -5, 22, 12];       // ms push/pull per 16th at WONK = 1
  const grid = {}; ROWS.forEach(([id]) => { grid[id] = new Array(16).fill(false); });

  // Plays a 16-step pattern with swing + per-step "wonky" timing (shared by CUSTOM and BR PHONK)
  function playPattern(rows, p, c, out, buf, s, t) {
    const ST = 60 / p.bpm / 4, odd = s % 2 === 1;
    const at = k => Math.max(t + (odd ? ST * 0.33 * p.swing : 0) + (FEEL[s] + (Math.random() * 2 - 1) * 8) * p.wonk * k / 1000, c.currentTime);
    ROWS.forEach(([id]) => { if (rows[id][s]) V[id](c, out, at(id === "bass" ? 0.3 : 1), buf, p.note); });
  }
  STYLES.custom = { get bpm() { return cfg.bpm; }, label: "CUSTOM", play(c, out, buf, bar, s, t) { playPattern(grid, cfg, c, out, buf, s, t); } };
  // BR PHONK is the PHONK preset above, always (it does not follow edits made in the REMIX panel)
  { const p = PRESETS.PHONK, rows = {}; ROWS.forEach(([id]) => { rows[id] = all.map(n => (p.rows[id] || []).includes(n)); });
    STYLES.phonk = { bpm: p.bpm, label: "BR PHONK", play(c, out, buf, bar, s, t) { playPattern(rows, p, c, out, buf, s, t); } }; }
  const ORDER = ["phonk", "rock", "trap"];

  // ---- UI ----
  const ui = document.createElement("div"); ui.className = "sound-ui";
  const panel = document.createElement("div"); panel.className = "sampler"; panel.hidden = true;
  const row = document.createElement("div"); row.className = "sound-row";
  ui.append(panel, row); document.body.appendChild(ui);
  const mk = txt => { const b = document.createElement("button"); b.className = "sound-toggle"; b.type = "button"; b.textContent = txt; row.appendChild(b); return b; };
  const btn = mk("SOUND: ON"), styleBtn = mk("BEAT: BR PHONK"), buildBtn = mk("REMIX");
  btn.classList.add("sound-main"); btn.setAttribute("aria-pressed", "true"); buildBtn.setAttribute("aria-expanded", "false");

  panel.innerHTML =
    '<div class="sampler-bar"><button type="button" class="sbtn" data-act="play" aria-pressed="false">&#9654; PLAY</button>' +
    '<button type="button" class="sbtn" data-act="clear">CLEAR</button><span class="slabel">LOAD:</span>' +
    PRESET_NAMES.map(k => '<button type="button" class="sbtn" data-preset="' + k + '">' + k + '</button>').join("") + '</div>' +
    '<div class="sgrid">' + ROWS.map(([id, label]) => '<div class="srow"><span class="slabel">' + label + '</span>' +
      all.map(n => '<button type="button" class="pad' + (n % 4 === 0 ? ' beat' : '') + '" data-r="' + id + '" data-s="' + n + '" aria-label="' + label + ' step ' + (n + 1) + '" aria-pressed="false"></button>').join("") + '</div>').join("") + '</div>' +
    '<div class="sampler-ctrl">' +
    '<label>TEMPO <input type="range" min="80" max="180" data-k="bpm"><output data-o="bpm"></output></label>' +
    '<label>SWING <input type="range" min="0" max="100" data-k="swing"><output data-o="swing"></output></label>' +
    '<label>WONK <input type="range" min="0" max="100" data-k="wonk"><output data-o="wonk"></output></label>' +
    '<label>808 NOTE <select data-k="note">' + NOTES.map(([m, n]) => '<option value="' + m + '">' + n + '</option>').join("") + '</select></label></div>';

  const playBtn = panel.querySelector('[data-act="play"]');
  const pct = k => Math.round(cfg[k] * 100);
  function paint() {
    panel.querySelectorAll(".pad").forEach(p => { const on_ = grid[p.dataset.r][+p.dataset.s]; p.classList.toggle("on", on_); p.setAttribute("aria-pressed", String(on_)); });
    panel.querySelector('[data-k="bpm"]').value = cfg.bpm;       panel.querySelector('[data-o="bpm"]').textContent = cfg.bpm;
    panel.querySelector('[data-k="swing"]').value = pct("swing"); panel.querySelector('[data-o="swing"]').textContent = pct("swing") + "%";
    panel.querySelector('[data-k="wonk"]').value = pct("wonk");   panel.querySelector('[data-o="wonk"]').textContent = pct("wonk") + "%";
    panel.querySelector('[data-k="note"]').value = cfg.note;
  }
  function applyPreset(p) {
    ROWS.forEach(([id]) => { grid[id] = all.map(n => (p.rows[id] || []).includes(n)); });
    cfg.bpm = p.bpm; cfg.swing = p.swing; cfg.wonk = p.wonk; cfg.note = p.note;
    paint();
  }
  applyPreset(PRESETS.PHONK);

  // ---- engine ----
  let ctx, master, buf, timer = null, nextTime = 0, step = 0, on = true, previewing = false, idleT, raf = 0;   // sound starts ON (needs one tap/click to unlock, see below)
  let base = "phonk", remixed = false; const queue = [];
  const activeStyle = () => remixed ? "custom" : base;      // custom = the REMIX grid, used once you start editing
  const stepLen = () => 60 / STYLES[activeStyle()].bpm / 4;
  const running = () => on || previewing;

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      const s = step % 16;
      STYLES[activeStyle()].play(ctx, master, buf, Math.floor(step / 16) % 2, s, nextTime);
      if (activeStyle() === "custom" && !panel.hidden) queue.push([nextTime, s]);
      nextTime += stepLen(); step = (step + 1) % 32;
    }
  }
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp); comp.connect(ctx.destination);
    buf = noiseBuf(ctx);
  }
  function setHead(n) { panel.querySelectorAll(".pad.now").forEach(p => p.classList.remove("now"));
    if (n >= 0) panel.querySelectorAll('.pad[data-s="' + n + '"]').forEach(p => p.classList.add("now")); }
  function frame() {
    raf = 0; if (panel.hidden || !ctx || !timer) return;
    let cur = -1; while (queue.length && queue[0][0] <= ctx.currentTime) cur = queue.shift()[1];
    if (cur >= 0) setHead(cur);
    raf = requestAnimationFrame(frame);
  }
  const kickFrame = () => { if (!raf && !panel.hidden) raf = requestAnimationFrame(frame); };
  function begin() {
    ensure(); ctx.resume();
    if (!timer) { nextTime = ctx.currentTime + 0.05; step = 0; timer = setInterval(tick, 25); }
    kickFrame();
  }
  function halt() { clearInterval(timer); timer = null; clearTimeout(idleT); queue.length = 0; setHead(-1);
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }
  function sync() {
    if (running()) { begin(); if (previewing) master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.03); }
    else if (ctx) halt();
  }
  function restartBar() { if (ctx && timer) { nextTime = ctx.currentTime + 0.05; step = 0; queue.length = 0; } }
  function onScroll() {
    if (!on || previewing || !ctx) return;
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, FADE_IN);
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (!previewing) master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT); }, IDLE_MS);
  }
  function setPreview(v) {
    previewing = v; playBtn.setAttribute("aria-pressed", String(v)); playBtn.innerHTML = v ? "&#9632; STOP" : "&#9654; PLAY";
    if (v) { markRemixed(); sync(); } else { if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); sync(); }
  }
  function setBase(name) {                      // BEAT button: pick a built-in beat (resets any remix)
    base = name; remixed = false; styleBtn.textContent = "BEAT: " + STYLES[name].label;
    if (!panel.hidden) applyPreset(PRESETS[PRESET_OF[name]]);
    restartBar();
  }
  function markRemixed() { if (!remixed) { remixed = true; restartBar(); } }      // from now on the grid is what plays

  btn.addEventListener("click", () => {
    on = !on; btn.textContent = on ? "SOUND: ON" : "SOUND: OFF"; btn.setAttribute("aria-pressed", String(on));
    sync(); if (on) onScroll();
  });
  styleBtn.addEventListener("click", () => setBase(ORDER[(ORDER.indexOf(base) + 1) % ORDER.length]));
  buildBtn.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    buildBtn.textContent = panel.hidden ? "REMIX" : "CLOSE"; buildBtn.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) { applyPreset(PRESETS[PRESET_OF[base]]); kickFrame(); } else { if (previewing) setPreview(false); setHead(-1); }
  });
  panel.addEventListener("click", e => {
    const pad = e.target.closest(".pad"), act = e.target.closest("[data-act]"), pre = e.target.closest("[data-preset]");
    if (pad) { markRemixed(); const r = pad.dataset.r, n = +pad.dataset.s; grid[r][n] = !grid[r][n]; paint(); }
    else if (act && act.dataset.act === "play") setPreview(!previewing);
    else if (act && act.dataset.act === "clear") { markRemixed(); ROWS.forEach(([id]) => grid[id].fill(false)); paint(); }
    else if (pre) { markRemixed(); applyPreset(PRESETS[pre.dataset.preset]); }
  });
  panel.addEventListener("input", e => {
    const k = e.target.dataset.k; if (!k) return; markRemixed(); const v = +e.target.value;
    cfg[k] = (k === "swing" || k === "wonk") ? v / 100 : v; paint();
  });
  ["scroll", "wheel", "touchmove"].forEach(e => addEventListener(e, onScroll, { passive: true }));
  // Sound is "on" from the start, but browsers only allow audio after a tap, click or key press.
  // The first one anywhere on the page unlocks it; after that, scrolling plays the beat.
  const UNLOCK = ["pointerdown", "pointerup", "touchend", "keydown", "click"];
  const unlock = e => {
    if (!on || (e.target.closest && e.target.closest(".sound-main"))) return;   // the SOUND button handles itself
    sync();
    if (ctx) ctx.resume().then(() => { if (ctx.state === "running") UNLOCK.forEach(t => removeEventListener(t, unlock, true)); });
  };
  UNLOCK.forEach(t => addEventListener(t, unlock, true));
  document.addEventListener("visibilitychange", () => {
    if (!running()) return;
    if (document.hidden) { clearInterval(timer); timer = null; if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } else sync();
  });
})();

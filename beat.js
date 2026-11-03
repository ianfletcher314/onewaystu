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
    trap: { bpm: 140, label: "808", play(c, out, buf, bar, s, t) {
      if (has([[0, 6, 10], [0, 6, 10, 14]][bar], s)) tone(c, out, t, { f0: 150, f1: 48, drop: 0.1, peak: 1, dur: 0.65, shaper: SOFT });
      if (s === 8) clap(c, out, t, buf);
      if (has([[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14, 15]][bar], s)) hat(c, out, t, buf, false);
    } },
    // Brazilian phonk: funk carioca "tamborzao" 3-3-2 groove, cowbell lead, gliding distorted 808.
    // Notes are pushed slightly off the grid (swung off-16ths, laid-back clap and cowbell, tiny
    // random jitter and velocity changes) so it feels played, not programmed.
    phonk: { bpm: 130, label: "BR PHONK", play(c, out, buf, bar, s, t) {
      const ST = 60 / 130 / 4, odd = s % 2 === 1;
      const j = ms => (Math.random() * 2 - 1) * ms / 1000;          // +/- ms of jitter
      const at = off => Math.max(t + off, c.currentTime);           // never schedule in the past
      const vel = v => v * (0.8 + Math.random() * 0.4);              // +/- 20% velocity
      if (has([0, 3, 8, 11], s)) {                                  // tight kick, odd steps a touch late
        const tk = at((odd ? ST * 0.12 : 0) + j(1.5));
        tone(c, out, tk, { f0: 170, f1: 60, drop: 0.04, peak: vel(0.9), dur: 0.15, shaper: SOFT });
        burst(c, out, tk, buf, { type: "lowpass", freq: 3500, peak: 0.35, dur: 0.012 });
      }
      if (has([6, 14], s)) { const tc = at(0.014 + j(3));             // clap sits behind the beat
        clap(c, out, tc, buf);
        burst(c, out, tc, buf, { type: "bandpass", freq: 2600, q: 0.7, peak: 0.45, dur: 0.12 }); }
      burst(c, out, at((odd ? ST * 0.22 : 0) + j(3)), buf, { type: "highpass", freq: 8000, peak: vel(s % 2 === 0 ? 0.2 : 0.09), dur: 0.04 }); // swung 16th hats
      const bass = { 0: 29, 8: 29 }; if (bar === 0) bass[14] = 27; else bass[11] = 25;   // 808 in F minor, slides into each note
      if (s in bass) { const n = bass[s], tb = at(j(1));
        tone(c, out, tb, { f0: hz(n) * 2, f1: hz(n), drop: 0.07, peak: 0.85, dur: s === 0 || s === 8 ? 0.55 : 0.3, shaper: curve(5) }); }
      const mel = bar === 0 ? { 0: 77, 3: 80, 6: 79, 8: 77, 11: 75 } : { 0: 77, 3: 80, 6: 84, 8: 80, 11: 79, 14: 77 };
      if (s in mel) cowbell(c, out, at(0.008 + (odd ? ST * 0.15 : 0) + j(3)), mel[s], vel(0.28));   // cowbell lags a hair
    } },
  };
  const ORDER = ["rock", "trap", "phonk"];

  // ---- UI ----
  const ui = document.createElement("div"); ui.className = "sound-ui";
  const mk = txt => { const b = document.createElement("button"); b.className = "sound-toggle"; b.type = "button"; b.textContent = txt; ui.appendChild(b); return b; };
  const btn = mk("SOUND: OFF"), styleBtn = mk("BEAT: ROCK");
  btn.setAttribute("aria-pressed", "false"); document.body.appendChild(ui);

  // ---- engine ----
  let ctx, master, buf, timer, nextTime = 0, step = 0, on = false, idleT, styleName = "rock";
  const stepLen = () => 60 / STYLES[styleName].bpm / 4;

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      STYLES[styleName].play(ctx, master, buf, Math.floor(step / 16) % 2, step % 16, nextTime);
      nextTime += stepLen(); step = (step + 1) % 32;
    }
  }
  function start() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0; master.connect(comp); comp.connect(ctx.destination);
      buf = noiseBuf(ctx);
    }
    ctx.resume(); nextTime = ctx.currentTime + 0.05; step = 0;
    clearInterval(timer); timer = setInterval(tick, 25);
  }
  function stop() { clearInterval(timer); clearTimeout(idleT); if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }
  function onScroll() {
    if (!on || !ctx) return;
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, FADE_IN);
    clearTimeout(idleT);
    idleT = setTimeout(() => master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT), IDLE_MS);
  }

  btn.addEventListener("click", () => {
    on = !on; btn.textContent = on ? "SOUND: ON" : "SOUND: OFF"; btn.setAttribute("aria-pressed", String(on));
    if (on) { start(); onScroll(); } else stop();
  });
  styleBtn.addEventListener("click", () => {
    styleName = ORDER[(ORDER.indexOf(styleName) + 1) % ORDER.length];
    styleBtn.textContent = "BEAT: " + STYLES[styleName].label;
    if (on) { nextTime = ctx.currentTime + 0.05; step = 0; }       // restart the bar in the new style
  });
  ["scroll", "wheel", "touchmove"].forEach(e => addEventListener(e, onScroll, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!on) return; document.hidden ? stop() : start(); });
})();

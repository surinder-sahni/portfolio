(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px), (hover: none)').matches;
gsap.registerPlugin(ScrollTrigger);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ---------- smooth scroll: desktop only (native scroll on touch/iOS) ----------
const CFG = window.SITE_CONFIG || {};
let lenis = null;
if (!reduce && !mobile && window.Lenis) {
  lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (!reduce) document.documentElement.classList.add('js-motion');
const scrollToEl = t => lenis ? lenis.scrollTo(t, { duration: 1.6, offset: -20 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const h = a.getAttribute('href'); if (h === '#') return;
  const t = $(h); if (!t) return; e.preventDefault(); closeMenu(); scrollToEl(t);
}));

// ---------- mobile menu ----------
const burger = $('#burger'), menu = $('#menu');
function closeMenu() { if (!document.body.classList.contains('menu-open')) return; document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
burger.addEventListener('click', () => {
  if (document.body.classList.contains('menu-open')) return closeMenu();
  document.body.classList.add('menu-open'); burger.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); lenis && lenis.stop();
  if (!reduce) gsap.fromTo('.menu nav a, .menu-foot', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.25 });
});
addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeLb(); } });

// ---------- WhatsApp placeholder ----------
$$('[data-wa]').forEach(a => {
  if (CFG.WHATSAPP_NUMBER) { a.href = 'https://wa.me/' + CFG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(CFG.WHATSAPP_TEXT || ''); a.target = '_blank'; a.rel = 'noopener'; }
  else a.addEventListener('click', e => { e.preventDefault(); scrollToEl($('#contact')); });
});

// ---------- text splitting ----------
const split = (el, chars) => {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
        const ws = document.createElement('span'); ws.className = 'w';
        if (chars) [...w].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); });
        else ws.textContent = w;
        frag.appendChild(ws);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el);
};
$$('.split').forEach(el => split(el, true));
$$('.reveal-text').forEach(el => split(el, false));

// ---------- preloader + sound gate ----------
const count = $('#count'), pre = $('#preloader'), gate = $('#gate');
const LS = 'ss-sound'; let stored = null; try { stored = localStorage.getItem(LS); } catch (e) {}
const intro = () => {
  document.body.classList.remove('is-loading');
  ScrollTrigger.refresh();
  if (reduce) return;
  gsap.from('.mega .ch', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.03 });
  gsap.from('.hero .eyebrow, .avatar, .hero-bottom > *, .nav, .floaters', { y: 30, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.4, clearProps: 'opacity,transform' });
};
const exitPre = () => reduce ? (pre.remove(), intro())
  : gsap.to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut', onStart: intro, onComplete: () => pre.remove() });
const showGate = () => {
  if (stored) { exitPre(); if (stored === 'on') armSound(); return; } // returning visitor: remembered choice, no gate
  gate.hidden = false; pre.classList.add('gated');
  if (!reduce) gsap.from(gate.children, { y: 24, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
  $('#gateOn').focus({ preventScroll: true });
};
$('#gateOn').addEventListener('click', () => { setSound(true); exitPre(); });
$('#gateOff').addEventListener('click', () => { setSound(false); exitPre(); });
if (reduce) { count.textContent = 100; showGate(); }
else {
  const o = { v: 0 };
  gsap.to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(o.v); gsap.set('#prebar', { scaleX: o.v / 100 }); }, onComplete: showGate });
}

// ---------- audio: voice in the hero, lo-fi loop after it, UI blips (all off unless the visitor opts in) ----------
// Music is assets/audio/lofi-loop.mp3, an original loop synthesised for this site (no third-party track).
const LOOP_LEN = 20.8696; // exact loop length in seconds (8 bars at 92 bpm)
const snd = { ctx: null, master: null, music: null, musicEl: null, on: false, inHero: true, voice: null, voiceDone: false };
const btns = $$('.sound');
window.__snd = snd;
const vid = $('#avatarVideo');
const ensureCtx = () => {
  if (snd.ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  const ctx = snd.ctx = new AC();
  snd.master = ctx.createGain(); snd.master.gain.value = 1; snd.master.connect(ctx.destination);
  snd.music = ctx.createGain(); snd.music.gain.value = 0; snd.music.connect(snd.master);
  // iOS unlock: play a one-sample silent buffer inside the user gesture
  const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  fetch('assets/audio/lofi-loop.mp3').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(buf => { const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = 0; src.loopEnd = Math.min(LOOP_LEN, buf.duration); src.connect(snd.music); src.start(); })
    .catch(() => { // file:// or old browser: plain looping <audio>, faded by hand
      const el = snd.musicEl = new Audio('assets/audio/lofi-loop.mp3'); el.loop = true; el.volume = 0; el.preload = 'auto';
    });
  return true;
};
const fadeEl = (el, to, ms = 1200) => { if (!el) return; cancelAnimationFrame(el._f); const from = el.volume, t0 = performance.now();
  if (to > 0 && el.paused) el.play().catch(() => {});
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.volume = from + (to - from) * k; if (k < 1) el._f = requestAnimationFrame(step); else if (to === 0) el.pause(); };
  el._f = requestAnimationFrame(step); };
// voice slot: the hero video's own audio if it exists, else assets/intro-voice.mp3 if it exists, else nothing
const findVoice = () => {
  if (snd.voice !== null) return;
  if ($('#avatar').classList.contains('has-video')) { snd.voice = vid; return; }
  snd.voice = false;
  const v = new Audio(); v.preload = 'auto';
  v.addEventListener('canplaythrough', () => { snd.voice = v; v.volume = 0; v.addEventListener('ended', () => { snd.voiceDone = true; mix(); }); mix(); }, { once: true });
  v.addEventListener('error', () => {}, { once: true });
  v.src = 'assets/intro-voice.mp3';
};
vid.addEventListener('timeupdate', () => { if (snd.voice === vid && vid._lt > vid.currentTime + 1) { snd.voiceDone = true; mix(); } vid._lt = vid.currentTime; });
const mix = () => {
  const c = snd.ctx, v = snd.voice, talking = snd.on && snd.inHero && v && !snd.voiceDone;
  const mv = !snd.on ? 0 : talking ? 0.1 : 0.55;
  if (c) { snd.music.gain.cancelScheduledValues(c.currentTime); snd.music.gain.setTargetAtTime(mv, c.currentTime, 0.5); }
  fadeEl(snd.musicEl, mv);
  if (v === vid) { if (talking) { vid.muted = false; fadeEl(vid, 1, 600); } else { cancelAnimationFrame(vid._f); gsap.to(vid, { volume: 0, duration: 0.8, onComplete: () => { vid.muted = true; } }); } }
  else if (v) fadeEl(v, talking ? 1 : 0, talking ? 600 : 900);
};
const setSound = on => {
  if (on && !ensureCtx()) on = false;
  snd.on = on; try { localStorage.setItem(LS, on ? 'on' : 'off'); } catch (e) {}
  if (on) { snd.ctx.resume && snd.ctx.resume(); findVoice(); }
  btns.forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('.sound-label').textContent = on ? 'Sound on' : 'Sound off'; });
  mix(); blip(on ? 660 : 440, 0.1, 0.05);
};
// remembered "on": browsers still need one gesture, so start on the first tap/key
const armSound = () => { btns.forEach(b => b.classList.add('on')); const go = () => { ['pointerdown', 'keydown'].forEach(e => removeEventListener(e, go, true)); if (!snd.on) setSound(true); };
  ['pointerdown', 'keydown'].forEach(e => addEventListener(e, go, true)); };
const blip = (freq = 880, len = 0.08, vol = 0.04) => {
  if (!snd.on || !snd.ctx) return;
  const c = snd.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + len);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.1);
  o.connect(g).connect(snd.master); o.start(t); o.stop(t + len + 0.15);
};
btns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setSound(!snd.on); }));
ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 35%', onLeave: () => { snd.inHero = false; mix(); }, onEnterBack: () => { snd.inHero = true; mix(); } });
if (!mobile) $$('[data-snd], .nav-links a, .pt-el, .cat').forEach(el => el.addEventListener('mouseenter', () => blip(1200, 0.04, 0.015)));
document.addEventListener('click', e => { if (e.target.closest('[data-snd], .pt-el, .pt-lg')) blip(520, 0.12, 0.05); });

// ---------- talking hero video slot: assets/hero-talk.mp4 replaces the photo when it exists ----------
vid.addEventListener('loadeddata', () => { $('#avatar').classList.add('has-video'); vid.play().catch(() => {}); if (snd.on && snd.voice === false) { snd.voice = vid; mix(); } }, { once: true });
vid.addEventListener('error', () => vid.removeAttribute('src'), { once: true });
vid.preload = 'metadata'; vid.src = vid.dataset.src;

// ---------- cursor + magnetic ----------
if (!mobile && !reduce) {
  const cur = $('#cursor');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('mousemove', e => { cur.style.opacity = 1; xTo(e.clientX); yTo(e.clientY); });
  $$('a, button, input, select, textarea, .chip').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('big'));
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });
  $$('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power3.out' });
    });
    b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.3)' }));
  });
} else $('#cursor').remove();

// ---------- hero parallax + intro word reveal ----------
if (!reduce) {
  gsap.to('.mega', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.reveal-text .w', { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top 75%', end: 'bottom 45%', scrub: true } });
}

// ---------- stacking decks (transform + overlay opacity only; no filters) ----------
const stackFx = (sel, inner, scaleTo, dimTo) => {
  if (reduce) return;
  const items = $$(sel);
  items.forEach((it, i) => {
    const next = items[i + 1]; if (!next) return;
    const el = inner ? it.querySelector(inner) : it;
    gsap.fromTo(el, { scale: 1, '--dim': 0 }, { scale: scaleTo, '--dim': dimTo, ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true } });
  });
};
stackFx('.pcard', '.pcard-in', 0.92, 0.35);
stackFx('.rv', null, 0.92, 0.4);

// ---------- projects: scroll-pinned horizontal slider + cursor layer (data from projects.js) ----------
const P = window.PROJECTS || [], slider = $('#slider'), rail = $('#rail');
const sizes = ['l', 's', 'm', 'l', 'm', 's'];
const cardHTML = (p, i) => `<figure class="slide" data-i="${i}"><div class="sw"><img src="${p.cover || p.full}" data-full="${p.full || ''}" alt="${p.title} website" loading="lazy" draggable="false"><button class="pv" type="button" data-open="${i}" aria-label="View project: ${p.title}">View project <i>→</i></button></div><figcaption><b><small>${String(i + 1).padStart(2, '0')}</small>${p.title}</b><span>${p.niche || p.category}</span></figcaption></figure>`;
rail.innerHTML = P.map(cardHTML).join('');
const slides = $$('.slide'), pad2 = n => String(n).padStart(2, '0');
$('#smTot').textContent = pad2(P.length);
let active = -1;
const setActive = i => { if (i === active || !P[i]) return; active = i;
  $('#smNum').textContent = pad2(i + 1); $('#smTitle').textContent = P[i].title; $('#smCat').textContent = P[i].category + (P[i].niche ? ' · ' + P[i].niche : '');
  if (!reduce) gsap.fromTo('.sm-title', { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true }); };
const nearest = () => { const c = innerWidth / 2; let best = 0, bd = 1e9;
  slides.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - c); if (d < bd) { bd = d; best = i; } }); return best; };
setActive(0);
let dragMoved = false;
if (reduce || mobile) {
  slider.classList.add(mobile ? 'stacked' : 'native');
  if (mobile && !reduce) slides.forEach(sl => gsap.fromTo(sl.querySelector('.sw'), { clipPath: 'inset(18% 6% 0% 6% round 22px)', y: 40 }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: sl, start: 'top 88%', once: true } }));
  let raf = 0; slider.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setActive(nearest())); }, { passive: true });
} else {
  // pinned: vertical scroll drives the rail; cursor layers an offset + skew on top (desktop)
  const pinEl = $('#workPin'), bar = $('#spBar'); pinEl.classList.add('pinmode');
  const setX = gsap.quickSetter(rail, 'x', 'px');
  const last = slides[slides.length - 1];
  const dist = () => Math.max(0, last.offsetLeft + last.offsetWidth / 2 - innerWidth / 2);
  const st = { x: 0 };
  gsap.to(st, { x: () => dist(), ease: 'none', scrollTrigger: { trigger: pinEl, start: 'top top', end: () => '+=' + Math.round(dist() * (mobile ? 1.1 : 1.25)), pin: true, scrub: mobile ? 0.6 : 1, anticipatePin: 1, invalidateOnRefresh: true,
    onToggle: self => $('.floaters').classList.toggle('in-pin', self.isActive), onUpdate: self => { bar.style.transform = `scaleX(${self.progress})`; } } });
  let mT = 0, mC = 0, prev = 0, frame = 0, inView = false;
  ScrollTrigger.create({ trigger: pinEl, start: 'top bottom', end: () => '+=' + (innerHeight * 2 + dist() * 1.3), onToggle: s => inView = s.isActive });
  if (!mobile) pinEl.addEventListener('mousemove', e => { mT = (e.clientX / innerWidth - 0.5) * innerWidth * 0.16; });
  if (!mobile) pinEl.addEventListener('mouseleave', () => { mT = 0; });
  addEventListener('load', () => ScrollTrigger.refresh());
  gsap.ticker.add(() => {
    if (!inView) return;
    mC += (mT - mC) * 0.07;
    // keep the cursor offset from pushing the first/last card past the screen edge
    const D = dist(), cur = gsap.utils.clamp(-innerWidth * 0.04, D + innerWidth * 0.04, st.x + mC), v = gsap.utils.clamp(-40, 40, cur - prev); prev = cur;
    setX(-cur);
    if (!mobile) slides.forEach(s => gsap.set(s, { skewX: -v * 0.12, rotate: -v * 0.04 }));
    if (++frame % 6 === 0) setActive(nearest());
  });
}
// hover: scroll through the full-page screenshot like a live preview (transform only)
if (!mobile && !reduce) slides.forEach(s => {
  const img = s.querySelector('img'); let tw = null;
  const go = () => { const d = Math.max(0, img.getBoundingClientRect().height - s.clientHeight);
    tw && tw.kill(); tw = gsap.to(img, { y: -d, duration: Math.max(2, d / 260), ease: 'power1.inOut' }); };
  s.addEventListener('mouseenter', () => {
    if (img.dataset.full && img.src.indexOf(img.dataset.full) < 0) { const n = new Image(); n.onload = () => { img.src = img.dataset.full; requestAnimationFrame(go); }; n.src = img.dataset.full; }
    else go();
  });
  s.addEventListener('mouseleave', () => { tw && tw.kill(); tw = gsap.to(img, { y: 0, duration: 1.2, ease: 'power3.out' }); });
});
// entrance: clip-path reveal
if (!reduce && !mobile) gsap.fromTo(slides, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: slider, start: 'top 85%', once: true } });
// lightbox
const lb = $('#lightbox'); let lbi = 0;
const showLb = i => { lbi = i; const p = P[i]; $('#lbImg').src = p.full || p.cover; $('.lb-scroll').scrollTop = 0; $('#lbImg').alt = p.title; $('#lbCap').innerHTML = `<span>${p.title} · ${p.category}</span>` + (p.link ? `<a href="${p.link}" target="_blank" rel="noopener">Visit site ↗</a>` : ''); };
function closeLb() { if (!lb.classList.contains('open')) return; lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); if (!document.body.classList.contains('cv-open')) lenis && lenis.start(); }
const step = d => showLb((lbi + d + P.length) % P.length);
const openLb = i => { showLb(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); blip(520, 0.12, 0.05); };
document.addEventListener('click', e => { const b = e.target.closest('[data-open]'), sl = e.target.closest('.slide'); if (!b && !sl) return;
  if (dragMoved) { dragMoved = false; return; } e.preventDefault(); openLb(+(b ? b.dataset.open : sl.dataset.i)); });
$('.lb-close').addEventListener('click', closeLb); $('.lb-prev').addEventListener('click', () => step(-1)); $('.lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
const cursorEl = $('#cursor');
if (cursorEl) slides.forEach(t => { t.addEventListener('mouseenter', () => cursorEl.classList.add('view')); t.addEventListener('mouseleave', () => cursorEl.classList.remove('view')); });

// ---------- section reveals ----------
// v10: reusable reveal system. Markup: data-anim="fade|fade-up|fade-down|fade-left|fade-right" [data-delay="0.2"] [data-split="words"]
// Defaults are assigned here so every section gets a consistent, varied rhythm; explicit attributes in HTML win.
const AUTO = [
  ['main section .eyebrow, .sec-head .eyebrow', 'fade-right'],
  ['.h2, .big-cta, .mega-2', 'fade-up', 'words'],
  ['.svc-sub, .sim-sub, .contact-copy p, .sim-note, .slider-hint', 'fade-up'],
  ['.sec-head .ulink', 'fade-left'],
  ['.cta-band p', 'fade-right'], ['.cta-band .btn', 'fade-left'],
  ['.stats > div', 'fade-up'], ['.lead > *', 'fade-up'],
  ['.hero-sub, .ctas', 'none'], ['footer > *', 'fade']
];
AUTO.forEach(([sel, a, sp]) => $$(sel).forEach(el => {
  if (el.closest('#catView, .rv, .hero, .menu') || el.hasAttribute('data-anim')) return;
  el.dataset.anim = a; if (sp) el.dataset.split = sp;
}));
const splitWords = el => { // wrap each word in a masked span, keep inline tags like <em>/<br>
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3 && c.textContent.trim()) {
      const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) { f.append(t); return; }
        const o = document.createElement('span'); o.className = 'aw'; const i = document.createElement('span'); i.className = 'ai'; i.textContent = t; o.append(i); f.append(o); });
      c.replaceWith(f);
    } else if (c.nodeType === 1 && c.tagName !== 'BR' && !c.classList.contains('aw')) walk(c);
  });
  walk(el); return el.querySelectorAll('.ai');
};
const OFF = { 'fade': {}, 'fade-up': { y: 40 }, 'fade-down': { y: -40 }, 'fade-left': { x: 48 }, 'fade-right': { x: -48 } };
const anims = $$('[data-anim]').filter(el => el.dataset.anim !== 'none');
if (!reduce && window.ScrollTrigger) anims.forEach(el => {
  try {
    const d = parseFloat(el.dataset.delay) || 0, st = { trigger: el, start: 'top 90%', once: true };
    if (el.dataset.split === 'words') {
      const w = splitWords(el);
      gsap.from(w, { yPercent: 110, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.05, delay: d, scrollTrigger: st, clearProps: 'transform,opacity' });
    } else gsap.from(el, { ...(OFF[el.dataset.anim] || {}), opacity: 0, duration: 1, ease: 'expo.out', delay: d, scrollTrigger: st, clearProps: 'transform,opacity' });
  } catch (e) { el.style.opacity = ''; el.style.transform = ''; }
});
// safety net: anything still hidden 1.2s after it scrolled into view (or if ScrollTrigger failed) is forced visible
const unhide = () => anims.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) [el, ...el.querySelectorAll('.ai')].forEach(n => { if (getComputedStyle(n).opacity === '0') gsap.set(n, { clearProps: 'all' }); }); });
let uhT; addEventListener('scroll', () => { clearTimeout(uhT); uhT = setTimeout(unhide, 1200); }, { passive: true });
setTimeout(unhide, 4000);
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

// ---------- category cards -> full-screen category view (clip-path wipe from the card, history-aware) ----------
const CATS = window.CATEGORIES || [], catList = $('#catList'), cv = $('#catView'), cvBody = $('#cvBody');
const catProjects = c => P.map((p, i) => [p, i]).filter(([p]) => (p.categories || []).includes(c.key));
catList.innerHTML = CATS.map((c, k) => { const n = catProjects(c).length;
  return `<button class="cat" type="button" data-cat="${k}" aria-haspopup="dialog"><span class="cat-n">${c.num}</span><span class="cat-t"><strong>${c.title}</strong><em>${c.line}</em></span><span class="cat-m"><b>${n ? n + ' projects' : 'Service'}</b><i>→</i></span></button>`; }).join('');
if (!reduce) gsap.from('.cat', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: catList, start: 'top 85%', once: true } });
let cvOpen = false, cvRect = null, cvRun = false, cvCur = 0, cvLast = 0, cvEx = [], cvCenters = [];
const cvScroll = $('#cvScroll'), cvRow = $('#cvRow'), cvWall = $('#cvWall');
const rectClip = r => r ? `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 18px)` : 'inset(50% 0% 50% 0%)';
const exWrap = (inner, plaque) => `<div class="ex"><div class="ex-inner"><span class="ex-lamp"></span><span class="ex-glow"></span><div class="ex-frame"><div class="ex-mat">${inner}</div><span class="ex-dim"></span></div>${plaque}</div></div>`;
function renderCat(c) {
  const items = catProjects(c);
  $('#cvNum').textContent = c.num; $('#cvTitle').textContent = c.title;
  $('#cvKick').textContent = items.length ? 'The studio' : 'The service';
  $('.cv-hint').textContent = items.length ? 'Scroll to walk the studio' : 'Scroll to walk through it';
  const pts = c.points || [];
  const html = items.map(([p, i]) => exWrap(`<div class="ex-bar"><i></i><i></i><i></i><span></span></div><div class="ex-shot"><img src="${p.cover || p.full}" alt="${p.title} website" loading="lazy" draggable="false"></div>`,
        `<div class="ex-plaque"><b>${p.title}</b><small>${p.niche} · ${p.category}</small><button class="ex-btn" type="button" data-open="${i}">View full site <i>↗</i></button></div>`))
    .concat(pts.map((x, k) => exWrap(`<div class="ex-card"><span class="n">${['I','II','III','IV','V','VI'][k]}</span><p>${x}</p></div>`, `<div class="ex-plaque"><b>${c.title}</b><small>What's included · ${k + 1} of ${pts.length}</small></div>`)))
    .concat(exWrap(`<div class="ex-card cta"><span class="n">→</span><p>${items.length ? 'Want one like these?' : 'Case studies are on the way.'} Let's talk about yours.</p><a href="#contact" class="btn" data-cv-cta data-snd><span>Book a free strategy call</span><i>→</i></a></div>`, `<div class="ex-plaque"><b>Your project, next</b><small>Free 30-min call</small></div>`));
  cvRow.innerHTML = html.join('');
  cvEx = $$('.ex', cvRow); $('#cvTot').textContent = pad2(cvEx.length); $('#cvTrack').style.setProperty('--n', cvEx.length);
}
function cvMeasure() { cvCenters = cvEx.map(e => e.offsetLeft + e.offsetWidth / 2); }
function cvFrame(now) {
  if (!cvRun) return; requestAnimationFrame(cvFrame);
  const N = cvEx.length, max = cvScroll.scrollHeight - cvScroll.clientHeight, t = max > 0 ? cvScroll.scrollTop / max : 0, target = t * (N - 1);
  const dt = Math.min(0.1, (now - (cvLast || now)) / 1000); cvLast = now;
  cvCur += (target - cvCur) * (reduce ? 1 : 1 - Math.exp(-dt * 6)); if (Math.abs(target - cvCur) < 0.0005) cvCur = target;
  const i0 = Math.max(0, Math.min(N - 1, Math.floor(cvCur))), i1 = Math.min(N - 1, i0 + 1), f = cvCur - i0;
  const cx = cvCenters[i0] * (1 - f) + cvCenters[i1] * f, bob = reduce ? 0 : Math.sin(cvCur * Math.PI * 2) * 3;
  cvRow.style.transform = `translate3d(${(innerWidth / 2 - cx).toFixed(1)}px,calc(-50% + ${bob.toFixed(2)}px),0)`;
  cvWall.style.transform = `translate3d(${(-cx * 0.04 % 120).toFixed(1)}px,0,0)`;
  for (let i = 0; i < N; i++) { const d = i - cvCur, ad = Math.abs(d), lit = Math.max(0, 1 - ad * 1.1);
    cvEx[i].style.setProperty('--lit', lit.toFixed(3));
    cvEx[i].style.transform = `rotateY(${Math.max(-28, Math.min(28, -d * 15)).toFixed(2)}deg) scale(${(1 - Math.min(ad, 1.5) * 0.1).toFixed(3)})`; }
  $('#cvNow').textContent = pad2(Math.round(cvCur) + 1); $('#cvProg').style.transform = `scaleX(${t.toFixed(3)})`;
}
function openCat(k, card, push = true) {
  const c = CATS[k]; if (!c) return; renderCat(c); cvOpen = true;
  cvRect = card ? card.getBoundingClientRect() : null;
  document.body.classList.add('cv-open'); lenis && lenis.stop(); document.documentElement.style.overflow = 'hidden';
  cv.classList.add('open'); cv.setAttribute('aria-hidden', 'false'); cvScroll.scrollTop = 0; cvCur = 0; cvLast = 0;
  cvMeasure(); cvRun = true; requestAnimationFrame(cvFrame);
  if (push) history.pushState({ cat: k }, '', '#category-' + (k + 1));
  gsap.killTweensOf(cv);
  if (reduce) gsap.set(cv, { clipPath: 'inset(0% 0% 0% 0% round 0px)' });
  else {
    // staged entrance: room wipes open from the card -> heading rises -> frames slide in -> lamps glow on -> plaques settle
    const inners = $$('.ex-inner', cvRow), glows = $$('.ex-glow', cvRow), lamps = $$('.ex-lamp', cvRow);
    const tl = gsap.timeline();
    tl.fromTo(cv, { clipPath: rectClip(cvRect) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.85, ease: 'expo.inOut' })
      .from('.cv-floor', { yPercent: 100, duration: 0.8, ease: 'expo.out' }, 0.35)
      .from('.cv-head > *', { y: 40, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, 0.5)
      .from(['.cv-close', '.cv-bar'], { opacity: 0, y: 16, duration: 0.6, ease: 'power3.out' }, 0.6)
      .from(inners, { x: 220, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0.5)
      .from(lamps, { opacity: 0, y: -14, duration: 0.5, ease: 'power2.out', stagger: 0.07 }, 0.95)
      .fromTo(glows, { opacity: 0 }, { opacity: (i, el) => +(getComputedStyle(el.closest('.ex')).getPropertyValue('--lit')) * .95, duration: 0.12, repeat: 3, yoyo: true, ease: 'none', clearProps: 'opacity' }, 1.15);
  }
  blip(440, 0.14, 0.05); setTimeout(() => blip(880, 0.06, 0.03), 1150);
  setTimeout(() => cvScroll.focus({ preventScroll: true }), 60);
}
function closeCat() {
  if (!cvOpen) return; cvOpen = false; closeLb();
  const done = () => { cvRun = false; cv.classList.remove('open'); cv.setAttribute('aria-hidden', 'true'); document.body.classList.remove('cv-open'); document.documentElement.style.overflow = ''; lenis && lenis.start(); };
  if (reduce) done(); else { gsap.to('.ex-inner', { opacity: 0, y: 30, duration: 0.35, ease: 'power2.in', stagger: 0.03 }); gsap.to(cv, { clipPath: rectClip(cvRect), duration: 0.7, delay: 0.2, ease: 'expo.inOut', onComplete: done }); }
}
addEventListener('resize', () => cvOpen && cvMeasure());
cv.addEventListener('keydown', e => { const N = cvEx.length, step = (cvScroll.scrollHeight - cvScroll.clientHeight) / Math.max(1, N - 1);
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); cvScroll.scrollTo({ top: Math.min(N - 1, Math.round(cvCur) + 1) * step, behavior: 'smooth' }); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); cvScroll.scrollTo({ top: Math.max(0, Math.round(cvCur) - 1) * step, behavior: 'smooth' }); } });
cvRow.addEventListener('click', e => { const ex = e.target.closest('.ex'); if (!ex || e.target.closest('button,a')) return; const i = cvEx.indexOf(ex);
  if (i !== Math.round(cvCur)) { e.stopPropagation(); const N = cvEx.length; cvScroll.scrollTo({ top: i * (cvScroll.scrollHeight - cvScroll.clientHeight) / Math.max(1, N - 1), behavior: 'smooth' }); } }, true);
catList.addEventListener('click', e => { const b = e.target.closest('.cat'); if (b) openCat(+b.dataset.cat, b); });
$('.cv-close').addEventListener('click', () => { history.state && history.state.cat != null ? history.back() : closeCat(); });
cv.addEventListener('click', e => { if (e.target.closest('[data-cv-cta]')) { e.preventDefault(); history.state && history.state.cat != null ? history.back() : closeCat(); setTimeout(() => scrollToEl($('#contact')), 800); } });
addEventListener('popstate', e => { if (e.state && e.state.cat != null) { if (!cvOpen) openCat(e.state.cat, null, false); } else closeCat(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && cvOpen && !lb.classList.contains('open')) $('.cv-close').click(); }, true);
const deep = location.hash.match(/^#category-(\d+)$/); if (deep) { history.replaceState(null, '', location.pathname); history.pushState({ cat: +deep[1] - 1 }, '', deep[0]); openCat(+deep[1] - 1, null, false); }

// ---------- lead growth simulator ----------
{
  const g = id => document.getElementById(id), fmt = n => Math.round(n).toLocaleString('en-US');
  const out = { leads: 0, cur: 0, nw: 0, rev: 0 };
  const calc = () => {
    const vis = +g('sVis').value, cr = +g('sCur').value, nr = Math.max(+g('sNew').value, cr), val = +g('sVal').value;
    g('vVis').textContent = fmt(vis); g('vCur').textContent = cr.toFixed(1) + '%'; g('vNew').textContent = (+g('sNew').value).toFixed(1) + '%'; g('vVal').textContent = '$' + fmt(val);
    const cur = vis * cr / 100, nw = vis * nr / 100, max = Math.max(nw, 1);
    gsap.to(out, { leads: nw - cur, cur, nw, rev: (nw - cur) * 12 * 0.1 * val, duration: reduce ? 0 : 0.8, ease: 'power3.out', overwrite: true,
      onUpdate: () => { g('oLeads').textContent = fmt(out.leads); g('oCur').textContent = fmt(out.cur); g('oNew').textContent = fmt(out.nw); g('oRev').textContent = '$' + fmt(out.rev); } });
    gsap.to('#bCur', { scaleX: cur / max, duration: reduce ? 0 : 0.8, ease: 'power3.out', overwrite: true });
    gsap.to('#bNew', { scaleX: nw / max, duration: reduce ? 0 : 0.8, ease: 'power3.out', overwrite: true });
    $$('.rng input').forEach(r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'));
  };
  $$('.rng input').forEach(r => { r.addEventListener('input', calc); r.addEventListener('change', () => blip(660, 0.08, 0.03)); });
  calc();
  const card = g('simCard');
  if (!mobile && !reduce) card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  if (!reduce) gsap.from('.sim-card', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.sim', start: 'top 80%', once: true } });
}

// ---------- count-up ----------
$$('.cnt').forEach(el => {
  const to = +el.dataset.to;
  if (reduce) { el.textContent = to; return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 2, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v), scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
});

// ---------- marquee with scroll velocity ----------
const track = $('#track');
track.innerHTML += track.innerHTML;
if (!reduce) {
  let x = 0, boost = 0, dir = -1;
  ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 120, 25); dir = s.direction === 1 ? -1 : 1; } });
  gsap.ticker.add(() => {
    const half = track.scrollWidth / 2;
    x += dir * (1 + boost); boost *= 0.92;
    if (x <= -half) x += half; if (x > 0) x -= half;
    gsap.set(track, { x });
  });
}

// ---------- floating buttons hide over contact ----------
// badge entrance + hide LET'S TALK pill while hero headline is on screen (desktop)
if (!reduce) gsap.from('.ut-badge', { y: -16, opacity: 0, duration: 1, ease: 'expo.out', delay: 1.1, clearProps: 'opacity,transform' });
if (!mobile) ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: '45% top', onToggle: st => $('.floaters').classList.toggle('in-hero', st.isActive) });
const UP = (window.SITE_CONFIG || {}).UPWORK_URL; if (UP) { const bd = $('.ut-badge'); bd.href = UP; bd.target = '_blank'; bd.rel = 'noopener'; }
if (UP) $$('[data-upwork]').forEach(a => a.href = UP);
ScrollTrigger.create({ trigger: '#contact', start: 'top 70%', end: 'bottom top', onToggle: st => $('.floaters').classList.toggle('hide', st.isActive) });

// ---------- lead form (frontend; set FORM_ENDPOINT in projects.js to go live) ----------
const form = $('#lead'), note = $('#note');
async function send(data) {
  if (!CFG.FORM_ENDPOINT) { await new Promise(r => setTimeout(r, 700)); return true; } // prototype mode
  const res = await fetch(CFG.FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
  return res.ok;
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll('[required]').forEach(f => { const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)); f.classList.toggle('err', bad); if (bad) ok = false; });
  if (!ok) { note.textContent = 'Please add your name and a valid email.'; return; }
  const fd = new FormData(form), data = Object.fromEntries(fd); data.services = fd.getAll('services');
  note.textContent = 'Sending…';
  try {
    if (!(await send(data))) throw 0;
    form.hidden = true; const s = $('#success'); s.hidden = false;
    if (!CFG.FORM_ENDPOINT) s.querySelector('p').textContent += ' (Prototype — nothing was actually sent.)';
    if (!reduce) gsap.from(s, { y: 40, opacity: 0, duration: 0.8, ease: 'expo.out' });
    ScrollTrigger.refresh();
  } catch { note.textContent = 'Something went wrong — please try WhatsApp or email.'; }
});

// ---------- About: hanging ID card (pendulum physics, canvas lanyard, flip on tap) ----------
(() => {
  const stage = $('#idcStage'), pend = $('#idcPend'), card = $('#idcCard'), inner = $('#idcInner'), cv = $('#idcStrap');
  if (!stage) return;
  const qr = $('.idc-qr'); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cells = []; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const f = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const fin = f && (((x % 14) === 0 || (x % 14) === 6 || y % 14 === 0 || y % 14 === 6) || ((x % 14) > 1 && (x % 14) < 5 && (y % 14) > 1 && (y % 14) < 5));
    if (f ? fin : rnd() > 0.52) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }
  qr.innerHTML = `<svg viewBox="0 0 21 21" shape-rendering="crispEdges">${cells.join('')}</svg>`;
  const ctx = cv.getContext('2d'); let W, H, L, dpr;
  const st = { th: 0.0, w: 0, thm: 0, flip: 0, drag: false, lastT: 0, vis: false };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight; L = parseFloat(getComputedStyle(stage).getPropertyValue('--L')) || 260;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
  size(); addEventListener('resize', size);
  const drawStrap = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const ax = W / 2, ex = ax - Math.sin(st.th) * L, ey = Math.cos(st.th) * L;
    const mx = ax - Math.sin(st.thm) * L * 0.5, my = Math.cos(st.thm) * L * 0.5 + 6;
    for (const [off, col, wd] of [[0, '#7a3a17', 20], [0, '#d4703a', 16]]) { ctx.beginPath(); ctx.moveTo(ax, -10); ctx.quadraticCurveTo(mx * 2 - (ax + ex) / 2, my * 2 - (ey - 10) / 2, ex, ey - 14);
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineCap = 'butt'; ctx.stroke(); }
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,230,200,.45)';
    ctx.beginPath(); ctx.moveTo(ax, -10); ctx.quadraticCurveTo(mx * 2 - (ax + ex) / 2, my * 2 - (ey - 10) / 2, ex, ey - 14); ctx.stroke(); ctx.setLineDash([]);
  };
  const render = () => {
    const twist = Math.max(-25, Math.min(25, st.w * 9));
    pend.style.transform = `rotate(${st.th}rad)`;
    const ang = (st.flip + twist) * Math.PI / 180, c = Math.cos(ang);
    inner.style.transform = `scaleX(${Math.max(0.02, Math.abs(c)).toFixed(4)}) skewY(${(Math.sin(ang) * (c < 0 ? -6 : 6)).toFixed(2)}deg)`; // 2D flip: no WebKit 3D bugs
    const isBack = Math.cos((st.flip + twist) * Math.PI / 180) < 0; if (isBack !== st.isBack) { st.isBack = isBack; inner.classList.toggle('is-back', isBack); }
    drawStrap();
  };
  const tick = t => {
    const dt = Math.min(0.033, (t - (st.lastT || t)) / 1000); st.lastT = t;
    if (!st.drag && !reduce) { const a = -9.5 * Math.sin(st.th) - 0.9 * st.w; st.w += a * dt; st.w = Math.max(-6, Math.min(6, st.w)); st.th += st.w * dt; }
    st.thm += (st.th - st.thm) * Math.min(1, dt * 9);
    render(); if (st.vis) requestAnimationFrame(tick); else st.lastT = 0;
  };
  new IntersectionObserver(es => es.forEach(e => { const was = st.vis; st.vis = e.isIntersecting; if (st.vis && !was) { if (!st.entered) { st.entered = true; st.th = -0.35; st.w = 0.4; } requestAnimationFrame(tick); } })).observe(stage);
  render();
  // drag + tap
  let sx = 0, sy = 0, moved = false, lastA = 0, lastTime = 0;
  const angleAt = e => { const r = stage.getBoundingClientRect(); return -Math.atan2(e.clientX - (r.left + W / 2), Math.max(40, e.clientY - r.top)); };
  card.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); st.drag = true; moved = false; sx = e.clientX; sy = e.clientY; lastA = st.th; lastTime = performance.now(); card.setPointerCapture(e.pointerId); card.classList.add('grab'); });
  card.addEventListener('pointermove', e => { if (!st.drag) return; if (Math.hypot(e.clientX - sx, e.clientY - sy) > 6) moved = true; if (!moved) return;
    const a = Math.max(-1.2, Math.min(1.2, angleAt(e))), now = performance.now(), dtt = Math.max(1, now - lastTime) / 1000;
    st.w = Math.max(-5, Math.min(5, (a - lastA) / Math.max(0.016, dtt) * 0.6)); st.th = a; lastA = a; lastTime = now; });
  const flip = () => { gsap.to(st, { flip: st.flip >= 90 ? 0 : 180, duration: 0.9, ease: 'back.out(1.4)' }); st.w += (st.th > 0 ? -1 : 1) * 1.2; blip(st.flip >= 90 ? 520 : 780, 0.12, 0.04);
    card.setAttribute('aria-label', st.flip >= 90 ? 'ID card front. Press to flip' : 'ID card back: services and contact. Press to flip'); };
  const up = e => { if (!st.drag) return; st.drag = false; card.classList.remove('grab'); if (!moved && !e.target.closest('.idc-cta')) flip(); };
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', () => { st.drag = false; card.classList.remove('grab'); });
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  // cursor proximity nudge
  let pmx = null; stage.addEventListener('mousemove', e => { if (st.drag) return; if (pmx !== null) { const r = card.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (d < 260) st.w += (e.clientX - pmx) * 0.0016 * (1 - d / 260); } pmx = e.clientX; });
  stage.addEventListener('mouseleave', () => pmx = null);
  window.__idc = st; // for testing
})();

// ---------- Skills: periodic table ----------
(() => {
  const grid = $('#ptGrid'), det = $('#ptDetail'), leg = $('#ptLegend'); if (!grid) return;
  const CAT = { cms: 'CMS & builders', design: 'Design', growth: 'Growth & marketing', code: 'Code' };
  const E = [
    ['Wp', 'WordPress', 'cms', 'Custom themes and sites clients can actually manage.'], ['El', 'Elementor', 'cms', 'Pixel-accurate Elementor builds with global styles and templates.'],
    ['Dv', 'Divi', 'cms', 'Divi layouts that stay fast and easy to edit.'], ['Gb', 'Gutenberg', 'cms', 'Block-based pages and reusable block patterns.'],
    ['Wc', 'WooCommerce', 'cms', 'Online stores, product setups and checkout tweaks.'], ['Ai', 'AI to WordPress', 'cms', 'AI-generated designs turned into real, editable WordPress sites.'],
    ['Fg', 'Figma to WP', 'design', 'Figma files rebuilt in WordPress, faithful to the design.'], ['Ux', 'UI/UX', 'design', 'User flows and interfaces that make the next step obvious.'],
    ['Wf', 'Wireframes', 'design', 'Low-fidelity layouts to agree structure before visuals.'], ['Pt', 'Prototypes', 'design', 'Clickable Figma prototypes to test before building.'],
    ['Lp', 'Landing Pages', 'growth', 'One-goal pages built to convert ad and search traffic.'], ['Se', 'SEO', 'growth', 'Technical, on-page and local SEO that gets you found.'],
    ['Gp', 'Google Business', 'growth', 'Google Business Profile setup for local map visibility.'], ['Pc', 'PPC', 'growth', 'Google Ads campaigns with pages that match the ad.'],
    ['Ga', 'GA4', 'growth', 'Analytics that shows where enquiries come from.'], ['Gt', 'Tag Manager', 'growth', 'Form, call and click conversion tracking via GTM.'],
    ['Cr', 'CRO', 'growth', 'Small changes, tested, that lift enquiry rates.'],
    ['Ht', 'HTML5', 'code', 'Clean, semantic, accessible markup.'], ['Cs', 'CSS3', 'code', 'Responsive layouts and smooth, lightweight animation.'],
    ['Js', 'JavaScript', 'code', 'Interactive features without heavy plugins.'], ['Ph', 'PHP', 'code', 'Custom WordPress functions, hooks and plugins.'],
    ['Mg', 'MongoDB', 'code', 'The M in MERN: flexible document databases.'], ['Ex', 'Express', 'code', 'The E in MERN: lean Node.js APIs.'],
    ['Re', 'React', 'code', 'The R in MERN: fast, component-based front-ends.'], ['Nd', 'Node.js', 'code', 'The N in MERN: server-side JavaScript.']
  ];
  leg.innerHTML = `<button class="pt-lg on" data-f="all" aria-pressed="true">All</button>` + Object.entries(CAT).map(([k, v]) => `<button class="pt-lg" data-f="${k}" aria-pressed="false"><i class="c-${k}"></i>${v}</button>`).join('');
  grid.innerHTML = E.map(([sym, name, c], i) => `<button class="pt-el c-${c}" data-i="${i}" data-c="${c}" aria-label="${name}"><small>${i + 1}</small><b>${sym}</b><span>${name}</span></button>`).join('');
  const show = i => { const [sym, name, c, d] = E[i]; det.className = 'pt-detail c-' + c;
    det.innerHTML = `<div class="pt-big"><small>${i + 1}</small><b>${sym}</b><span>${name}</span><em>${CAT[c]}</em></div><p>${d}</p>`;
    $$('.pt-el', grid).forEach(b => b.classList.toggle('sel', +b.dataset.i === i)); };
  show(0);
  grid.addEventListener('mouseover', e => { const b = e.target.closest('.pt-el'); if (b && !mobile) show(+b.dataset.i); });
  grid.addEventListener('click', e => { const b = e.target.closest('.pt-el'); if (b) show(+b.dataset.i); });
  grid.addEventListener('focusin', e => { const b = e.target.closest('.pt-el'); if (b) show(+b.dataset.i); });
  leg.addEventListener('click', e => { const b = e.target.closest('.pt-lg'); if (!b) return; const f = b.dataset.f;
    $$('.pt-lg', leg).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    grid.classList.toggle('filtering', f !== 'all'); $$('.pt-el', grid).forEach(x => x.classList.toggle('hit', x.dataset.c === f));
    if (f !== 'all') show(E.findIndex(x => x[2] === f)); });
  if (!reduce && window.ScrollTrigger) gsap.from($$('.pt-el', grid), { y: 30, opacity: 0, scale: 0.9, duration: 0.7, ease: 'expo.out', stagger: { each: 0.03, from: 'start' }, clearProps: 'transform,opacity', scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
})();

addEventListener('load', () => ScrollTrigger.refresh());
})();

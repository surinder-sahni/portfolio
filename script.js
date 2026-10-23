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

// ---------- preloader ----------
const count = $('#count'), pre = $('#preloader');
const intro = () => {
  document.body.classList.remove('is-loading');
  ScrollTrigger.refresh();
  if (reduce) return;
  gsap.from('.mega .ch', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.03 });
  gsap.from('.hero .eyebrow, .avatar, .hero-bottom > *, .nav, .floaters', { y: 30, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.4, clearProps: 'opacity,transform' });
};
if (reduce) { pre.remove(); intro(); }
else {
  const o = { v: 0 };
  gsap.timeline()
    .to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(o.v); gsap.set('#prebar', { scaleX: o.v / 100 }); } })
    .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut', onStart: intro, onComplete: () => pre.remove() }, '+=0.1');
}

// ---------- audio (synthesised live with Web Audio, no files, OFF by default) ----------
const snd = { ctx: null, master: null, on: false };
const btns = $$('.sound');
const startAmbient = () => {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  const ctx = snd.ctx = new AC();
  const master = snd.master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7; lp.connect(master);
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 450; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
  // slow drifting chord: D minor 9 spread (warm pad)
  [73.42, 110, 146.83, 174.61, 220, 329.63].forEach((f, i) => {
    [-6, 6].forEach(d => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = d;
      g.gain.value = (i < 2 ? 0.09 : 0.035);
      const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 0.05 + i * 0.023; tg.gain.value = g.gain.value * 0.6;
      trem.connect(tg).connect(g.gain); trem.start();
      o.connect(g).connect(lp); o.start();
    });
  });
  // soft air noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.4;
  const ng = ctx.createGain(); ng.gain.value = 0.012; n.connect(bp).connect(ng).connect(master); n.start();
  return true;
};
const blip = (freq = 880, len = 0.08, vol = 0.04) => {
  if (!snd.on || !snd.ctx) return;
  const c = snd.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + len);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.1);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.15);
};
const vid = $('#avatarVideo');
const toggleSound = () => {
  if (!snd.ctx && !startAmbient()) return;
  snd.on = !snd.on;
  if (snd.on) snd.ctx.resume();
  snd.master.gain.cancelScheduledValues(snd.ctx.currentTime);
  snd.master.gain.setTargetAtTime(snd.on ? 0.55 : 0, snd.ctx.currentTime, 0.6);
  btns.forEach(b => { b.classList.toggle('on', snd.on); b.setAttribute('aria-pressed', snd.on); b.querySelector('.sound-label').textContent = snd.on ? 'Sound on' : 'Sound off'; });
  if (vid.dataset.video === 'on') vid.muted = !snd.on;
  blip(snd.on ? 660 : 440, 0.1, 0.05);
};
btns.forEach(b => b.addEventListener('click', toggleSound));
if (!mobile) $$('[data-snd], .nav-links a').forEach(el => el.addEventListener('mouseenter', () => blip(1200, 0.04, 0.015)));
$$('[data-snd]').forEach(el => el.addEventListener('click', () => blip(520, 0.12, 0.05)));

// ---------- avatar video slot ----------
if (vid.dataset.video === 'on') {
  vid.src = vid.dataset.src;
  vid.addEventListener("loadeddata", () => { $('#avatar').classList.add('has-video'); vid.play().catch(() => {}); }, { once: true });
  vid.addEventListener('error', () => vid.removeAttribute('src'), { once: true });
  vid.load();
}

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
const catProjects = c => c.match ? P.map((p, i) => [p, i]).filter(([p]) => (p.category + ' ' + p.niche).includes(c.match)) : [];
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
  const html = items.length
    ? items.map(([p, i]) => exWrap(`<div class="ex-bar"><i></i><i></i><i></i><span></span></div><div class="ex-shot"><img src="${p.cover || p.full}" alt="${p.title} website" loading="lazy" draggable="false"></div>`,
        `<div class="ex-plaque"><b>${p.title}</b><small>${p.niche} · ${p.category}</small><button class="ex-btn" type="button" data-open="${i}">View full site <i>↗</i></button></div>`))
    : (c.points || []).map((x, k) => exWrap(`<div class="ex-card"><span class="n">${['I','II','III','IV','V','VI'][k]}</span><p>${x}</p></div>`, `<div class="ex-plaque"><b>${c.title}</b><small>What's included · ${k + 1} of ${c.points.length}</small></div>`))
      .concat(exWrap(`<div class="ex-card cta"><span class="n">→</span><p>Case studies are on the way. Let's talk about yours.</p><a href="#contact" class="btn" data-cv-cta data-snd><span>Book a free strategy call</span><i>→</i></a></div>`, `<div class="ex-plaque"><b>Your project, next</b><small>Free 30-min call</small></div>`));
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

addEventListener('load', () => ScrollTrigger.refresh());
})();

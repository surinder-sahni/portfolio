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

// ---------- image-mask moment ----------
if (!reduce) {
  gsap.fromTo('.mask-type', { backgroundPosition: '50% 0%' }, { backgroundPosition: '50% 100%', ease: 'none', scrollTrigger: { trigger: '.mask', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.mask-type span', { yPercent: 60, opacity: 0, stagger: 0.15, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.mask-type', start: 'top 80%' } });
  gsap.fromTo('.mask-reveal', { clipPath: 'inset(30% 35% 30% 35% round 200px)' }, { clipPath: 'inset(0% 0% 0% 0% round 26px)', ease: 'none', scrollTrigger: { trigger: '.mask-reveal', start: 'top 90%', end: 'center 55%', scrub: true } });
  gsap.fromTo('.mask-reveal img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.mask-reveal', start: 'top bottom', end: 'bottom top', scrub: true } });
}

// ---------- projects: cursor-driven horizontal slider (data from projects.js) ----------
const P = window.PROJECTS || [], slider = $('#slider'), rail = $('#rail');
const sizes = ['l', 's', 'm', 'l', 'm', 's'];
rail.innerHTML = P.map((p, i) => `<figure class="slide sz-${['l','m','s'].includes(p.size) ? p.size : sizes[i % sizes.length]}" data-i="${i}" tabindex="0" role="button" aria-label="Open ${p.title}"><div class="sw"><img src="${p.cover || p.full}" data-full="${p.full || ''}" alt="${p.title} website" loading="lazy" draggable="false"></div><figcaption><small>${String(i + 1).padStart(2, '0')}</small><span>${p.niche || p.category}</span></figcaption></figure>`).join('');
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
if (reduce) {
  slider.classList.add('native');
  let raf = 0; slider.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setActive(nearest())); }, { passive: true });
} else {
  // pinned: vertical scroll drives the rail; cursor layers an offset + skew/parallax on top (desktop)
  const pinEl = $('#workPin'), bar = $('#spBar'); pinEl.classList.add('pinmode');
  const imgs = slides.map(s => s.querySelector('img')), setX = gsap.quickSetter(rail, 'x', 'px');
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
    const cur = st.x + mC, v = gsap.utils.clamp(-40, 40, cur - prev); prev = cur;
    setX(-cur);
    if (!mobile) { const c = innerWidth / 2;
      slides.forEach((s, i) => { gsap.set(s, { skewX: -v * 0.12, rotate: -v * 0.04 });
        const r = s.getBoundingClientRect(); gsap.set(imgs[i], { xPercent: -((r.left + r.width / 2 - c) / innerWidth) * 8 }); }); }
    if (++frame % 6 === 0) setActive(nearest());
  });
}
// hover: scroll through the full-page screenshot like a live preview (transform only)
if (!mobile && !reduce) slides.forEach(s => {
  const img = s.querySelector('img'); let tw = null;
  const go = () => { const d = Math.max(0, img.getBoundingClientRect().height / (gsap.getProperty(img, 'scale') || 1) - s.clientHeight);
    tw && tw.kill(); tw = gsap.to(img, { y: -d, duration: Math.max(2, d / 260), ease: 'power1.inOut' }); };
  s.addEventListener('mouseenter', () => {
    if (img.dataset.full && img.src.indexOf(img.dataset.full) < 0) { const n = new Image(); n.onload = () => { img.src = img.dataset.full; requestAnimationFrame(go); }; n.src = img.dataset.full; }
    else go();
  });
  s.addEventListener('mouseleave', () => { tw && tw.kill(); tw = gsap.to(img, { y: 0, duration: 1.2, ease: 'power3.out' }); });
});
// entrance: clip-path reveal
if (!reduce) gsap.fromTo(slides, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: slider, start: 'top 85%', once: true } });
// lightbox
const lb = $('#lightbox'); let lbi = 0;
const showLb = i => { lbi = i; const p = P[i]; $('#lbImg').src = p.full || p.cover; $('.lb-scroll').scrollTop = 0; $('#lbImg').alt = p.title; $('#lbCap').innerHTML = `<span>${p.title} · ${p.category}</span>` + (p.link ? `<a href="${p.link}" target="_blank" rel="noopener">Visit site ↗</a>` : ''); };
function closeLb() { if (!lb.classList.contains('open')) return; lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
const step = d => showLb((lbi + d + P.length) % P.length);
slides.forEach(t => { const open = () => { showLb(+t.dataset.i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); blip(520, 0.12, 0.05); };
  t.addEventListener('click', () => { if (dragMoved) { dragMoved = false; return; } open(); });
  t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); });
$('.lb-close').addEventListener('click', closeLb); $('.lb-prev').addEventListener('click', () => step(-1)); $('.lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
const cursorEl = $('#cursor');
if (cursorEl) slides.forEach(t => { t.addEventListener('mouseenter', () => cursorEl.classList.add('view')); t.addEventListener('mouseleave', () => cursorEl.classList.remove('view')); });

// ---------- reveals ----------
if (!reduce) $$('.sec-head, .svc-head > *, .big-cta span, .stats > div, .contact-copy, .cta-band').forEach(el =>
  gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));

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

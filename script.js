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

// ---------- projects gallery (data from projects.js) ----------
const P = window.PROJECTS || [], gal = $('#gallery'), fil = $('#filters');
const cats = ['All', ...new Set(P.map(p => p.category))];
fil.innerHTML = cats.map((c, i) => `<button role="tab" class="${i ? '' : 'on'}" data-c="${c}">${c}<sup>${c === 'All' ? P.length : P.filter(p => p.category === c).length}</sup></button>`).join('');
gal.innerHTML = P.map((p, i) => `<figure class="tile ${p.size || ''}" data-i="${i}" data-c="${p.category}" tabindex="0" role="button" aria-label="Open ${p.title}"><div class="tw"><img src="${p.image}" alt="${p.title}" loading="lazy"></div><figcaption><span>${p.title}</span><small>${p.category}</small></figcaption></figure>`).join('');
const tiles = $$('.tile');
const revealTiles = () => {
  if (reduce) return;
  tiles.filter(t => !t.classList.contains('hidden')).forEach((t, k) => {
    if (t._rv) return; t._rv = 1;
    gsap.fromTo(t, { clipPath: 'inset(100% 0% 0% 0% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.2, ease: 'expo.out', delay: (k % 3) * 0.08, scrollTrigger: { trigger: t, start: 'top 92%' } });
    gsap.fromTo(t.querySelector('.tw'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
};
revealTiles();
fil.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#filters button').forEach(x => x.classList.toggle('on', x === b)); blip(900, 0.05, 0.03);
  const c = b.dataset.c, show = tiles.filter(t => c === 'All' || t.dataset.c === c);
  tiles.forEach(t => t.classList.toggle('hidden', !show.includes(t)));
  if (!reduce) gsap.fromTo(show, { opacity: 0, y: 40, clipPath: 'inset(0% 0% 0% 0% round 26px)' }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 });
  ScrollTrigger.refresh();
});
// lightbox
const lb = $('#lightbox'); let cur = 0;
const visible = () => tiles.filter(t => !t.classList.contains('hidden')).map(t => +t.dataset.i);
const showLb = i => { cur = i; const p = P[i]; $('#lbImg').src = p.image; $('#lbImg').alt = p.title; $('#lbCap').innerHTML = `<span>${p.title} · ${p.category}</span>` + (p.link ? `<a href="${p.link}" target="_blank" rel="noopener">Visit site ↗</a>` : ''); };
function closeLb() { if (!lb.classList.contains('open')) return; lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
const step = d => { const v = visible(); showLb(v[(v.indexOf(cur) + d + v.length) % v.length]); };
tiles.forEach(t => { const open = () => { showLb(+t.dataset.i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); blip(520, 0.12, 0.05); };
  t.addEventListener('click', open); t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); });
$('.lb-close').addEventListener('click', closeLb); $('.lb-prev').addEventListener('click', () => step(-1)); $('.lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
// cursor "View" label on tiles
const cursorEl = $('#cursor');
if (cursorEl) tiles.forEach(t => { t.addEventListener('mouseenter', () => cursorEl.classList.add('view')); t.addEventListener('mouseleave', () => cursorEl.classList.remove('view')); });

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

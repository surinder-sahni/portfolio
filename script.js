(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px), (hover: none)').matches;
gsap.registerPlugin(ScrollTrigger);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ---------- Lenis smooth scroll ----------
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: mobile ? 0.9 : 1.25, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
  lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}));

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
  gsap.from('.hero .eyebrow, .avatar, .hero-bottom > *, .nav', { y: 30, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.4 });
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
const btn = $('#sound'), label = $('#soundLabel');
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
btn.addEventListener('click', () => {
  if (!snd.ctx && !startAmbient()) return;
  snd.on = !snd.on;
  if (snd.on) snd.ctx.resume();
  snd.master.gain.cancelScheduledValues(snd.ctx.currentTime);
  snd.master.gain.setTargetAtTime(snd.on ? 0.55 : 0, snd.ctx.currentTime, 0.6);
  btn.classList.toggle('on', snd.on); btn.setAttribute('aria-pressed', snd.on);
  label.textContent = snd.on ? 'Sound on' : 'Sound off';
  if (vid.dataset.video === 'on') vid.muted = !snd.on;
  blip(snd.on ? 660 : 440, 0.1, 0.05);
});
if (!mobile) $$('[data-snd], .nav nav a').forEach(el => el.addEventListener('mouseenter', () => blip(1200, 0.04, 0.015)));
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
  $$('a, button, .work-list li, input, select, textarea').forEach(el => {
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

// ---------- package pinned story ----------
const steps = gsap.utils.toArray('.step');
if (reduce) { gsap.set(steps, { opacity: 1, position: 'relative' }); $('.steps').style.height = 'auto'; }
else {
  gsap.set(steps[0], { opacity: 1 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.package', start: 'top top', end: () => '+=' + innerHeight * (mobile ? 2.5 : 3.5), pin: '.package-pin', scrub: 0.6 } });
  tl.to('.progress span', { scaleX: 1, ease: 'none', duration: steps.length }, 0);
  steps.forEach((s, i) => {
    if (!i) return;
    tl.to(steps[i - 1], { opacity: 0, y: -60, filter: 'blur(8px)', duration: 0.4 }, i - 0.4)
      .fromTo(s, { opacity: 0, y: 80, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4 }, i - 0.2);
  });
}

// ---------- stacking: previous card shrinks & dims as next slides over ----------
const stackFx = (sel, scaleTo, dim) => {
  if (reduce) return;
  const items = $$(sel);
  items.forEach((it, i) => {
    const next = items[i + 1]; if (!next) return;
    const inner = it.querySelector('.panel-in') || it;
    gsap.to(inner, { scale: scaleTo, filter: `brightness(${dim})`, ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
  });
};
stackFx('.panel', 0.88, 0.45);
stackFx('.rv', 0.9, 0.5);
if (!reduce) $$('.panel h3').forEach(h => gsap.from(h, { yPercent: 40, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 55%', scrub: true } }));

// ---------- reveals ----------
if (!reduce) $$('.sec-head, .big-cta span, .stats > div, .work-list li, .contact-copy').forEach(el =>
  gsap.from(el, { y: 70, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

// ---------- work hover preview ----------
const pv = $('#preview');
if (!mobile) {
  const px = gsap.quickTo(pv, 'x', { duration: 0.5, ease: 'power3' }), py = gsap.quickTo(pv, 'y', { duration: 0.5, ease: 'power3' });
  const list = $('.work-list');
  list.addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
  list.querySelectorAll('li').forEach(li => li.addEventListener('mouseenter', () =>
    pv.querySelectorAll('.pv').forEach(p => p.classList.toggle('on', p.classList.contains('g' + li.dataset.g)))));
  list.addEventListener('mouseenter', () => gsap.to(pv, { scale: 1, duration: 0.4, ease: 'power3.out' }));
  list.addEventListener('mouseleave', () => gsap.to(pv, { scale: 0, duration: 0.3 }));
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

// ---------- floating talk pill hides over contact ----------
ScrollTrigger.create({ trigger: '#contact', start: 'top 70%', onToggle: s => $('#talk').classList.toggle('hide', s.isActive) });

// ---------- form ----------
$('#lead').addEventListener('submit', e => { e.preventDefault(); $('#note').textContent = 'Thanks! (Prototype only — nothing was sent.)'; });

addEventListener('load', () => ScrollTrigger.refresh());
})();

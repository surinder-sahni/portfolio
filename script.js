(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px), (hover: none)').matches;
gsap.registerPlugin(ScrollTrigger);

// Lenis smooth scroll
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: mobile ? 0.9 : 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t); }
  }));
}

// split hero text into words/chars
document.querySelectorAll('.split').forEach(el => {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
        const ws = document.createElement('span'); ws.className = 'w';
        [...w].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); });
        frag.appendChild(ws);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el);
});

// preloader
const count = document.getElementById('count'), pre = document.getElementById('preloader');
const intro = () => {
  document.body.classList.remove('is-loading');
  if (reduce) { pre.remove(); return; }
  gsap.from('.hero-title .ch', { yPercent: 110, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: mobile ? 0.008 : 0.018 });
  gsap.from('.hero .eyebrow, .hero-bottom > *, .nav', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
};
if (reduce) { pre.remove(); intro(); }
else {
  const o = { v: 0 };
  gsap.timeline()
    .to(o, { v: 100, duration: 1.8, ease: 'power2.inOut', onUpdate: () => count.textContent = Math.round(o.v) })
    .to('.curtain', { y: 0, yPercent: 0, duration: 0.6, ease: 'power4.inOut' })
    .to(pre, { yPercent: -100, duration: 0.8, ease: 'power4.inOut', onStart: intro, onComplete: () => pre.remove() });
}

// custom cursor + magnetic buttons (desktop only)
if (!mobile && !reduce) {
  const cur = document.getElementById('cursor');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('mousemove', e => { cur.style.opacity = 1; xTo(e.clientX); yTo(e.clientY); });
  document.querySelectorAll('a, button, .card, .work-list li, input, select, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('big'));
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });
  document.querySelectorAll('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.35, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
    });
    b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.3)' }));
  });
} else document.getElementById('cursor').remove();

// package story pinned
const steps = gsap.utils.toArray('.step');
if (reduce) { gsap.set(steps, { opacity: 1, position: 'relative' }); document.querySelector('.steps').style.height = 'auto'; }
else {
  gsap.set(steps[0], { opacity: 1 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.package', start: 'top top', end: () => '+=' + innerHeight * (mobile ? 2.5 : 3.5), pin: '.package-pin', scrub: 0.6 } });
  tl.to('.progress span', { scaleX: 1, ease: 'none', duration: steps.length }, 0);
  steps.forEach((s, i) => {
    if (i === 0) return;
    tl.to(steps[i - 1], { opacity: 0, y: -60, filter: 'blur(8px)', duration: 0.4 }, i - 0.4)
      .fromTo(s, { opacity: 0, y: 80, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4 }, i - 0.2);
  });
}

// section reveals
if (!reduce) {
  gsap.utils.toArray('.sec-head, .big-cta span, .stats > div, .card, .work-list li').forEach(el => {
    gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
}

// cards: 3D tilt + expand
document.querySelectorAll('.card').forEach(c => {
  c.addEventListener('click', () => c.classList.toggle('open'));
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('open'); } });
  if (mobile || reduce) return;
  c.addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(c, { rotateY: px * 14, rotateX: -py * 14, duration: 0.4, ease: 'power2.out' });
  });
  c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1,0.4)' }));
});

// work hover preview
const pv = document.getElementById('preview');
if (!mobile) {
  const px = gsap.quickTo(pv, 'x', { duration: 0.5, ease: 'power3' }), py = gsap.quickTo(pv, 'y', { duration: 0.5, ease: 'power3' });
  const list = document.querySelector('.work-list');
  list.addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
  list.querySelectorAll('li').forEach(li => li.addEventListener('mouseenter', () => {
    pv.querySelectorAll('.pv').forEach(p => p.classList.toggle('on', p.classList.contains('g' + li.dataset.g)));
  }));
  list.addEventListener('mouseenter', () => gsap.to(pv, { scale: 1, duration: 0.4, ease: 'power3.out' }));
  list.addEventListener('mouseleave', () => gsap.to(pv, { scale: 0, duration: 0.3 }));
}

// count-up
document.querySelectorAll('.cnt').forEach(el => {
  const to = +el.dataset.to;
  if (reduce) { el.textContent = to; return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 2, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v), scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
});

// marquee with scroll velocity
const track = document.getElementById('track');
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

// draggable testimonials
const slider = document.getElementById('slider'), slides = document.getElementById('slides');
let down = false, sx = 0, cx = 0, tx = 0;
const max = () => Math.min(0, slider.clientWidth - slides.scrollWidth);
slider.addEventListener('pointerdown', e => { down = true; sx = e.clientX; cx = tx; slider.setPointerCapture(e.pointerId); });
slider.addEventListener('pointermove', e => { if (!down) return; tx = gsap.utils.clamp(max() - 80, 80, cx + e.clientX - sx); gsap.to(slides, { x: tx, duration: 0.3, ease: 'power3.out' }); });
const up = () => { if (!down) return; down = false; tx = gsap.utils.clamp(max(), 0, tx); gsap.to(slides, { x: tx, duration: 0.8, ease: 'expo.out' }); };
slider.addEventListener('pointerup', up); slider.addEventListener('pointercancel', up);

// form (frontend only)
document.getElementById('lead').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('note').textContent = 'Thanks! (Prototype only — nothing was sent.)';
});

addEventListener('load', () => ScrollTrigger.refresh());
})();

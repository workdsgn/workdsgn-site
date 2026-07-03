// Continuous scroll-position driver for the shader canvas AND the global
// background color.
//
// Replaces IntersectionObserver-based snap with smooth smoothstep interpolation.
// Both --shader-opacity and --bg are lerped between section targets on every
// rAF tick, so the transition zone reads as one coordinated fade — no seam.

const OPACITY_BY_SECTION = { hero: 1.0, services: 0.0, cta: 0.8 };

const BG_COLORS = {
  hero:     [0x09, 0x09, 0x09],
  services: [0xF4, 0xEC, 0xD5],
  cta:      [0xF4, 0xEC, 0xD5]
};

// Half-width of the boundary blend zone (as a fraction of viewport height).
// Wider than the earlier 0.3 so color drift feels like a gradient rather
// than a snap.
const BLEND_HALF = 0.7;

let scrollY = 0;
let ticking = false;
let lastDominant = null;

const sections = [
  { name: 'hero',     el: null, start: 0, end: 0 },
  { name: 'services', el: null, start: 0, end: 0 },
  { name: 'cta',      el: null, start: 0, end: 0 }
];

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function toHex(r, g, b) {
  const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function computeBoundaries() {
  sections[0].el = document.querySelector('.section-hero');
  sections[1].el = document.querySelector('.section-services');
  sections[2].el = document.querySelector('.section-cta');
  for (const s of sections) {
    if (!s.el) continue;
    s.start = s.el.offsetTop;
    s.end = s.el.offsetTop + s.el.offsetHeight;
  }
}

function getPresence() {
  const vh = window.innerHeight;
  const w = vh * BLEND_HALF;
  const midline = scrollY + vh / 2;

  // Hero: same wide taper as before.
  const heroS = smoothstep(sections[0].end - w, sections[0].end + w, midline);
  const hero = heroS < 0.5 ? 1 - heroS * 2 : 0;

  // Services: wide start (matches hero-out), TIGHT end so it holds a zero-shader
  // hold right up to the CTA boundary.
  const services =
    smoothstep(sections[1].start - w, sections[1].start + w, midline) *
    (1 - smoothstep(sections[1].end - vh * 0.1, sections[1].end + vh * 0.1, midline));

  // CTA: delayed ramp — don't start fading the shader back in until we're
  // ~100px past the CTA boundary. Combined with the tightened services.end
  // above, this creates a guaranteed zero-opacity window inside which the
  // blend mode is safe to snap from normal → screen without a pop.
  const cta = smoothstep(sections[2].start + vh * 0.1, sections[2].start + vh * 0.6, midline);

  return { hero, services, cta };
}

function update() {
  const p = getPresence();

  const shaderOpacity =
    p.hero * OPACITY_BY_SECTION.hero +
    p.services * OPACITY_BY_SECTION.services +
    p.cta * OPACITY_BY_SECTION.cta;
  document.documentElement.style.setProperty('--shader-opacity', shaderOpacity.toFixed(3));

  const total = p.hero + p.services + p.cta || 1;
  const nh = p.hero / total;
  const ns = p.services / total;
  const nc = p.cta / total;
  const r = BG_COLORS.hero[0] * nh + BG_COLORS.services[0] * ns + BG_COLORS.cta[0] * nc;
  const g = BG_COLORS.hero[1] * nh + BG_COLORS.services[1] * ns + BG_COLORS.cta[1] * nc;
  const b = BG_COLORS.hero[2] * nh + BG_COLORS.services[2] * ns + BG_COLORS.cta[2] * nc;
  document.documentElement.style.setProperty('--bg', toHex(r, g, b));

  const dominant =
    p.hero >= p.services && p.hero >= p.cta ? 'hero'
    : p.services >= p.cta ? 'services'
    : 'cta';
  if (lastDominant !== dominant) {
    document.documentElement.dataset.dominant = dominant;
    window.dispatchEvent(new CustomEvent('dominantchange', { detail: { dominant } }));
    lastDominant = dominant;
  }

  const shaderBlend = p.cta > 0.01 ? 'screen' : 'hard-light';
  if (document.documentElement.dataset.shaderBlend !== shaderBlend) {
    document.documentElement.dataset.shaderBlend = shaderBlend;
  }
}

function onScroll() {
  scrollY = window.scrollY;
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    update();
    ticking = false;
  });
}

export function initScrollDriver() {
  const start = () => {
    computeBoundaries();
    onScroll();
  };
  // Debug hook — lets eval drive the update loop when programmatic scrollTo
  // doesn't dispatch scroll events (e.g., some previews).
  // TODO: strip before ship.
  window.__driver = {
    onScroll,
    computeBoundaries,
    // Force a synchronous update from wherever scrollY currently is —
    // bypasses the `ticking` gate for eval-driven verification.
    tick() {
      scrollY = window.scrollY;
      update();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    computeBoundaries();
    onScroll();
  });
  if (document.fonts?.ready) {
    document.fonts.ready.then(start);
  }
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }
}

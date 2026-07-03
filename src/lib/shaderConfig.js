// Per-section shader presets. Any key in DEFAULT_PARAMS can appear here;
// unknown keys are ignored by applyPreset().

// Extracted so `ambient_hero` can spread from it — a `...shaderPresets.ambient`
// self-reference inside the object literal below wouldn't resolve at eval time.
const AMBIENT = {
  rings: 7.4, sharp: 0.85, aspect: 0.40,
  speed: 1.38, pulse: 0.99,
  grain: 0.35, gscale: 1150, flick: 1,
  chrom: 0.044, edge: 0.18,
  env: 0.87, nuc: 0.0, bright: 0.64, wob: 0.113,
  mouseStrength: 0.78, mouseEase: 0.04
};

export const shaderPresets = {
  rings: {
    rings: 14, sharp: 1.8, aspect: 0.78,
    speed: 0.25, pulse: 0.35,
    grain: 0.75, gscale: 1200, flick: 12,
    chrom: 0.018, edge: 0.7,
    env: 0.55, nuc: 0.35, bright: 1.35, wob: 0.02
  },
  converge: {
    rings: 8, sharp: 3.0, aspect: 0.95,
    speed: 0.45, pulse: 0.7,
    grain: 0.6, gscale: 1400, flick: 8,
    chrom: 0.032, edge: 0.9,
    env: 0.65, nuc: 0.6, bright: 1.45, wob: 0.04
  },
  plate: {
    rings: 22, sharp: 1.2, aspect: 0.7,
    speed: 0.12, pulse: 0.15,
    grain: 0.95, gscale: 900, flick: 20,
    chrom: 0.012, edge: 0.4,
    env: 0.35, nuc: 0.15, bright: 1.2, wob: 0.008
  },
  nucleus: {
    rings: 10, sharp: 2.5, aspect: 0.9,
    speed: 0.35, pulse: 0.5,
    grain: 0.5, gscale: 1600, flick: 6,
    chrom: 0.025, edge: 0.8,
    env: 0.75, nuc: 1.0, bright: 1.6, wob: 0.015
  },
  ambient: AMBIENT,
  // Hero override — ambient was tuned against pure black without hard-light.
  // On #090909 + hard-light the base peaks blow out; dim bright, cut chrom,
  // push fringe to the edges, and add a bit more grain texture.
  // Hero-specific — full overwrite (not a spread) per latest tuning pass.
  // Coarser grain particles (gscale 450) for a real sand/cymatics feel.
  ambient_hero: {
    rings: 7.4,
    sharp: 0.85,
    aspect: 0.40,
    speed: 1.38,
    pulse: 1.00,
    grain: 0.14,
    gscale: 450,
    flick: 13,
    chrom: 0.020,
    edge: 0.45,
    env: 0.87,
    nuc: 0.0,
    bright: 0.42,
    wob: 0.113,
    mouseStrength: 0.78,
    mouseEase: 0.04
  },
  // Services — pull the shader further back, tighter rings, calmer motion.
  recede: {
    rings: 4.5, sharp: 1.6, aspect: 0.62,
    speed: 0.7, pulse: 0.5,
    grain: 0.4, gscale: 1200, flick: 3,
    chrom: 0.028, edge: 0.35,
    env: 0.7, nuc: 0.05, bright: 0.85, wob: 0.06,
    mouseStrength: 1.0, mouseEase: 0.06
  },
  // CTA — nearly ghostly, wide + slow, minimal chroma. CSS opacity handles the fade.
  trace: {
    rings: 3.0, sharp: 2.6, aspect: 0.9,
    speed: 0.4, pulse: 0.3,
    grain: 0.3, gscale: 1400, flick: 2,
    chrom: 0.018, edge: 0.2,
    env: 0.55, nuc: 0.0, bright: 1.1, wob: 0.03,
    mouseStrength: 0.4, mouseEase: 0.1
  }
};

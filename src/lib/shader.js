// Concentric / chromatic shader — ported verbatim from concentric_shader.html.
// Exposes a mutable `params` object and a `destroy()` handle so the caller
// (Astro island, later scroll-driven controller) can drive it.

const VS = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uRings, uSharp, uAspect, uSpeed, uPulse;
uniform float uGrain, uGscale, uFlick;
uniform float uChrom, uEdge;
uniform float uEnv, uNuc, uBright, uWob;
uniform vec2 uMouse;
uniform float uMouseStrength;

float hash(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float ringField(vec2 uv, vec2 center, float phase){
  vec2 p = uv - center;
  p.x *= uAspect;
  p.x += sin(uTime * 0.7) * uWob;
  p.y += cos(uTime * 0.5) * uWob;
  float d = length(p);
  float t = uTime * uSpeed;
  float mod_d = d * (1.0 + sin(t * 2.0) * uPulse * 0.08);
  float r = sin(mod_d * uRings * 3.14159 - t * 2.0 + phase);
  r = pow(abs(r), 1.0 / max(uSharp, 0.01));
  float envelope = smoothstep(0.02, 0.12, d) * smoothstep(1.15, 0.35, d);
  envelope = mix(1.0, envelope, uEnv);
  float nucleus = smoothstep(0.14, 0.0, d) * uNuc;
  return r * envelope + nucleus;
}

float particulate(vec2 uv, float ringVal, float channelSeed){
  float g = hash(floor(uv * uGscale) + floor(uTime * uFlick) + channelSeed);
  float threshold = 1.0 - clamp(ringVal, 0.0, 1.0) * 0.95;
  float particle = smoothstep(threshold - 0.06, threshold + 0.02, g);
  return mix(ringVal, particle * 1.2, uGrain);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - uRes.xy * 0.5) / min(uRes.x, uRes.y);
  uv *= 2.0;

  float rDist = length(uv);
  float aberration = uChrom * (0.3 + rDist * uEdge * 3.5);
  vec2 dir = uv / (rDist + 0.0001);

  vec2 uvR = uv - dir * aberration;
  vec2 uvG = uv;
  vec2 uvB = uv + dir * aberration;

  float rRing = ringField(uvR, vec2(0.0), 0.0);
  float gRing = ringField(uvG, vec2(0.0), 0.0);
  float bRing = ringField(uvB, vec2(0.0), 0.0);

  // Second ring system centered on the cursor. When the two overlap they
  // create moiré interference — the "client + designer converging" motif.
  float rRing2 = ringField(uvR, uMouse, 0.0);
  float gRing2 = ringField(uvG, uMouse, 0.0);
  float bRing2 = ringField(uvB, uMouse, 0.0);

  float rSum = rRing + rRing2 * uMouseStrength;
  float gSum = gRing + gRing2 * uMouseStrength;
  float bSum = bRing + bRing2 * uMouseStrength;

  float r = particulate(uvR, rSum, 1.3);
  float g = particulate(uvG, gSum, 7.1);
  float b = particulate(uvB, bSum, 13.7);

  vec3 col = vec3(r, g, b);

  float mono = (r + g + b) / 3.0;
  float chromaMask = smoothstep(0.15, 1.1, rDist) * uEdge;
  col = mix(vec3(mono), col, clamp(chromaMask, 0.0, 1.0));

  col *= uBright;
  col = clamp(col, 0.0, 1.8);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const DEFAULT_PARAMS = {
  rings: 14, sharp: 1.8, aspect: 0.78,
  speed: 0.25, pulse: 0.35,
  grain: 0.75, gscale: 1200, flick: 12,
  chrom: 0.018, edge: 0.7,
  env: 0.55, nuc: 0.35, bright: 1.35, wob: 0.02,
  mouseStrength: 0.0, mouseEase: 0.08
};

const UNIFORM_NAMES = [
  'uRes','uTime','uRings','uSharp','uAspect','uSpeed','uPulse',
  'uGrain','uGscale','uFlick','uChrom','uEdge','uEnv','uNuc','uBright','uWob',
  'uMouse','uMouseStrength'
];

function compile(gl, src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('SHADER ERROR:', gl.getShaderInfoLog(s));
    console.error(src);
  }
  return s;
}

export function mountShader(canvas, initialParams = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: false });
  if (!gl) {
    console.error('WebGL not available');
    return null;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, VS, gl.VERTEX_SHADER));
  gl.attachShader(prog, compile(gl, FS, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  UNIFORM_NAMES.forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  const params = { ...DEFAULT_PARAMS, ...initialParams };
  const mouse = { targetX: 0, targetY: 0, x: 0, y: 0 };

  // Preset interpolation state. When a new target is set, each frame
  // lerps every param key toward `targetParams[k]` with factor `targetEase`.
  // Unset keys are ignored. Null target = no interpolation (immediate params).
  let targetParams = null;
  let targetEase = 0.05;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);

  const t0 = performance.now();
  let rafId = 0;
  let running = true;

  function loop() {
    if (!running) return;
    const t = (performance.now() - t0) / 1000;

    // Ease mouse toward target — clamp ease into (0, 1] so a bad value
    // can't freeze or overshoot the follow.
    const ease = Math.min(Math.max(params.mouseEase, 0.001), 1);
    mouse.x += (mouse.targetX - mouse.x) * ease;
    mouse.y += (mouse.targetY - mouse.y) * ease;

    // Interpolate params toward the current preset target.
    if (targetParams) {
      const pe = Math.min(Math.max(targetEase, 0.001), 1);
      for (const k of Object.keys(DEFAULT_PARAMS)) {
        const tv = targetParams[k];
        if (typeof tv === 'number') {
          params[k] += (tv - params[k]) * pe;
        }
      }
    }

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uRings, params.rings);
    gl.uniform1f(U.uSharp, params.sharp);
    gl.uniform1f(U.uAspect, params.aspect);
    gl.uniform1f(U.uSpeed, params.speed);
    gl.uniform1f(U.uPulse, params.pulse);
    gl.uniform1f(U.uGrain, params.grain);
    gl.uniform1f(U.uGscale, params.gscale);
    gl.uniform1f(U.uFlick, params.flick);
    gl.uniform1f(U.uChrom, params.chrom);
    gl.uniform1f(U.uEdge, params.edge);
    gl.uniform1f(U.uEnv, params.env);
    gl.uniform1f(U.uNuc, params.nuc);
    gl.uniform1f(U.uBright, params.bright);
    gl.uniform1f(U.uWob, params.wob);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uMouseStrength, params.mouseStrength);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    rafId = requestAnimationFrame(loop);
  }
  loop();

  return {
    params,
    // NDC-style coords: (0,0) center, x∈[-~aspect, +~aspect], y∈[-1, +1]
    // in units of half the min canvas dimension × 2.
    setMouseTarget(x, y) {
      mouse.targetX = x;
      mouse.targetY = y;
    },
    // Pause the render loop entirely — used while sections that don't show
    // the shader are active so we're not burning GPU cycles on invisible frames.
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    },
    resume() {
      if (running) return;
      running = true;
      loop();
    },
    applyPreset(preset) {
      if (!preset) return;
      for (const k of Object.keys(DEFAULT_PARAMS)) {
        if (k in preset) params[k] = preset[k];
      }
      // Snap the interpolation target too, so a future setTargetParams
      // doesn't yank us back toward the old target.
      targetParams = null;
    },
    // Start easing params toward a target preset. Ease defaults to 0.05
    // which reaches ~99% of target in ~90 frames (~1.5s at 60fps).
    setTargetParams(preset, ease = 0.05) {
      if (!preset) {
        targetParams = null;
        return;
      }
      targetParams = preset;
      targetEase = ease;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    }
  };
}

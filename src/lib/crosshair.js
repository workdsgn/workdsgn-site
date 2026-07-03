// Custom cursor site-wide. Two states:
//   - default: crosshair reticle + coord readout (surveying vibe)
//   - over interactive element: gauntlet glove PNG (action vibe)
//
// Difference-blended reticle stays visible on hero (near-black), services
// (cream), and CTA (cream) without per-section rules. Gauntlet uses a
// drop-shadow instead so its metallic detail reads on both backdrops.
//
// Fine-pointer only — coarse-pointer devices see the native cursor via
// the media-query override in global.css.

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, textarea, select, [data-cursor="gauntlet"]';

function formatCoord(n) {
  const s = Math.abs(Math.round(n)).toString();
  const sign = n < 0 ? '-' : '';
  if (s.length > 3) return sign + s.slice(0, -3) + ',' + s.slice(-3);
  return sign + s.padStart(3, '0');
}

export function initCrosshair() {
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasFinePointer) return;

  const crosshair = document.querySelector('.crosshair');
  const coords = document.querySelector('.coords');
  const gauntlet = document.querySelector('.gauntlet-cursor');
  if (!crosshair || !coords || !gauntlet) return;

  let visible = false;
  let overInteractive = false;

  const showReticle = () => {
    crosshair.classList.add('visible');
    coords.classList.add('visible');
    gauntlet.classList.remove('visible');
  };
  const showGauntlet = () => {
    gauntlet.classList.add('visible');
    crosshair.classList.remove('visible');
    coords.classList.remove('visible');
  };
  const hideAll = () => {
    crosshair.classList.remove('visible');
    coords.classList.remove('visible');
    gauntlet.classList.remove('visible');
    visible = false;
    overInteractive = false;
  };

  const updateReticle = (x, y) => {
    crosshair.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    coords.style.transform = `translate(${x - 10}px, ${y + 10}px) translate(-100%, 0)`;
    coords.innerHTML = `${formatCoord(x)}<br>${formatCoord(y)}`;
  };
  const updateGauntlet = (x, y) => {
    // Anchor: -8px x, -20px y shifts the glove up so the fingertip lands on
    // the actual cursor position. Must match the base transform on
    // .gauntlet-cursor in global.css.
    gauntlet.style.transform = `translate(${x - 8}px, ${y - 20}px)`;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      const nowInteractive = !!(e.target && e.target.closest && e.target.closest(INTERACTIVE_SELECTOR));

      // First frame after entering the window — show the correct cursor.
      if (!visible) {
        if (nowInteractive) showGauntlet();
        else showReticle();
        visible = true;
        overInteractive = nowInteractive;
      } else if (nowInteractive !== overInteractive) {
        // Swap on interactive-boundary crossing.
        overInteractive = nowInteractive;
        if (nowInteractive) showGauntlet();
        else showReticle();
      }

      // Always update the visible cursor's position.
      if (nowInteractive) updateGauntlet(e.clientX, e.clientY);
      else updateReticle(e.clientX, e.clientY);
    },
    { passive: true }
  );

  // Pointer leaves the window entirely (into browser chrome / devtools).
  window.addEventListener('pointerleave', hideAll);
  document.addEventListener('mouseleave', hideAll, true);
  // Coming back in — first pointermove will re-show whichever cursor fits.
}

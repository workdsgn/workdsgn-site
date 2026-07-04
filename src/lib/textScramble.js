// Per-character hover scramble, aino.agency-style.
//
// Each [data-scramble] element is split into individual character spans
// on init. Hovering a single character kicks off a short glyph-cycle on
// just that character — the rest of the text stays put. This gives the
// interactive feel of "the letter under my cursor is dancing" rather than
// the whole block scrambling on element enter.

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

// Cycle a single char span through a few random glyphs, then restore.
// Idempotent: re-entry while already scrambling is a no-op so the timer
// chain doesn't stack.
function scrambleChar(span) {
  if (span.dataset.scrambling === '1') return;
  span.dataset.scrambling = '1';
  const original = span.dataset.originalChar;
  const iterations = 5 + Math.floor(Math.random() * 5);
  let count = 0;
  const tick = () => {
    if (count >= iterations) {
      span.textContent = original;
      delete span.dataset.scrambling;
      return;
    }
    span.textContent = randomChar();
    count++;
    setTimeout(tick, 35);
  };
  tick();
}

// Render `text` into `el` as one span-per-character, wired for hover
// scramble. Chars are grouped into per-word nowrap containers so the
// browser can only break the line at whitespace between words — without
// this, inline-block char spans are treated as atomic wrap points and
// long words split mid-glyph ("align|ment"). Exported so out-of-band
// updaters (e.g. the ticking clock) can rewrite the element without
// losing the per-char scramble hookup.
//
// `append`: when true, does NOT clear the element first. Used by
// initScramble when it emits real <br> elements between text segments.
export function renderScrambleText(el, text, append = false) {
  if (!append) el.textContent = '';
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      continue;
    }
    const word = document.createElement('span');
    word.className = 'scramble-word';
    for (const ch of part) {
      const span = document.createElement('span');
      span.className = 'scramble-char';
      span.textContent = ch;
      span.dataset.originalChar = ch;
      span.addEventListener('mouseenter', () => scrambleChar(span));
      word.appendChild(span);
    }
    el.appendChild(word);
  }
}

// Decode HTML entities in a segment (e.g. &amp; → &) by round-tripping
// through a detached element's innerHTML/textContent.
function decodeEntities(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

// Wires up every [data-scramble] element on the page. Idempotent — safe to
// call after DOM changes; already-initialized elements are skipped.
// Opt-in [data-scramble-lock-width]: after render, snapshot the element's
// laid-out width and pin it inline. Used for pill buttons/badges where the
// per-char scramble's occasional wide glyphs would otherwise push the
// container wider mid-hover, resizing the pill visibly.
//
// Source <br> tags in the element's markup are preserved — the split into
// segments happens before we tokenize text into scramble spans, so authors
// can hard-break lines (widow control on the CTA copy) without losing the
// per-char effect.
export function initScramble() {
  const targets = document.querySelectorAll('[data-scramble]:not([data-scramble-ready])');
  targets.forEach((root) => {
    root.dataset.scrambleReady = '1';
    const segments = root.innerHTML.split(/<br\s*\/?>/i);
    root.textContent = '';
    segments.forEach((seg, i) => {
      if (i > 0) root.appendChild(document.createElement('br'));
      renderScrambleText(root, decodeEntities(seg), /*append*/ true);
    });
    if (root.hasAttribute('data-scramble-lock-width')) {
      // Lock both dimensions — some glyphs in the scramble pool (e.g. `{`,
      // `[`, `\`) have ascenders/descenders that outsize the rest text, so
      // width alone would still let the pill stretch vertically mid-hover.
      const rect = root.getBoundingClientRect();
      root.style.boxSizing = 'border-box';
      root.style.width = rect.width + 'px';
      root.style.height = rect.height + 'px';
      root.style.textAlign = 'center';
      root.style.overflow = 'hidden';
    }
  });
}

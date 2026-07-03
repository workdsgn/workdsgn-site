// One-shot fade-in observer for content that should reveal as it enters
// the viewport. Independent of the scroll-position shader driver: this
// handles typography, that handles the shader.

export function initContentReveal() {
  const targets = document.querySelectorAll('.fade-in');
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.3 }
  );

  targets.forEach((el) => io.observe(el));
}

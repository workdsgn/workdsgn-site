// 4-frame rotating reticle favicon. The base viewBox is 33×33 but the
// canvas renders at 64×64 for retina crispness (browsers sample down when
// the icon is drawn at 16×16 in the tab). Each frame rotates the inner
// disc (with its bitten-out quadrant) 90° clockwise; four frames make a
// full rotation. Frame cadence is intentionally slow (600ms) so nobody
// notices CPU. Paused via `visibilitychange` when the tab isn't focused.

export function startAnimatedFavicon() {
  const link = document.getElementById('favicon');
  if (!link) return;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Palette matches the site tokens — cream reticle on ink background.
  const CREAM = '#C5BEAC';
  const INK = '#12110F';
  const FRAME_MS = 600;

  // viewBox is 33×33; scale drawing units to the 64px canvas.
  const s = size / 33;

  function drawFrame(frame) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, size, size);

    // Outer crosshair arms — static, never rotate.
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 1 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(25.2531 * s, 16.4968 * s);
    ctx.lineTo(32.5 * s, 16.4968 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16.4969 * s, 7.74683 * s);
    ctx.lineTo(16.4969 * s, 0.49989 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7.74695 * s, 16.4968 * s);
    ctx.lineTo(0.500012 * s, 16.4968 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16.4969 * s, 25.2529 * s);
    ctx.lineTo(16.4969 * s, 32.4999 * s);
    ctx.stroke();

    // Rotating disc group — rotate around the disc's center.
    ctx.save();
    ctx.translate(16.5 * s, 16.5 * s);
    ctx.rotate((frame * 90) * Math.PI / 180);
    ctx.translate(-16.5 * s, -16.5 * s);

    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(16.5 * s, 16.4938 * s, 8.75306 * s, 0, Math.PI * 2);
    ctx.fill();

    // Inner cross cuts through the disc.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1 * s;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(7.74391 * s, 16.4968 * s);
    ctx.lineTo(25.2531 * s, 16.4968 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16.4955 * s, 7.74536 * s);
    ctx.lineTo(16.4955 * s, 25.2544 * s);
    ctx.stroke();

    // Bitten-out quadrant — filled ink pie slice that "eats" one quarter
    // of the cream disc. Rotates with the group.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(16.2012 * s, 25.25 * s);
    ctx.arc(16.5 * s, 16.7988 * s, 8.4512 * s, Math.PI / 2, Math.PI, false);
    ctx.lineTo(16.2012 * s, 16.7988 * s);
    ctx.lineTo(16.2012 * s, 25.25 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  let frame = 0;
  let intervalId = null;

  function tick() {
    drawFrame(frame);
    link.href = canvas.toDataURL('image/png');
    // First swap changes the file type — sync the type attr so Firefox
    // and Safari don't warn about mismatch on later refresh cycles.
    if (link.type !== 'image/png') link.type = 'image/png';
    frame = (frame + 1) % 4;
  }

  function start() {
    if (intervalId) return;
    tick();
    intervalId = setInterval(tick, FRAME_MS);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}

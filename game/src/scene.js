// Scene: the night market as a place, not a dashboard. A dusk sky with
// stars, a city-roof silhouette, a warm market floor, festival bunting
// and fireworks. The background always stays darker and dimmer than the
// gameplay objects in front of it, so readability never suffers.

// Deterministic star positions (stable across frames; only the twinkle
// changes with time).
const STARS = [];
{
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 70; i += 1) {
    STARS.push({ x: next() * 1280, y: 66 + next() * 200, r: 0.8 + next() * 1.4, phase: next() * Math.PI * 2 });
  }
}

const ROOFTOPS = [
  { x: 0, w: 110, h: 46 }, { x: 110, w: 90, h: 62 }, { x: 200, w: 130, h: 40 },
  { x: 330, w: 80, h: 70 }, { x: 410, w: 120, h: 48 }, { x: 530, w: 100, h: 64 },
  { x: 630, w: 140, h: 42 }, { x: 770, w: 90, h: 68 }, { x: 860, w: 120, h: 50 },
  { x: 980, w: 110, h: 66 }, { x: 1090, w: 90, h: 44 }, { x: 1180, w: 100, h: 58 },
];

/** The dusk sky: a deep gradient with twinkling stars. No big sun. */
export function drawNightSky(ctx, time, festival) {
  const sky = ctx.createLinearGradient(0, 64, 0, 360);
  if (festival) {
    sky.addColorStop(0, '#241a3d');
    sky.addColorStop(0.55, '#3d2a4d');
    sky.addColorStop(1, '#5a3a3a');
  } else {
    sky.addColorStop(0, '#1a2233');
    sky.addColorStop(0.55, '#2c3348');
    sky.addColorStop(1, '#4a3a3a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 64, 1280, 296);
  for (const star of STARS) {
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.5 + star.phase));
    ctx.fillStyle = `rgba(255, 244, 214, ${(0.75 * twinkle).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The city roofline: dark silhouettes with a few dim lit windows. */
export function drawCitySkyline(ctx) {
  const baseY = 340;
  for (const roof of ROOFTOPS) {
    ctx.fillStyle = '#161c2b';
    ctx.fillRect(roof.x, baseY - roof.h, roof.w, roof.h);
    // A sloped roof cap.
    ctx.beginPath();
    ctx.moveTo(roof.x - 4, baseY - roof.h);
    ctx.lineTo(roof.x + roof.w / 2, baseY - roof.h - 12);
    ctx.lineTo(roof.x + roof.w + 4, baseY - roof.h);
    ctx.closePath();
    ctx.fill();
    // One or two dim windows, kept faint.
    ctx.fillStyle = 'rgba(242, 193, 78, 0.35)';
    if (roof.w >= 100) {
      ctx.fillRect(roof.x + 16, baseY - roof.h + 14, 8, 10);
      ctx.fillRect(roof.x + roof.w - 28, baseY - roof.h + 22, 8, 10);
    } else {
      ctx.fillRect(roof.x + roof.w / 2 - 4, baseY - roof.h + 16, 8, 10);
    }
  }
}

/**
 * The market floor: warm planks under the stalls with soft glow pools.
 * Kept dim so stalls, dishes and customers stay the brightest things.
 */
export function drawMarketFloor(ctx, stallXs) {
  const floor = ctx.createLinearGradient(0, 360, 0, 720);
  floor.addColorStop(0, '#3a2a20');
  floor.addColorStop(0.35, '#463322');
  floor.addColorStop(1, '#2c1f16');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 360, 1280, 360);
  // Plank seams.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;
  for (let y = 400; y < 720; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }
  // Soft warm pools under each stall, radial and dim.
  for (const x of stallXs) {
    const pool = ctx.createRadialGradient(x, 560, 10, x, 560, 190);
    pool.addColorStop(0, 'rgba(242, 193, 78, 0.16)');
    pool.addColorStop(1, 'rgba(242, 193, 78, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(x, 560, 190, 150, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const FLAG_COLORS = ['#e63946', '#f2c14e', '#2a9d8f', '#7c5cbf', '#e07b39'];

/** Festival bunting: two swags of small triangle flags below the HUD. */
export function drawBunting(ctx, time) {
  for (const [y0, sag] of [[66, 26], [96, 30]]) {
    const sway = Math.sin(time * 0.8) * 2;
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(640, y0 + sag * 2 + sway, 1280, y0);
    ctx.stroke();
    for (let i = 0; i < 26; i += 1) {
      const t = (i + 0.5) / 26;
      const x = t * 1280;
      // Point on the quadratic curve at t.
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2 + sway) + t * t * y0;
      ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 16);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * Static firework bursts painted directly (results screen, where the
 * simulation is not stepping): radial dots only.
 * `bursts` is a list of {x, y, color, radius}.
 */
export function drawFireworks(ctx, bursts, time) {
  for (const burst of bursts) {
    const pulse = 1 + Math.sin(time * 2 + burst.x) * 0.05;
    const dots = 14;
    for (let i = 0; i < dots; i += 1) {
      const angle = (i / dots) * Math.PI * 2 + burst.x;
      const r = burst.radius * pulse * (i % 2 === 0 ? 1 : 0.62);
      const dx = Math.cos(angle) * r;
      const dy = Math.sin(angle) * r;
      ctx.fillStyle = burst.color;
      ctx.globalAlpha = i % 2 === 0 ? 0.95 : 0.6;
      ctx.beginPath();
      ctx.arc(burst.x + dx, burst.y + dy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8e1';
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Static confetti pieces frozen in the air (results screen). */
export function drawConfetti(ctx, pieces) {
  for (const piece of pieces) {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-4, -2.5, 8, 5);
    ctx.restore();
  }
}

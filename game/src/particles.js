// Particles: coins that burst from a paid customer, steam puffing from the
// pans, and stars over the festival results. All of them are drawn, not assets.

/** A fresh particle list: nothing flying yet. */
export function createParticles() {
  return [];
}

/** A burst of coins from a paid customer — big, high and long-lived. */
export function spawnCoinBurst(particles, x, y, count, random) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      kind: 'coin',
      x,
      y,
      vx: (random() - 0.5) * 240,
      vy: -140 - random() * 140,
      life: 0.9 + random() * 0.5,
      maxLife: 1.4,
      size: 8 + random() * 6,
      color: '#ffd166',
    });
  }
}

/** A firework burst: radial sparks that fall and fade. */
export function spawnFireworkBurst(particles, x, y, color, random) {
  const count = 24;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.3;
    const speed = 90 + random() * 120;
    particles.push({
      kind: 'firework',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 1.0 + random() * 0.5,
      maxLife: 1.5,
      size: 5 + random() * 3,
      color: color ?? '#f2c14e',
    });
  }
}

/** A shower of confetti pieces that flutter down slowly. */
export function spawnConfetti(particles, x, y, random) {
  const colors = ['#e63946', '#f2c14e', '#2a9d8f', '#7c5cbf', '#e07b39'];
  for (let i = 0; i < 22; i += 1) {
    particles.push({
      kind: 'confetti',
      x: x + (random() - 0.5) * 140,
      y: y + (random() - 0.5) * 30,
      vx: -15 + random() * 30,
      vy: 35 + random() * 35,
      life: 1.6 + random() * 0.8,
      maxLife: 2.4,
      size: 4 + random() * 2,
      color: colors[i % colors.length],
      sway: random() * Math.PI * 2,
      spin: -3 + random() * 6,
      angle: random() * Math.PI,
    });
  }
}

/** A puff of steam above a cooking pan. */
export function spawnSteamPuff(particles, x, y, random) {
  particles.push({
    kind: 'steam',
    x: x + (random() - 0.5) * 30,
    y,
    vx: (random() - 0.5) * 12,
    vy: -28 - random() * 20,
    life: 0.9 + random() * 0.4,
    maxLife: 1.3,
    size: 6 + random() * 6,
    color: '#e8ecf7',
  });
}

/** Stars over the festival results screen. */
export function spawnStarBurst(particles, x, y, count, random) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      kind: 'star',
      x: x + (random() - 0.5) * 300,
      y: y + (random() - 0.5) * 120,
      vx: 0,
      vy: -14 - random() * 20,
      life: 1.2 + random() * 0.6,
      maxLife: 1.8,
      size: 6 + random() * 6,
      color: '#ffd166',
    });
  }
}

/** Advance all particles one step; dead ones drop off the list. */
export function updateParticles(particles, step) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= step;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.kind === 'coin') p.vy += 320 * step;
    if (p.kind === 'steam') p.size += 14 * step;
    if (p.kind === 'firework') p.vy += 140 * step;
    if (p.kind === 'confetti') {
      p.x += Math.sin(p.life * 8 + p.sway) * 14 * step;
      p.angle += p.spin * step;
    }
  }
}

// Characters: the people of the night market. Each customer kind is a
// distinct character — a stranger should spot the critic and the big
// spender in two seconds — and every face changes with patience: smile,
// worry, anger. The cook runs the serving counter between the stalls.

const SKIN_TONES = ['#f2c89b', '#eab887', '#d99a63', '#c98a54'];
const SHIRT_BY_KIND = {
  sabar: ['#8b5a2b', '#7a4e24', '#9c6b3a'],
  buru: ['#e63946', '#ef476f', '#f4845f'],
  boros: ['#7c5cbf', '#8e6fd1', '#6a4fa8'],
  kritikus: ['#1f2430', '#2b3140', '#161a26'],
};

/** Pick a visual variant for a new customer: skin tone + shirt shade. */
export function customerVisualFor(random, kind) {
  const shirts = SHIRT_BY_KIND[kind] ?? SHIRT_BY_KIND.sabar;
  return {
    skin: SKIN_TONES[Math.floor(random() * SKIN_TONES.length)],
    shirt: shirts[Math.floor(random() * shirts.length)],
  };
}

/** The face a customer wears at a patience ratio: happy, worried, angry. */
export function customerFaceForPatience(ratio) {
  if (ratio <= 0.25) return 'angry';
  if (ratio <= 0.5) return 'worried';
  return 'happy';
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Eyes, brows and mouth for a face state, at a head centre. */
function drawFace(ctx, hx, hy, r, face, skin, kind) {
  // Anger reddens the skin before anything else is drawn.
  if (face === 'angry') {
    ctx.fillStyle = 'rgba(230, 57, 70, 0.30)';
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const eyeY = hy - 2;
  const eyeDx = r * 0.4;
  ctx.fillStyle = '#241a12';
  const eyeR = face === 'worried' ? 3.2 : 2.6;
  ctx.beginPath();
  ctx.arc(hx - eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(hx + eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  // Brows: raised and worried, or slanted and angry.
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  if (face === 'worried') {
    ctx.beginPath();
    ctx.moveTo(hx - eyeDx - 4, eyeY - 9);
    ctx.lineTo(hx - eyeDx + 4, eyeY - 12);
    ctx.moveTo(hx + eyeDx - 4, eyeY - 12);
    ctx.lineTo(hx + eyeDx + 4, eyeY - 9);
    ctx.stroke();
  } else if (face === 'angry') {
    ctx.beginPath();
    ctx.moveTo(hx - eyeDx - 4, eyeY - 12);
    ctx.lineTo(hx - eyeDx + 4, eyeY - 8);
    ctx.moveTo(hx + eyeDx - 4, eyeY - 8);
    ctx.lineTo(hx + eyeDx + 4, eyeY - 12);
    ctx.stroke();
  }
  // Mouth: smile, flat line, or frown.
  ctx.beginPath();
  if (face === 'happy') {
    ctx.arc(hx, hy + r * 0.25, r * 0.38, Math.PI * 0.15, Math.PI * 0.85);
  } else if (face === 'worried') {
    ctx.moveTo(hx - r * 0.3, hy + r * 0.45);
    ctx.lineTo(hx + r * 0.3, hy + r * 0.45);
  } else {
    ctx.arc(hx, hy + r * 0.75, r * 0.35, Math.PI * 1.15, Math.PI * 1.85);
  }
  ctx.stroke();
  // The hurried customer sweats when the wait drags on.
  if (kind === 'buru' && face !== 'happy') {
    ctx.fillStyle = '#7ec8e3';
    ctx.beginPath();
    ctx.ellipse(hx + r * 0.95, hy - r * 0.55, 3.5, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(hx + r * 0.9, hy - r * 0.7, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Anger steams out of the head.
  if (face === 'angry') {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx - 8, hy - r - 6, 4, Math.PI * 0.9, Math.PI * 1.9);
    ctx.arc(hx + 6, hy - r - 10, 4, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
  }
  void skin;
}

function drawCaping(ctx, hx, hy, r) {
  // The patient elder's woven cone hat.
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.moveTo(hx - r - 8, hy - r + 6);
  ctx.quadraticCurveTo(hx, hy - r - 22, hx + r + 8, hy - r + 6);
  ctx.quadraticCurveTo(hx, hy - r + 12, hx - r - 8, hy - r + 6);
  ctx.fill();
  ctx.strokeStyle = '#a87c2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - r - 2, hy - r - 2);
  ctx.quadraticCurveTo(hx, hy - r - 14, hx + r + 2, hy - r - 2);
  ctx.stroke();
  // A small white chin beard under the mouth.
  ctx.fillStyle = '#f5f0e6';
  ctx.beginPath();
  ctx.ellipse(hx, hy + r * 0.85, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBaseballCap(ctx, hx, hy, r) {
  // The hurried youngster's cap, brim forward.
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.arc(hx, hy - r + 8, r * 0.95, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + r + 6, hy - r + 8, 12, 4, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, hy - r + 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawTopHat(ctx, hx, hy, r) {
  // The critic's top hat, with a gold band.
  ctx.fillStyle = '#14161f';
  roundRectPath(ctx, hx - r * 0.7, hy - r - 26, r * 1.4, 26, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx, hy - r, r * 1.05, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(hx - r * 0.7, hy - r - 8, r * 1.4, 5);
}

function drawMonocle(ctx, hx, hy, r) {
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx + r * 0.4, hy - 2, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.4 + 5, hy + 3);
  ctx.lineTo(hx + r * 0.75, hy + r * 0.8);
  ctx.stroke();
}

/** The kind's signature accessory: hat, necklace, monocle, bow tie. */
export function customerAccessory(ctx, kind, hx, hy, r, face, torsoY, torsoW) {
  if (kind === 'sabar') drawCaping(ctx, hx, hy, r);
  else if (kind === 'buru') drawBaseballCap(ctx, hx, hy, r);
  else if (kind === 'kritikus') {
    drawTopHat(ctx, hx, hy, r);
    drawMonocle(ctx, hx, hy, r);
    // Gold bow tie at the neck.
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(hx, torsoY + 4);
    ctx.lineTo(hx - 9, torsoY - 1);
    ctx.lineTo(hx - 9, torsoY + 9);
    ctx.closePath();
    ctx.moveTo(hx, torsoY + 4);
    ctx.lineTo(hx + 9, torsoY - 1);
    ctx.lineTo(hx + 9, torsoY + 9);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'boros') {
    // A thick gold necklace across the chest.
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hx, torsoY - 4, torsoW * 0.32, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(hx, torsoY + torsoW * 0.28, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  void face;
}

/**
 * A full customer character at its seat: chair, body, head, face,
 * accessory and table. The customer carries {kind, x, y, wobble,
 * visual, patience, maxPatience}. The critic sits 12px higher so the
 * top hat clears the patience bar.
 */
export function drawCustomerCharacter(ctx, customer, time) {
  const { kind } = customer;
  const lift = kind === 'kritikus' ? -12 : 0;
  const bob = Math.sin(time * 2 + (customer.wobble ?? 0)) * 1.5;
  const x = customer.x;
  const y = customer.y + lift;
  const visual = customer.visual ?? { skin: '#f2c89b', shirt: '#8b5a2b' };
  const headR = kind === 'boros' ? 22 : 20;
  const torsoW = kind === 'boros' ? 68 : 56;
  const headY = y - 12 + bob;
  const torsoY = headY + headR - 4;
  const face = customerFaceForPatience(customer.patience / customer.maxPatience);

  // Chair: wooden, or red VIP with gold trim for the critic.
  ctx.fillStyle = kind === 'kritikus' ? '#a93226' : '#6b4423';
  roundRectPath(ctx, x - 36, y + 4, 72, 46, 8);
  ctx.fill();
  if (kind === 'kritikus') {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x - 36, y + 4, 72, 46, 8);
    ctx.stroke();
  }

  // Torso.
  ctx.fillStyle = visual.shirt;
  roundRectPath(ctx, x - torsoW / 2, torsoY, torsoW, 40, 12);
  ctx.fill();

  // Head.
  ctx.fillStyle = visual.skin;
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  drawFace(ctx, x, headY, headR, face, visual.skin, kind);
  customerAccessory(ctx, kind, x, headY, headR, face, torsoY, torsoW);

  // Table in front, with a small plate and cup.
  ctx.fillStyle = '#7a4a21';
  roundRectPath(ctx, x - 48, y + 45, 96, 16, 5);
  ctx.fill();
  ctx.fillStyle = '#a06a35';
  ctx.fillRect(x - 48, y + 45, 96, 4);
  if (kind === 'kritikus') {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x - 48, y + 45, 96, 16, 5);
    ctx.stroke();
  }
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.arc(x - 18, y + 46, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e07b39';
  ctx.fillRect(x + 12, y + 40, 8, 10);
}

/**
 * The critic, drawn as a full character, with an optional thumbs-up
 * for the results screen celebration.
 */
export function drawCritic(ctx, customer, time, celebrating = false) {
  drawCustomerCharacter(ctx, customer, time);
  if (!celebrating) return;
  const x = customer.x;
  const y = customer.y - 12;
  const visual = customer.visual ?? { skin: '#f2c89b', shirt: '#1f2430' };
  // Raised arm and thumb.
  ctx.strokeStyle = visual.shirt;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 32);
  ctx.lineTo(x + 44, y + 6);
  ctx.stroke();
  ctx.fillStyle = visual.skin;
  ctx.beginPath();
  ctx.arc(x + 47, y + 1, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 47, y - 8, 3.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The cook behind the serving counter: chef hat, apron, and a stirring
 * arm when busy. (x, y) is the counter top the cook stands behind.
 */
export function drawCook(ctx, x, y, time, busy) {
  const headY = y - 44;
  const bob = Math.sin(time * 3) * 1.2;
  // Torso with apron.
  ctx.fillStyle = '#2f6f5e';
  roundRectPath(ctx, x - 26, y - 28, 52, 32, 10);
  ctx.fill();
  ctx.fillStyle = '#fdf6e3';
  roundRectPath(ctx, x - 16, y - 24, 32, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#e07b39';
  ctx.fillRect(x - 16, y - 24, 32, 4);
  // Stirring arm: a small pan that rocks when a stall is cooking.
  const armAngle = busy ? Math.sin(time * 6) * 0.35 : 0;
  ctx.save();
  ctx.translate(x + 26, y - 18);
  ctx.rotate(armAngle);
  ctx.strokeStyle = '#2f6f5e';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, -4);
  ctx.stroke();
  ctx.fillStyle = '#3a3f4a';
  ctx.beginPath();
  ctx.ellipse(22, -6, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e07b39';
  ctx.beginPath();
  ctx.arc(22, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Head.
  ctx.fillStyle = '#eab887';
  ctx.beginPath();
  ctx.arc(x, headY + bob, 17, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat: three puffs over a band.
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.arc(x - 11, headY - 14 + bob, 8, 0, Math.PI * 2);
  ctx.arc(x, headY - 19 + bob, 10, 0, Math.PI * 2);
  ctx.arc(x + 11, headY - 14 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 16, headY - 16 + bob, 32, 8);
  // A focused smile and eyes.
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.arc(x - 6, headY - 1 + bob, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 6, headY - 1 + bob, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, headY + 5 + bob, 5, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

// Render: paints the market — a real night-market world (dusk sky, city
// roofs, warm floor, string lights), distinct customer characters with
// order bubbles and patience bars, a serving counter with the cook, stalls
// with big woks, the HUD, and the title / shop / results screens.
// Everything is drawn, nothing is an image.

import { COOK, COUNTER, DISHES, FIELD, PALETTE } from './config.js';
import { stallRecipes } from './recipes.js';
import { stallCookProgress } from './stalls.js';
import { boughtUpgrades, upgradeChoices } from './upgrades.js';
import { coinBalance } from './economy.js';
import { comboMultiplier } from './combo.js';
import { drawCook, drawCritic, drawCustomerCharacter } from './characters.js';
import { drawBunting, drawCitySkyline, drawConfetti, drawFireworks, drawMarketFloor, drawNightSky } from './scene.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SHOP = 'shop';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export const START_BUTTON = { x: 490, y: 520, width: 300, height: 64 };
export const RESTART_BUTTON = { x: 490, y: 505, width: 300, height: 64 };
export const NEXT_NIGHT_BUTTON = { x: 980, y: 640, width: 240, height: 56 };

/** The shop card grid (computed once, shared with the click handler). */
export function shopCards() {
  const cards = [];
  for (let i = 0; i < 6; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    cards.push({ x: 90 + col * 390, y: 130 + row * 220, width: 360, height: 190 });
  }
  return cards;
}

/** Is a point inside a rectangle? */
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = FIELD.width;
    canvas.height = FIELD.height;
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground(world, time) {
    // The market as a world: dusk sky with stars, city roofs, warm floor.
    // No big sun — the market glows from its stalls, not from the sky.
    const festival = world.nights.night >= 7;
    drawNightSky(ctx, time, festival);
    drawCitySkyline(ctx);
    drawMarketFloor(ctx, world.stalls.map((stall) => stall.x));
    // Festival bunting on night 7, above the string lights.
    if (festival) drawBunting(ctx, time);
    // String lights across the top of the market (small dots only).
    ctx.strokeStyle = 'rgba(255, 243, 214, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 116);
    ctx.quadraticCurveTo(640, 168, 1280, 116);
    ctx.stroke();
    for (let i = 0; i < 14; i += 1) {
      const x = 60 + i * 88;
      const y = 116 + Math.sin((i / 13) * Math.PI) * 32;
      const glow = 0.6 + 0.3 * Math.sin(time * 2 + i);
      ctx.globalAlpha = glow;
      ctx.fillStyle = i % 3 === 0 ? '#ff9f1c' : i % 3 === 1 ? '#ffd166' : '#7ee081';
      ctx.beginPath();
      ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Planters frame the market edges now that the counter fills the middle.
    for (const px of [36, 1244]) {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(px - 26, 330, 52, 22);
      ctx.fillStyle = '#2f7d4f';
      ctx.beginPath();
      ctx.arc(px - 12, 322, 16, 0, Math.PI * 2);
      ctx.arc(px + 12, 318, 18, 0, Math.PI * 2);
      ctx.arc(px, 310, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5964';
      ctx.beginPath();
      ctx.arc(px - 14, 312, 4, 0, Math.PI * 2);
      ctx.arc(px + 10, 306, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The stall's big wok: visible food, steam, and a large progress ring. */
  function drawStallWok(stall, time) {
    const { x } = stall;
    const wokY = 596;
    const job = stall.cooking;
    // The wok itself: dark pan with a warm rim.
    ctx.fillStyle = '#101a33';
    ctx.beginPath();
    ctx.arc(x, wokY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a6478';
    ctx.lineWidth = 3;
    ctx.stroke();
    // The food inside, big enough to read at a glance.
    if (job) {
      const dish = DISHES[job.dishId];
      ctx.fillStyle = dish.color;
      ctx.beginPath();
      ctx.arc(x, wokY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dish.glyph, x, wokY + 11);
      // The progress ring around the wok, twice the old size.
      const done = stallCookProgress(stall);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(x, wokY, 43, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2);
      ctx.stroke();
      // The ring is the timer: no seconds text under the wok (it would sit
      // below the card's edge, on the floor).
      // Steam: large white puffs rising from the wok.
      const steam = 0.5 + 0.5 * Math.sin(time * 3 + x);
      ctx.globalAlpha = 0.45 + 0.3 * steam;
      ctx.fillStyle = '#e8ecf7';
      ctx.beginPath();
      ctx.arc(x - 14, wokY - 46, 9 + 4 * steam, 0, Math.PI * 2);
      ctx.arc(x + 10, wokY - 56, 11 + 4 * steam, 0, Math.PI * 2);
      ctx.arc(x + 2, wokY - 68, 8 + 3 * steam, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // An empty wok waits, with the hint below it.
      ctx.fillStyle = '#1a2440';
      ctx.beginPath();
      ctx.arc(x, wokY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aab3d0';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('Klik untuk memasak', x, wokY + 40);
    }
  }

  function drawStall(stall, world, time) {
    const { x } = stall;
    // Wooden posts turn the card into a market structure.
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x - 128, 446, 10, 196);
    ctx.fillRect(x + 118, 446, 10, 196);
    if (stall.locked) {
      ctx.fillStyle = '#232c47';
      roundRect(x - 120, 470, 240, 172, 12);
      ctx.fill();
      ctx.strokeStyle = '#3a4a75';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#aab3d0';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', x, 546);
      ctx.fillStyle = '#f8f4e8';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('TERKUNCI', x, 584);
      ctx.fillStyle = '#aab3d0';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Beli di toko antar-malam', x, 610);
      return;
    }
    // Striped awning.
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? stall.roof : '#fff3d6';
      const ax = x - 130 + i * 44;
      ctx.beginPath();
      ctx.moveTo(ax, 392);
      ctx.lineTo(ax + 44, 392);
      ctx.lineTo(ax + 44, 428);
      ctx.lineTo(ax + 22, 446);
      ctx.lineTo(ax, 428);
      ctx.closePath();
      ctx.fill();
    }
    // Counter card, taller now that the wok is big.
    ctx.fillStyle = '#2e3d63';
    roundRect(x - 120, 470, 240, 172, 12);
    ctx.fill();
    ctx.strokeStyle = stall.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Stall name + dish selector chips.
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stall.name, x, 498);
    const recipes = stallRecipes(stall.id).filter((dish) => !dish.locked || world.unlocked.has(dish.id));
    recipes.forEach((dish, i) => {
      const chipX = x - 44 + i * 88;
      const selected = stall.selectedDish === dish.id || (!stall.selectedDish && i === 0);
      ctx.fillStyle = selected ? dish.color : '#1a2440';
      roundRect(chipX - 40, 510, 80, 34, 17);
      ctx.fill();
      ctx.strokeStyle = selected ? '#fff3d6' : '#3a4a75';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`${dish.glyph} ${dish.price}`, chipX, 533);
    });
    drawStallWok(stall, time);
  }

  /** The serving counter: the cook, and finished dishes waiting on plates. */
  function drawServingCounter(world, time) {
    const anyCooking = world.stalls.some((stall) => stall.cooking);
    drawCook(ctx, COOK.x, COUNTER.y, time, anyCooking);
    // The wooden counter bar.
    ctx.fillStyle = '#6b4423';
    roundRect(COUNTER.x, COUNTER.y, COUNTER.width, COUNTER.height, 8);
    ctx.fill();
    ctx.fillStyle = '#8b5a2b';
    roundRect(COUNTER.x, COUNTER.y, COUNTER.width, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#4a2d15';
    ctx.fillRect(COUNTER.x, COUNTER.y + COUNTER.height - 4, COUNTER.width, 4);
    // Finished dishes wait on the counter, above their own stall.
    for (const stall of world.stalls) {
      stall.counter.forEach((dishId, i) => {
        const dish = DISHES[dishId];
        const dx = stall.x - 70 + i * 70;
        const dy = COUNTER.dishY;
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.arc(dx, dy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dish.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.font = '26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dish.glyph, dx, dy + 9);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText('SIAP!', dx, COUNTER.y + 24);
      });
    }
  }

  function drawCustomer(customer, time) {
    const wobbleX = Math.sin(customer.wobble) * 3;
    const x = customer.x + wobbleX;
    const y = customer.y;
    const drawn = { ...customer, x, y };
    // Order bubble first: each order on its own plate, so a double order
    // reads as two plates. The critic's bubble has a gold outline.
    const bubbleY = y - 108;
    ctx.fillStyle = '#fff3d6';
    roundRect(x - 52, bubbleY, 104, 52, 12);
    ctx.fill();
    ctx.strokeStyle = customer.kind === 'kritikus' ? '#f2c14e' : customer.angry ? '#ff5964' : '#3a4a75';
    ctx.lineWidth = customer.kind === 'kritikus' ? 3 : 2;
    ctx.stroke();
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const orders = customer.orders;
    if (orders.length === 0) {
      ctx.fillText('✓', x, bubbleY + 35);
    } else if (orders.length === 1) {
      ctx.fillStyle = '#e8ecf7';
      ctx.beginPath();
      ctx.arc(x, bubbleY + 26, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(DISHES[orders[0]].glyph, x, bubbleY + 35);
    } else {
      orders.slice(0, 2).forEach((dishId, i) => {
        const px = x - 26 + i * 52;
        ctx.fillStyle = '#e8ecf7';
        ctx.beginPath();
        ctx.arc(px, bubbleY + 26, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(DISHES[dishId].glyph, px, bubbleY + 34);
      });
    }
    // Patience bar: green → yellow → red.
    const ratio = Math.max(0, customer.patience / customer.maxPatience);
    const barColor = ratio > 0.5 ? '#7ee081' : ratio > 0.25 ? '#ffd166' : '#ff5964';
    ctx.fillStyle = '#101a33';
    roundRect(x - 52, bubbleY + 56, 104, 10, 5);
    ctx.fill();
    ctx.fillStyle = barColor;
    roundRect(x - 52, bubbleY + 56, 104 * ratio, 10, 5);
    ctx.fill();
    // The character itself: chair, body, face, accessory, table.
    drawCustomerCharacter(ctx, drawn, time);
    if (customer.leaving && customer.angry) {
      ctx.fillStyle = '#ff5964';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('💢', x, y - 70);
    }
    if (customer.leaving && customer.happy) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('😊', x, y - 70);
    }
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife)) * 0.9;
      ctx.fillStyle = p.color;
      if (p.kind === 'star') {
        ctx.font = `${p.size * 2}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('★', p.x, p.y);
      } else if (p.kind === 'firework') {
        // A bright core with a faint halo around it.
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife)) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle ?? 0);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.kind === 'coin') {
        // Coins glow: a faint halo around a bright core, so a burst reads
        // as a burst even at a glance.
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife)) * 0.18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats(world) {
    ctx.textAlign = 'center';
    for (const float of world.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, float.life));
      ctx.fillStyle = float.color;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(float.text, float.x, float.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD(world, muted) {
    ctx.fillStyle = 'rgba(16, 26, 51, 0.92)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    ctx.fillStyle = PALETTE.awning;
    ctx.fillRect(0, FIELD.hudHeight - 3, FIELD.width, 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Malam ${Math.max(1, world.nights.night)}/${7}`, 16, 40);
    ctx.fillStyle = '#aab3d0';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(world.nights.event.name, 170, 40);
    // Coins + night target.
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`🪙 ${world.purse.coins}`, 380, 41);
    ctx.fillStyle = '#aab3d0';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Target malam: ${world.nights.target} · Malam ini: ${world.purse.nightIncome}`, 540, 40);
    // Hearts.
    ctx.font = '26px system-ui, sans-serif';
    let hearts = '';
    for (let i = 0; i < 5; i += 1) hearts += i < world.purse.hearts ? '♥' : '♡';
    ctx.fillStyle = '#ff5964';
    ctx.fillText(hearts, 900, 41);
    // Timer + combo.
    const seconds = Math.max(0, Math.ceil(world.nights.secondsLeft));
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    ctx.fillStyle = seconds <= 10 ? '#ff5964' : '#fff3d6';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`${mm}:${ss}`, 1048, 40);
    if (world.combo.count >= 2) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(`Kombo x${comboMultiplier(world.combo).toFixed(1)}`, 1140, 40);
    }
    // Mute lives in the bottom hint bar; the HUD keeps timer + combo only.
    void muted;
  }

  function drawTitleScreen(world, best) {
    // Lighter than before, so the living market shows through the panel.
    ctx.fillStyle = 'rgba(16, 26, 51, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.awning;
    ctx.lineWidth = 3;
    ctx.strokeRect(330, 90, 620, 470);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PASAR SENJA', 640, 210);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('— Layani 7 malam hingga festival —', 640, 258);
    ctx.fillStyle = '#f8f4e8';
    ctx.font = '21px system-ui, sans-serif';
    ctx.fillText('Masak hidangan, antar sebelum pelanggan marah,', 640, 312);
    ctx.fillText('dan belanja upgrade antar-malam. Jangan sampai', 640, 342);
    ctx.fillText('reputasi pasar habis!', 640, 372);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('Klik stan: masak • Klik hidangan lalu klik pelanggan: antar', 640, 420);
    ctx.fillText('1/2/3: masak di stan • P: jeda • R: ulang • M: suara', 640, 448);
    if (best > 0) {
      ctx.fillStyle = '#aab3d0';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(`Penghasilan terbaik: ${best} koin`, 640, 482);
    }
    // Start button.
    ctx.fillStyle = PALETTE.awning;
    roundRect(START_BUTTON.x, START_BUTTON.y, START_BUTTON.width, START_BUTTON.height, 10);
    ctx.fill();
    ctx.fillStyle = '#101a33';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('MULAI BERDAGANG', 640, START_BUTTON.y + 42);
    ctx.textAlign = 'left';
  }

  function drawShopScreen(world) {
    ctx.fillStyle = 'rgba(16, 26, 51, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TOKO — Malam ${world.nights.night} selesai!`, 640, 70);
    ctx.fillStyle = '#f8f4e8';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`Penghasilan malam ini: ${world.purse.nightIncome} koin · Hati: ${'♥'.repeat(world.purse.hearts)}${'♡'.repeat(5 - world.purse.hearts)}`, 640, 104);
    const cards = shopCards();
    const choices = upgradeChoices(world.shop);
    choices.forEach((item, i) => {
      const card = cards[i];
      const affordable = world.purse.coins >= item.price;
      ctx.fillStyle = affordable ? '#2e3d63' : '#232c47';
      roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.fill();
      ctx.strokeStyle = affordable ? PALETTE.awning : '#3a4a75';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(item.name, card.x + card.width / 2, card.y + 40);
      ctx.fillStyle = '#aab3d0';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(item.blurb, card.x + card.width / 2, card.y + 72);
      ctx.fillStyle = affordable ? '#ffd166' : '#ff5964';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(`🪙 ${item.price}`, card.x + card.width / 2, card.y + 128);
      ctx.fillStyle = affordable ? '#101a33' : '#aab3d0';
      if (affordable) {
        ctx.fillStyle = PALETTE.awning;
        roundRect(card.x + 100, card.y + 142, 160, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#101a33';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText('BELI', card.x + card.width / 2, card.y + 166);
      } else {
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillStyle = '#ff5964';
        ctx.fillText('Koin tidak cukup', card.x + card.width / 2, card.y + 166);
      }
    });
    if (choices.length === 0) {
      ctx.fillStyle = '#7ee081';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('Semua upgrade sudah dibeli!', 640, 300);
    }
    // Bought upgrades fill the empty slots with a DIMILIKI badge.
    const owned = boughtUpgrades(world.shop);
    owned.forEach((item, j) => {
      const slot = choices.length + j;
      if (slot >= cards.length) return;
      const card = cards[slot];
      ctx.fillStyle = '#1a2440';
      roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.fill();
      ctx.strokeStyle = '#3a4a75';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#aab3d0';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(item.name, card.x + card.width / 2, card.y + 40);
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(item.blurb, card.x + card.width / 2, card.y + 72);
      ctx.fillStyle = '#7ee081';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('✓ DIMILIKI', card.x + card.width / 2, card.y + 128);
      ctx.fillStyle = '#aab3d0';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Sudah aktif di pasar', card.x + card.width / 2, card.y + 160);
    });
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Koin: ${world.purse.coins}`, 200, 668);
    ctx.fillStyle = PALETTE.awning;
    roundRect(NEXT_NIGHT_BUTTON.x, NEXT_NIGHT_BUTTON.y, NEXT_NIGHT_BUTTON.width, NEXT_NIGHT_BUTTON.height, 10);
    ctx.fill();
    ctx.fillStyle = '#101a33';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`Malam ${world.nights.night + 1} ▶`, NEXT_NIGHT_BUTTON.x + NEXT_NIGHT_BUTTON.width / 2, NEXT_NIGHT_BUTTON.y + 37);
    ctx.textAlign = 'left';
  }

  /** The celebrating crowd on the win screen: happy regulars + the critic. */
  function drawResultsCrowd(time) {
    const crowd = [
      { kind: 'sabar', x: 150, visual: { skin: '#f2c89b', shirt: '#8b5a2b' } },
      { kind: 'buru', x: 330, visual: { skin: '#eab887', shirt: '#e63946' } },
      { kind: 'boros', x: 510, visual: { skin: '#d99a63', shirt: '#7c5cbf' } },
      { kind: 'sabar', x: 690, visual: { skin: '#c98a54', shirt: '#9c6b3a' } },
      { kind: 'buru', x: 870, visual: { skin: '#f2c89b', shirt: '#f4845f' } },
      { kind: 'kritikus', x: 1050, visual: { skin: '#eab887', shirt: '#1f2430' } },
    ];
    crowd.forEach((person, i) => {
      const guest = {
        kind: person.kind,
        x: person.x,
        y: 640,
        wobble: i * 1.1,
        visual: person.visual,
        patience: 1,
        maxPatience: 1,
      };
      if (person.kind === 'kritikus') drawCritic(ctx, guest, time, true);
      else drawCustomerCharacter(ctx, guest, time);
    });
  }

  function drawResultsScreen(world, best, won, time) {
    ctx.fillStyle = won ? 'rgba(16, 26, 51, 0.72)' : 'rgba(16, 26, 51, 0.85)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    if (won) {
      // Fireworks and confetti frozen in the air over the celebration.
      drawFireworks(ctx, [
        { x: 180, y: 140, color: '#f2c14e', radius: 46 },
        { x: 1100, y: 120, color: '#e63946', radius: 42 },
        { x: 640, y: 96, color: '#2a9d8f', radius: 38 },
      ], time);
      drawConfetti(ctx, [
        { x: 120, y: 220, angle: 0.4, color: '#e63946' }, { x: 240, y: 160, angle: 1.2, color: '#f2c14e' },
        { x: 380, y: 200, angle: 0.8, color: '#2a9d8f' }, { x: 520, y: 150, angle: 2.1, color: '#7c5cbf' },
        { x: 760, y: 180, angle: 0.2, color: '#e07b39' }, { x: 900, y: 140, angle: 1.6, color: '#f2c14e' },
        { x: 1040, y: 210, angle: 0.9, color: '#2a9d8f' }, { x: 1160, y: 170, angle: 2.6, color: '#e63946' },
        { x: 300, y: 260, angle: 1.9, color: '#7c5cbf' }, { x: 980, y: 260, angle: 0.5, color: '#e07b39' },
      ]);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 60px system-ui, sans-serif';
      ctx.fillText('FESTIVAL BERHASIL!', 640, 168);
      ctx.fillStyle = '#fff3d6';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('Kritikus pulang tersenyum. Pasar Senja jadi buah bibir kota.', 640, 212);
      ctx.font = '54px system-ui, sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('★'.repeat(world.stars) + '☆'.repeat(3 - world.stars), 640, 276);
    } else {
      ctx.fillStyle = '#ff5964';
      ctx.font = 'bold 60px system-ui, sans-serif';
      ctx.fillText('PASAR SEPI', 640, 168);
      ctx.fillStyle = '#fff3d6';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('Reputasi habis — pelanggan pergi dan tak kembali.', 640, 212);
      ctx.font = '54px system-ui, sans-serif';
      ctx.fillStyle = '#aab3d0';
      ctx.fillText('☆☆☆', 640, 276);
    }
    // A bigger stats panel, one row per stat with an icon.
    ctx.fillStyle = 'rgba(16, 26, 51, 0.8)';
    roundRect(390, 300, 500, 168, 14);
    ctx.fill();
    ctx.strokeStyle = '#3a4a75';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`🪙 Penghasilan total: ${world.purse.totalIncome} koin`, 640, 342);
    ctx.fillStyle = '#f8f4e8';
    ctx.font = '21px system-ui, sans-serif';
    ctx.fillText(`😊 Pelanggan dilayani: ${world.stats.served}  ·  💢 Marah: ${world.stats.angry}`, 640, 382);
    ctx.fillText(`🌙 Malam dicapai: ${world.nights.night}/7  ·  🔥 Kombo terbaik: x${world.combo.best}`, 640, 414);
    ctx.fillText(`🍢 Hidangan dimasak: ${world.stats.dishesCooked}  ·  🛒 Upgrade: ${world.stats.upgradesBought}`, 640, 446);
    if (world.purse.totalIncome >= best && world.purse.totalIncome > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('★ Penghasilan terbaik baru! ★', 640, 490);
    }
    ctx.fillStyle = PALETTE.awning;
    roundRect(RESTART_BUTTON.x, RESTART_BUTTON.y, RESTART_BUTTON.width, RESTART_BUTTON.height, 10);
    ctx.fill();
    ctx.fillStyle = '#101a33';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('MAIN LAGI (R)', 640, RESTART_BUTTON.y + 40);
    ctx.fillStyle = '#aab3d0';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Klik tombol atau tekan R untuk membuka pasar lagi.', 640, 592);
    // The crowd celebrates below the button (win only — a lost market is quiet).
    if (won) drawResultsCrowd(time);
    ctx.textAlign = 'left';
  }

  function drawPausedScreen() {
    ctx.fillStyle = 'rgba(16, 26, 51, 0.7)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JEDA', 640, 330);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Tekan P atau klik untuk lanjut • R untuk ulang dari awal', 640, 380);
    ctx.textAlign = 'left';
  }

  function drawPlayScreen(world, muted, mouse) {
    drawBackground(world, world.time);
    for (const customer of world.customers) drawCustomer(customer, world.time);
    drawServingCounter(world, world.time);
    for (const stall of world.stalls) drawStall(stall, world, world.time);
    drawParticles(world);
    drawFloats(world);
    drawHUD(world, muted);
    // The carried dish follows the cursor.
    if (world.carried) {
      const dish = DISHES[world.carried];
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y - 24, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dish.color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dish.glyph, mouse.x, mouse.y - 15);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('Klik pelanggan yang memesannya', mouse.x, mouse.y + 22);
      ctx.textAlign = 'left';
    }
    // Bottom hint bar.
    ctx.fillStyle = 'rgba(16, 26, 51, 0.85)';
    ctx.fillRect(0, 664, FIELD.width, 56);
    ctx.fillStyle = '#aab3d0';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Klik stan: masak  •  Klik hidangan: bawa  •  Klik pelanggan: antar  •  1/2/3: masak di stan  •  P: jeda  •  R: ulang  •  M: suara', 16, 698);
  }

  /** Paint the current screen over the world. */
  function draw(world, screen, best, muted, mouse = { x: 640, y: 360 }) {
    if (screen === SCREEN_TITLE) {
      // The title floats over a living market: customers, cook, stalls.
      drawBackground(world, world.time);
      for (const customer of world.customers) drawCustomer(customer, world.time);
      drawServingCounter(world, world.time);
      for (const stall of world.stalls) drawStall(stall, world, world.time);
      drawTitleScreen(world, best);
    } else if (screen === SCREEN_SHOP) {
      drawBackground(world, world.time);
      drawServingCounter(world, world.time);
      for (const stall of world.stalls) drawStall(stall, world, world.time);
      drawShopScreen(world);
    } else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      drawBackground(world, world.time);
      drawResultsScreen(world, best, screen === SCREEN_WIN, world.time);
    } else if (screen === SCREEN_PAUSED) {
      drawPlayScreen(world, muted, mouse);
      drawPausedScreen();
    } else {
      drawPlayScreen(world, muted, mouse);
    }
  }

  return { draw };
}

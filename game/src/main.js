// Boot and the one loop: input is read every frame, the market advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// shop, victory and defeat.
//
// ?seed=N fixes the nights. ?shot=festival|title|shop|results (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createMarket, resetMarket, startMarketNight, stepMarket, clickStallAt, takeDishAt, serveAt, cancelCarry, EVENT_WIN, EVENT_LOSE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_STALL_1, ACTION_STALL_2, ACTION_STALL_3, createInput, takeActions, takeClick, mousePosition } from './input.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN, START_BUTTON, RESTART_BUTTON, NEXT_NIGHT_BUTTON, shopCards, pointInRect } from './render.js';
import { buyUpgrade, upgradeChoices } from './upgrades.js';
import { stallRecipes } from './recipes.js';
import { unlockAudio, toggleMute, playVictorySound, playDefeatSound } from './audio.js';
import { loadBestIncome, saveBestIncome } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const market = createMarket(createRandom(seed));
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, market);
  let painted = 0;
  function paint() {
    renderer.draw(market, scene.screen, scene.best, false, { x: 640, y: 360 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = loadBestIncome();
  let muted = false;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  /** Begin a fresh festival run: reset the market, open the first night. */
  function startGame() {
    resetMarket(market);
    startMarketNight(market);
    screen = SCREEN_PLAY;
    announce('Playing. Serve customers for 7 nights until the festival.');
  }

  /** Start over from the title, the results or the shop screen. */
  function restartGame() {
    startGame();
  }

  /** The festival is won: the critic smiled, the score is kept. */
  function endGameWon() {
    screen = SCREEN_WIN;
    best = saveBestIncome(market.purse.totalIncome);
    playVictorySound();
    announce(`Festival success! Income ${market.purse.totalIncome}. Best ${best}.`);
  }

  /** The market went quiet: reputation ran out. */
  function endGameLost() {
    screen = SCREEN_LOSE;
    best = saveBestIncome(market.purse.totalIncome);
    playDefeatSound();
    announce(`The market went quiet. Income ${market.purse.totalIncome}. Best ${best}.`);
  }

  /** A click on a stall's dish chip: switch which dish that stall cooks. */
  function handleDishChipClick(point) {
    for (const stall of market.stalls) {
      if (stall.locked) continue;
      const recipes = stallRecipes(stall.id).filter((dish) => !dish.locked || market.unlocked.has(dish.id));
      for (let i = 0; i < recipes.length; i += 1) {
        const chipX = stall.x - 44 + i * 88;
        if (Math.abs(point.x - chipX) < 42 && point.y >= 510 && point.y <= 548) {
          stall.selectedDish = recipes[i].id;
          return true;
        }
      }
    }
    return false;
  }

  /** A click on the field during play: cook, carry, serve, or put back. */
  function handleFieldClick(point) {
    if (market.carried) {
      const served = serveAt(market, point.x, point.y);
      if (served && served.matched) return;
      if (served && !served.matched) return;
      if (takeDishAt(market, point.x, point.y)) return;
      cancelCarry(market);
      return;
    }
    if (handleDishChipClick(point)) return;
    if (takeDishAt(market, point.x, point.y)) return;
    clickStallAt(market, point.x, point.y);
  }

  /** A click on a shop card: buy the upgrade when the purse allows. */
  function handleShopClick(point) {
    const cards = shopCards();
    const choices = upgradeChoices(market.shop);
    for (let i = 0; i < choices.length; i += 1) {
      const card = cards[i];
      if (!pointInRect(point.x, point.y, card)) continue;
      if (buyUpgrade(market.shop, market.purse, market.stalls, market.unlocked, choices[i])) {
        market.stats.upgradesBought += 1;
        announce(`Bought ${choices[i].name}.`);
      }
      return;
    }
    if (pointInRect(point.x, point.y, NEXT_NIGHT_BUTTON)) {
      startMarketNight(market);
      screen = SCREEN_PLAY;
      announce(`Night ${market.nights.night} begins.`);
    }
  }

  function handleActions() {
    const actions = takeActions(input);
    if (actions & ACTION_MUTE) {
      muted = toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    const click = takeClick(input);
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
      else if (click && pointInRect(click.x, click.y, START_BUTTON)) {
        unlockAudio();
        startGame();
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        restartGame();
      } else if (actions & ACTION_STALL_1) {
        clickStallAt(market, market.stalls[0].x, 520);
      } else if (actions & ACTION_STALL_2) {
        clickStallAt(market, market.stalls[1].x, 520);
      } else if (actions & ACTION_STALL_3) {
        clickStallAt(market, market.stalls[2].x, 520);
      } else if (click) {
        unlockAudio();
        handleFieldClick(click);
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM) || click) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_RESTART) {
        restartGame();
      }
    } else if (screen === SCREEN_SHOP) {
      if (click) handleShopClick(click);
      else if (actions & ACTION_CONFIRM) {
        startMarketNight(market);
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM)) restartGame();
      else if (click && pointInRect(click.x, click.y, RESTART_BUTTON)) restartGame();
    }
  }

  function step() {
    const events = stepMarket(market, STEP);
    if (events & EVENT_WIN) endGameWon();
    else if (events & EVENT_LOSE) endGameLost();
    else if (market.inShop && screen === SCREEN_PLAY) {
      screen = SCREEN_SHOP;
      announce(`Night ${market.nights.night} done. Shop time.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      // The title's backdrop drifts: string lights sway, the market waits.
      while (accumulator >= STEP) {
        stepMarket(market, STEP);
        accumulator -= STEP;
      }
      accumulator = 0;
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const mouse = mousePosition(input);
    renderer.draw(market, screen, best, muted, mouse);
  }

  // Leaving the tab pauses a running game rather than letting patience run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A small handle for the maker's own play-tests (never used by the game itself).
  window.__pasarsenja = {
    get market() {
      return market;
    },
    get screen() {
      return screen;
    },
    startGame,
  };

  announce('PASAR SENJA. Press Space or click to start trading.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

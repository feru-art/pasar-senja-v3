// Input: the mouse does the cooking and the serving; keys switch stalls,
// pause, restart and mute. Clicks and actions are queued per frame so the
// loop reads them exactly once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_STALL_1 = 16;
export const ACTION_STALL_2 = 32;
export const ACTION_STALL_3 = 64;

/** A fresh input state: mouse in the middle, nothing queued. */
export function createInput(canvas) {
  const state = {
    mouseX: 640,
    mouseY: 360,
    actions: 0,
    click: null,
    firing: false,
  };
  function toGamePoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  canvas.addEventListener('mousemove', (event) => {
    const point = toGamePoint(event);
    state.mouseX = point.x;
    state.mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toGamePoint(event);
    state.click = point;
    state.mouseX = point.x;
    state.mouseY = point.y;
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') state.actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') state.actions |= ACTION_PAUSE;
    else if (event.code === 'KeyR') state.actions |= ACTION_RESTART;
    else if (event.code === 'KeyM') state.actions |= ACTION_MUTE;
    else if (event.code === 'Digit1') state.actions |= ACTION_STALL_1;
    else if (event.code === 'Digit2') state.actions |= ACTION_STALL_2;
    else if (event.code === 'Digit3') state.actions |= ACTION_STALL_3;
  });
  return state;
}

/** Take the queued actions (and clear them) — one read per frame. */
export function takeActions(input) {
  const actions = input.actions;
  input.actions = 0;
  return actions;
}

/** Take the queued click (and clear it) — one read per frame. */
export function takeClick(input) {
  const click = input.click;
  input.click = null;
  return click;
}

/** Where the mouse is right now, in game coordinates. */
export function mousePosition(input) {
  return { x: input.mouseX, y: input.mouseY };
}

/** Click a stall counter to start cooking its dish. */
export function clickIngredient(stall, dishId) {
  return { stall, dishId };
}

/** Switch the selected stall with keys 1-3. */
export function switchStall(index) {
  return index;
}

/** Pause with P or Escape. */
export function handlePauseKey(actions) {
  return (actions & ACTION_PAUSE) !== 0;
}

/** Restart with R. */
export function handleRestartKey(actions) {
  return (actions & ACTION_RESTART) !== 0;
}

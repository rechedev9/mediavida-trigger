export type Button = "up" | "down" | "left" | "right" | "confirm" | "cancel" | "menu" | "run";

const KEYMAP: Record<string, Button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  KeyZ: "confirm",
  Enter: "confirm",
  Space: "confirm",
  KeyX: "cancel",
  Escape: "cancel",
  Backspace: "cancel",
  KeyC: "menu",
  Tab: "menu",
  ShiftLeft: "run",
  ShiftRight: "run",
};

const ALL: readonly Button[] = ["up", "down", "left", "right", "confirm", "cancel", "menu", "run"];
const REPEAT_DELAY = 0.3;
const REPEAT_RATE = 0.08;

const held = new Set<Button>();
const pressedNow = new Set<Button>();
const pressedFrame = new Set<Button>();
const repeatTimer = new Map<Button, number>();
const repeatFrame = new Set<Button>();
let anyListener: (() => void) | null = null;
const padHeld = new Set<Button>();
let anyNow = false;
let anyFrame = false;
let textHandler: ((key: string) => void) | null = null;

/** While set, printable keys and Backspace go to `handler` instead of mapping to buttons. */
export function setTextCapture(handler: ((key: string) => void) | null): void {
  textHandler = handler;
}

function textKey(e: KeyboardEvent): string | null {
  if (e.key === "Backspace") return e.key;
  if (e.key.length !== 1) return null;
  // AltGr reports Ctrl+Alt on Windows, and it types "@" on Spanish keyboards.
  const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
  return plain || e.getModifierState("AltGraph") ? e.key : null;
}

export function initInput(onFirstInput: () => void): void {
  anyListener = onFirstInput;
  window.addEventListener("keydown", (e) => {
    const b = KEYMAP[e.code];
    anyListener?.();
    if (!e.repeat) anyNow = true;
    const text = textHandler ? textKey(e) : null;
    if (text) {
      e.preventDefault();
      // A confirm key still held from the previous screen must not type a letter.
      if (!e.repeat || text === "Backspace") textHandler?.(text);
      return;
    }
    if (!b) return;
    e.preventDefault();
    if (!held.has(b)) pressedNow.add(b);
    held.add(b);
  });
  window.addEventListener("keyup", (e) => {
    const b = KEYMAP[e.code];
    if (b) held.delete(b);
  });
  window.addEventListener("blur", () => held.clear());
  // Inside an embed (itch.io) a click is what gives the page keyboard focus.
  window.addEventListener("pointerdown", () => {
    window.focus();
    anyListener?.();
    anyNow = true;
  });
}

function pollGamepad(): void {
  const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    const btn = (i: number): boolean => pad.buttons[i]?.pressed ?? false;
    const state: Record<Button, boolean> = {
      up: ay < -0.5 || btn(12),
      down: ay > 0.5 || btn(13),
      left: ax < -0.5 || btn(14),
      right: ax > 0.5 || btn(15),
      confirm: btn(0),
      cancel: btn(1),
      menu: btn(3) || btn(9),
      run: btn(2),
    };
    for (const b of ALL) {
      if (state[b]) {
        if (!held.has(b)) {
          pressedNow.add(b);
          anyNow = true;
        }
        held.add(b);
        anyListener?.();
      } else if (padHeld.has(b)) {
        held.delete(b);
      }
      if (state[b]) padHeld.add(b);
      else padHeld.delete(b);
    }
  }
}
/** Call once per frame before updating scenes. */
export function updateInput(dt: number): void {
  pollGamepad();
  pressedFrame.clear();
  repeatFrame.clear();
  for (const b of pressedNow) pressedFrame.add(b);
  pressedNow.clear();
  anyFrame = anyNow;
  anyNow = false;
  for (const b of ALL) {
    // A tap released before this frame still moves menu cursors once.
    if (!held.has(b)) {
      repeatTimer.delete(b);
      if (pressedFrame.has(b)) repeatFrame.add(b);
      continue;
    }
    if (pressedFrame.has(b)) {
      repeatTimer.set(b, REPEAT_DELAY);
      repeatFrame.add(b);
      continue;
    }
    const t = (repeatTimer.get(b) ?? REPEAT_DELAY) - dt;
    if (t <= 0) {
      repeatFrame.add(b);
      repeatTimer.set(b, REPEAT_RATE);
    } else {
      repeatTimer.set(b, t);
    }
  }
}

export function isHeld(b: Button): boolean {
  return held.has(b);
}

export function wasPressed(b: Button): boolean {
  return pressedFrame.has(b);
}

/** Pressed this frame or auto-repeating while held; for menu cursors. */
export function wasRepeated(b: Button): boolean {
  return repeatFrame.has(b);
}

/** Any key, pad button or click this frame; for "press to start" screens. */
export function wasAnyPressed(): boolean {
  return anyFrame;
}

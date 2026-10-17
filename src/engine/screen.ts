export const SCREEN_W = 256;
export const SCREEN_H = 224;

export type Screen = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

export function createScreen(host: HTMLElement): Screen {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  canvas.className = "screen";
  host.append(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.imageSmoothingEnabled = false;
  const fit = (): void => {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth / SCREEN_W, innerHeight / SCREEN_H)));
    canvas.style.width = `${SCREEN_W * scale}px`;
    canvas.style.height = `${SCREEN_H * scale}px`;
  };
  addEventListener("resize", fit);
  fit();
  return { canvas, ctx };
}

export interface Scene {
  /** Scenes below a transparent scene keep drawing (dialogue over the field). */
  readonly transparent: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  onEnter?(): void;
  onExit?(): void;
}

type Entry = { scene: Scene; resolve: (value: unknown) => void };

export class SceneStack {
  private entries: Entry[] = [];

  get top(): Scene | null {
    return this.entries.at(-1)?.scene ?? null;
  }

  get size(): number {
    return this.entries.length;
  }

  /** Pushes a scene and resolves with the value passed to `finish`. */
  run(scene: Scene): Promise<unknown> {
    return new Promise((resolve) => {
      this.entries.push({ scene, resolve });
      scene.onEnter?.();
    });
  }

  push(scene: Scene): void {
    void this.run(scene);
  }

  finish(scene: Scene, value?: unknown): void {
    const i = this.entries.findIndex((e) => e.scene === scene);
    if (i < 0) return;
    const [entry] = this.entries.splice(i, 1);
    entry?.scene.onExit?.();
    entry?.resolve(value);
  }

  /** Clears the stack and starts over with one scene. */
  reset(scene: Scene): void {
    for (const e of this.entries) e.scene.onExit?.();
    this.entries = [];
    this.push(scene);
  }

  update(dt: number): void {
    this.top?.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    let start = this.entries.length - 1;
    while (start > 0 && this.entries[start]?.scene.transparent) start--;
    for (let i = Math.max(0, start); i < this.entries.length; i++) {
      this.entries[i]?.scene.draw(ctx);
    }
  }
}

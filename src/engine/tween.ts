type Task = { left: number; total: number; step: (k: number) => void; done: () => void };

export type Ease = (k: number) => number;

const linear: Ease = (k) => k;
export const easeOut: Ease = (k) => 1 - (1 - k) * (1 - k);

/** Game-clock timers: they advance only when `update` runs, so pausing the loop pauses them. */
export class Timers {
  private tasks: Task[] = [];

  update(dt: number): void {
    const now = this.tasks;
    this.tasks = [];
    for (const t of now) {
      t.left -= dt;
      const k = t.total <= 0 ? 1 : Math.min(1, 1 - t.left / t.total);
      t.step(k);
      if (t.left <= 0) t.done();
      else this.tasks.push(t);
    }
  }

  wait(seconds: number): Promise<void> {
    return this.tween(seconds, () => {});
  }

  tween(seconds: number, step: (k: number) => void, ease: Ease = linear): Promise<void> {
    return new Promise((resolve) => {
      this.tasks.push({ left: seconds, total: seconds, step: (k) => step(ease(k)), done: resolve });
    });
  }

  clear(): void {
    this.tasks = [];
  }
}

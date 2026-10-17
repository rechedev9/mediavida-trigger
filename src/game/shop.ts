import { playSfx } from "../audio/audio";
import { itemDef } from "../data/items";
import { drawText, drawWindow } from "../engine/gfx";
import type { Scene } from "../engine/scene";
import { game } from "./game";
import { addItem } from "./state";
import { ListMenu } from "./ui";

export class ShopScene implements Scene {
  readonly transparent = true;
  private menu: ListMenu;
  private note = "¿Qué te llevas?";

  constructor(private ids: string[]) {
    this.menu = new ListMenu(this.rows(), { rows: 6 });
  }

  private rows(): { label: string; right: string }[] {
    return [
      ...this.ids.map((id) => ({
        label: itemDef(id)?.name ?? id,
        right: String(itemDef(id)?.price ?? 0),
      })),
      { label: "Salir", right: "" },
    ];
  }

  update(dt: number): void {
    const r = this.menu.update(dt);
    if (r === "cancel" || (r === "confirm" && this.menu.index === this.ids.length)) {
      game.stack.finish(this);
      return;
    }
    const id = this.ids[this.menu.index];
    const item = itemDef(id ?? "");
    if (r !== "confirm" || !item) return;
    const s = game.state;
    if (s.karma < item.price) {
      playSfx("buzz");
      this.note = "No tienes karma suficiente.";
      return;
    }
    if ((s.items[item.id] ?? 0) >= 99) {
      playSfx("buzz");
      this.note = "No te caben más.";
      return;
    }
    s.karma -= item.price;
    addItem(s, item.id, 1);
    playSfx("chest");
    this.note = `${item.name}: ${s.items[item.id] ?? 0} en la mochila.`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.menu.draw(ctx, { x: 60, y: 30, w: 136, h: 88 });
    drawWindow(ctx, { x: 60, y: 120, w: 136, h: 22 });
    drawText(ctx, `Karma: ${game.state.karma}`, {
      x: 128,
      y: 125,
      align: "center",
      color: "#f8c060",
    });
    drawWindow(ctx, { x: 4, y: 156, w: 248, h: 64 });
    const item = itemDef(this.ids[this.menu.index] ?? "");
    drawText(ctx, this.note, { x: 12, y: 164 });
    if (item) drawText(ctx, item.desc, { x: 12, y: 182, color: "#a8a0b8" });
  }
}

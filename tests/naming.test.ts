import { describe, expect, test } from "bun:test";
import { cleanHeroName, heroText, memberName, setHeroName } from "../src/data/party";
import { NameDraft } from "../src/game/naming";
import { newGame, parseSave, serialize } from "../src/game/state";

const draft = (): NameDraft =>
  new NameDraft({ initial: "Novato", accepts: (c) => c !== "~", fits: (t) => t.length <= 10 });

describe("hero name", () => {
  test("the first key replaces the default nick", () => {
    const d = draft();
    expect(d.type("R")).toBe(true);
    expect(d.text).toBe("R");
    expect(d.isDefault).toBe(false);
  });

  test("erase clears the default, then drops one character", () => {
    const d = draft();
    d.erase();
    expect(d.text).toBe("");
    d.type("a");
    d.type("ñ");
    d.erase();
    expect(d.text).toBe("a");
  });

  test("rejects unknown glyphs, a leading space and names that do not fit", () => {
    const d = draft();
    expect(d.type(" ")).toBe(false);
    expect(d.type("~")).toBe(false);
    for (const c of "abcdefghij") d.type(c);
    expect(d.type("k")).toBe(false);
    expect(d.text).toBe("abcdefghij");
  });

  test("an empty or blank name falls back to the default", () => {
    expect(cleanHeroName("   ")).toBe("Novato");
    expect(cleanHeroName(" Kirby\n ")).toBe("Kirby");
    expect(cleanHeroName("x".repeat(40))).toHaveLength(12);
  });

  test("saves keep the name and old saves get the default", () => {
    const s = { ...newGame(), heroName: "Reche" };
    expect(parseSave(serialize(s))?.heroName).toBe("Reche");
    const raw = JSON.parse(serialize(newGame()));
    delete raw.state.heroName;
    expect(parseSave(JSON.stringify(raw))?.heroName).toBe("Novato");
  });

  test("on-screen names and tech texts use the chosen nick", () => {
    setHeroName("Reche");
    expect(memberName("novato")).toBe("Reche");
    expect(memberName("stiles")).toBe("STILES");
    expect(heroText("Novato y STILES.")).toBe("Reche y STILES.");
    setHeroName("Novato");
  });
});

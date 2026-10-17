import { describe, expect, test } from "bun:test";
import { addItem, joinParty, newGame, parseSave, serialize, setFlag } from "../src/game/state";

describe("save files", () => {
  test("round trip keeps progress", () => {
    const s = newGame();
    joinParty(s, "stiles");
    setFlag(s, "portal1");
    addItem(s, "cafe", 2);
    s.map = "lan";
    expect(parseSave(serialize(s))).toEqual(s);
  });

  test("rejects corrupt or foreign data", () => {
    expect(parseSave("not json")).toBeNull();
    expect(parseSave("{}")).toBeNull();
    expect(parseSave(JSON.stringify({ version: 2, state: newGame() }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 1, state: { members: {}, order: [] } }))).toBeNull();
  });

  test("drops unknown members, items and maps", () => {
    const s = newGame();
    const raw = JSON.parse(serialize(s));
    raw.state.members.fantasma = { level: 3 };
    raw.state.order.push("fantasma");
    raw.state.items.roto = "x";
    raw.state.map = "atlantida";
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.order).toEqual(["novato"]);
    expect(parsed?.items.roto).toBeUndefined();
    expect(parsed?.map).toBe("plaza");
  });
});

describe("party", () => {
  test("new members join at the party's average level", () => {
    const s = newGame();
    const lead = s.members.novato;
    if (lead) lead.level = 7;
    joinParty(s, "mystee");
    expect(s.members.mystee?.level).toBe(7);
    joinParty(s, "mystee");
    expect(s.order.filter((id) => id === "mystee")).toHaveLength(1);
  });

  test("items clamp between 0 and 99", () => {
    const s = newGame();
    addItem(s, "cafe", 500);
    expect(s.items.cafe).toBe(99);
    addItem(s, "cafe", -500);
    expect(s.items.cafe).toBeUndefined();
  });
});

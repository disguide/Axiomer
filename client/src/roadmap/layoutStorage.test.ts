import { describe, expect, it } from "vitest";
import { ownPosition, readArrangements } from "./layoutStorage";
describe("personal arrangement storage boundaries", () => {
  it("accepts reserved imported IDs as data without prototype lookups", () => {
    const value = '{"__proto__":{"constructor":{"x":175,"y":225},"__proto__":{"x":5,"y":6}}}';
    const { layouts, error } = readArrangements({ getItem: () => value });
    expect(error).toBeNull();
    expect(ownPosition(layouts["__proto__"], "constructor")).toEqual({x:175,y:225});
    expect(ownPosition(layouts["__proto__"], "__proto__")).toEqual({x:5,y:6});
    expect(ownPosition({}, "constructor")).toBeUndefined();
    expect(ownPosition({}, "__proto__")).toBeUndefined();
    expect(Object.getPrototypeOf(layouts)).toBeNull();
  });
  it("preserves unreadable arrangement data instead of presenting it as saved", () => {
    const raw = '{"draft":{"step":{"x":"175","y":225}}}';
    const { layouts, error } = readArrangements({ getItem: () => raw });
    expect(error).toContain("has not been overwritten");
    expect(Object.keys(layouts)).toHaveLength(0);
    expect(ownPosition({bad:{x:Infinity,y:0}}, "bad")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { cleanDeep, cleanText, MAX_TEXT } from "./untrusted";

describe("outside text is cleaned before it leaves the server", () => {
  it("drops control, zero-width and direction-override characters", () => {
    expect(cleanText("a\u0000b​c‮d﻿e\u0007")).toBe("abcde");
  });

  it("keeps ordinary punctuation, tabs and newlines", () => {
    expect(cleanText("Line one,\n\tline two: 'ok' (yes) 100%")).toBe("Line one,\n\tline two: 'ok' (yes) 100%");
  });

  it("caps very long strings and says so", () => {
    const t = cleanText("x".repeat(MAX_TEXT + 50));
    expect(t.startsWith("x".repeat(MAX_TEXT))).toBe(true);
    expect(t).toContain(`cut at ${MAX_TEXT} characters`);
  });

  it("walks nested objects and arrays, keys included", () => {
    expect(cleanDeep({ "k​": [{ title: "hi‮" }, 3, null, true] })).toEqual({ k: [{ title: "hi" }, 3, null, true] });
  });
});

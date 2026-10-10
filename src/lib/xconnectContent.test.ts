import { describe, expect, it } from "vitest";
import content from "../data/content/xconnect.json";
import { validateXConnectLocale } from "./xconnectContent";

describe("XConnect website content", () => {
  for (const locale of ["zh", "en"] as const) {
    it(`validates the complete ${locale} variant`, () => {
      expect(() =>
        validateXConnectLocale(content[locale], locale),
      ).not.toThrow();
      expect(content[locale].wizard.steps.map((step) => step.step)).toEqual([
        1, 2, 3,
      ]);
    });
  }
  it("rejects missing section copy", () => {
    const copy = structuredClone(content.zh);
    copy.diagnostics.privacyNote = "";
    expect(() => validateXConnectLocale(copy, "test")).toThrow(
      "diagnostics.privacyNote",
    );
  });
  it("rejects executable CTA URLs", () => {
    const copy = structuredClone(content.zh);
    copy.hero.cta.href = "javascript:alert(1)";
    expect(() => validateXConnectLocale(copy, "test")).toThrow("hero.cta.href");
  });
  it("rejects missing or out-of-order setup steps", () => {
    const copy = structuredClone(content.zh);
    copy.wizard.steps[2].step = 4;
    expect(() => validateXConnectLocale(copy, "test")).toThrow(
      "wizard.steps.order",
    );
    copy.wizard.steps.pop();
    expect(() => validateXConnectLocale(copy, "test")).toThrow("wizard.steps");
  });
  it("keeps the shared guide and source entrypoints", () => {
    expect(content.zh.guide.cta.href).toBe(content.en.guide.cta.href);
    expect(content.zh.source.cta.href).toBe(content.en.source.cta.href);
    expect(content.zh.hero.cta.href).toBe("/register");
    expect(content.zh.hero.secondaryCta.href).toBe(
      "/download?product=xconnect",
    );
  });
});

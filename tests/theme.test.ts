import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PRESET,
  guardThemePresets,
  isGuardThemePreset,
  resolveGuardTheme,
  themeToCssVariables,
} from "../src/react/theme/themes";
import type { GuardTheme, GuardThemePreset } from "../src/react/theme/themes";

const PRESET_NAMES: GuardThemePreset[] = [
  "minimal",
  "light",
  "midnight",
  "glass",
  "neutral",
  "terminal",
];

describe("theme presets", () => {
  it("defines every documented preset with complete tokens", () => {
    for (const name of PRESET_NAMES) {
      const preset = guardThemePresets[name];
      expect(preset, name).toBeDefined();
      for (const token of [
        "accent",
        "accentText",
        "surface",
        "backdrop",
        "surfaceBlur",
        "text",
        "textMuted",
        "border",
        "radius",
        "spacing",
        "controlSize",
        "fontFamily",
        "fontSize",
      ] as const) {
        expect(preset[token], `${name}.${token}`).toBeTruthy();
      }
    }
  });

  it("keeps touch targets at least 44px in every preset", () => {
    for (const name of PRESET_NAMES) {
      expect(parseInt(guardThemePresets[name].controlSize, 10)).toBeGreaterThanOrEqual(44);
    }
  });

  it("recognizes preset names", () => {
    expect(isGuardThemePreset("midnight")).toBe(true);
    expect(isGuardThemePreset("solarized")).toBe(false);
    expect(isGuardThemePreset(42)).toBe(false);
  });
});

describe("resolveGuardTheme (preset + override model)", () => {
  it("defaults to the default preset", () => {
    expect(resolveGuardTheme()).toEqual(guardThemePresets[DEFAULT_THEME_PRESET]);
  });

  it("resolves a preset by name and applies overrides on top", () => {
    const resolved = resolveGuardTheme("midnight", { accent: "#ff0000", radius: "2px" });
    expect(resolved.accent).toBe("#ff0000");
    expect(resolved.radius).toBe("2px");
    expect(resolved.surface).toBe(guardThemePresets.midnight.surface);
  });

  it("does not mutate the preset object", () => {
    const before = { ...guardThemePresets.light };
    resolveGuardTheme("light", { accent: "#123456" });
    expect(guardThemePresets.light).toEqual(before);
  });

  it("accepts a fully custom theme object", () => {
    const custom: GuardTheme = {
      ...guardThemePresets.minimal,
      accent: "#bada55",
      fontFamily: "serif",
    };
    const resolved = resolveGuardTheme(custom, { text: "#222222" });
    expect(resolved.accent).toBe("#bada55");
    expect(resolved.fontFamily).toBe("serif");
    expect(resolved.text).toBe("#222222");
  });
});

describe("themeToCssVariables", () => {
  it("maps every theme token onto a --fhg-* variable", () => {
    const vars = themeToCssVariables(guardThemePresets.glass);
    expect(vars["--fhg-accent"]).toBe(guardThemePresets.glass.accent);
    expect(vars["--fhg-surface-blur"]).toBe("18px");
    expect(vars["--fhg-control-size"]).toBe("44px");
    expect(Object.keys(vars).every((k) => k.startsWith("--fhg-"))).toBe(true);
    expect(Object.keys(vars).length).toBe(13);
  });
});

/**
 * Theme system for the submit-time guard overlay. Themes are plain token
 * objects turned into CSS custom properties, so they work unchanged inside
 * the closed ShadowRoot (variables are set inline on the overlay container,
 * inside the shadow boundary).
 */

export interface GuardTheme {
  /** Primary interactive color (buttons, highlights). */
  accent: string;
  /** Text color rendered on top of the accent color. */
  accentText: string;
  /** Dialog surface color. */
  surface: string;
  /** Full-screen backdrop color behind the dialog. */
  backdrop: string;
  /** Backdrop-filter blur applied to the dialog surface (e.g. "0px", "16px"). */
  surfaceBlur: string;
  text: string;
  textMuted: string;
  border: string;
  /** Corner radius of the dialog and controls. */
  radius: string;
  /** Base spacing unit; paddings/gaps are multiples of this. */
  spacing: string;
  /** Minimum size of interactive controls (keep >= 44px for touch). */
  controlSize: string;
  fontFamily: string;
  /** Base font size; headings and small text scale from it. */
  fontSize: string;
}

export type GuardThemePreset = "minimal" | "light" | "midnight" | "glass" | "neutral" | "terminal";

const base = {
  surfaceBlur: "0px",
  radius: "12px",
  spacing: "8px",
  controlSize: "44px",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontSize: "14px",
} satisfies Partial<GuardTheme>;

export const guardThemePresets: Record<GuardThemePreset, GuardTheme> = {
  minimal: {
    ...base,
    accent: "#111111",
    accentText: "#ffffff",
    surface: "#ffffff",
    backdrop: "rgba(17, 17, 17, 0.4)",
    text: "#111111",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    radius: "8px",
  },
  light: {
    ...base,
    accent: "#0969da",
    accentText: "#ffffff",
    surface: "#f8fafc",
    backdrop: "rgba(15, 23, 42, 0.45)",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#cbd5e1",
  },
  midnight: {
    ...base,
    accent: "#818cf8",
    accentText: "#0b1021",
    surface: "#111631",
    backdrop: "rgba(2, 4, 14, 0.65)",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
    border: "#2b325a",
  },
  glass: {
    ...base,
    accent: "#0ea5e9",
    accentText: "#ffffff",
    surface: "rgba(255, 255, 255, 0.72)",
    backdrop: "rgba(15, 23, 42, 0.35)",
    surfaceBlur: "18px",
    text: "#0f172a",
    textMuted: "#475569",
    border: "rgba(255, 255, 255, 0.55)",
    radius: "16px",
  },
  neutral: {
    ...base,
    accent: "#57534e",
    accentText: "#ffffff",
    surface: "#fafaf9",
    backdrop: "rgba(41, 37, 36, 0.45)",
    text: "#292524",
    textMuted: "#78716c",
    border: "#d6d3d1",
  },
  terminal: {
    ...base,
    accent: "#22c55e",
    accentText: "#04130a",
    surface: "#0a0f0a",
    backdrop: "rgba(0, 0, 0, 0.7)",
    text: "#bbf7d0",
    textMuted: "#4ade80",
    border: "#166534",
    radius: "4px",
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Fira Code', monospace",
  },
};

export const DEFAULT_THEME_PRESET: GuardThemePreset = "light";

export function isGuardThemePreset(value: unknown): value is GuardThemePreset {
  return typeof value === "string" && value in guardThemePresets;
}

/**
 * Preset + override model: start from a preset (or a fully custom theme
 * object) and apply per-token overrides on top.
 */
export function resolveGuardTheme(
  theme: GuardThemePreset | GuardTheme = DEFAULT_THEME_PRESET,
  overrides: Partial<GuardTheme> = {}
): GuardTheme {
  const baseTheme = typeof theme === "string" ? guardThemePresets[theme] : theme;
  return { ...baseTheme, ...overrides };
}

/** Map a theme onto the `--fhg-*` CSS custom properties used by the overlay. */
export function themeToCssVariables(theme: GuardTheme): Record<string, string> {
  return {
    "--fhg-accent": theme.accent,
    "--fhg-accent-text": theme.accentText,
    "--fhg-surface": theme.surface,
    "--fhg-backdrop": theme.backdrop,
    "--fhg-surface-blur": theme.surfaceBlur,
    "--fhg-text": theme.text,
    "--fhg-text-muted": theme.textMuted,
    "--fhg-border": theme.border,
    "--fhg-radius": theme.radius,
    "--fhg-spacing": theme.spacing,
    "--fhg-control-size": theme.controlSize,
    "--fhg-font-family": theme.fontFamily,
    "--fhg-font-size": theme.fontSize,
  };
}

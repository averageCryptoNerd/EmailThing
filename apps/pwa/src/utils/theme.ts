export const THEME_STORAGE_KEY = "mail-theme";

export const THEMES = [
  { id: "system", label: "System" },
  { id: "midnight", label: "Midnight" },
  { id: "cotton-candy", label: "Cotton Candy" },
  { id: "dusk", label: "Dusk" },
  { id: "forest", label: "Forest" },
  { id: "sapphire", label: "Sapphire" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const VALID_THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id));

export function normalizeTheme(theme: string | null | undefined): ThemeId {
  if (!theme || !VALID_THEME_IDS.has(theme)) {
    return "system";
  }

  return theme as ThemeId;
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") {
    return "system";
  }

  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", theme);
}
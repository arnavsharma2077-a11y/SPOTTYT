export type BlendTheme = {
  id: string;
  colorA: string;
  colorB: string;
  colorMid: string;
};

const BLEND_THEMES: BlendTheme[] = [
  { id: "teal-pink", colorA: "#00f5d4", colorB: "#ff006e", colorMid: "#a855f7" },
  { id: "violet-rose", colorA: "#8b5cf6", colorB: "#fb7185", colorMid: "#c084fc" },
  { id: "cyan-amber", colorA: "#22d3ee", colorB: "#fbbf24", colorMid: "#6366f1" },
  { id: "lime-fuchsia", colorA: "#a3e635", colorB: "#e879f9", colorMid: "#14b8a6" },
  { id: "sky-coral", colorA: "#38bdf8", colorB: "#fb923c", colorMid: "#818cf8" },
  { id: "mint-plum", colorA: "#5eead4", colorB: "#c026d3", colorMid: "#64748b" },
  { id: "gold-indigo", colorA: "#fcd34d", colorB: "#6366f1", colorMid: "#f472b6" },
  { id: "sea-peach", colorA: "#2dd4bf", colorB: "#fda4af", colorMid: "#7c3aed" },
];

export function pickRandomBlendTheme(): BlendTheme {
  return BLEND_THEMES[Math.floor(Math.random() * BLEND_THEMES.length)];
}

export function blendThemeBackground(theme: BlendTheme): string {
  return `linear-gradient(135deg, ${theme.colorA}22 0%, #0a0a0f 38%, #0a0a0f 62%, ${theme.colorB}22 100%)`;
}

export function blendThemeGlow(theme: BlendTheme): string {
  return `0 0 80px ${theme.colorA}14, 0 0 80px ${theme.colorB}14`;
}

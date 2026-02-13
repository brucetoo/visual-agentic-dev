// Design tokens for the promo video
export const COLORS = {
    // Primary gradient - deep purple to electric blue
    gradientStart: "#0f0c29",
    gradientMid: "#302b63",
    gradientEnd: "#24243e",

    // Accent colors
    accentPurple: "#a855f7",
    accentBlue: "#3b82f6",
    accentCyan: "#06b6d4",
    accentGreen: "#10b981",
    accentOrange: "#f59e0b",
    accentPink: "#ec4899",

    // Text
    textWhite: "#ffffff",
    textGray: "#94a3b8",
    textMuted: "#64748b",

    // Surfaces
    cardBg: "rgba(255, 255, 255, 0.06)",
    cardBorder: "rgba(255, 255, 255, 0.1)",
    glowPurple: "rgba(168, 85, 247, 0.3)",
    glowBlue: "rgba(59, 130, 246, 0.3)",
};

export const FONTS = {
    heading: "Inter, sans-serif",
    mono: "'Fira Code', 'JetBrains Mono', monospace",
};

// Scene timing — total 38s
// Scene 1: Intro (0s - 4s)
// Scene 2: Detailed workflow (4s - 38s) — Done appears, video ends
export const SCENE_TIMING = {
    intro: { start: 0, duration: 4 },
    workflow: { start: 4, duration: 34 },
};

/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";

// ---------------------------------------------------------------------------
// PoolIt colour system. Change a colour here and the whole app follows.
// These are also exposed as CSS variables (--color-primary-dark, ...).
// ---------------------------------------------------------------------------
const PALETTE = {
  // Brand greens
  "primary-dark": "#0E4D3B",
  primary: "#157A5C",
  "primary-light": "#22A07B",
  "primary-tint": "#E6F4F0",
  // Neutrals and surfaces
  "bg-main": "#F6F8F9",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  "text-muted": "#64748B",
  "text-main": "#1A202C",
  // Semantic and category accents
  "accent-red": "#EF4444",
  "accent-blue": "#3B82F6",
  "accent-amber": "#F59E0B",
  "accent-pink": "#EC4899",
  "accent-purple": "#8B5CF6",
};
const P = PALETTE;

const colors = {
  // surfaces
  background: P["bg-main"], surface: P["bg-main"], "surface-bright": P["bg-main"],
  "surface-dim": "#D5DDE6", "surface-tint": P.primary, "surface-variant": P.border,
  "surface-container-lowest": P.surface, "surface-container-low": "#F0F4F6", "surface-container": "#E9EEF2",
  "surface-container-high": P.border, "surface-container-highest": "#D8E0E9",
  "on-background": P["text-main"], "on-surface": P["text-main"],
  // slightly darker than text-muted so small grey text stays readable on tinted cards
  "on-surface-variant": "#526074", outline: "#5F6F84", "outline-variant": "#BCC8D6",
  "inverse-surface": P["text-main"], "inverse-on-surface": P["bg-main"],

  // brand: dark green headers, sidebar and hero cards
  primary: P.primary, "on-primary": "#FFFFFF",
  "primary-container": P["primary-dark"], "on-primary-container": "#A5D5C4",
  "primary-fixed": P["primary-tint"], "primary-fixed-dim": "#C4E6DA",
  "on-primary-fixed": "#0A3A2C", "on-primary-fixed-variant": P["primary-dark"], "inverse-primary": "#9FD3C1",

  // action green: buttons and highlights
  secondary: P.primary, "on-secondary": "#FFFFFF",
  "secondary-container": P["primary-light"], "on-secondary-container": "#06251C",
  "secondary-fixed": "#C4E8DA", "secondary-fixed-dim": "#1D8C6B",
  "on-secondary-fixed": "#06251C", "on-secondary-fixed-variant": P["primary-dark"],

  // success
  tertiary: P["primary-dark"], "on-tertiary": "#FFFFFF",
  "tertiary-container": "#0A3A2C", "on-tertiary-container": "#137257",
  "tertiary-fixed": "#BFE8DA", "tertiary-fixed-dim": P["primary-light"],
  "on-tertiary-fixed": "#0A3A2C", "on-tertiary-fixed-variant": P["primary-dark"],

  // danger (a shade darker than accent-red so red text passes contrast on white)
  error: "#DC2626", "on-error": "#FFFFFF", "error-container": "#FDE8E8", "on-error-container": "#7F1D1D",

  // warning
  warning: "#B45309", "warning-container": "#FEF3C7", "on-warning-container": "#92400E",

  // category accents (charts, chips, labels)
  "accent-red": P["accent-red"], "accent-red-container": "#FEE2E2", "on-accent-red-container": "#991B1B",
  "accent-blue": P["accent-blue"], "accent-blue-container": "#DBEAFE", "on-accent-blue-container": "#1E3A8A",
  "accent-amber": P["accent-amber"], "accent-amber-container": "#FEF3C7", "on-accent-amber-container": "#92400E",
  "accent-pink": P["accent-pink"], "accent-pink-container": "#FCE7F3", "on-accent-pink-container": "#9D174D",
  "accent-purple": P["accent-purple"], "accent-purple-container": "#EDE9FE", "on-accent-purple-container": "#5B21B6",
};

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors,
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      "spacing": {
        "space-sm": "0.5rem",
        "gutter-mobile": "1rem",
        "space-xs": "0.25rem",
        "gutter": "1.5rem",
        "space-lg": "1.5rem",
        "margin-mobile": "1rem",
        "space-xl": "2.5rem",
        "space-md": "1rem",
        "margin": "2rem"
      },
      "fontFamily": {
        "label-md": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "currency-stat": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "headline-lg-mobile": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "display-lg": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "body-sm": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "body-md": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "headline-sm": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "display-lg-mobile": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "label-sm": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "label-lg": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "headline-md": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "currency-stat-mobile": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "body-lg": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "headline-lg": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "sans": [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      "fontSize": {
        "label-md": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.02em",
            "fontWeight": "600"
          }
        ],
        "currency-stat": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "headline-lg-mobile": [
          "22px",
          {
            "lineHeight": "28px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "display-lg": [
          "36px",
          {
            "lineHeight": "44px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "body-sm": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.01em",
            "fontWeight": "400"
          }
        ],
        "body-md": [
          "14px",
          {
            "lineHeight": "20px",
            "letterSpacing": "0em",
            "fontWeight": "400"
          }
        ],
        "headline-sm": [
          "18px",
          {
            "lineHeight": "24px",
            "letterSpacing": "0em",
            "fontWeight": "600"
          }
        ],
        "display-lg-mobile": [
          "28px",
          {
            "lineHeight": "36px",
            "letterSpacing": "-0.01em",
            "fontWeight": "800"
          }
        ],
        "label-sm": [
          "11px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.04em",
            "fontWeight": "700"
          }
        ],
        "label-lg": [
          "14px",
          {
            "lineHeight": "20px",
            "letterSpacing": "0.01em",
            "fontWeight": "600"
          }
        ],
        "headline-md": [
          "20px",
          {
            "lineHeight": "28px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "currency-stat-mobile": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.01em",
            "fontWeight": "800"
          }
        ],
        "body-lg": [
          "16px",
          {
            "lineHeight": "24px",
            "letterSpacing": "0em",
            "fontWeight": "400"
          }
        ],
        "headline-lg": [
          "28px",
          {
            "lineHeight": "36px",
            "letterSpacing": "-0.02em",
            "fontWeight": "700"
          }
        ]
      }
    },
  },
  plugins: [
    // exposes the palette as CSS variables: var(--color-primary-dark), var(--color-text-muted), ...
    plugin(({ addBase }) => {
      addBase({ ":root": Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [`--color-${k}`, v])) });
    }),
  ],
};

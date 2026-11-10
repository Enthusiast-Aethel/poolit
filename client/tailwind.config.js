/** @type {import('tailwindcss').Config} */
// Design tokens copied from the Stitch exports (login, admin portal, member home)
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
            "on-primary-fixed": "#071c36",
            "primary-fixed-dim": "#b5c7ea",
            "on-background": "#0b1c30",
            "secondary-container": "#ffc641",
            "outline-variant": "#c4c6ce",
            "surface-container-low": "#eff4ff",
            "surface-container": "#e5eeff",
            "on-primary-container": "#7587a7",
            "on-secondary-fixed-variant": "#5c4300",
            "on-secondary-fixed": "#261a00",
            "tertiary-fixed-dim": "#4edea3",
            "surface-container-lowest": "#ffffff",
            "tertiary-container": "#002516",
            "on-primary-fixed-variant": "#364764",
            "on-secondary": "#ffffff",
            "primary": "#000615",
            "on-surface": "#0b1c30",
            "surface-dim": "#cbdbf5",
            "tertiary": "#000904",
            "error-container": "#ffdad6",
            "surface-bright": "#f8f9ff",
            "surface-tint": "#4d5f7d",
            "secondary-fixed": "#ffdfa0",
            "surface-container-highest": "#d3e4fe",
            "primary-fixed": "#d6e3ff",
            "on-tertiary-fixed": "#002113",
            "secondary-fixed-dim": "#f6be39",
            "secondary": "#795900",
            "surface-container-high": "#dce9ff",
            "on-error-container": "#93000a",
            "primary-container": "#0b1f3a",
            "inverse-surface": "#213145",
            "on-tertiary-container": "#009a6a",
            "surface-variant": "#d3e4fe",
            "inverse-on-surface": "#eaf1ff",
            "on-error": "#ffffff",
            "background": "#f8f9ff",
            "surface": "#f8f9ff",
            "on-tertiary": "#ffffff",
            "on-secondary-container": "#715300",
            "error": "#ba1a1a",
            "inverse-primary": "#b5c7ea",
            "on-tertiary-fixed-variant": "#005236",
            "on-primary": "#ffffff",
            "on-surface-variant": "#44474d",
            "outline": "#75777e",
            "tertiary-fixed": "#6ffbbe"
      },
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
  plugins: [],
};
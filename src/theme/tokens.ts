// Design tokens: type, radius, icon size, layout.
// Nothing imports these until each screen is migrated, one batch at a time.

export const fontSizes = {
  micro: 11,
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 18,
  title: 22,
  headline: 24,
  display: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const iconSize = {
  xs: 12,   // inline with small text
  sm: 16,   // inline with body text, list rows
  md: 20,   // buttons, headers
  lg: 24,   // prominent actions
} as const;

export const layout = {
  gutter: 20,       // horizontal screen padding
  sectionGap: 32,   // vertical space between sections
  headerHeight: 56,
} as const;

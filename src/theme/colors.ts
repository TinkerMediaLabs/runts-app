// Design tokens: colors. Existing keys (background, text, primary) are unchanged.
export const colors = {
  background: '#000000',
  text: '#ffffff',
  primary: '#00ffff',

  // accent
  accent: '#00ffff',
  accentSoft: '#00ffffa5',
  accentFaint: '#00ffff40',

  // text on dark
  textPrimary: '#ffffff',
  textStrong: 'rgba(255,255,255,0.75)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textOnAccent: '#000000',

  // surfaces (darkest to lightest)
  surface0: '#000000',  // screen background
  surface1: '#111111',  // panels, sheets
  surface2: '#1c1c1c',  // cards, inputs, tiles
  surface3: '#2a2a2a',  // raised: chips, secondary buttons, dividers

  // lines
  border: '#2a2a2a',                       // card and input outlines
  borderSubtle: 'rgba(255,255,255,0.1)',   // hairlines, list separators

  // translucent white fills over any background
  fillFaint: 'rgba(255,255,255,0.06)',
  fill: 'rgba(255,255,255,0.1)',
  fillStrong: 'rgba(255,255,255,0.2)',

  // status / special
  danger: '#ff6b6b',        // red text/icons on dark
  dangerSolid: '#cc2222',   // red button fill
  gold: '#C9A84C',
  erotic: '#ff00ff',
};

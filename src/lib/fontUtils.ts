const FONT_MAP: Record<string, string> = {
  '100': 'Urbanist_100Thin',
  '100_italic': 'Urbanist_100Thin_Italic',
  '200': 'Urbanist_200ExtraLight',
  '200_italic': 'Urbanist_200ExtraLight_Italic',
  '300': 'Urbanist_300Light',
  '300_italic': 'Urbanist_300Light_Italic',
  '400': 'Urbanist_400Regular',
  '400_italic': 'Urbanist_400Regular_Italic',
  'normal': 'Urbanist_400Regular',
  'normal_italic': 'Urbanist_400Regular_Italic',
  '500': 'Urbanist_500Medium',
  '500_italic': 'Urbanist_500Medium_Italic',
  '600': 'Urbanist_600SemiBold',
  '600_italic': 'Urbanist_600SemiBold_Italic',
  '700': 'Urbanist_700Bold',
  '700_italic': 'Urbanist_700Bold_Italic',
  'bold': 'Urbanist_700Bold',
  'bold_italic': 'Urbanist_700Bold_Italic',
  '800': 'Urbanist_800ExtraBold',
  '800_italic': 'Urbanist_800ExtraBold_Italic',
  '900': 'Urbanist_900Black',
  '900_italic': 'Urbanist_900Black_Italic',
};

export function resolveFontFamily(fontWeight?: string | number, fontStyle?: string): string {
  const weightKey = fontWeight ? String(fontWeight) : '400';
  const isItalic = fontStyle === 'italic';
  const key = isItalic ? `${weightKey}_italic` : weightKey;
  return FONT_MAP[key] ?? (isItalic ? 'Urbanist_400Regular_Italic' : 'Urbanist_400Regular');
}

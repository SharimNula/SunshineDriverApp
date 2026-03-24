import { Platform } from 'react-native';

const tintColorLight = '#F7A531';
const tintColorDark = '#F7A531';

export const AppTheme = {
  canvas: '#04131A',
  surface: '#0A1E26',
  surfaceRaised: '#13323C',
  surfaceMuted: '#173540',
  outline: '#25505D',
  accent: '#F7A531',
  accentSoft: '#FFD07A',
  secondary: '#FF7A59',
  sky: '#6ED0FF',
  success: '#BFE87D',
  text: '#F4F7F2',
  mutedText: '#96AFB7',
  danger: '#FF6A6A',
  tabBar: '#07171E',
};

export const Colors = {
  light: {
    text: AppTheme.text,
    background: AppTheme.canvas,
    tint: tintColorLight,
    icon: AppTheme.mutedText,
    tabIconDefault: AppTheme.mutedText,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppTheme.text,
    background: AppTheme.canvas,
    tint: tintColorDark,
    icon: AppTheme.mutedText,
    tabIconDefault: AppTheme.mutedText,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

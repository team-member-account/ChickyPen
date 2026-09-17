import { MD3LightTheme } from 'react-native-paper';
export const colors = {
  green: '#286344',
  deep: '#193F2C',
  cream: '#F8F7EF',
  surface: '#FFFFFF',
  pale: '#E7EFDC',
  text: '#23392C',
  muted: '#697568',
  line: '#DFE5D9',
  amber: '#95631C',
  amberLight: '#FFF1D6',
  red: '#B3483F',
  redLight: '#FCEBE7',
};
export const theme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.green,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.pale,
    secondary: colors.amber,
    background: colors.cream,
    surface: colors.surface,
    surfaceVariant: '#F0F2E9',
    onSurface: colors.text,
    onBackground: colors.text,
    outline: '#859580',
    error: colors.red,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontSize: 17 },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontSize: 16 },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontSize: 16 },
  },
};

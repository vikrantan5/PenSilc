// Color conversion utilities for dark mode

// Neon colors for white conversion
const NEON_COLORS = ['#00eaff', '#39ff14', '#b026ff', '#00ffff', '#ff00ff'];

// Bright colors for black conversion
const BRIGHT_COLORS = ['#ffe600', '#ff2ae6', '#ff7b00', '#ffff00', '#00ff00'];

export function isWhiteColor(color: string): boolean {
  const normalized = color.toLowerCase().trim();
  // Check for white, #fff, #ffffff, rgb(255,255,255), etc.
  return (
    normalized === '#fff' ||
    normalized === '#ffffff' ||
    normalized === 'white' ||
    normalized === 'rgb(255,255,255)' ||
    normalized === 'rgba(255,255,255,1)'
  );
}

export function isBlackColor(color: string): boolean {
  const normalized = color.toLowerCase().trim();
  // Check for black, #000, #000000, rgb(0,0,0), etc.
  return (
    normalized === '#000' ||
    normalized === '#000000' ||
    normalized === 'black' ||
    normalized === 'rgb(0,0,0)' ||
    normalized === 'rgba(0,0,0,1)'
  );
}

export function isNeonColor(color: string): boolean {
  return NEON_COLORS.includes(color.toLowerCase());
}

export function isBrightColor(color: string): boolean {
  return BRIGHT_COLORS.includes(color.toLowerCase());
}

export function getRandomNeonColor(): string {
  return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
}

export function getRandomBrightColor(): string {
  return BRIGHT_COLORS[Math.floor(Math.random() * BRIGHT_COLORS.length)];
}

export function convertColorForDarkMode(color: string): string {
  if (isWhiteColor(color)) {
    return getRandomNeonColor();
  }
  if (isBlackColor(color)) {
    return getRandomBrightColor();
  }
  return color;
}

export function convertColorForLightMode(color: string, originalColor?: string): string {
  // If we have the original color stored, use it
  if (originalColor) {
    return originalColor;
  }
  
  // Otherwise, try to reverse the conversion
  if (isNeonColor(color)) {
    return '#ffffff';
  }
  if (isBrightColor(color)) {
    return '#000000';
  }
  return color;
}

export function getDefaultDrawingColor(darkMode: boolean): string {
  return darkMode ? getRandomBrightColor() : '#000000';
}

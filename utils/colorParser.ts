
// Color name to hex mapping for common GAA club colors
const COLOR_MAP: Record<string, string> = {
  // Greens
  'green': '#0F8A3B',
  'emerald': '#0F8A3B',
  'lime': '#32CD32',
  
  // Golds/Yellows
  'gold': '#F4C542',
  'yellow': '#FFD700',
  'amber': '#FFBF00',
  
  // Blues
  'blue': '#0047AB',
  'navy': '#000080',
  'sky': '#87CEEB',
  'royal': '#4169E1',
  
  // Reds
  'red': '#DC143C',
  'maroon': '#800000',
  'crimson': '#DC143C',
  
  // Blacks/Whites
  'black': '#000000',
  'white': '#FFFFFF',
  
  // Purples
  'purple': '#800080',
  'violet': '#8B00FF',
  
  // Oranges
  'orange': '#FF8C00',
  'saffron': '#F4C430',
  
  // Others
  'grey': '#808080',
  'gray': '#808080',
  'silver': '#C0C0C0',
  'brown': '#8B4513',
  'pink': '#FFC0CB',
};

function normalizeColorName(name: string): string {
  return name.toLowerCase().trim();
}

function parseColorName(name: string): string | null {
  const normalized = normalizeColorName(name);
  return COLOR_MAP[normalized] || null;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

function ensureHex(color: string): string {
  if (color.startsWith('#')) {
    return color;
  }
  return `#${color}`;
}

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb.map(val => {
    const lightened = Math.round(val + (255 - val) * (percent / 100));
    return Math.min(255, lightened);
  });
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export interface ParsedColors {
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULT_PRIMARY = '#169B62';
const DEFAULT_SECONDARY = '#0D7A4D';

/**
 * Parse club colors from various formats:
 * - "Green and Gold"
 * - "Green/Gold"
 * - "#0F8A3B,#F4C542"
 * - "Green" (single color - generates lighter secondary)
 * 
 * Returns hex color values for primary and secondary colors
 */
export function parseClubColors(colorsInput: string | undefined): ParsedColors {
  console.log('[ColorParser] Parsing club colors:', colorsInput);
  
  if (!colorsInput || !colorsInput.trim()) {
    console.log('[ColorParser] No colors provided, using defaults');
    return {
      primaryColor: DEFAULT_PRIMARY,
      secondaryColor: DEFAULT_SECONDARY,
    };
  }

  const input = colorsInput.trim();
  
  // Try parsing as comma-separated hex values: "#0F8A3B,#F4C542"
  if (input.includes(',')) {
    const parts = input.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const hex1 = ensureHex(parts[0]);
      const hex2 = ensureHex(parts[1]);
      
      if (isValidHex(hex1) && isValidHex(hex2)) {
        console.log('[ColorParser] Parsed hex colors:', { primaryColor: hex1, secondaryColor: hex2 });
        return {
          primaryColor: hex1,
          secondaryColor: hex2,
        };
      }
    }
  }
  
  // Try parsing as "Color and Color" or "Color/Color"
  const separators = [' and ', '/', ' & ', '+'];
  for (const separator of separators) {
    if (input.toLowerCase().includes(separator)) {
      const parts = input.split(new RegExp(separator, 'i')).map(p => p.trim());
      if (parts.length >= 2) {
        const color1 = parseColorName(parts[0]);
        const color2 = parseColorName(parts[1]);
        
        if (color1 && color2) {
          console.log('[ColorParser] Parsed named colors:', { primaryColor: color1, secondaryColor: color2 });
          return {
            primaryColor: color1,
            secondaryColor: color2,
          };
        }
      }
    }
  }
  
  // Try parsing as single color name
  const singleColor = parseColorName(input);
  if (singleColor) {
    const secondaryColor = lightenColor(singleColor, 20);
    console.log('[ColorParser] Parsed single color, generated secondary:', { primaryColor: singleColor, secondaryColor });
    return {
      primaryColor: singleColor,
      secondaryColor,
    };
  }
  
  // Try parsing as single hex value
  const hex = ensureHex(input);
  if (isValidHex(hex)) {
    const secondaryColor = lightenColor(hex, 20);
    console.log('[ColorParser] Parsed single hex, generated secondary:', { primaryColor: hex, secondaryColor });
    return {
      primaryColor: hex,
      secondaryColor,
    };
  }
  
  // Fallback to defaults
  console.log('[ColorParser] Could not parse colors, using defaults');
  return {
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
  };
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * Returns value between 0 (black) and 1 (white)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Get contrasting text color (black or white) for a background color
 * Uses WCAG contrast ratio formula
 */
export function getContrastTextColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Validate hex color format
 */
export function validateHexColor(hex: string): boolean {
  return isValidHex(hex);
}

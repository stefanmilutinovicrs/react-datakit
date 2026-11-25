export type Rgb = readonly [number, number, number];

/** Resolves a color as computed styles report it, `color(srgb …)` included, to 8-bit sRGB. */
export function toRgb(color: string): Rgb {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No 2D canvas context.');
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function toHex(color: string): string {
  return `#${toRgb(color)
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The same mix as `color-mix(in srgb, first weight%, second)`. */
export function mix(first: string, weight: number, second: string): Rgb {
  const a = toRgb(first);
  const b = toRgb(second);
  const channel = (i: 0 | 1 | 2) => Math.round(a[i] * weight + b[i] * (1 - weight));
  return [channel(0), channel(1), channel(2)];
}

function luminance(color: Rgb): number {
  const linear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(color[0] / 255) + 0.7152 * linear(color[1] / 255) + 0.0722 * linear(color[2] / 255);
}

/** WCAG 2 contrast ratio of two opaque colors. */
export function contrast(first: string, second: string): number {
  const a = luminance(toRgb(first));
  const b = luminance(toRgb(second));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

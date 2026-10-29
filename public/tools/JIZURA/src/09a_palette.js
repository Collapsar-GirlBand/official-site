/* Final-frame palette constraint shared by browser preview and image/video exports. */
(() => {
'use strict';
const KEYS = ['bg', 'fg', 'sub', 'accent', 'accent2', 'ink', 'dim', 'ghostA', 'ghostB'];
const cache = new Map();

J.paletteColors = sc => [...new Set([
  ...KEYS.map(k => sc[k]), ...(Array.isArray(sc.grad) ? sc.grad : []),
].filter(c => typeof c === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(c))
  .map(c => J.toHex(...J.hex(c)).toUpperCase()))];

J.strictPalettePixels = (data, sc) => {
  const colors = J.paletteColors(sc);
  if (!colors.length) return;
  const key = colors.join(',');
  let entry = cache.get(key);
  if (!entry) {
    const rgb = colors.map(c => J.hex(c));
    // A bounded 5-bit RGB lookup avoids a nearest-colour search per output pixel.
    const lut = new Uint8Array(32768);
    for (let n = 0; n < lut.length; n++) {
      const r = ((n >> 10) & 31) * 255 / 31;
      const g = ((n >> 5) & 31) * 255 / 31;
      const b = (n & 31) * 255 / 31;
      let best = Infinity;
      for (let j = 0; j < rgb.length; j++) {
        const [R, G, B] = rgb[j];
        const distance = 2 * (r - R) ** 2 + 4 * (g - G) ** 2 + 3 * (b - B) ** 2;
        if (distance < best) { best = distance; lut[n] = j; }
      }
    }
    const exact = new Set(rgb.map(([r, g, b]) => (r << 16) | (g << 8) | b));
    entry = { rgb, lut, exact };
    cache.set(key, entry);
    if (cache.size > 8) cache.delete(cache.keys().next().value);
  }
  const { rgb, lut, exact } = entry;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    // Preserve user colours exactly, including near-identical colours in one LUT cell.
    if (exact.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) continue;
    const c = rgb[lut[((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)]];
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
};
})();

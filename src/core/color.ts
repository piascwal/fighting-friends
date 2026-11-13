const shadeCache = new Map<string, string>();

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur #rrggbb. */
export function shade(hex: string, amount: number): string {
  const key = hex + amount;
  const cached = shadeCache.get(key);
  if (cached) return cached;
  const f = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const [r, g, b] = parseHex(hex);
  const out = `rgb(${f(r)},${f(g)},${f(b)})`;
  shadeCache.set(key, out);
  return out;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

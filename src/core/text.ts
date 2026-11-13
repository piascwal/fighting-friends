/** « Mathéo le Grand » → « matheo-le-grand » : identifiant sûr pour un dossier ou une clé. */
export function slug(text: string): string {
  const out = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return out || 'perso';
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return text.replace(/[&<>"]/g, (c) => map[c]!);
}

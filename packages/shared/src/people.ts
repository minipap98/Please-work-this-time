/** "Dean's Marine" → "DM", "jane" → "J". The initials shown on avatars and bid cards. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

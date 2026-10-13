/**
 * A `next` redirect target from the URL or a form, made safe: only a path on this site.
 * Returns null for anything that could leave the site ("//evil.com", "/\evil.com", "https://...").
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  // Let the URL parser have the last word, the same way a browser would read it.
  const base = "http://nexus.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  if (url.origin !== base) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

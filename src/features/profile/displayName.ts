// Same limit as the database: profiles.display_name is 1-32 characters.
export const DISPLAY_NAME_MAX = 32;

/** Serbian error for an invalid "Ime u igri", or null if it's fine. Expects a trimmed value. */
export function displayNameError(name: string): string | null {
  // Count characters like Postgres char_length does (code points, not UTF-16 units).
  const length = [...name].length;
  if (length === 0) return "Unesi ime u igri.";
  if (length > DISPLAY_NAME_MAX) return `Najviše ${DISPLAY_NAME_MAX} znaka.`;
  return null;
}

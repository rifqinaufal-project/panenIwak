/** Only show an explicit server message, never an arbitrary error/credential payload. */
export function requestErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('data' in error)) return fallback;
  const data = error.data;
  if (typeof data !== 'object' || data === null || !('statusMessage' in data)) return fallback;
  return typeof data.statusMessage === 'string' && data.statusMessage
    ? data.statusMessage
    : fallback;
}

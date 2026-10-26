export { sendPage, renderOverview, renderAliasOverview, renderSlot, sendShortcut } from './views';

export function normalizeTaskCommandText(messageText: string | undefined) {
  return String(messageText ?? '')
    .trim()
    .replace(/^(!|！|\/|#|＃)\s*/, '');
}

/** Converts the Go-confirmed task step into the existing command route. */
export function toTaskRouteCommand(step: string) {
  const normalized = normalizeTaskCommandText(step).replace(/\s+/g, ' ');

  return normalized ? `/${normalized}` : '';
}

/** Selects the same route as toTaskRouteCommand of a Go-confirmed executed
 * step. The server still decides whether the input actually matches that step. */
export function toTaskInputRouteCommand(input: string): string {
  const candidate = input
    .replace(/^(!|！|\/|#|＃)\s*/, '')
    .trim()
    .replace(/\s+/g, ' ');

  return toTaskRouteCommand(candidate);
}

/** Preserve the former framework Number-to-string conversion in the request.
 * Invalid input is still judged from the original message by the backend. */
export function taskRouteNumberText(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : String(Number(value));
}

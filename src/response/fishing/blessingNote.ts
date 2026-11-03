/** Only forward the service's settled note. Never add the amount to a gain. */
export function fishingBlessingNote(text: string | undefined): string {
  if (text === undefined) { return ''; }
  const index = text.lastIndexOf('锦鲤赐福+');

  return index < 0 ? '' : text.slice(index);
}

export function fishingBlessingSuffix(text: string | undefined): string {
  const note = fishingBlessingNote(text);

  return note ? `（含${note}）` : '';
}

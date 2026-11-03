/** Exact fish identity and grams must survive every market projection. */
export function assertMarketFish(item: Record<string, unknown>, message: string): void {
  if ((item.category ?? item.itemCategory) !== 'fish') { return; }
  if (
    typeof item.catchId !== 'string' ||
    !/^[A-Za-z0-9_.:-]{1,40}$/.test(item.catchId) ||
    typeof item.weightG !== 'number' ||
    !Number.isSafeInteger(item.weightG) ||
    item.weightG < 1 ||
    item.quantity !== 1 ||
    (item.gradeId !== undefined && item.gradeId !== null)
  ) { throw new Error(message); }
}

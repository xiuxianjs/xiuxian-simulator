export type IssuedReward = { type: string; name: string; amount: number };

/** Issued entries have positive quantities; an empty array is valid. */
export function parsePositiveIssuedRewards(value: unknown, listError: string, itemError = listError): IssuedReward[] {
  return parseIssuedRewards(value, listError, itemError, 1);
}

/** Capped resource grants can successfully issue zero units. */
export function parseNonNegativeIssuedRewards(value: unknown, listError: string, itemError = listError): IssuedReward[] {
  return parseIssuedRewards(value, listError, itemError, 0);
}

function parseIssuedRewards(value: unknown, listError: string, itemError: string, minimum: number): IssuedReward[] {
  if (!Array.isArray(value)) {
    throw new Error(listError);
  }

  return value.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(itemError);
    }
    const reward = value as Record<string, unknown>;

    if (
      typeof reward.type !== 'string' ||
      typeof reward.name !== 'string' ||
      typeof reward.amount !== 'number' ||
      !Number.isSafeInteger(reward.amount) ||
      reward.amount < minimum
    ) {
      throw new Error(itemError);
    }

    return { type: reward.type, name: reward.name, amount: reward.amount };
  });
}

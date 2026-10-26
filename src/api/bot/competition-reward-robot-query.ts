export function parseRobotCompetitionReward(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门大比领奖响应不完整');
  }
  const row = value as Record<string, unknown>;
  const receipt = row.receipt as Record<string, unknown> | undefined;

  if (
    typeof row.message !== 'string' ||
    !receipt ||
    Array.isArray(receipt) ||
    receipt.code !== 'SPIRIT_CRYSTAL' ||
    !Number.isInteger(receipt.changeAmount) ||
    Number(receipt.changeAmount) <= 0 ||
    !Number.isInteger(receipt.beforeAmount) ||
    !Number.isInteger(receipt.afterAmount) ||
    typeof receipt.detail !== 'string'
  ) {
    throw new Error('宗门大比领奖响应不完整');
  }

  return { message: row.message, receipt };
}

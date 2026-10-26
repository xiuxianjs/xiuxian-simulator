/** v2 success only contains the committed reward summary, including zero values. */
export function parseRobotNewcomerTaskReward(value: unknown): { spiritCrystal: number; vipExpYuan: number } {
  const data = value as Record<string, unknown> | null;

  if (!data || !Number.isSafeInteger(data.spiritCrystal) || !Number.isSafeInteger(data.vipExpYuan)) {
    throw new Error('新人任务领奖响应不完整');
  }

  return { spiritCrystal: data.spiritCrystal as number, vipExpYuan: data.vipExpYuan as number };
}

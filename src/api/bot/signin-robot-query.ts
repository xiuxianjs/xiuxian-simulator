import { formatGameDate } from '@src/utils/gameTime';
import { displayCurrencyText } from '@src/constants/currency';
import { parseDailyCheckIn, parseNewcomerCheckIn } from './daily-checkin';
import { parseCelestialCheckIn } from './celestial-checkin';

export function presentDailyCheckIn(result: ReturnType<typeof parseDailyCheckIn>) {
  const rewards = result.issued.map(reward => `${displayCurrencyText(reward.name)} ×${reward.amount}`).join('、');

  const rewardText =
    result.dateIssued !== undefined && result.accumulatedIssued !== undefined
      ? `\n今日奖励：${result.dateIssued.map(r => `${displayCurrencyText(r.name)} ×${r.amount}`).join('、') || '暂无配置奖励'}${result.accumulatedIssued.length ? `\n🎁 累计奖励已到账：${result.accumulatedIssued.map(r => `${displayCurrencyText(r.name)} ×${r.amount}`).join('、')}` : ''}`
      : rewards
        ? `\n🎁 签到奖励：${rewards}`
        : '\n今日暂无配置奖励。';

  return {
    code: 'OK' as const,
    data: {
      ritualText: result.ritualText,
      message: `日常签到成功！\n本月累计签到：${result.accumulatedDays}天${rewardText}${result.progressText ? `\n${result.progressText}` : ''}${result.titleMessage ? `\n${result.titleMessage}` : ''}`
    }
  };
}
export function parseRobotDailyCheckIn(value: unknown) {
  const result = presentDailyCheckIn(parseDailyCheckIn(value));

  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as Record<string, unknown>).repeatSuffix !== 'string') {
    throw new Error('签到响应不完整');
  }
  const suffix = (value as { repeatSuffix: string }).repeatSuffix;

  if (suffix) {
    result.data.message += '\n\n' + suffix;
  }

  return result;
}

export function presentNewcomerCheckIn(result: ReturnType<typeof parseNewcomerCheckIn>) {
  const rewards = result.issued.map(reward => `${displayCurrencyText(reward.name)} ×${reward.amount}`).join('、');

  return {
    code: 'OK' as const,
    data: {
      ritualText: result.ritualText,
      message: `新人签到成功！\n累计签到：${result.accumulatedDays}天\n活动截止：${formatGameDate(result.expireDate)}${rewards ? `\n🎁 签到奖励：${rewards}` : ''}`
    }
  };
}
export function parseRobotNewcomerCheckIn(value: unknown) {
  const result = presentNewcomerCheckIn(parseNewcomerCheckIn(value));

  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as Record<string, unknown>).repeatSuffix !== 'string') {
    throw new Error('签到响应不完整');
  }
  const suffix = (value as { repeatSuffix: string }).repeatSuffix;

  if (suffix) {
    result.data.message += '\n\n' + suffix;
  }

  return result;
}

export function presentCelestialCheckIn(data: ReturnType<typeof parseCelestialCheckIn>) {
  const rewards = data.issued.map(item => `${displayCurrencyText(item.name)} ×${item.amount}`).join('\n');

  return {
    code: 'OK' as const,
    data: { ritualText: data.ritualText, message: `登仙台签到成功！\n签到时段：${data.signedSlots.join('、')}\n🎁 签到奖励：\n${rewards}` }
  };
}
export function parseRobotCelestialCheckIn(value: unknown) {
  const result = presentCelestialCheckIn(parseCelestialCheckIn(value));

  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as Record<string, unknown>).repeatSuffix !== 'string') {
    throw new Error('签到响应不完整');
  }
  const suffix = (value as { repeatSuffix: string }).repeatSuffix;

  if (suffix) {
    result.data.message += '\n\n' + suffix;
  }

  return result;
}

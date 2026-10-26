import { parseLimitedEventCheckin } from './limited-event-checkin';
import { displayCurrencyText } from '@src/constants/currency';
export function presentLimitedEventCheckin(result: ReturnType<typeof parseLimitedEventCheckin>) {
  return {
    code: 'OK' as const,
    data: {
      success: true,
      results: result.results.map(row => ({
        eventTitle: row.eventTitle,
        subTitle: row.subTitle,
        dayIndex: row.dayIndex,
        rewardText: row.issued.map(reward => `${displayCurrencyText(reward.name)}×${reward.amount}`).join('\n')
      }))
    }
  };
}
export const parseRobotLimitedEventCheckin = (value: unknown) => presentLimitedEventCheckin(parseLimitedEventCheckin(value));

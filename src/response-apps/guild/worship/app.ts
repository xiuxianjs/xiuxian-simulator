import { parseGuildWorshipGuide } from '@src/api/bot/guild-activity-robot-query';
import { postBackendGuildWorship, type GuildWorshipOffer } from '@src/api/bot/guild-worship-stipend';
import { requestBackend } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type OfferInfo = {
  name: GuildWorshipOffer;
  cost: number;
  activity: number;
  contribution: number;
  line: string;
  canWorship: boolean;
};

type Result =
  | {
      code: 'NO_GUILD';
      data: { message: string };
    }
  | {
      code: 'GUIDE';
      data: {
        dailyWorshipDone: boolean;
        canWorship: boolean;
        introText: string;
        noticeText: string;
        offers: OfferInfo[];
      };
    }
  | {
      code: 'DONE' | 'FAILED';
      data: {
        message: string;
      };
    }
  | {
      code: 'OK';
      data: {
        message: string;
        offerName: GuildWorshipOffer;
        cost: number;
        dailyActivityAdded: number;
        currentDailyActivity: number;
        contributionAdded: number;
        offerText: string;
        dailyActivityText: string;
        contributionText: string;
      };
    };

export default async function App(params: { uid: number; bid?: string; offerName?: GuildWorshipOffer; request?: BackendRequestContext }): Promise<Result> {
  if (!params.bid) {
    return { code: 'FAILED', data: { message: '操作缺少平台身份' } };
  }
  try {
    if (!params.offerName) {
      const data = await requestBackend(params.bid, 'get_players_id_guild_worship', { path: { id: params.uid } });

      return { code: 'GUIDE', data: parseGuildWorshipGuide(data) };
    }
    const result = await postBackendGuildWorship(params.bid, params.uid, params.offerName, params.request);

    return {
      code: 'OK',
      data: {
        message: result.message,
        offerName: result.offer,
        cost: result.cost,
        dailyActivityAdded: result.dailyActivityAdded,
        currentDailyActivity: result.currentDailyActivity,
        contributionAdded: result.contributionAdded,
        offerText: result.offerText,
        dailyActivityText: result.dailyActivityText,
        contributionText: result.contributionText
      }
    };
  } catch (error: any) {
    const message = error?.message ?? '祭祀祖师失败';

    if (error?.code === 'GUILD_NOT_MEMBER') {
      return { code: 'NO_GUILD', data: { message } };
    }

    if (error?.code === 'GUILD_WORSHIP_ALREADY_DONE') {
      return { code: 'DONE', data: { message } };
    }

    return { code: 'FAILED', data: { message } };
  }
}

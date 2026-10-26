import { BackendAPIError, getBackendGuildStorylineRecords } from '@src/api/bot';

type Result =
  | { code: 'NO_GUILD' | 'LOAD_FAILED'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        guildName: string;
        guildLevel: number;
        records: Array<{
          stageIndex: number;
          damageDealt: number;
          participationPoint: number;
          battleResult: number;
          isEffective: boolean;
          attemptNo: number;
        }>;
      };
    };

export default async function App(params: { bid?: string; uid: number }): Promise<Result> {
  try {
    const data = await getBackendGuildStorylineRecords(params.bid, params.uid);

    return { code: 'OK', data };
  } catch (error: any) {
    if (error instanceof BackendAPIError && error.status === 409) {
      return { code: 'NO_GUILD', data: { message: '你当前尚未加入宗门' } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '读取宗门主线记录失败' } };
  }
}

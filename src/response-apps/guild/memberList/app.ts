import { PAGE_SIZE } from '@src/constants';
import { getBackendGuildMembers } from '@src/api/bot';

type AppResult =
  | { code: 'FAIL'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        guildName: string;
        members: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page?: number; pageSize?: number }): Promise<AppResult> {
  try {
    const data = await getBackendGuildMembers(params.bid, params.uid, params.page ?? 1, params.pageSize ?? PAGE_SIZE);

    if (data.membershipStatus !== 'joined') {
      const message =
        data.membershipStatus === 'not_joined' ? '你还未加入任何宗门' : data.membershipStatus === 'guild_missing' ? '未找到宗门信息' : '未找到宗门成员信息';

      return { code: 'FAIL', data: { message } };
    }

    return { code: 'OK', data };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取成员列表失败' } };
  }
}

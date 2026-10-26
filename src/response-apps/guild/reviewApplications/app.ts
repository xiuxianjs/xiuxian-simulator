import { getBackendGuildReview } from '@src/api/bot/guild-review-queries';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'NO_PERMISSION'; data: { message: string; roleName: string } }
  | { code: 'OK'; data: { guildName: string; result: any } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid: string | undefined; uid: number; page: number }): Promise<AppResult> {
  try {
    const data = await getBackendGuildReview(params.bid, params.uid, params.page);

    if (!data.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '您还未加入任何宗门，无法查看申请审核' } };
    }
    if (!data.canReview) {
      return { code: 'NO_PERMISSION', data: { message: '只有长老及以上才能执行此操作', roleName: data.roleName ?? '未知' } };
    }
    const result = {
      applications: data.applications.map(row => ({
        ...row,
        userName: row.userName ?? '未知',
        realmName: row.realmName ?? '未知',
        createdAt: row.createdAt
      })),
      total: data.total,
      totalPages: data.totalPages,
      currentPage: data.currentPage
    };

    return { code: 'OK', data: { guildName: data.guildName ?? '', result } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查看申请列表失败' } };
  }
}

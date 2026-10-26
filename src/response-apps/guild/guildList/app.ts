import { getBackendGuilds } from '@src/api';

type AppResult = { code: 'OK'; data: { result: any } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; page: number; pageSize: number }): Promise<AppResult> {
  try {
    const result = await getBackendGuilds(params.bid, params.page, params.pageSize);

    return { code: 'OK', data: { result } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取宗门列表失败' } };
  }
}

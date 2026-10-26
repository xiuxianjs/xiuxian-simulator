import { getBackendDungeonCatalog } from '@src/api/bot';

export default async function App(params: { bid?: string; uid: number; page: number }) {
  const data = await getBackendDungeonCatalog(params.bid, params.uid, params.page);

  return { code: data.pagination.total === 0 ? ('EMPTY' as const) : ('OK' as const), data };
}

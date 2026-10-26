import { getBackendFlyMailHome } from '@src/api/bot/fly-mail-queries';
import type { FlyMailScope } from '@src/api/schemas/fly-mail-query';

export { parseFlyMailHomeCommand } from '@src/utils/flyMailCommand';
export default async function App(params: { bid: string | undefined; uid: number; scope: FlyMailScope; page: number }) {
  return { code: 'OK' as const, data: await getBackendFlyMailHome(params.bid, params.uid, params.scope, params.page) };
}

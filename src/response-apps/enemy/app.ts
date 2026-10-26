import { getBackendEnemies } from '@src/api/bot';

export interface EnemyItem {
  uid: number;
  name: string;
  totalAttacks: number;
  lastAttackTime: Date;
  lastLogId: number;
}

type Result = { code: 'OK'; data: { enemies: EnemyItem[] } } | { code: 'EMPTY'; data: Record<string, never> };

export default async function App(params: { bid?: string; uid: number }): Promise<Result> {
  const enemies = await getBackendEnemies(params.bid, params.uid);

  if (enemies.length === 0) {
    return { code: 'EMPTY', data: {} };
  }

  return { code: 'OK', data: { enemies: enemies } };
}

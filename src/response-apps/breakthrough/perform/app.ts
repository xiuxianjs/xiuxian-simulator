import { performBackendRealmBreakthrough } from '@src/api/bot/realm-breakthrough';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'REALM_CAPPED';
      data: { realmName: string };
    }
  | {
      code: 'SUCCESS';
      data: {
        newRealm: {
          name: string;
          level: number;
          spiritualPower: number;
          speed: number;
          magicAttack: number;
          physicalAttack: number;
          magicDefense: number;
          physicalDefense: number;
          experienceLimit: number;
        };
        unlockedRecipes: string[];
        isNewStage: boolean;
        newStageName: string | null;
        masterStageMessages?: string[];
      };
    }
  | {
      code: 'FAIL';
      data: {
        message: string;
        isStageFull: boolean;
      };
    }
  | {
      code: 'ERROR';
      data: { message: string };
    };

export default async function App(params: {
  load?: () => ReturnType<typeof performBackendRealmBreakthrough>;
  uid: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  const { uid, bid, request } = params;

  try {
    const result = params.load ? await params.load() : await performBackendRealmBreakthrough(bid, uid, request);

    return { code: 'SUCCESS', data: { ...result, newStageName: result.newStageName || null } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '突破过程中发生未知错误，请稍后再试或联系运营。';

    if (error instanceof BackendAPIError && error.code === 'REALM_VERSION_CAPPED') {
      const details = error.details;

      if (details && typeof details === 'object' && 'realmName' in details && typeof details.realmName === 'string') {
        return { code: 'REALM_CAPPED', data: { realmName: details.realmName } };
      }

      return { code: 'ERROR', data: { message: '突破接口返回不完整，请更新服务端后重试' } };
    }

    return {
      code: 'FAIL',
      data: { message, isStageFull: error instanceof BackendAPIError && error.code === 'REALM_STAGE_FULL' }
    };
  }
}

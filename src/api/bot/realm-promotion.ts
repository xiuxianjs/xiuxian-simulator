export type BackendPromotion = {
  success: boolean;
  message: string;
  capReached: boolean;
  capRealmName: string;
  newRealm?: {
    name: string;
    spiritualPower: number;
    speed: number;
    magicAttack: number;
    physicalAttack: number;
    magicDefense: number;
    physicalDefense: number;
    experienceLimit: number;
  };
  tribulation?: { name: string; totalLayers: number; passedLayers: number; summary: string };
  unlockedRecipes: string[];
  masterStageMessages: string[];
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('晋级接口返回不完整，请更新服务端后重试');
  }

  return value as Record<string, unknown>;
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function parseBackendRealmPromotion(data: unknown): BackendPromotion {
  const value = record(data);

  if (value.capReached === true) {
    if (typeof value.capRealmName !== 'string') {
      throw new Error('晋级接口返回的上限信息不完整');
    }

    return { success: false, message: '', capReached: true, capRealmName: value.capRealmName, unlockedRecipes: [], masterStageMessages: [] };
  }
  const unlockedRecipes = value.unlockedRecipes ?? [];
  const masterStageMessages = value.masterStageMessages ?? [];

  if (typeof value.success !== 'boolean' || typeof value.message !== 'string' || !stringList(unlockedRecipes) || !stringList(masterStageMessages)) {
    throw new Error('晋级接口返回不完整，请更新服务端后重试');
  }
  const result: BackendPromotion = {
    success: value.success,
    message: value.message,
    capReached: false,
    capRealmName: '',
    unlockedRecipes,
    masterStageMessages
  };

  if (value.newRealm !== undefined) {
    const realm = record(value.newRealm);
    const numeric = ['spiritualPower', 'speed', 'magicAttack', 'physicalAttack', 'magicDefense', 'physicalDefense', 'experienceLimit'];

    if (typeof realm.name !== 'string' || !numeric.every(key => typeof realm[key] === 'number' && Number.isFinite(realm[key]))) {
      throw new Error('晋级接口返回的新境界不完整');
    }
    result.newRealm = realm as BackendPromotion['newRealm'];
  }
  if (value.tribulation !== undefined) {
    const tribulation = record(value.tribulation);

    if (
      typeof tribulation.name !== 'string' ||
      !['totalLayers', 'passedLayers'].every(key => typeof tribulation[key] === 'number') ||
      typeof tribulation.summary !== 'string'
    ) {
      throw new Error('晋级接口返回的渡劫信息不完整');
    }
    result.tribulation = tribulation as BackendPromotion['tribulation'];
  }

  return result;
}

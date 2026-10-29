import { parseBackendTianshuContent } from '../api/bot/tianshu-content';
import { observation } from './mutation';
import { boolean, integer, list, object, text } from './schema';

const unlock = object({ realm: text, features: list(text), unlocked: boolean }, ['unlocked']);
const stage = object({ stageLevel: integer, stageName: text, realmName: text, unlocks: list(unlock) }, ['realmName']);
const feature = object(
  {
    id: text,
    name: text,
    description: text,
    realm: text,
    realmReached: boolean,
    visible: boolean,
    conditions: list(text),
    entryPaths: list(text),
    lockedReason: text,
    minimumLevel: integer,
    gate: object({ kind: text, minimumLevel: integer, minimumStage: integer, minimumRealmId: integer, maximumStage: integer }, [
      'minimumStage',
      'minimumRealmId',
      'maximumStage'
    ])
  },
  ['entryPaths', 'lockedReason', 'minimumLevel', 'gate']
);

export const tianshuActions = {
  get_tianshu: observation(
    '查询天书的玩法规则、境界开放条件和当前角色的服务端功能状态；未注册账号也可查询公共内容。visible 和 realmReached 不保证满足所有业务条件。',
    'tianshu.content',
    object({}),
    object(
      {
        intro: text,
        realmUnlocks: list(object({ realm: text, features: list(text) })),
        notes: list(text),
        gateVersion: integer,
        currentStage: stage,
        nextStage: stage,
        featureCatalog: list(object({ stageLevel: integer, stageName: text, features: list(feature) })),
        commandFeatures: list(object({ command: text, featureId: text }))
      },
      ['gateVersion', 'currentStage', 'nextStage', 'featureCatalog', 'commandFeatures']
    ),
    () => '/天书',
    data => {
      const content = parseBackendTianshuContent(data);

      const commandFeatures = content.commandFeatures && Object.entries(content.commandFeatures).map(([command, featureId]) => ({ command, featureId }));

      return { ...content, ...(commandFeatures ? { commandFeatures } : {}) };
    }
  )
};

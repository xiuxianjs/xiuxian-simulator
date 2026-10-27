import { Expose } from 'alemonjs';
import { caveActions } from './cave-actions';
import { guildActions } from './guild-actions';
import { storylineActions } from './storyline-actions';
import { adventureActions } from './adventure-actions';
import { battleActions } from './battle-actions';
import { loadoutActions } from './loadout-actions';
import { templateActions } from './template-actions';
import { cultivationActions } from './cultivation-actions';
import { commonActions } from './common-actions';
import { authorize, currentPlayer } from './access';
import { bagQueryActions } from './bags';
import { commonQueryActions } from './common-queries';
import { getBackendInventory } from '../api/bot/inventory';
import { getBackendBattleTemplates } from '../api/bot/battle-templates-query';
import { inventorySchema, templatesSchema, projectInventory, projectTemplates } from './queries';
import { getBackendAttributePanel } from '../api/bot/attribute-panel';

export const GAME_EXPOSE_PROTOCOL = 'xiuxian.player.v1';

const numericFields = [
  'strength',
  'maxStrength',
  'intelligence',
  'maxIntelligence',
  'constitution',
  'maxConstitution',
  'agility',
  'maxAgility',
  'luck',
  'maxLuck',
  'combatPower',
  'physicalAttack',
  'physicalDefense',
  'magicAttack',
  'magicDefense',
  'spiritualPower',
  'mentalPower',
  'hp',
  'speed',
  'critRate',
  'critDamage',
  'antiCritRate',
  'hitRate',
  'dodgeRate'
] as const;

type Attributes = { uid: number; daoName: string; realmName: string } & Record<(typeof numericFields)[number], number>;

export const gameExpose = Expose.create().provide({
  name: GAME_EXPOSE_PROTOCOL,
  version: '1.9.0',
  description: '当前消息玩家的结构化查询与游戏操作；身份、准入和结算由服务端校验。',
  actions: {
    ...commonQueryActions,
    ...commonActions,
    ...cultivationActions,
    ...templateActions,
    ...loadoutActions,
    ...battleActions,
    ...adventureActions,
    ...storylineActions,
    ...caveActions,
    ...guildActions,
    ...bagQueryActions,
    get_inventory: Expose.action<{ category: 'prop' | 'material'; page?: number; subtype?: string }, ReturnType<typeof projectInventory>>({
      description: '分页查询当前玩家道具(prop)或材料(material)背包；page 默认 1，subtype 可选。数量为服务端库存事实，不代表可直接消耗。',
      effect: 'read',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['category'],
        properties: {
          category: { type: 'string', enum: ['prop', 'material'] },
          page: { type: 'integer', minimum: 1, maximum: 2147483647 },
          subtype: { type: 'string', minLength: 1, maxLength: 100 }
        }
      },
      outputSchema: inventorySchema,
      authorize,
      handler: async (input, context) => {
        const { bid, uid, request } = await currentPlayer(context);
        const page = await getBackendInventory(bid, uid, { ...input, page: input.page ?? 1 }, request);

        return projectInventory(page);
      }
    }),
    get_battle_templates: Expose.action<Record<string, never>, ReturnType<typeof projectTemplates>>({
      description: '查询当前配装与已保存战斗模板，包括缺失装备和功法数量；服务端保留境界资格校验，不保存或应用模板。',
      effect: 'read',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: templatesSchema,
      authorize,
      handler: async (_input, context) => {
        const { bid, uid } = await currentPlayer(context);

        return projectTemplates(await getBackendBattleTemplates(bid, uid, context.signal));
      }
    }),
    get_attributes: Expose.action<Record<string, never>, Attributes>({
      description: '查询当前玩家的属性面板。数值及单位沿用服务端；不结算资源，不执行游戏操作。',
      effect: 'read',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: {
        type: 'object',
        properties: {
          uid: { type: 'integer', minimum: 1 },
          daoName: { type: 'string' },
          realmName: { type: 'string' },
          ...Object.fromEntries(numericFields.map(key => [key, { type: 'integer' as const }]))
        },
        required: ['uid', 'daoName', 'realmName', ...numericFields],
        additionalProperties: false
      },
      authorize,
      handler: async (_input, context) => {
        const { bid, uid } = await currentPlayer(context);
        const panel = await getBackendAttributePanel(bid, uid, context.signal);

        return {
          uid: panel.uid,
          daoName: panel.daoName,
          realmName: panel.realmName,
          ...Object.fromEntries(numericFields.map(key => [key, panel[key]]))
        } as Attributes;
      }
    })
  }
});

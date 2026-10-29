import { Expose } from 'alemonjs';
import { membershipActions } from './membership-actions';
import { tianshuActions } from './tianshu-actions';
import { battleMemoryActions } from './battle-memory-actions';
import { personalHistoryActions } from './personal-history-actions';
import { baoluActions } from './baolu-actions';
import { activityActions } from './activity-actions';
import { referralActions } from './referral-actions';
import { profileActions } from './profile-actions';
import { registrationActions } from './registration-actions';
import { onboardingActions } from './onboarding-actions';
import { wudaoActions } from './wudao-actions';
import { talentActions } from './talent-actions';
import { explorationActions } from './exploration-actions';
import { storageLockActions } from './storage-lock-actions';
import { guildBuildingActions } from './guild-building-actions';
import { guildContentActions } from './guild-content-actions';
import { guildInformationActions } from './guild-information-actions';
import { guildLeaveActions } from './guild-leave-actions';
import { guildRedPacketActions } from './guild-red-packet-actions';
import { limitedEventActions } from './limited-event-actions';
import { professionActions } from './profession-actions';
import { forgeOrderActions } from './forge-order-actions';
import { returnRewardsActions } from './return-rewards-actions';
import { soulArtifactActions } from './soul-artifact-actions';
import { decompositionActions } from './decomposition-actions';
import { caveSocialActions } from './cave-social-actions';
import { tianjiaoActions } from './tianjiao-actions';
import { competitionActions } from './competition-actions';
import { blackBoxActions } from './black-box-actions';
import { friendActions } from './friend-actions';
import { treasureActions } from './treasure-actions';
import { pkBattleActions } from './pk-battle-actions';
import { pkActions } from './pk-actions';
import { pvpActions } from './pvp-actions';
import { bountyActions } from './bounty-actions';
import { marketActions } from './market-actions';
import { masterActions } from './master-actions';
import { companionActions } from './companion-actions';
import { encyclopediaActions } from './encyclopedia-actions';
import { guildStorylineActions } from './guild-storyline-actions';
import { secretRealmActions } from './secret-realm-actions';
import { settingsActions } from './settings-actions';
import { taskActions } from './task-actions';
import { guildMembershipActions } from './guild-membership-actions';
import { newcomerActions } from './newcomer-actions';
import { peiyuanActions } from './peiyuan-actions';
import { mingwuActions } from './mingwu-actions';
import { achievementActions } from './achievement-actions';
import { tongtianActions } from './tongtian-actions';
import { growthActions } from './growth-actions';
import { teamActions } from './team-actions';
import { guildRoutineActions } from './guild-routine-actions';
import { soulActions } from './soul-actions';
import { spiritRootActions } from './spirit-root-actions';
import { shopActions } from './shop-actions';
import { itemActions } from './item-actions';
import { skillActions } from './skill-actions';
import { rewardActions } from './reward-actions';
import { tribulationActions } from './tribulation-actions';
import { craftingActions } from './crafting-actions';
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

type Attributes = {
  uid: number;
  daoName: string;
  realmName: string;
  maxAttributeBonus: number;
  access: { canUseMeridian: boolean; canUseSoulArtifact: boolean; canUseSoulPath: boolean };
  mpRecoveryEfficiency?: number;
  mentalRecoveryEfficiency?: number;
} & Record<(typeof numericFields)[number], number>;

export const gameExpose = Expose.create().provide({
  name: GAME_EXPOSE_PROTOCOL,
  version: '1.178.0',
  description: '当前消息玩家的结构化查询与游戏操作；身份、准入和结算由服务端校验。',
  actions: {
    ...membershipActions,
    ...tianshuActions,
    ...battleMemoryActions,
    ...personalHistoryActions,
    ...baoluActions,
    ...activityActions,
    ...referralActions,
    ...profileActions,
    ...registrationActions,
    ...onboardingActions,
    ...wudaoActions,
    ...talentActions,
    ...explorationActions,
    ...storageLockActions,
    ...guildBuildingActions,
    ...guildContentActions,
    ...guildInformationActions,
    ...guildLeaveActions,
    ...guildRedPacketActions,
    ...limitedEventActions,
    ...professionActions,
    ...forgeOrderActions,
    ...returnRewardsActions,
    ...soulArtifactActions,
    ...decompositionActions,
    ...caveSocialActions,
    ...tianjiaoActions,
    ...competitionActions,
    ...blackBoxActions,
    ...guildMembershipActions,
    ...friendActions,
    ...masterActions,
    ...marketActions,
    ...bountyActions,
    ...pvpActions,
    ...pkActions,
    ...pkBattleActions,
    ...treasureActions,
    ...companionActions,
    ...encyclopediaActions,
    ...guildStorylineActions,
    ...secretRealmActions,
    ...newcomerActions,
    ...peiyuanActions,
    ...mingwuActions,
    ...achievementActions,
    ...tongtianActions,
    ...growthActions,
    ...teamActions,
    ...settingsActions,
    ...taskActions,
    ...guildRoutineActions,
    ...soulActions,
    ...spiritRootActions,
    ...shopActions,
    ...itemActions,
    ...skillActions,
    ...rewardActions,
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
    ...craftingActions,
    ...tribulationActions,
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
          maxAttributeBonus: { type: 'integer' },
          access: {
            type: 'object',
            properties: { canUseMeridian: { type: 'boolean' }, canUseSoulArtifact: { type: 'boolean' }, canUseSoulPath: { type: 'boolean' } },
            required: ['canUseMeridian', 'canUseSoulArtifact', 'canUseSoulPath'],
            additionalProperties: false
          },
          mpRecoveryEfficiency: { type: 'number' },
          mentalRecoveryEfficiency: { type: 'number' },
          ...Object.fromEntries(numericFields.map(key => [key, { type: 'integer' as const }]))
        },
        required: ['uid', 'daoName', 'realmName', 'maxAttributeBonus', 'access', ...numericFields],
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
          maxAttributeBonus: panel.maxAttributeBonus,
          access: panel.access,
          ...(panel.mpRecoveryEfficiency === undefined ? {} : { mpRecoveryEfficiency: panel.mpRecoveryEfficiency }),
          ...(panel.mentalRecoveryEfficiency === undefined ? {} : { mentalRecoveryEfficiency: panel.mentalRecoveryEfficiency }),
          ...Object.fromEntries(numericFields.map(key => [key, panel[key]]))
        } as Attributes;
      }
    })
  }
});

import { authorize, currentPlayer } from "./access.js";
import { membershipActions } from "./membership-actions.js";
import { tianshuActions } from "./tianshu-actions.js";
import { battleMemoryActions } from "./battle-memory-actions.js";
import { personalHistoryActions } from "./personal-history-actions.js";
import { baoluActions } from "./baolu-actions.js";
import { activityActions } from "./activity-actions.js";
import { referralActions } from "./referral-actions.js";
import { profileActions } from "./profile-actions.js";
import { commonQueryActions } from "./common-queries.js";
import { registrationActions } from "./registration-actions.js";
import { onboardingActions } from "./onboarding-actions.js";
import { wudaoActions } from "./wudao-actions.js";
import { talentActions } from "./talent-actions.js";
import { explorationActions } from "./exploration-actions.js";
import { storageLockActions } from "./storage-lock-actions.js";
import { guildBuildingActions } from "./guild-building-actions.js";
import { guildContentActions } from "./guild-content-actions.js";
import { guildInformationActions } from "./guild-information-actions.js";
import { guildLeaveActions } from "./guild-leave-actions.js";
import { guildRedPacketActions } from "./guild-red-packet-actions.js";
import { limitedEventActions } from "./limited-event-actions.js";
import { craftingActions } from "./crafting-actions.js";
import { professionActions } from "./profession-actions.js";
import { forgeOrderActions } from "./forge-order-actions.js";
import { returnRewardsActions } from "./return-rewards-actions.js";
import { soulArtifactActions } from "./soul-artifact-actions.js";
import { decompositionActions } from "./decomposition-actions.js";
import { caveSocialActions } from "./cave-social-actions.js";
import { tianjiaoActions } from "./tianjiao-actions.js";
import { competitionActions } from "./competition-actions.js";
import { blackBoxActions } from "./black-box-actions.js";
import { friendActions } from "./friend-actions.js";
import { treasureActions } from "./treasure-actions.js";
import { pkBattleActions } from "./pk-battle-actions.js";
import { pkActions } from "./pk-actions.js";
import { pvpActions } from "./pvp-actions.js";
import { bountyActions } from "./bounty-actions.js";
import { marketActions } from "./market-actions.js";
import { masterActions } from "./master-actions.js";
import { companionActions } from "./companion-actions.js";
import { encyclopediaActions } from "./encyclopedia-actions.js";
import { glossaryActions } from "./glossary-actions.js";
import { feedbackActions } from "./feedback-actions.js";
import { guildStorylineActions } from "./guild-storyline-actions.js";
import { secretRealmActions } from "./secret-realm-actions.js";
import { settingsActions } from "./settings-actions.js";
import { taskActions } from "./task-actions.js";
import { taskHomeActions } from "./task-home-actions.js";
import { getBackendInventory } from "../api/bot/inventory.js";
import { inventorySchema, projectInventory, projectTemplates, templatesSchema } from "./queries.js";
import { bagQueryActions } from "./bags.js";
import { taskInventoryActions } from "./task-inventory-actions.js";
import { guildMembershipActions } from "./guild-membership-actions.js";
import { newcomerActions } from "./newcomer-actions.js";
import { itemActions } from "./item-actions.js";
import { peiyuanActions } from "./peiyuan-actions.js";
import { mingwuActions } from "./mingwu-actions.js";
import { achievementActions } from "./achievement-actions.js";
import { tongtianActions } from "./tongtian-actions.js";
import { growthActions } from "./growth-actions.js";
import { teamActions } from "./team-actions.js";
import { guildRoutineActions } from "./guild-routine-actions.js";
import { soulActions } from "./soul-actions.js";
import { spiritRootActions } from "./spirit-root-actions.js";
import { shopActions } from "./shop-actions.js";
import { skillActions } from "./skill-actions.js";
import { rewardActions } from "./reward-actions.js";
import { tribulationActions } from "./tribulation-actions.js";
import { caveActions } from "./cave-actions.js";
import { guildActions } from "./guild-actions.js";
import { storylineActions } from "./storyline-actions.js";
import { adventureActions } from "./adventure-actions.js";
import { battleActions } from "./battle-actions.js";
import { loadoutActions } from "./loadout-actions.js";
import { templateActions } from "./template-actions.js";
import { cultivationActions } from "./cultivation-actions.js";
import { commonActions } from "./common-actions.js";
import { getBackendBattleTemplates } from "../api/bot/battle-templates-query.js";
import { getBackendAttributePanel } from "../api/bot/attribute-panel.js";
import { Expose } from "alemonjs";

//#region src/expose/index.ts
const GAME_EXPOSE_PROTOCOL = "xiuxian.player.v1";
const numericFields = [
	"strength",
	"maxStrength",
	"intelligence",
	"maxIntelligence",
	"constitution",
	"maxConstitution",
	"agility",
	"maxAgility",
	"luck",
	"maxLuck",
	"combatPower",
	"physicalAttack",
	"physicalDefense",
	"magicAttack",
	"magicDefense",
	"spiritualPower",
	"mentalPower",
	"hp",
	"speed",
	"critRate",
	"critDamage",
	"antiCritRate",
	"hitRate",
	"dodgeRate"
];
const gameExpose = Expose.create().provide({
	name: GAME_EXPOSE_PROTOCOL,
	version: "1.290.0",
	description: "当前消息玩家的结构化查询与游戏操作；身份、准入和结算由服务端校验。",
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
		...glossaryActions,
		...feedbackActions,
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
		...taskHomeActions,
		...taskInventoryActions,
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
		get_inventory: Expose.action({
			description: "分页查询当前玩家道具(prop)或材料(material)背包；page 默认 1，subtype 可选。道具的 userItemId 可用于 consume_inventory_item 或背包实例锁定；库存数量不代表可直接消耗。",
			effect: "read",
			inputSchema: {
				type: "object",
				additionalProperties: false,
				required: ["category"],
				properties: {
					category: {
						type: "string",
						enum: ["prop", "material"]
					},
					page: {
						type: "integer",
						minimum: 1,
						maximum: 2147483647
					},
					subtype: {
						type: "string",
						minLength: 1,
						maxLength: 100
					}
				}
			},
			outputSchema: inventorySchema,
			authorize,
			handler: async (input, context) => {
				const { bid, uid, request } = await currentPlayer(context);
				const page = await getBackendInventory(bid, uid, {
					...input,
					page: input.page ?? 1
				}, request);
				return projectInventory(page);
			}
		}),
		get_battle_templates: Expose.action({
			description: "查询当前配装与已保存战斗模板，包括缺失装备和功法数量；服务端保留境界资格校验，不保存或应用模板。",
			effect: "read",
			inputSchema: {
				type: "object",
				properties: {},
				additionalProperties: false
			},
			outputSchema: templatesSchema,
			authorize,
			handler: async (_input, context) => {
				const { bid, uid } = await currentPlayer(context);
				return projectTemplates(await getBackendBattleTemplates(bid, uid, context.signal));
			}
		}),
		get_attributes: Expose.action({
			description: "查询当前玩家的属性面板。数值及单位沿用服务端；不结算资源，不执行游戏操作。",
			effect: "read",
			inputSchema: {
				type: "object",
				properties: {},
				additionalProperties: false
			},
			outputSchema: {
				type: "object",
				properties: {
					uid: {
						type: "integer",
						minimum: 1
					},
					daoName: { type: "string" },
					realmName: { type: "string" },
					maxAttributeBonus: { type: "integer" },
					access: {
						type: "object",
						properties: {
							canUseMeridian: { type: "boolean" },
							canUseSoulArtifact: { type: "boolean" },
							canUseSoulPath: { type: "boolean" }
						},
						required: [
							"canUseMeridian",
							"canUseSoulArtifact",
							"canUseSoulPath"
						],
						additionalProperties: false
					},
					mpRecoveryEfficiency: { type: "number" },
					mentalRecoveryEfficiency: { type: "number" },
					...Object.fromEntries(numericFields.map((key) => [key, { type: "integer" }]))
				},
				required: [
					"uid",
					"daoName",
					"realmName",
					"maxAttributeBonus",
					"access",
					...numericFields
				],
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
					...panel.mpRecoveryEfficiency === void 0 ? {} : { mpRecoveryEfficiency: panel.mpRecoveryEfficiency },
					...panel.mentalRecoveryEfficiency === void 0 ? {} : { mentalRecoveryEfficiency: panel.mentalRecoveryEfficiency },
					...Object.fromEntries(numericFields.map((key) => [key, panel[key]]))
				};
			}
		})
	}
});

//#endregion
export { GAME_EXPOSE_PROTOCOL, gameExpose };
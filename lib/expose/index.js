import { authorize, currentPlayer } from "./access.js";
import { craftingActions } from "./crafting-actions.js";
import { commonQueryActions } from "./common-queries.js";
import { caveActions } from "./cave-actions.js";
import { guildActions } from "./guild-actions.js";
import { storylineActions } from "./storyline-actions.js";
import { adventureActions } from "./adventure-actions.js";
import { battleActions } from "./battle-actions.js";
import { loadoutActions } from "./loadout-actions.js";
import { inventorySchema, projectInventory, projectTemplates, templatesSchema } from "./queries.js";
import { templateActions } from "./template-actions.js";
import { cultivationActions } from "./cultivation-actions.js";
import { commonActions } from "./common-actions.js";
import { bagQueryActions } from "./bags.js";
import { getBackendInventory } from "../api/bot/inventory.js";
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
	version: "1.10.0",
	description: "当前消息玩家的结构化查询与游戏操作；身份、准入和结算由服务端校验。",
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
		...craftingActions,
		...bagQueryActions,
		get_inventory: Expose.action({
			description: "分页查询当前玩家道具(prop)或材料(material)背包；page 默认 1，subtype 可选。数量为服务端库存事实，不代表可直接消耗。",
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
					...Object.fromEntries(numericFields.map((key) => [key, { type: "integer" }]))
				},
				required: [
					"uid",
					"daoName",
					"realmName",
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
					...Object.fromEntries(numericFields.map((key) => [key, panel[key]]))
				};
			}
		})
	}
});

//#endregion
export { GAME_EXPOSE_PROTOCOL, gameExpose };
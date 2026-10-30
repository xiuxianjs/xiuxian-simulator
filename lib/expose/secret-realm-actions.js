import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseBackendSecretRealmChallenge, parseBackendSecretRealmClaim, parseBackendSecretRealmHome, parseBackendSecretRealmList, parseBackendSecretRealmView } from "../api/bot/guild-secret-realm-war.js";

//#region src/expose/secret-realm-actions.ts
const empty = object({});
const realmNo = {
	type: "integer",
	minimum: 1,
	maximum: 127
};
const home = object({
	isActive: boolean,
	...fields(text, "activeStart activeEnd guildName memberRoleName joinAt"),
	...fields(integer, "attackUsed maxAttack guildId"),
	activeDataJson: text,
	settledDataJson: text,
	display: object({
		...fields(text, "participationNotice statusLabel membershipNotice activeOwnedText outputMultiplierText settledOwnedText rewardText"),
		attackRemaining: integer,
		canPromptClaim: boolean
	}, [
		"activeOwnedText",
		"outputMultiplierText",
		"settledOwnedText",
		"rewardText"
	])
}, [
	"guildId",
	"joinAt",
	"activeDataJson",
	"settledDataJson"
]);
const summary = object({
	...fields(integer, "realmNo winnerGuildId winnerPoints"),
	...fields(text, "tier name winnerGuildName")
});
const position = object({
	...fields(integer, "positionNo positionPoints npcId occupiedUserId occupiedGuildId"),
	...fields(text, "occupiedUserName occupiedGuildName frozenUntil")
}, [
	"occupiedUserId",
	"occupiedGuildId",
	"occupiedUserName",
	"occupiedGuildName",
	"frozenUntil"
]);
const secretRealmActions = {
	get_spirit_vein_war: observation("查询灵脉攻防战时段、本人宗门、剩余攻击次数和奖励提示；服务端查询可能维护周期状态。", "secret-realm.home", empty, home, () => "/灵脉攻防战", (data) => {
		const result = parseBackendSecretRealmHome(data);
		return {
			...result,
			...result.activeData === null ? {} : { activeDataJson: JSON.stringify(result.activeData) },
			...result.settledData === null ? {} : { settledDataJson: JSON.stringify(result.settledData) }
		};
	}),
	execute_task_spirit_vein_war: mutation("查询灵脉攻防战时段、本人宗门、剩余攻击次数和奖励提示；服务端查询可能维护周期状态。", "secret-realm.home", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), home, () => "/灵脉攻防战", (data) => {
		const result = parseBackendSecretRealmHome(data);
		return {
			...result,
			...result.activeData === null ? {} : { activeDataJson: JSON.stringify(result.activeData) },
			...result.settledData === null ? {} : { settledDataJson: JSON.stringify(result.settledData) }
		};
	}, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	list_spirit_vein_realms: observation("分页查询灵脉攻防战秘境及领先宗门；每页五条，返回秘境编号供查看阵位。", "secret-realm.list", object({ page }, ["page"]), object({ items: list(summary) }), (input) => `/灵脉攻防战列表 ${input.page ?? 1}`, parseBackendSecretRealmList, (input) => ({ page: String(input.page ?? 1) })),
	execute_task_spirit_vein_list: mutation("执行灵脉攻防战列表查看步骤，返回第一页秘境编号及领先宗门，不发起挑战。", "secret-realm.list", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({ items: list(summary) }), () => "/灵脉攻防战列表", parseBackendSecretRealmList, () => ({ page: "1" }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	execute_task_spirit_vein_view_help: mutation("执行无编号的灵脉攻防战查看任务步骤。服务端返回用法提示，不返回阵位；先查询灵脉列表并选择秘境编号。", "secret-realm.view", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({ positions: list(position) }), () => "/灵脉攻防战查看", parseBackendSecretRealmView, () => ({
		realmNo: null,
		page: "1"
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_spirit_vein_positions: observation("分页查询指定灵脉秘境的阵位、占领者和冻结时间；每页五条。", "secret-realm.view", object({
		realmNo,
		page
	}, ["page"]), object({ positions: list(position) }), (input) => `/灵脉攻防战查看 ${input.realmNo} ${input.page ?? 1}`, parseBackendSecretRealmView, (input) => ({
		realmNo: String(input.realmNo),
		page: String(input.page ?? 1)
	})),
	challenge_spirit_vein_position: mutation("挑战执行时指定灵脉阵位，服务端检查时段、宗门、次数与冻结状态；阵位占领者可能变化。同消息新挑战使用新 intentId，同次重试沿用原编号。", "secret-realm.challenge", object({
		realmNo,
		positionNo: realmNo,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		won: boolean,
		...fields(integer, "realmNo positionNo participationContribution"),
		frozenUntil: text
	}, ["frozenUntil"]), (input) => `/灵脉攻防战挑战 ${input.realmNo} ${input.positionNo}`, (data, input) => {
		const result = parseBackendSecretRealmChallenge(data);
		if (result.realmNo !== input.realmNo || result.positionNo !== input.positionNo || !(data && typeof data === "object" && "participationContribution" in data)) throw new Error("灵脉挑战回执与请求不匹配");
		return result;
	}, (input) => ({
		realmNo: String(input.realmNo),
		positionNo: String(input.positionNo)
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_spirit_vein_war_rewards: mutation("领取本人可领取的灵脉攻防战结算奖励，以实际灵晶、贡献和声望回执为准。", "secret-realm.claim", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		...fields(integer, "spiritCrystal contribution reputation ownedRealms"),
		reputationAlreadyClaimed: boolean
	}), () => "/灵脉攻防战领取奖励", parseBackendSecretRealmClaim, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { secretRealmActions };
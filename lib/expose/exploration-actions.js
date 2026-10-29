import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseSeclusionCommand } from "../api/bot/seclusion-command.js";
import { parseSeclusionEnd } from "../api/bot/seclusion-end.js";

//#region src/expose/exploration-actions.ts
const drop = object({
	name: text,
	quantity: integer
});
const preview = object({
	...fields(integer, "duration dungeonId experience spiritStone huanHunDan yangShenDan soulDew projectedCreditedExperience projectedGatheredCount"),
	...fields(number, "materialProgressPercent expectedHuanHunDan expectedYangShenDan"),
	...fields(boolean, "premium experienceCapWarning breakthroughReady"),
	rareDrops: list(drop)
}, [
	"projectedCreditedExperience",
	"projectedGatheredCount",
	"materialProgressPercent",
	"expectedHuanHunDan",
	"expectedYangShenDan",
	"experienceCapWarning",
	"breakthroughReady"
]);
const dungeon = object({
	id: integer,
	name: text,
	startOptions: list(object({
		duration: integer,
		spiritCost: integer,
		available: boolean,
		reason: text,
		preview
	}, ["reason"]))
});
const status = object({
	...fields(boolean, "inSeclusion startAvailable canEnd"),
	...fields(text, "startReason endReason"),
	recommendedDuration: integer,
	record: object({
		...fields(integer, "id duration elapsedHours remainingHours settleableBlocks settleableHours dungeonId"),
		isCompleted: boolean,
		dungeonName: text
	}, ["dungeonName"]),
	earlyExitPolicy: object({
		...fields(integer, "settleBlockHours refundBeforeHours penaltyBeforeHours"),
		penaltyRate: number
	}),
	availableDungeons: list(dungeon)
}, [
	"startReason",
	"endReason",
	"recommendedDuration",
	"record"
]);
const viewResult = object({
	code: text,
	canUseSoulPath: boolean,
	status,
	message: text
}, ["status", "message"]);
const endResult = object({
	...fields(boolean, "interrupted spiritRefunded penaltyApplied"),
	...fields(integer, "settledHours creditedExperience refundedSpirit gatheredMaterialCount"),
	materialProgressPercent: number,
	presenceText: text,
	view: object({
		...fields(text, "kind title introText penaltyText expBonusText"),
		...fields(integer, "pillCount rareDropTypeCount rareDropTotalCount"),
		...fields(boolean, "showHuanHunDan showYangShenDan showRareDrops")
	}),
	rewards: object({
		...fields(integer, "experience spiritStone huanHunDan yangShenDan soulDew"),
		rareDrops: list(drop)
	})
}, [
	"creditedExperience",
	"refundedSpirit",
	"gatheredMaterialCount",
	"materialProgressPercent",
	"presenceText",
	"rewards"
]);
const explorationActions = {
	get_exploration: observation("查询探索状态、可选秘境、时长、精力和收益预览及提前返程规则；预览不保证实际收益。准入可能结算常规资源。", "seclusion.command", object({}), viewResult, () => "/探索秘境", (data) => {
		const result = parseSeclusionCommand(data, "view");
		return result.result.code === "OK" ? {
			code: "OK",
			canUseSoulPath: result.access.canUseSoulPath,
			status: result.result.data
		} : {
			code: result.result.code,
			canUseSoulPath: result.access.canUseSoulPath,
			message: result.result.data.message
		};
	}, () => ({ action: "view" })),
	start_exploration: mutation("开始探索指定秘境，时长与精力消耗以探索状态中的可用选项和服务端结果为准。", "seclusion.command", object({
		dungeonName: {
			type: "string",
			minLength: 1
		},
		duration: {
			type: "integer",
			minimum: 1,
			maximum: 2147483647
		}
	}), object({
		code: text,
		canUseSoulPath: boolean,
		message: text,
		dungeon: object({
			id: integer,
			name: text
		}),
		record: object({
			duration: integer,
			spiritCost: integer,
			endTime: text
		}, ["endTime"])
	}, [
		"message",
		"dungeon",
		"record"
	]), (input) => `/探索秘境 ${input.dungeonName} ${input.duration}`, (data, input) => {
		const result = parseSeclusionCommand(data, "start");
		if (result.result.code !== "OK") return {
			code: result.result.code,
			canUseSoulPath: result.access.canUseSoulPath,
			message: result.result.data.message
		};
		if (result.result.data.dungeon.name !== input.dungeonName || result.result.data.record.duration !== input.duration) throw new Error("探索回执目标不匹配");
		return {
			code: "OK",
			canUseSoulPath: result.access.canUseSoulPath,
			...result.result.data
		};
	}, (input) => ({
		action: "start",
		dungeonName: input.dungeonName,
		duration: input.duration
	})),
	end_exploration: mutation("返程并结算实际收益；提前返程可能退款或扣减收益，先查询返程规则。", "seclusion.end", object({}), endResult, () => "/返程", (data) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("返程回执不完整");
		return parseSeclusionEnd(data.result);
	})
};

//#endregion
export { explorationActions };
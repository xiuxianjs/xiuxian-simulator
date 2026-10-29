import { requestBackend } from "../api/bot/client.js";
import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { query } from "./query.js";
import { parseRobotSkillDetail } from "../api/bot/skill-detail-queries.js";
import { parseBackendSkillBookProficiency } from "../api/bot/skill-book-proficiency.js";
import { parseSkillBookBatchUpgrade } from "../api/bot/skill-book-batch-upgrade.js";
import { parseProfessionDashboard } from "../api/bot/profession-dashboard-query.js";
import { parseLingzhiGuideState } from "../api/bot/lingzhi-guide.js";

//#region src/expose/growth-actions.ts
const bookId = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const herbalistSession = object({
	step: {
		type: "integer",
		minimum: 1,
		maximum: 4
	},
	createTime: bookId,
	expireTime: bookId,
	version: bookId
});
const detailDisplay = object({
	...fields(text, "titleText damageLine statusLine proficiencyText visibilityAction visibilityLabel cooldownLine costLine defenseIgnoreLine triggerLine effectNamesLine"),
	...fields(boolean, "canComprehend canUseMingwudan canReset"),
	narrativeLines: list(text),
	effectLines: list(text),
	attributeLines: list(text),
	recoveryLines: list(text)
}, [
	"damageLine",
	"visibilityLabel",
	"costLine",
	"defenseIgnoreLine",
	"triggerLine",
	"effectNamesLine"
]);
const detailBook = object({
	...fields(integer, "id status isHidden upgradeCount proficiency physicalAttack magicAttack physicalDefense magicDefense hp speed maxPhysicalAttack maxMagicAttack maxPhysicalDefense maxMagicDefense maxHp maxSpeed"),
	...fields(number, "physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent critRate critDamage maxPhysicalAttackPercent maxMagicAttackPercent maxPhysicalDefensePercent maxMagicDefensePercent maxHpPercent maxCritRate maxCritDamage"),
	...fields(text, "name skillType damageType statusText listText slotText attributeSummary skillName camp triggerCondition"),
	...fields(boolean, "canHide canReset"),
	...fields(integer, "skillId skillTypeId skillModule cost cooldown targetCount"),
	...fields(number, "multiplier defenseIgnorePercent"),
	buffNames: list(text),
	skillEffects: list(object({
		...fields(text, "name camp triggerScope"),
		...fields(integer, "module probability type applyTiming effectTiming applyProbability effectProbability duration multiplier maxStacks attributeModule"),
		removable: boolean
	}, [
		"camp",
		"triggerScope",
		"module",
		"probability",
		"type",
		"applyTiming",
		"effectTiming",
		"applyProbability",
		"effectProbability",
		"duration",
		"multiplier",
		"maxStacks",
		"attributeModule",
		"removable"
	])),
	detailDisplay
}, [
	"damageType",
	"skillId",
	"skillTypeId",
	"skillModule",
	"cost",
	"cooldown",
	"targetCount",
	"multiplier",
	"defenseIgnorePercent",
	"camp",
	"triggerCondition"
]);
const profession = object({
	access: object({
		...fields(boolean, "canUseProfessionAndCave canJoinAlchemyGuide"),
		features: list(object({
			key: text,
			realmReached: boolean,
			requiredRealm: text,
			lockedReason: text
		}))
	}),
	alchemy: object({
		...fields(boolean, "unlocked canAdvance showSection"),
		title: text,
		...fields(integer, "level exp nextExpRequired totalCrafts learnedRecipeCount"),
		primaryAction: {
			type: "string",
			enum: [
				"recipes",
				"continueGuide",
				"joinGuide",
				"none"
			]
		},
		equipments: list(object({
			typeName: text,
			equipped: boolean,
			equipmentName: text,
			gradeName: text
		}, ["equipmentName", "gradeName"])),
		guide: object({
			active: boolean,
			...fields(integer, "step expiresAt"),
			stepLabel: text
		}, ["step", "expiresAt"])
	}, ["nextExpRequired"]),
	lingzhi: object({
		unlocked: boolean,
		...fields(text, "title maxFieldGradeLabel cultivationCostText"),
		...fields(integer, "level exp nextExpRequired dailyExpGained dailyExpCap maxPlots maxFieldGrade yieldBonus cultivatedCount cultivatableCount"),
		primaryAction: {
			type: "string",
			enum: ["plots", "joinGuide"]
		}
	}, [
		"nextExpRequired",
		"cultivatedCount",
		"cultivatableCount",
		"cultivationCostText"
	])
});
const growthActions = {
	get_herbalist_guide: query("读取本人当前灵药师指引，不开启或推进；active=false 仅表示没有有效引导会话，不表示职业未入门，需结合职业面板核对。", object({
		active: boolean,
		session: herbalistSession
	}, ["session"]), async ({ bid, uid }, _input, context) => {
		const raw = await requestBackend(bid, "get_players_id_professions_lingzhi_guide", {
			path: { id: uid },
			signal: context.signal
		});
		const state = parseLingzhiGuideState(raw);
		if (state.completed) throw new Error("灵药师指引查询返回异常完成状态");
		return {
			active: Boolean(state.session),
			...state.session ? { session: state.session } : {}
		};
	}),
	start_herbalist_guide: mutation("开启或恢复本人灵药师指引；返回服务端当前步骤、版本及有效期。此操作不会推进步骤或表示已完成职业入门；已入门或不符合条件时保留服务端拒绝。", "profession.lingzhi-guide", object({}), object({ session: herbalistSession }), () => "/加入灵药师", (data) => {
		const state = parseLingzhiGuideState(data);
		if (state.completed || !state.session) throw new Error("灵药师指引开始响应不完整");
		return { session: state.session };
	}, () => ({ continued: false })),
	continue_herbalist_guide: mutation("继续本人灵药师指引，expected 必须完整使用上次服务端返回的原 session。服务端核对原步骤和版本；completed=true 才表示入门完成，最终步骤会发放服务端规定的入门物资。失败或结果未知时先查询职业与指引状态。", "profession.lingzhi-guide", object({ expected: herbalistSession }), object({
		completed: boolean,
		session: herbalistSession,
		activation: object({
			message: text,
			completed: boolean,
			alreadyCompleted: boolean,
			professionCreated: boolean,
			plotsInitialized: boolean,
			starterSeedGranted: boolean,
			hoeGranted: boolean
		})
	}, ["session", "activation"]), () => "/继续灵药指引", (data, input) => {
		const state = parseLingzhiGuideState(data);
		if (state.completed) {
			const activation = data.activation;
			if (input.expected.step !== 4 || activation?.completed !== true || typeof activation.message !== "string") throw new Error("灵药师入门结算响应不完整");
			return {
				completed: true,
				activation
			};
		}
		if (!state.session || input.expected.step >= 4 || state.session.step !== input.expected.step + 1 || state.session.version !== input.expected.version + 1 || state.session.createTime !== input.expected.createTime || state.session.expireTime !== input.expected.expireTime) throw new Error("灵药师指引步骤与请求不匹配");
		return {
			completed: false,
			session: state.session
		};
	}, (input) => ({
		continued: true,
		expected: {
			step: input.expected.step,
			createTime: input.expected.createTime,
			expireTime: input.expected.expireTime,
			version: input.expected.version
		}
	})),
	get_skill_book_detail: mutation("查询本人已学功法实例详情、当前和上限属性、技能效果及可操作状态；不执行升级或参悟。可选字段缺失表示服务端未提供。", "skill-books.detail", object({ bookId }), object({
		skillBookId: integer,
		proficiencyPoints: integer,
		skillBook: detailBook
	}), (input) => `/查看功法 ${input.bookId}`, (data, input) => {
		const result = parseRobotSkillDetail(data);
		if (result.skillBookId !== input.bookId) throw new Error("功法详情与请求实例不匹配");
		return result;
	}, (input) => ({ bookId: String(input.bookId) })),
	comprehend_skill_book: mutation("对本人功法投入指定熟练点；实际成功、失败、保底及剩余点数以回执为准，不保证每点成功。同一原消息重试复用幂等键；新消息是新操作。", "skill-books.proficiency", object({
		bookId,
		points: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		}
	}), object({
		outcome: {
			type: "string",
			enum: ["ok"]
		},
		skillBookName: text,
		...fields(integer, "consumedPoints oldProficiency newProficiency remainingPoints successCount failCount"),
		pityTriggered: boolean
	}), (input) => `/参悟 ${input.bookId} ${input.points}`, (data, input) => {
		const result = parseBackendSkillBookProficiency(data);
		const { consumedPoints, oldProficiency, newProficiency, remainingPoints, successCount, failCount } = result;
		const invalidCounts = [
			consumedPoints,
			oldProficiency,
			newProficiency,
			remainingPoints,
			successCount,
			failCount
		].some((n) => !Number.isSafeInteger(n) || n < 0);
		if (result.outcome !== "ok" || invalidCounts || consumedPoints < 1 || consumedPoints > input.points || successCount + failCount !== consumedPoints || oldProficiency > newProficiency || newProficiency > 100 || newProficiency - oldProficiency !== successCount) throw new Error("参悟功法结算响应不完整");
		return result;
	}, (input) => ({ tokens: [String(input.bookId), String(input.points)] })),
	upgrade_skill_book: mutation("对本人已学功法连续升级，服务端最多处理36次，并可能因材料、灵石或属性上限提前停止。检查实际 successCount、消耗和 stopReason，不能把请求次数当作完成次数。同一原消息重试复用幂等键。", "skill-books.batch-upgrade", object({
		bookId,
		count: {
			type: "integer",
			minimum: 1,
			maximum: 36
		}
	}), object({
		outcome: {
			type: "string",
			enum: ["ok"]
		},
		target: object({
			id: integer,
			name: text
		}),
		...fields(integer, "successCount totalConsumedExp totalConsumedSpiritStone lastUpgradeCount upgradeCount skillBookId"),
		attributeChanges: list(object({
			name: text,
			...fields(number, "growth currentValue maxValue"),
			isNew: boolean
		})),
		attributeLines: list(text),
		stopReason: text
	}), (input) => `/升级功法 ${input.bookId} ${input.count}`, (data, input) => {
		const row = data;
		if (row?.mode !== "execute") throw new Error("功法升级未返回结算");
		const result = parseSkillBookBatchUpgrade(row.result);
		if (result.outcome !== "ok" || result.skillBookId !== input.bookId || result.target?.id !== input.bookId || result.upgradeCount !== input.count || result.successCount < 0 || result.successCount > result.upgradeCount || result.totalConsumedExp < 0 || result.totalConsumedSpiritStone < 0 || result.lastUpgradeCount < 0) throw new Error("功法升级结算与请求不匹配");
		return result;
	}, (input) => ({
		bookId: String(input.bookId),
		count: String(input.count)
	})),
	get_profession_dashboard: observation("查询炼丹师与灵药师职业等级、经验、装备、入门引导状态和开放条件；不报名、不领取、不消耗资源。功能条件以 access 为准，缺失可选字段不等于零。", "profession.dashboard", object({}), profession, () => "/我的职业", (data) => {
		const result = parseProfessionDashboard(data);
		return {
			...result,
			access: {
				...result.access,
				features: Object.entries(result.access.features ?? {}).map(([key, value]) => ({
					key,
					...value
				}))
			}
		};
	})
};

//#endregion
export { growthActions };
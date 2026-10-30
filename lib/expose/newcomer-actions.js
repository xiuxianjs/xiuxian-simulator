import { boolean, fields, integer, list, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseBackendNewcomerLoginView } from "../api/bot/newcomer-login-queries.js";
import { parseRobotNewcomerTaskReward } from "../api/bot/newcomer-activity.js";
import { parseRobotNewcomerLogin } from "../api/bot/checkin-robot-query.js";
import { ExposeError } from "alemonjs";

//#region src/expose/newcomer-actions.ts
const dayStatus = {
	type: "string",
	enum: [
		"LOCKED",
		"MISSED",
		"AVAILABLE",
		"CLAIMED"
	]
};
const milestoneStatus = {
	type: "string",
	enum: [
		"LOCKED",
		"CLAIMABLE",
		"CLAIMED"
	]
};
const taskId = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const view = object({
	...fields(integer, "eventDays contentDays currentDayIndex"),
	...fields(text, "timeRange nextUnlockText totalText"),
	signInCommand: text,
	overviewDays: list(object({
		day: integer,
		theme: text,
		status: dayStatus,
		taskSummary: text
	})),
	detailDays: list(object({
		day: integer,
		theme: text,
		flavor: text,
		status: dayStatus,
		configExists: boolean,
		rewardText: text,
		rewardStatus: text,
		tasks: list(object({
			label: text,
			progressText: text,
			milestones: list(object({
				text,
				status: milestoneStatus,
				taskConfigId: taskId
			}, ["taskConfigId"]))
		}))
	}))
}, ["signInCommand"]);
function newcomerCommand(input, claim) {
	const allowed = claim ? ["初入仙途签到", "新人狂欢签到"] : ["初入仙途", "新人狂欢"];
	if (input.taskInput === void 0) return `/${allowed[0]}`;
	const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
	if (!allowed.includes(command)) throw new ExposeError("INVALID_INPUT", "新人活动任务指令不匹配");
	return `/${command}`;
}
const newcomerActions = {
	get_newcomer_activity: observation("查询初入仙途活动的服务端周期、签到及每日任务。taskConfigId 仅从服务端明确给出的新人任务领奖命令提取；未开放或缺失时不构造编号。过期及查询失败保留服务端拒绝。", "newcomer-activity.overview", object({}), view, () => "/初入仙途", (data) => {
		const result = parseBackendNewcomerLoginView(data);
		return {
			...result,
			detailDays: result.detailDays.map((day) => ({
				...day,
				tasks: day.tasks.map((task) => ({
					...task,
					milestones: task.milestones.map((milestone) => {
						const match = milestone.command?.match(/^\/新人任务领取 ([1-9]\d*)$/);
						const id = match ? Number(match[1]) : void 0;
						return {
							...milestone,
							...id !== void 0 && Number.isSafeInteger(id) ? { taskConfigId: id } : {}
						};
					})
				}))
			}))
		};
	}),
	execute_task_newcomer_activity: mutation("查询初入仙途活动的服务端周期、签到及每日任务。taskConfigId 仅从服务端明确给出的新人任务领奖命令提取；未开放或缺失时不构造编号。过期及查询失败保留服务端拒绝。", "newcomer-activity.overview", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), view, (input) => newcomerCommand(input, false), (data) => {
		const result = parseBackendNewcomerLoginView(data);
		return {
			...result,
			detailDays: result.detailDays.map((day) => ({
				...day,
				tasks: day.tasks.map((task) => ({
					...task,
					milestones: task.milestones.map((milestone) => {
						const match = milestone.command?.match(/^\/新人任务领取 ([1-9]\d*)$/);
						const id = match ? Number(match[1]) : void 0;
						return {
							...milestone,
							...id !== void 0 && Number.isSafeInteger(id) ? { taskConfigId: id } : {}
						};
					})
				}))
			}))
		};
	}, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_newcomer_login: mutation("领取初入仙途可领的当日登录奖励；code=OK 才表示发奖，ALL_CLAIMED 和 NO_CLAIMABLE 不表示本次领取成功。", "checkin.newcomer-login", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		code: {
			type: "string",
			enum: [
				"OK",
				"ALL_CLAIMED",
				"NO_CLAIMABLE"
			]
		},
		data: object({
			claimDay: integer,
			spiritCrystal: integer,
			grantedItems: list(text)
		})
	}, ["data"]), (input) => newcomerCommand(input, true), parseRobotNewcomerLogin, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_newcomer_task: mutation("领取初入仙途活动面板中指定 taskConfigId 的任务里程碑；服务端校验周期、任务状态和进度，返回实际灵晶及 VIP 经验，允许零奖励。", "newcomer-activity.claim-task", object({
		taskConfigId: taskId,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		spiritCrystal: integer,
		vipExpYuan: integer
	}), (input) => `/新人任务领取 ${input.taskConfigId}`, parseRobotNewcomerTaskReward, (input) => ({ taskConfigId: input.taskConfigId }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { newcomerActions };
import { boolean, fields, integer, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parseRobotGuildLeaderLeave, parseRobotGuildLeave } from "../api/bot/guild-leave-robot-query.js";
import { parseGuildLeaveCancel } from "../api/bot/guild-leave-confirmation-cancel.js";
import { parseRobotGuildImpeach } from "../api/bot/guild-leadership-end-robot-query.js";

//#region src/expose/guild-leave-actions.ts
const empty = object({});
const membership = object({
	...fields(text, "outcome message guildName targetName roleName"),
	...fields(integer, "guildId targetUserId cooldownHours"),
	confirmationRequired: boolean
}, [
	"targetUserId",
	"targetName",
	"roleName",
	"cooldownHours"
]);
function leave(data) {
	const result = parseRobotGuildLeave(data);
	const cooldown = data.cooldownHours;
	if (cooldown !== void 0 && (!Number.isSafeInteger(cooldown) || Number(cooldown) < 0)) throw new Error("退出宗门冷却信息无效");
	return result;
}
const guildLeaveActions = {
	impeach_guild_leader: mutation("对当前宗主发起弹劾，可能累计次数或直接更换宗主；应由玩家明确请求。失败时服务端仍可能清理旧计数，结果以回执及后续状态为准。", "guild.impeach", empty, object({
		...fields(text, "outcome message leaderName successorName successorRoleName"),
		...fields(integer, "guildId impeachCount requiredImpeachCount successorUserId")
	}, [
		"successorName",
		"successorRoleName",
		"successorUserId"
	]), () => "/弹劾宗主", (data) => {
		const result = parseRobotGuildImpeach(data);
		const receipt = data.receipt;
		if (![
			"guildId",
			"impeachCount",
			"requiredImpeachCount"
		].every((key) => Number.isSafeInteger(receipt[key])) || typeof receipt.leaderName !== "string") throw new Error("宗门弹劾回执不完整");
		if (receipt.successorUserId !== void 0 && (!Number.isSafeInteger(receipt.successorUserId) || Number(receipt.successorUserId) < 1)) throw new Error("宗门继任者回执不完整");
		for (const key of ["successorName", "successorRoleName"]) if (receipt[key] !== void 0 && typeof receipt[key] !== "string") throw new Error("宗门继任者回执不完整");
		return {
			...receipt,
			...result
		};
	}),
	request_or_confirm_guild_leave: mutation("请求或确认退出宗门：若已有有效待确认请求，本次会直接退出；否则创建 60 秒确认。确认必须来自用户新的明确请求，服务端按当前待确认状态执行。", "guild.leave", empty, membership, () => "/退出宗门", leave),
	cancel_guild_leave: mutation("取消本人待确认的退出宗门请求；deleted 表示是否实际删除了待确认状态。", "guild.leave-cancel", empty, object({ deleted: boolean }), () => "/取消退出宗门", parseGuildLeaveCancel),
	take_guild_leader_leave: mutation("宗主申请请假，服务端校验宗主身份与当前请假状态，返回实际结果。", "guild.leader-leave", empty, object({
		message: text,
		receipt: membership
	}), () => "/宗主请假", parseRobotGuildLeaderLeave)
};

//#endregion
export { guildLeaveActions };
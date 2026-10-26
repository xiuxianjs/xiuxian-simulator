import { parseGuildApply, parseGuildCreate } from "./guild-membership-mutations.js";

//#region src/api/bot/guild-membership-robot-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门申请响应不完整");
	return value;
}
function parseRobotGuildCreate(value) {
	const row = record(value);
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result") throw new Error("创建宗门响应不完整");
	return {
		outcome: "result",
		data: { message: `宗门【${parseGuildCreate(row.receipt).name}】创建成功，您已成为宗主` }
	};
}
function parseRobotGuildApply(value) {
	const row = record(value);
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result") throw new Error("入宗申请响应不完整");
	const data = parseGuildApply(row.receipt);
	return {
		outcome: "result",
		data: {
			...data,
			message: `已向【${data.guildName}】提交加入申请，请等待审核`
		}
	};
}

//#endregion
export { parseRobotGuildApply, parseRobotGuildCreate };
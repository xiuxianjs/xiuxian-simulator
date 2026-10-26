import { parseBackendCaveCommand, parseBackendCavePlantQuery } from "./cave-command.js";
import { parseBackendCaveAccelerationPreview } from "./cave-plot-actions.js";

//#region src/api/bot/cave-robot-command.ts
function caveCultivateArguments(text) {
	if (/^(?:[!！/#＃])?(?:开垦所有|一键开垦)\s*$/.test(text)) return {
		plotIndex: null,
		all: true
	};
	const match = text.match(/开垦(?:\s+(\d+))?$/);
	const index = match?.[1] ? Number(match[1]) : void 0;
	return { plotIndex: index !== void 0 ? String(index) : null };
}
function cavePlantArguments(text) {
	const match = text.trim().match(/播种(?:\s+(\d+))?(?:\s+(.+))?$/);
	const index = match?.[1] ? Number(match[1]) : void 0;
	const seedName = match?.[2]?.trim() ?? "";
	return {
		plotIndex: index !== void 0 ? String(index) : null,
		seedName: seedName.length > 0 ? seedName : null
	};
}
function parseRobotCavePlant(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("播种响应不完整");
	const data = value;
	if (data.mode === "select") return {
		mode: "select",
		...parseBackendCavePlantQuery(data.query)
	};
	if (data.mode === "plant") return {
		mode: "plant",
		result: parseBackendCaveCommand(data.result)
	};
	throw new Error("播种响应分支无效");
}
function caveActionCommand(messageText) {
	if (/^[!！/#＃]?一键(?:灵田)?(?:加速|催熟)$/.test(messageText.trim())) return {
		operation: "cave.accelerate",
		title: messageText.includes("催熟") ? "一键灵田催熟" : "一键灵田加速",
		args: {
			mode: "all",
			plotIndex: null,
			accelerator: messageText.includes("催熟") ? "ripen" : "spiritStone",
			count: "1"
		}
	};
	const text = messageText.trim().replace(/^([!！/#＃]?)一键(浇灌|除虫|除草|收割)(?=\s|$)/, "$1$2");
	for (const [word, operation, title] of [
		[
			"浇灌",
			"cave.water",
			"浇灌灵田"
		],
		[
			"除虫",
			"cave.worm",
			"除虫"
		],
		[
			"除草",
			"cave.weed",
			"除草"
		],
		[
			"收割",
			"cave.harvest",
			"收割灵植"
		],
		[
			"升级灵田",
			"cave.upgrade",
			"升级灵田"
		]
	]) if (new RegExp("^([!！/#＃]?" + word + ")").test(text)) {
		const value = text.match(new RegExp(word + "(?:\\s+(\\d+))?$"))?.[1];
		return {
			operation,
			title,
			args: { plotIndex: value ? String(Number(value)) : null }
		};
	}
	const [, indexText, itemName, countText] = text.match(/灵田加速\s+(\d+)(?:\s+(灵肥|小绿瓶|灵石|催熟))?(?:\s+(\d+))?$/) ?? [];
	const index = indexText ? Number(indexText) : void 0;
	return {
		operation: "cave.accelerate",
		title: "灵田加速",
		args: {
			mode: !index ? "usage" : itemName ? "execute" : "preview",
			plotIndex: index !== void 0 ? String(index) : null,
			accelerator: itemName ? itemName === "灵石" ? "spiritStone" : itemName === "催熟" ? "ripen" : itemName === "灵肥" ? "lingfei" : "greenBottle" : null,
			count: countText ? String(Number(countText)) : null
		}
	};
}
function parseRobotCaveAction(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("灵田操作响应不完整");
	const data = value;
	if (data.mode === "command") return {
		mode: "command",
		result: parseBackendCaveCommand(data.result)
	};
	if (data.mode === "preview") return {
		mode: "preview",
		preview: parseBackendCaveAccelerationPreview(data.preview)
	};
	throw new Error("灵田操作响应分支无效");
}
async function caveSocialCommand(messageText, mention) {
	const text = messageText.trim();
	const steal = /^(!|！|\/|#|＃)?偷药/.test(text);
	const operation = steal ? "cave.steal" : "cave.collaborate";
	const match = steal ? text.match(/^(!|！|\/|#|＃)?偷药\s+(.+?)(?:\s+(\d+))?$/u) : text.match(/^(!|！|\/|#|＃)?协作灵田\s+(.+?)\s+(浇灌|除虫|除草|收割)(?:\s+(\d+))?$/u);
	const args = {
		mode: "usage",
		ownerUid: null,
		ownerBid: null,
		plotIndex: null,
		careAction: null
	};
	if (!match) return {
		operation,
		args
	};
	const targetUid = /^\d+$/.test(match[2]) ? Number(match[2]) : void 0;
	let ownerBid;
	if (targetUid === void 0) {
		const user = await mention?.findOne();
		ownerBid = user?.count && user.data?.UserId ? user.data.UserId : void 0;
	}
	if ((!targetUid || targetUid <= 0) && !ownerBid) return {
		operation,
		args
	};
	const index = match[steal ? 3 : 4];
	const actionMap = {
		浇灌: "water",
		除虫: "worm",
		除草: "weed",
		收割: "harvest"
	};
	return {
		operation,
		args: {
			...args,
			mode: "command",
			ownerUid: targetUid !== void 0 ? String(targetUid) : null,
			ownerBid: ownerBid ?? null,
			plotIndex: index ? String(Number(index)) : null,
			careAction: steal ? null : actionMap[match[3]]
		}
	};
}

//#endregion
export { caveActionCommand, caveCultivateArguments, cavePlantArguments, caveSocialCommand, parseRobotCaveAction, parseRobotCavePlant };
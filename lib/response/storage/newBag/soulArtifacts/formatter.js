import { section } from "../../../presentation/sections.js";

//#region src/response/storage/newBag/soulArtifacts/formatter.ts
/** 按服务端投影排版本命物背包条目。 */
function formatSoulArtifactItem(item, md) {
	const lockMark = item.isLocked === 1 ? " 🔒" : item.isLocked === 2 ? " 📦" : "";
	const upgradedTag = item.hasUpgraded ? " · 已升品" : "";
	const baseInfo = `品级：${item.gradeName} · 等级：Lv.${item.level} · 洗涤：${item.washCount}次${upgradedTag}`;
	const actions = [];
	if (item.canRefine) actions.push({
		label: "炼化",
		command: `/炼化 ${item.userSoulArtifactId}`
	});
	if (item.lockAction === "unlock") actions.push({
		label: "解锁",
		command: `/解锁 本命 ${item.userSoulArtifactId}`
	});
	else if (item.lockAction === "lock") actions.push({
		label: "锁定",
		command: `/锁定 本命 ${item.userSoulArtifactId}`
	});
	actions.push({
		label: "详情",
		command: `/本命物详情 ${item.userSoulArtifactId}`
	});
	md.addBlockquote(section({
		title: item.name,
		id: item.userSoulArtifactId,
		suffix: lockMark.trim(),
		lines: [baseInfo],
		actions
	}));
}

//#endregion
export { formatSoulArtifactItem };
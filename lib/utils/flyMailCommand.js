//#region src/utils/flyMailCommand.ts
const parseFlyMailHomeCommand = (messageText) => {
	const text = String(messageText ?? "").trim();
	const conversation = text.match(/^[!！/#＃]?飞信\s+会话\s+(\d+)(?:\s+(\d+))?$/);
	if (conversation) {
		const conversationId = Number(conversation[1]);
		const page = Number(conversation[2] ?? 1);
		return Number.isSafeInteger(conversationId) && conversationId > 0 && Number.isSafeInteger(page) && page > 0 ? {
			scope: "friend",
			conversationId,
			page
		} : null;
	}
	const match = text.match(/^[!！/#＃]?飞信(?:\s+(师门|宗门|道侣|队伍))?(?:\s+(\d+))?$/);
	if (!match) return null;
	const scopeText = match[1] ?? "";
	const page = match[2] ? Number(match[2]) : 1;
	return {
		scope: scopeText === "师门" ? "master" : scopeText === "宗门" ? "guild" : scopeText === "道侣" ? "companion" : scopeText === "队伍" ? "team" : "friend",
		page: Number.isFinite(page) && page > 0 ? page : 1
	};
};
const parseSendCommand = (messageText) => {
	const text = String(messageText ?? "").trim();
	const directMatch = text.match(/^[!！/#＃]?发飞信(?:\s+(\S+)(?:\s+([\s\S]+))?)?$/);
	if (directMatch) return {
		scope: "friend",
		targetArg: directMatch[1]?.trim(),
		content: directMatch[2]?.trim(),
		usageText: "用法：/发飞信 <好友UID|@目标> <内容>"
	};
	const masterMatch = text.match(/^[!！/#＃]?发师门飞信(?:\s+([\s\S]+))?$/);
	if (masterMatch) return {
		scope: "master",
		content: masterMatch[1]?.trim(),
		usageText: "用法：/发师门飞信 <内容>"
	};
	const guildMatch = text.match(/^[!！/#＃]?发宗门飞信(?:\s+([\s\S]+))?$/);
	if (guildMatch) return {
		scope: "guild",
		content: guildMatch[1]?.trim(),
		usageText: "用法：/发宗门飞信 <内容>"
	};
	const teamMatch = text.match(/^[!！/#＃]?发队伍飞信(?:\s+([\s\S]+))?$/);
	if (teamMatch) return {
		scope: "team",
		content: teamMatch[1]?.trim(),
		usageText: "用法：/发队伍飞信 <内容>"
	};
	const companionMatch = text.match(/^[!！/#＃]?发道侣飞信(?:\s+([\s\S]+))?$/);
	if (companionMatch) return {
		scope: "companion",
		content: companionMatch[1]?.trim(),
		usageText: "用法：/发道侣飞信 <内容>"
	};
	return null;
};
const parseFlyMailSendCommand = (messageText) => {
	const parsed = parseSendCommand(messageText);
	if (!parsed) return null;
	const match = parsed.content?.match(/^\[会话:(\d+)\](?:\s+([\s\S]*))?$/);
	if (!match) return {
		...parsed,
		originConversationId: void 0
	};
	const id = Number(match[1]);
	return {
		...parsed,
		content: match[2]?.trim(),
		originConversationId: Number.isSafeInteger(id) && id > 0 ? id : 0
	};
};
const parseFlyMailMuteCommand = (messageText) => {
	const text = String(messageText ?? "").trim();
	const muteMatch = text.match(/^[!！/#＃]?飞信禁言(?:\s+(\S+))?$/);
	if (muteMatch) return {
		action: "mute",
		targetArg: muteMatch[1]?.trim(),
		usageText: "用法：/飞信禁言 <UID|@目标>"
	};
	const unmuteMatch = text.match(/^[!！/#＃]?飞信解除(?:\s+(\S+))?$/);
	if (unmuteMatch) return {
		action: "unmute",
		targetArg: unmuteMatch[1]?.trim(),
		usageText: "用法：/飞信解除 <UID|@目标>"
	};
	return null;
};
function formatFlyMailMuteResult(result, action) {
	let message = "";
	if (result.outcome === "updated") message = action === "mute" ? `已屏蔽${result.targetName}的飞信。` : `已解除对${result.targetName}的飞信屏蔽。`;
	else if (result.outcome === "self") message = "不能对自己进行操作";
	else if (result.outcome === "not_found") message = "该用户不存在";
	return {
		...result,
		message
	};
}

//#endregion
export { formatFlyMailMuteResult, parseFlyMailHomeCommand, parseFlyMailMuteCommand, parseFlyMailSendCommand };
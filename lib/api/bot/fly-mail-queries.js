import { parseGameTime } from "../../utils/gameTime.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/fly-mail-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("飞信接口数据不完整");
	return value;
}
function integer(value, minimum = Number.MIN_SAFE_INTEGER) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error("飞信接口数据不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("飞信接口数据不完整");
	return value;
}
async function getBackendFlyMailHome(bid, uid, scope, page) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	return parseBackendFlyMailHome(await requestBackend(bid, "get_players_id_flymail", {
		path: { id: uid },
		query: {
			scope,
			page
		}
	}), scope);
}
function parseBackendFlyMailHome(data, scope) {
	const value = record(data);
	const access = record(value.access);
	if (value.scope !== scope || typeof access.allowed !== "boolean" || !Array.isArray(value.list) || !Array.isArray(value.muteList)) throw new Error("飞信接口数据不完整");
	return {
		scope,
		page: integer(value.page, 1),
		total: integer(value.total, 0),
		totalPage: integer(value.totalPage, 1),
		access: {
			allowed: access.allowed,
			realmName: text(access.realmName),
			realmLevel: integer(access.realmLevel)
		},
		muteList: value.muteList.map((value) => {
			const item = record(value);
			return {
				uid: integer(item.uid),
				name: text(item.name)
			};
		}),
		list: value.list.map((value) => {
			const item = record(value);
			if (item.kind !== "message" || item.scope !== scope) throw new Error("飞信接口数据不完整");
			const createdAt = parseGameTime(text(item.createdAt));
			if (!createdAt) throw new Error("飞信接口数据不完整");
			return {
				kind: "message",
				id: integer(item.id, 0),
				scope,
				senderUid: integer(item.senderUid, 0),
				senderName: text(item.senderName),
				content: text(item.content),
				createdAt: createdAt.toDate(),
				conversationId: integer(item.conversationId, 0),
				title: text(item.title)
			};
		})
	};
}
function parseRobotFlyMailHome(data, scope) {
	const out = parseBackendFlyMailHome(data, scope);
	if (!out.access.allowed) throw new Error("飞信接口数据不完整");
	return out;
}
function parseRobotFriendInbox(data, conversationId) {
	const value = record(data);
	const out = parseRobotFlyMailHome(data, "friend");
	const view = conversationId ? "messages" : "conversations";
	if (value.view !== view || !Array.isArray(value.conversations)) throw new Error("飞信会话数据不完整");
	const conversations = value.conversations.map((raw) => {
		const item = record(raw);
		const createdAt = parseGameTime(text(item.lastMessageAt));
		if (!createdAt) throw new Error("飞信会话数据不完整");
		return {
			id: integer(item.id, 1),
			targetUid: integer(item.targetUid, 1),
			targetName: text(item.targetName),
			preview: text(item.preview),
			lastMessageAt: createdAt.toDate()
		};
	});
	let conversation = null;
	if (view === "messages") {
		const item = record(value.conversation);
		conversation = {
			id: integer(item.id, 1),
			targetUid: integer(item.targetUid, 1),
			targetName: text(item.targetName)
		};
		if (conversation.id !== conversationId || out.list.some((item) => item.conversationId !== conversationId) || conversations.length) throw new Error("飞信会话数据不完整");
	} else if (out.list.length || value.conversation !== null) throw new Error("飞信会话数据不完整");
	return {
		...out,
		view,
		conversations,
		conversation
	};
}

//#endregion
export { getBackendFlyMailHome, parseBackendFlyMailHome, parseRobotFlyMailHome, parseRobotFriendInbox };
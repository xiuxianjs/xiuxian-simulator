import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseBackendBlocklist, parseBackendFriendRequests, parseBackendFriends } from "../api/bot/queries.js";
import { parseBackendFriendSettings } from "../api/bot/friend-settings.js";
import { parseBackendRandomFriend } from "../api/bot/random-friend-queries.js";
import { parseBackendFriendWorkflow } from "../api/bot/social-workflows.js";
import { parseBackendFriendMutation } from "../api/bot/friend-request-actions.js";
import { parseBackendFriendReject } from "../api/bot/friend-request-reject.js";
import { parseBackendBlockUser } from "../api/bot/block-user-by-name.js";
import { parseBackendUnblock } from "../api/bot/blocklist-removal.js";
import { parseGuardedSocialQuery } from "../api/bot/social-robot-query.js";
import { parseRobotFlyMailHome, parseRobotFriendInbox } from "../api/bot/fly-mail-queries.js";
import { parseRobotFlyMailSend } from "../api/bot/flymail-send.js";
import { parseRobotFlyMailMute } from "../api/bot/flymail-mute.js";
import { ExposeError } from "alemonjs";

//#region src/expose/friend-actions.ts
const access = object({
	ok: boolean,
	realmName: text,
	canUseSpar: boolean
});
const flyMailScope = {
	type: "string",
	enum: [
		"friend",
		"master",
		"guild",
		"companion",
		"team"
	]
};
const flyMailTarget = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const flyMailReceipt = object({
	message: text,
	targetUid: integer,
	conversationId: integer
}, ["targetUid", "conversationId"]);
const friendRemoval = object({
	outcome: text,
	realmName: text,
	targetId: text,
	target: object({
		id: integer,
		name: text
	}, ["name"]),
	removal: object({
		outcome: text,
		realmName: text
	}, ["realmName"])
}, [
	"realmName",
	"target",
	"removal"
]);
function parseFriendRemoval(data, input) {
	const result = parseBackendFriendWorkflow(data, "remove");
	if ((result.outcome === "confirmation_required" || result.outcome === "result") && (result.targetId !== String(input.targetUid) || result.target?.id !== input.targetUid)) throw new Error("删除好友目标与请求不匹配");
	return result;
}
function validateFlyMail(input) {
	if (input.scope === "friend" !== (input.targetUid !== void 0)) throw new ExposeError("INVALID_INPUT", "好友飞信需要目标 UID，其他范围不接受目标 UID");
}
function privateFlyMail(event) {
	if (event.name !== "private.message.create" || event.isPrivate === false || event.IsPrivate === false) throw new ExposeError("FORBIDDEN", "飞信仅限私聊");
}
function flyMailArguments(input, event) {
	privateFlyMail(event);
	return {
		scope: input.scope,
		content: input.content,
		target: input.targetUid === void 0 ? null : { uid: input.targetUid },
		...input.originConversationId === void 0 ? {} : { originConversationId: input.originConversationId }
	};
}
function flyMailCommand(input) {
	return `${input.scope === "friend" ? `/发飞信 ${input.targetUid}` : `/发${{
		master: "师门",
		guild: "宗门",
		companion: "道侣",
		team: "队伍"
	}[input.scope]}飞信`} ${input.originConversationId ? `[会话:${input.originConversationId}] ` : ""}${input.content}`;
}
const friendActions = {
	preview_remove_friend: observation("预览删除好友，返回服务端确认状态与目标；此步骤不删除好友。", "friends.remove", object({ targetUid: flyMailTarget }), friendRemoval, (input) => `/删除好友 ${input.targetUid}`, parseFriendRemoval, (input) => ({
		targetUid: String(input.targetUid),
		confirmed: false
	})),
	confirm_remove_friend: mutation("确认删除指定好友；仅在玩家明确要求删除后调用，实际结果以 removal.outcome 为准。", "friends.remove", object({ targetUid: flyMailTarget }), friendRemoval, (input) => `/删除好友 ${input.targetUid} 确认`, parseFriendRemoval, (input) => ({
		targetUid: String(input.targetUid),
		confirmed: true
	})),
	send_flymail: mutation("发送飞信给指定好友或当前师门、宗门、道侣、队伍；仅私聊使用。正文由用户明确提供，服务端校验关系、内容及发送资格。", "flymail.send", object({
		scope: flyMailScope,
		targetUid: flyMailTarget,
		content: {
			type: "string",
			minLength: 1
		}
	}, ["targetUid"]), flyMailReceipt, flyMailCommand, parseRobotFlyMailSend, flyMailArguments, validateFlyMail),
	reply_flymail: mutation("回复原飞信会话；originConversationId 使用收到的原会话编号，服务端校验会话和当前关系。仅私聊使用。", "flymail.reply", object({
		scope: flyMailScope,
		targetUid: flyMailTarget,
		content: {
			type: "string",
			minLength: 1
		},
		originConversationId: flyMailTarget
	}, ["targetUid"]), flyMailReceipt, flyMailCommand, parseRobotFlyMailSend, flyMailArguments, validateFlyMail),
	mute_flymail: mutation("私聊中屏蔽指定玩家的飞信；目标 UID 来自玩家或飞信列表，服务端校验资格。", "flymail.mute", object({ targetUid: flyMailTarget }), object({
		outcome: text,
		targetName: text,
		realmName: text
	}, ["targetName", "realmName"]), (input) => `/飞信禁言 ${input.targetUid}`, parseRobotFlyMailMute, (input, event) => {
		privateFlyMail(event);
		return {
			targetUid: String(input.targetUid),
			targetBid: null
		};
	}),
	unmute_flymail: mutation("私聊中解除指定玩家的飞信屏蔽。", "flymail.unmute", object({ targetUid: flyMailTarget }), object({
		outcome: text,
		targetName: text,
		realmName: text
	}, ["targetName", "realmName"]), (input) => `/飞信解除 ${input.targetUid}`, parseRobotFlyMailMute, (input, event) => {
		privateFlyMail(event);
		return {
			targetUid: String(input.targetUid),
			targetBid: null
		};
	}),
	get_flymail: observation("仅在私聊中查询本人飞信；好友默认列出会话，指定 conversationId 查看该会话消息。其他范围直接返回消息，访问权限由服务端校验。", "flymail.home", object({
		scope: {
			type: "string",
			enum: [
				"friend",
				"master",
				"guild",
				"companion",
				"team"
			]
		},
		page,
		conversationId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		}
	}, ["page", "conversationId"]), object({
		scope: text,
		page: integer,
		total: integer,
		totalPage: integer,
		access: object({
			allowed: boolean,
			realmName: text,
			realmLevel: integer
		}),
		muteList: list(object({
			uid: integer,
			name: text
		})),
		list: list(object({
			kind: text,
			id: integer,
			scope: text,
			senderUid: integer,
			senderName: text,
			content: text,
			createdAt: text,
			conversationId: integer,
			title: text
		})),
		view: text,
		conversations: list(object({
			id: integer,
			targetUid: integer,
			targetName: text,
			preview: text,
			lastMessageAt: text
		})),
		conversation: object({
			id: integer,
			targetUid: integer,
			targetName: text
		})
	}, [
		"view",
		"conversations",
		"conversation"
	]), (input) => input.scope === "friend" ? input.conversationId ? `/飞信 会话 ${input.conversationId} ${input.page ?? 1}` : `/飞信 ${input.page ?? 1}` : `/飞信 ${{
		master: "师门",
		guild: "宗门",
		companion: "道侣",
		team: "队伍"
	}[input.scope]} ${input.page ?? 1}`, (data, input) => {
		if (input.scope === "friend") {
			const result = parseRobotFriendInbox(data, input.conversationId);
			return {
				...result,
				list: result.list.map((item) => ({
					...item,
					createdAt: item.createdAt.toISOString()
				})),
				conversations: result.conversations.map((item) => ({
					...item,
					lastMessageAt: item.lastMessageAt.toISOString()
				}))
			};
		}
		const result = parseRobotFlyMailHome(data, input.scope);
		return {
			...result,
			list: result.list.map((item) => ({
				...item,
				createdAt: item.createdAt.toISOString()
			}))
		};
	}, (input, event) => {
		if (event.name !== "private.message.create" || event.isPrivate === false || event.IsPrivate === false) throw new ExposeError("FORBIDDEN", "飞信仅限私聊");
		return {
			scope: input.scope,
			page: String(input.page ?? 1),
			...input.scope === "friend" ? {
				view: input.conversationId ? "messages" : "conversations",
				...input.conversationId ? { conversationId: String(input.conversationId) } : {}
			} : {}
		};
	}, (input) => {
		if (input.scope !== "friend" && input.conversationId !== void 0) throw new ExposeError("INVALID_INPUT", "会话编号仅适用于好友飞信");
	}),
	get_friend_blocklist: observation("查询本人黑名单记录；取消拉黑使用此列表的记录 ID。服务端保留准入检查和实际读取结果。", "friends.blocklist", object({}), object({
		access,
		data: list(object({
			id: integer,
			blockedUserName: text,
			createdAt: text
		}))
	}, ["data"]), () => "/黑名单", (data) => {
		const result = parseGuardedSocialQuery(data, parseBackendBlocklist);
		return {
			...result,
			data: result.data?.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString()
			}))
		};
	}),
	block_friend_by_name: mutation("按精确道号拉黑目标，阻止其发送好友申请；服务端还会尝试移除现有好友关系，该后续移除可能失败。", "friends.block", object({ targetName: {
		type: "string",
		minLength: 1,
		maxLength: 100
	} }), object({
		access,
		data: object({
			outcome: text,
			name: text,
			realmName: text
		}, ["name", "realmName"])
	}, ["data"]), (input) => `/拉黑 ${input.targetName}`, (data) => parseGuardedSocialQuery(data, parseBackendBlockUser)),
	unblock_friend: mutation("按本人黑名单中的记录 ID 取消拉黑；服务端校验记录归属。取消拉黑不会自动恢复好友关系。", "friends.unblock", object({ recordId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		access,
		data: object({
			outcome: text,
			blockedUserId: integer,
			name: text,
			realmName: text
		}, [
			"blockedUserId",
			"name",
			"realmName"
		])
	}, ["data"]), (input) => `/取消拉黑 ${input.recordId}`, (data) => parseGuardedSocialQuery(data, parseBackendUnblock), (input) => ({ recordId: String(input.recordId) })),
	find_random_friend: observation("查询服务端推荐的一位道友；player 缺失表示没有推荐目标，access.ok=false 表示资格未解锁。", "friends.random", object({}), object({
		access: object({
			ok: boolean,
			realmName: text
		}, ["realmName"]),
		player: object({
			uid: integer,
			name: text,
			realmName: text,
			activeTitle: text
		}, ["realmName", "activeTitle"])
	}, ["player"]), () => "/随机好友", parseBackendRandomFriend),
	get_friend_request_settings: observation("查询本人是否接受好友申请及功能资格。", "friends.settings", object({}), object({
		canUseFifthLayerFeature: boolean,
		realmName: text,
		isEnabled: boolean
	}, ["realmName"]), () => "/好友设置", parseBackendFriendSettings),
	set_friend_requests_enabled: mutation("开启或关闭本人接收好友申请；资格未解锁时以服务端状态为准，不报告设置成功。", "friends.settings-update", object({ enabled: boolean }), object({
		canUseFifthLayerFeature: boolean,
		realmName: text,
		isEnabled: boolean
	}, ["realmName"]), (input) => `/好友设置 ${input.enabled ? "开启" : "关闭"}`, (data, input) => {
		const result = parseBackendFriendSettings(data);
		if (result.canUseFifthLayerFeature && result.isEnabled !== input.enabled) throw new Error("好友申请设置回执不匹配");
		return result;
	}),
	request_friend: mutation("向指定目标玩家发起好友申请；targetUid 是目标而非调用者，服务端校验资格、关系和申请设置。", "friends.request", object({ targetUid: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		outcome: text,
		realmName: text,
		targetId: text,
		target: object({
			id: integer,
			name: text
		}, ["name"]),
		request: object({
			success: boolean,
			requestId: integer,
			...fields(text, "targetName fromUserName message")
		})
	}, [
		"realmName",
		"target",
		"request"
	]), (input) => `/结交好友 ${input.targetUid}`, (data) => parseBackendFriendWorkflow(data, "request"), (input) => ({ targetUid: String(input.targetUid) })),
	accept_friend_request: mutation("接受本人收到的指定好友申请；服务端校验申请归属和有效状态。", "friends.accept", object({ requestId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		access,
		data: object({
			success: boolean,
			requestId: integer,
			...fields(text, "targetName fromUserName message")
		})
	}, ["data"]), (input) => `/同意结交 ${input.requestId}`, (data, input) => parseGuardedSocialQuery(data, (value) => {
		const result = parseBackendFriendMutation(value);
		if (result.requestId !== input.requestId || !result.success) throw new Error("好友申请接受回执不匹配");
		return result;
	}), (input) => ({ requestId: String(input.requestId) })),
	reject_friend_request: mutation("拒绝本人收到的指定好友申请；服务端校验申请归属和有效状态。", "friends.reject", object({ requestId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		access,
		data: object({
			outcome: text,
			listed: boolean,
			fromUserName: text,
			realmName: text
		}, ["fromUserName", "realmName"])
	}, ["data"]), (input) => `/拒绝结交 ${input.requestId}`, (data) => parseGuardedSocialQuery(data, parseBackendFriendReject), (input) => ({ requestId: String(input.requestId) })),
	get_friends: observation("分页查询本人好友、关系及亲密度；好友编号可作为赠礼目标。未解锁时 access.ok=false，不将缺失列表当作空列表。", "friends.overview", object({ page }, ["page"]), object({
		access,
		data: object({
			...fields(integer, "total currentPage pageSize maxFriends myGender"),
			hasCompanion: boolean,
			list: list(object({
				...fields(integer, "friendId relationType intimacy gender"),
				...fields(text, "friendName relationText spiritBondLevel"),
				...fields(boolean, "canProposeCompanion hasCompanion")
			}, ["gender"]))
		})
	}, ["data"]), (input) => `/我的好友 ${input.page ?? 1}`, (data) => parseGuardedSocialQuery(data, parseBackendFriends), (input) => ({
		page: input.page ?? 1,
		pageSize: 5
	})),
	execute_task_friends: mutation("分页查询本人好友、关系及亲密度；好友编号可作为赠礼目标。未解锁时 access.ok=false，不将缺失列表当作空列表。", "friends.overview", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		access,
		data: object({
			...fields(integer, "total currentPage pageSize maxFriends myGender"),
			hasCompanion: boolean,
			list: list(object({
				...fields(integer, "friendId relationType intimacy gender"),
				...fields(text, "friendName relationText spiritBondLevel"),
				...fields(boolean, "canProposeCompanion hasCompanion")
			}, ["gender"]))
		})
	}, ["data"]), () => "/我的好友", (data) => parseGuardedSocialQuery(data, parseBackendFriends), () => ({
		page: 1,
		pageSize: 5
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_friend_requests: observation("查询本人收到的待处理好友申请；未解锁时 access.ok=false。", "friends.requests", object({}), object({
		access,
		data: list(object({
			...fields(integer, "id fromUserId"),
			...fields(text, "fromUserName fromUserRealm message createdAt")
		}, ["message"]))
	}, ["data"]), () => "/好友申请", (data) => {
		const result = parseGuardedSocialQuery(data, parseBackendFriendRequests);
		return {
			...result,
			data: result.data?.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString()
			}))
		};
	})
};

//#endregion
export { friendActions };
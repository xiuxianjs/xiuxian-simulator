import { formatGameTime, parseGameTime } from "../../utils/gameTime.js";
import { number as number$1 } from "../schemas/ranking-values.js";
import { getEventAccessFacts } from "./access-facts.js";
import { requestBackend } from "./client.js";
import { parseRobberyRecord } from "./robbery-records.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/queries.ts
function identity(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return bid;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("查询接口返回格式不完整");
	return value;
}
function rows(value) {
	if (!Array.isArray(value)) throw new Error("查询接口缺少列表");
	return value.map(record);
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("查询接口缺少数值字段");
	return value;
}
function boolean(value, message = "查询接口缺少布尔字段") {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("查询接口缺少文本字段");
	return value;
}
function date(value) {
	const result = parseGameTime(text(value));
	if (!result) throw new Error("查询接口日期无效");
	return result.toDate();
}
async function getBackendBlocklist(bid, uid) {
	return parseBackendBlocklist(await requestBackend(identity(bid), "get_players_id_blocklist", { path: { id: uid } }));
}
function parseBackendBlocklist(data) {
	return rows(data).map((row) => ({
		id: number$1(row.id),
		blockedUserName: text(row.blockedUserName) || "未知用户",
		createdAt: date(row.createdAt)
	}));
}
async function getBackendFriendRequests(bid, uid) {
	return parseBackendFriendRequests(await requestBackend(identity(bid), "get_players_id_friend_requests", { path: { id: uid } }));
}
function parseBackendFriendRequests(data) {
	return rows(data).map((row) => {
		const id = number$1(row.id);
		const fromUserId = number$1(row.fromUserId);
		const fromUserName = text(row.fromUserName) || "未知用户";
		const realmId = number$1(row.fromUserRealmId);
		const realmName = text(row.fromUserRealmName);
		return {
			id,
			fromUserId,
			fromUserName,
			fromUserRealm: realmId ? realmName || "未知境界" : "无境界",
			message: row.message === void 0 || row.message === null ? null : text(row.message),
			createdAt: date(row.createdAt)
		};
	});
}
async function getBackendSocialAccess(bid, uid) {
	const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;
	if (cached) return cached;
	const data = record(await requestBackend(identity(bid), "get_players_id_social_access", { path: { id: uid } }));
	return {
		ok: boolean(data.canUseFifthLayerFeature, "查询接口缺少境界资格"),
		realmName: text(data.realmName) || "未知"
	};
}
async function getBackendToolCategories(bid) {
	const category = rows(record(await requestBackend(identity(bid), "get_encyclopedia_categories")).items).find((row) => row.category === "天工");
	if (!category || !Array.isArray(category.subCategories)) throw new Error("查询接口缺少天工分类");
	return category.subCategories.map(text);
}
async function getBackendEncyclopedia(bid, category, subCategory, page) {
	return parseBackendEncyclopedia(await requestBackend(identity(bid), "get_encyclopedia", { query: {
		category,
		subCategory: subCategory ?? void 0,
		page
	} }), category);
}
function parseBackendEncyclopedia(value, category) {
	const data = record(value);
	const pagination = record(data.page);
	return {
		code: "OK",
		data: {
			items: rows(data.items).map((row) => ({
				id: number$1(row.id),
				name: text(row.name),
				gradeName: text(row.gradeName)
			})),
			totalCount: number$1(pagination.totalCount),
			totalPages: number$1(pagination.totalPages),
			page: number$1(pagination.page),
			detailPrefix: category === "材料" ? "道具" : category === "本命" ? "本命物" : category
		}
	};
}
async function getBackendMemories(bid, uid) {
	return parseBackendMemories(await requestBackend(identity(bid), "get_players_id_memories", { path: { id: uid } }));
}
function parseBackendMemories(value) {
	const data = record(value);
	if (!Array.isArray(data.items)) throw new Error("回忆接口展示回执不完整");
	const canShowStoryButton = boolean(data.canShowStoryButton, "回忆接口展示回执不完整");
	const totalDays = number$1(data.totalDays, "回忆接口展示回执不完整");
	const items = data.items.map((value) => {
		const item = record(value);
		if (typeof item.label !== "string" || typeof item.text !== "string" || item.subtext !== void 0 && typeof item.subtext !== "string") throw new Error("回忆接口展示回执不完整");
		return {
			label: item.label,
			text: item.text,
			subtext: item.subtext
		};
	});
	return {
		name: text(data.name),
		totalDays,
		canShowStoryButton,
		items
	};
}
async function getBackendStory(bid, uid) {
	return parseBackendStory(await requestBackend(identity(bid), "get_players_id_story", { path: { id: uid } }));
}
function parseBackendStory(value) {
	const data = record(value);
	if (!Array.isArray(data.items)) throw new Error("故事接口展示回执不完整");
	const canShowMemoryButton = boolean(data.canShowMemoryButton, "故事接口展示回执不完整");
	const items = data.items.map((value) => {
		const item = record(value);
		if (typeof item.label !== "string" || typeof item.value !== "string" || typeof item.flavor !== "string") throw new Error("故事接口展示回执不完整");
		return {
			label: item.label,
			value: item.value,
			flavor: item.flavor
		};
	});
	return {
		name: text(data.name),
		items,
		canShowMemoryButton
	};
}
async function getBackendEmails(bid, uid, page, pageSize) {
	return parseBackendEmails(await requestBackend(identity(bid), "get_players_id_emails", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}));
}
function parseBackendEmails(value) {
	const data = record(value);
	return {
		total: number$1(data.total),
		list: rows(data.list).map(emailData),
		hasClaimable: boolean(data.hasClaimable),
		hasDeletable: boolean(data.hasDeletable)
	};
}
function emailData(row) {
	return {
		"email.id": number$1(row.id),
		"email.name": text(row.name),
		"email.subtitle": text(row.subtitle),
		"email.data": text(row.data),
		"email.goods": rows(row.goods).map((good) => ({
			itemId: good.itemId === null || good.itemId === void 0 ? 0 : number(good.itemId),
			name: good.name === null || good.name === void 0 ? "" : text(good.name),
			category: text(good.category),
			quantity: good.quantity === null || good.quantity === void 0 ? 1 : number(good.quantity)
		})),
		state: number$1(row.state),
		canClaim: boolean(row.canClaim),
		canDelete: boolean(row.canDelete)
	};
}
async function getBackendEncyclopediaDetail(bid, category, entryId) {
	return parseBackendEncyclopediaDetail(await requestBackend(identity(bid), "get_encyclopedia_category_entryId", { path: {
		category,
		entryId
	} }), category, entryId);
}
function parseBackendEncyclopediaDetail(raw, category, entryId) {
	const data = record(raw);
	const value = record(data.record);
	if (number$1(value.id) !== entryId || text(data.category) !== category) throw new Error("图鉴详情返回对象不一致");
	text(value.name);
	if (category === "本命" || category === "本命物") {
		text(value.mainAffixText);
		text(value.subAffixText);
	}
	const sources = record(data.sources);
	const lore = data.lore === null ? null : record(data.lore);
	const nullableText = (v) => v === null ? null : text(v);
	const nullableInteger = (v) => v === null ? null : number$1(v);
	const facts = {
		view: rows(data.view).map((block) => {
			const kind = text(block.kind);
			if (kind !== "text" && kind !== "newline" && kind !== "quote" && kind !== "source" || kind !== "newline" && typeof block.text !== "string" || block.text !== void 0 && typeof block.text !== "string") throw new Error("图鉴详情展示投影无效");
			if (block.command !== void 0 && typeof block.command !== "string") throw new Error("图鉴详情跳转信息无效");
			return {
				kind,
				text: block.text === void 0 ? void 0 : text(block.text),
				command: block.command
			};
		}),
		sources: {
			stages: rows(sources.stages).map((row) => {
				if (row.isElite !== null && typeof row.isElite !== "boolean") throw new Error("图鉴缺少关卡类型");
				return {
					probability: number$1(row.probability),
					chapterId: nullableInteger(row.chapterId),
					chapterName: nullableText(row.chapterName),
					stageLabel: nullableText(row.stageLabel),
					isElite: row.isElite
				};
			}),
			dungeons: rows(sources.dungeons).map((row) => ({
				probability: number$1(row.probability),
				dungeonName: nullableText(row.dungeonName)
			})),
			recipes: rows(sources.recipes).map((row) => ({
				id: number$1(row.id),
				name: text(row.name),
				pillItemId: number$1(row.pillItemId),
				inferiorPillItemId: nullableInteger(row.inferiorPillItemId)
			})),
			shops: rows(sources.shops).map((row) => ({
				shopCode: text(row.shopCode),
				priceAmount: number$1(row.priceAmount),
				priceCurrencyCode: text(row.priceCurrencyCode)
			})),
			guildShop: rows(sources.guildShop).map((row) => ({ priceContribution: number$1(row.priceContribution) })),
			materials: rows(sources.materials).map((row) => ({
				recipeId: number$1(row.recipeId),
				recipeName: text(row.recipeName)
			}))
		},
		lore: lore === null ? null : {
			gameplay: nullableText(lore.gameplay),
			lore: nullableText(lore.lore)
		},
		equipmentSet: data.equipmentSet === null ? null : { name: text(record(data.equipmentSet).name) },
		setEffects: rows(data.setEffects)
	};
	if (category === "功法") {
		if (!Object.hasOwn(value, "skill")) throw new Error("图鉴缺少技能关联");
	}
	if (category === "装备" && !Object.hasOwn(value, "equipmentType")) throw new Error("图鉴缺少装备类型");
	return {
		category: {
			道具: "item",
			材料: "item",
			装备: "equipment",
			天工: "professionTool",
			功法: "skillBook",
			本命: "soulArtifact",
			本命物: "soulArtifact"
		}[category],
		record: value,
		grade: data.grade === null ? null : record(data.grade),
		facts
	};
}
async function getBackendAchievements(bid, page, pageSize, uid) {
	return validateBackendAchievements(uid === void 0 ? await requestBackend(identity(bid), "get_achievements", { query: {
		page,
		pageSize
	} }) : await requestBackend(identity(bid), "get_players_id_achievements", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}), uid !== void 0);
}
function validateBackendAchievements(value, completed) {
	const data = record(value);
	const pagination = record(data.page);
	return {
		achievements: rows(data.items).map((row) => {
			if (completed && row.completedAt === void 0) throw new Error("成就完成时间缺失");
			return {
				id: number$1(row.id),
				name: row.name === null ? "未知成就" : text(row.name),
				description: row.description === null ? "暂无描述" : text(row.description),
				displayIndex: !completed ? number$1(row.displayIndex) : null,
				completedAt: row.completedAt === null || row.completedAt === void 0 ? null : date(row.completedAt).toISOString()
			};
		}),
		total: number$1(pagination.total),
		currentPage: number$1(pagination.currentPage),
		totalPages: number$1(pagination.totalPages)
	};
}
async function getBackendGiftRecords(bid, uid, mode, page, pageSize) {
	return parseBackendGiftRecords(await requestBackend(identity(bid), "get_players_id_companion_gifts", {
		path: { id: uid },
		query: {
			mode,
			page,
			pageSize
		}
	}));
}
function parseBackendGiftRecords(value) {
	const data = record(value);
	return {
		rows: rows(data.list).map((row) => ({
			id: number$1(row.id),
			senderUid: number$1(row.senderUid),
			receiverUid: number$1(row.receiverUid),
			giftName: text(row.giftName),
			quantity: number$1(row.quantity),
			intimacyGained: number$1(row.intimacyGained),
			tongxinGained: number$1(row.tongxinGained),
			premium: boolean(row.premium),
			relationText: text(row.relationText),
			created_at: date(row.createdAt),
			senderName: row.senderName === null ? `#${number$1(row.senderUid)}` : text(row.senderName),
			receiverName: row.receiverName === null ? `#${number$1(row.receiverUid)}` : text(row.receiverName)
		})),
		currentPage: number$1(data.page),
		totalPages: number$1(data.totalPages),
		total: number$1(data.total)
	};
}
async function getBackendFriends(bid, uid, page, pageSize) {
	return parseBackendFriends(await requestBackend(identity(bid), "get_players_id_friends", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}));
}
function parseBackendFriends(value) {
	const data = record(value);
	const hasCompanion = boolean(data.hasCompanion, "查询接口缺少道侣状态");
	return {
		total: number$1(data.total),
		currentPage: number$1(data.currentPage),
		pageSize: number$1(data.pageSize),
		maxFriends: number$1(data.maxFriends),
		myGender: number$1(data.myGender),
		hasCompanion,
		list: rows(data.list).map((row) => {
			const userExists = boolean(row.userExists, "查询接口缺少好友状态");
			const friendHasCompanion = boolean(row.hasCompanion, "查询接口缺少好友状态");
			if (typeof row.relationText !== "string" || typeof row.spiritBondLevel !== "string") throw new Error("查询接口缺少好友关系展示信息");
			const canProposeCompanion = boolean(row.canProposeCompanion, "查询接口缺少好友关系展示信息");
			const friendName = text(row.friendName);
			return {
				friendId: number$1(row.friendId),
				friendName: userExists ? friendName : "未知用户",
				relationType: number$1(row.relationType),
				relationText: row.relationText,
				intimacy: number$1(row.intimacy),
				spiritBondLevel: row.spiritBondLevel,
				canProposeCompanion,
				gender: row.gender === null ? null : number$1(row.gender),
				hasCompanion: friendHasCompanion
			};
		})
	};
}
async function getBackendFriendAccess(bid, uid) {
	const cached = bid ? getEventAccessFacts(getCurrentEvent(), bid, uid)?.social : void 0;
	if (cached) return [{
		ok: cached.canUseFifthLayerFeature,
		realmName: cached.realmName
	}, {
		ok: cached.canUseSpar,
		realmName: cached.realmName
	}];
	const data = record(await requestBackend(identity(bid), "get_players_id_social_access", { path: { id: uid } }));
	const canUseSpar = boolean(data.canUseSpar, "查询接口缺少好友资格");
	const canUseFifthLayerFeature = boolean(data.canUseFifthLayerFeature, "查询接口缺少好友资格");
	const realmName = text(data.realmName) || "未知";
	return [{
		ok: canUseFifthLayerFeature,
		realmName
	}, {
		ok: canUseSpar,
		realmName
	}];
}
async function getBackendGuilds(bid, page, pageSize) {
	return parseBackendGuilds(await requestBackend(identity(bid), "get_guilds", { query: {
		page,
		pageSize
	} }));
}
function parseBackendGuilds(value) {
	const data = record(value);
	return {
		guilds: rows(data.guilds).map((row) => {
			if (!Array.isArray(row.titles)) throw new Error("查询接口缺少宗门称号");
			const name = text(row.name);
			return {
				id: number$1(row.id),
				name,
				intro: row.intro === null ? `${name}，欢迎加入` : text(row.intro),
				memberCount: number$1(row.memberCount),
				levelId: number$1(row.levelId),
				levelName: row.level === null ? void 0 : `${number$1(row.level)}级`,
				minRealmName: row.minRealmName === null ? void 0 : text(row.minRealmName),
				titles: row.titles.map((value) => text(value).trim()).filter(Boolean)
			};
		}),
		total: number$1(data.total),
		currentPage: number$1(data.currentPage),
		totalPages: number$1(data.totalPages)
	};
}
async function getBackendGuildAccess(bid, uid) {
	const cached = bid ? getEventAccessFacts(getCurrentEvent(), bid, uid)?.social : void 0;
	if (cached) return {
		ok: cached.canCreateOrApplyGuild,
		realmName: cached.realmName
	};
	const data = record(await requestBackend(identity(bid), "get_players_id_social_access", { path: { id: uid } }));
	return {
		ok: boolean(data.canCreateOrApplyGuild, "查询接口缺少宗门资格"),
		realmName: text(data.realmName) || "未知"
	};
}
async function getBackendTeams(bid, page, pageSize) {
	return parseBackendTeams(record(await requestBackend(identity(bid), "get_teams", { query: {
		page,
		pageSize
	} })));
}
function parseBackendTeams(value) {
	const data = record(value);
	const teams = rows(data.items).map((row) => ({
		teamId: number$1(row.id),
		leaderName: row.leaderName === null ? "未知" : text(row.leaderName),
		memberCount: number$1(row.memberCount),
		maxMembers: number$1(row.maxMembers),
		minRealmName: row.minRealmName === null ? null : text(row.minRealmName)
	}));
	const total = number$1(data.total);
	const responsePageSize = number$1(data.pageSize);
	if (responsePageSize <= 0) throw new Error("队伍列表分页大小无效");
	return {
		teams,
		total,
		currentPage: number$1(data.page),
		totalPages: Math.ceil(total / responsePageSize)
	};
}
async function getBackendGuildLogs(bid, uid, page, pageSize) {
	return parseGuildLogs(await requestBackend(identity(bid), "get_players_id_guild_logs", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}));
}
function parseGuildLogs(value) {
	const data = record(value);
	return {
		hasGuild: boolean(data.hasGuild, "宗门日志接口返回格式不完整"),
		guildName: text(data.guildName),
		total: number$1(data.total),
		page: number$1(data.page),
		totalPages: number$1(data.totalPages),
		logs: rows(data.logs).map((row) => ({
			id: number$1(row.id),
			content: text(row.content),
			formattedTime: formatGameTime(row.createdAt === void 0 || row.createdAt === null ? null : text(row.createdAt))
		}))
	};
}
async function getBackendMasterRanking(bid, uid) {
	return parseMasterRanking(await requestBackend(identity(bid), "get_players_id_master_ranking", { path: { id: uid } }));
}
function parseMasterRanking(value) {
	const data = record(value);
	const stats = (row) => ({
		masterVirtueLevel: number$1(row.virtueLevel),
		virtueTitle: text(row.virtueTitle),
		masterVirtueExp: number$1(row.virtueExperience),
		totalGraduatedCount: number$1(row.totalGraduatedCount),
		activeDiscipleCount: number$1(row.activeDiscipleCount)
	});
	const self = data.self === null ? void 0 : record(data.self);
	return {
		nearby: rows(data.nearby).map((row) => ({
			...stats(row),
			rank: number$1(row.rank),
			userId: number$1(row.userId),
			userName: row.userName === null ? "未知修士" : text(row.userName)
		})),
		top: rows(data.top).map((row) => ({
			...stats(row),
			rank: number$1(row.rank),
			userId: number$1(row.userId),
			userName: row.userName === null ? "未知修士" : text(row.userName)
		})),
		self: self === void 0 ? void 0 : {
			...stats(self),
			rank: number$1(self.rank)
		}
	};
}
async function getBackendGachaCatalog(bid, uid) {
	return parseGachaCatalog(record(await requestBackend(identity(bid), "get_players_id_gacha_catalog", { path: { id: uid } })));
}
function parseGachaCatalog(data) {
	if (typeof data.active !== "boolean") throw new Error("活动目录接口返回格式不完整");
	if (data.accessStatus !== "NO_BANNER" && data.accessStatus !== "REALM_LOW" && data.accessStatus !== "READY") throw new Error("活动目录接口返回访问状态无效");
	const realm = (value) => {
		if (value === null) return null;
		const row = record(value);
		return {
			id: number$1(row.id),
			name: text(row.name),
			level: number$1(row.level),
			stageLevel: number$1(row.stageLevel)
		};
	};
	return {
		active: data.active,
		accessStatus: data.accessStatus,
		bannerId: number$1(data.bannerId),
		minRealm: realm(data.minRealm),
		userRealm: realm(data.userRealm),
		pools: rows(data.pools).map((row) => ({
			id: number$1(row.id),
			poolName: text(row.poolName),
			realm: realm(row.realm),
			merchantTitle: text(row.merchantTitle)
		}))
	};
}
async function getBackendGachaHistory(bid, uid, poolId, limit = 20) {
	return parseGachaHistory(await requestBackend(identity(bid), "get_players_id_gacha_pools_poolId_history", {
		path: {
			id: uid,
			poolId
		},
		query: { limit }
	}));
}
function parseGachaHistory(data) {
	return rows(data).map((row) => {
		if (typeof row.isFree !== "boolean") throw new Error("记录接口返回格式不完整");
		return {
			id: number$1(row.id),
			tierName: text(row.tierName),
			itemSnapshotJson: text(row.itemSnapshotJson),
			isFree: row.isFree,
			created_at: date(row.createdAt)
		};
	});
}
async function getBackendGachaGoods(bid, poolId) {
	return parseGachaGoods(await requestBackend(identity(bid), "get_gacha_pools_poolId_items", { path: { poolId } }));
}
function parseGachaGoods(data) {
	return rows(data).map((tier) => ({
		tierName: text(tier.tierName),
		tierLabel: text(tier.tierLabel),
		tierWeight: number$1(tier.tierWeight),
		probabilityPercent: number(tier.probabilityPercent),
		pityLimit: tier.pityLimit === null ? null : number$1(tier.pityLimit),
		items: rows(tier.items).map((item) => {
			if (typeof item.isUp !== "boolean" || typeof item.canViewDetail !== "boolean") throw new Error("货品接口返回格式不完整");
			return {
				itemName: text(item.itemName),
				itemType: text(item.itemType),
				itemTypeLabel: text(item.itemTypeLabel),
				displayName: text(item.displayName),
				canViewDetail: item.canViewDetail,
				quantity: number$1(item.quantity),
				isUp: item.isUp,
				probability: number(item.probability),
				actualRatePercent: number(item.actualRatePercent)
			};
		})
	}));
}
async function getBackendGachaOverview(bid, uid) {
	return parseGachaOverview(record(await requestBackend(identity(bid), "get_players_id_gacha_overview", { path: { id: uid } })));
}
function parseGachaOverview(value) {
	const data = record(value);
	if (data.banner === null) return null;
	if (data.accessStatus !== "REALM_LOW" && data.accessStatus !== "READY") throw new Error("转盘概览接口返回访问状态无效");
	const realm = (value) => {
		if (value === null) return null;
		const r = record(value);
		return {
			name: text(r.name),
			level: number$1(r.level),
			stageLevel: number$1(r.stageLevel)
		};
	};
	const banner = record(data.banner);
	const assets = record(data.currencies);
	const currencies = {
		spiritStone: number$1(assets.spiritStone),
		spiritsCrystal: number$1(assets.spiritsCrystal),
		spiritsMilk: number$1(assets.spiritsMilk),
		signInCoin: number$1(assets.signInCoin),
		towerScore: number$1(assets.towerScore),
		reputation: number$1(assets.reputation),
		tongxin: number$1(assets.tongxin),
		greenBottle: number$1(assets.greenBottle)
	};
	return {
		title: text(banner.title),
		description: text(banner.description),
		startTime: date(banner.startTime),
		endTime: date(banner.endTime),
		minRealm: realm(data.minRealm),
		accessStatus: data.accessStatus,
		userRealm: realm(data.userRealm),
		currencies,
		pools: rows(banner.pools).map((pool) => {
			const pity = record(pool.pity);
			return {
				id: number$1(pool.id),
				poolName: text(pool.poolName),
				poolLevel: number$1(pool.poolLevel),
				currencyCode: text(pool.currencyCode),
				currencyName: text(pool.currencyName),
				pricePerPull: number$1(pool.pricePerPull),
				tenPullCost: number$1(pool.tenPullCost),
				maxUpPerUser: number$1(pool.maxUpPerUser),
				realm: realm(pool.realm),
				merchantTitle: text(pool.merchantTitle),
				tiers: rows(pool.tiers).map((t) => ({
					tierName: text(t.tierName),
					tierLabel: text(t.tierLabel),
					weight: number$1(t.weight),
					probabilityPercent: number(t.probabilityPercent),
					pityLimit: t.pityLimit === null ? null : number$1(t.pityLimit)
				})),
				upItems: rows(pool.upItems).map((i) => ({ itemName: text(i.itemName) })),
				pity: {
					freeRemaining: number$1(pity.freeRemaining),
					upObtained: number$1(pity.upObtained),
					tierPity: Object.fromEntries(Object.entries(record(pity.tierPity)).map(([key, value]) => [key, number$1(value)]))
				},
				mainPityRemaining: pool.mainPityRemaining === null ? null : number$1(pool.mainPityRemaining),
				subPityRemaining: pool.subPityRemaining === null ? null : number$1(pool.subPityRemaining),
				upLimitReached: boolean(pool.upLimitReached)
			};
		})
	};
}
async function getBackendLootboxes(bid, uid, page) {
	return parseBackendLootboxes(await requestBackend(identity(bid), "get_players_id_lootboxes", {
		path: { id: uid },
		query: { page }
	}));
}
function parseBackendLootboxes(value) {
	const data = record(value);
	const capabilities = (value) => rows(value).map((capability) => {
		if (capability.kind !== "open" || typeof capability.valid !== "boolean") throw new Error("礼盒接口返回未知能力");
		return {
			kind: "open",
			valid: capability.valid,
			options: rows(capability.options).map((option) => {
				const requestedCount = number$1(option.requestedCount);
				const effectiveCount = number$1(option.effectiveCount);
				if (requestedCount <= 0 || effectiveCount <= 0) throw new Error("礼盒接口能力选项无效");
				return {
					requestedCount,
					effectiveCount
				};
			})
		};
	});
	return {
		page: number$1(data.page),
		total: number$1(data.total),
		pageSize: number$1(data.pageSize),
		items: rows(data.items).map((item) => ({
			id: number$1(item.id),
			lootboxId: number$1(item.lootboxId),
			quantity: number$1(item.quantity),
			name: item.name === null ? "未知礼盒" : text(item.name),
			description: item.description === null ? "" : text(item.description),
			capabilities: capabilities(item.capabilities)
		}))
	};
}
async function getBackendSoulArtifactBag(bid, uid, page) {
	return parseSoulArtifactBag(await requestBackend(identity(bid), "get_players_id_soul_artifacts_bag", {
		path: { id: uid },
		query: { page }
	}));
}
function parseSoulArtifactBag(value) {
	const data = record(value);
	const lockAction = (value) => {
		if (value !== "lock" && value !== "unlock" && value !== "") throw new Error("本命物背包接口返回未知锁定动作");
		return value;
	};
	return {
		page: number$1(data.page),
		total: number$1(data.total),
		pageSize: number$1(data.pageSize),
		items: rows(data.items).map((item) => ({
			id: number$1(item.id),
			userSoulArtifactId: number$1(item.id),
			artifactId: number$1(item.artifactId),
			gradeId: number$1(item.gradeId),
			name: item.name === null ? "未知本命物" : text(item.name),
			gradeName: item.gradeName === null ? "未知" : text(item.gradeName),
			level: number$1(item.level),
			washCount: number$1(item.washCount),
			hasUpgraded: number$1(item.hasUpgraded) === 1,
			isEquipped: number$1(item.isEquipped) === 1,
			isLocked: number$1(item.isLocked),
			canRefine: boolean(item.canRefine),
			canToggleLock: boolean(item.canToggleLock),
			lockAction: lockAction(item.lockAction)
		}))
	};
}
function teamBattleRecord(data) {
	return {
		id: number$1(data.id),
		teamId: number$1(data.teamId),
		leaderUserId: number$1(data.leaderUserId),
		battleMode: text(data.battleMode),
		targetLabel: text(data.targetLabel),
		battleResult: text(data.battleResult),
		participantCount: number$1(data.participantCount),
		battleLogId: data.battleLogId === null ? null : text(data.battleLogId) || null,
		settledAt: date(data.settledAt)
	};
}
async function getBackendTeamBattleRecords(bid, page, pageSize) {
	return parseBackendTeamBattleRecords(record(await requestBackend(identity(bid), "get_teams_battle_records", { query: {
		page,
		pageSize
	} })));
}
function parseBackendTeamBattleRecords(value) {
	const data = record(value);
	return {
		currentPage: number$1(data.page),
		total: number$1(data.total),
		totalPages: number$1(data.totalPages),
		records: rows(data.items).map(teamBattleRecord)
	};
}
async function getBackendTeamBattleDetail(bid, recordId) {
	return parseBackendTeamBattleDetail(record(await requestBackend(identity(bid), "get_teams_battle_records_recordId", { path: { recordId } })), recordId);
}
function parseBackendTeamBattleDetail(value, recordId) {
	const data = record(value);
	const detail = teamBattleRecord(data);
	if (detail.id !== recordId) throw new Error("战报详情返回对象不一致");
	return {
		...detail,
		members: rows(data.members).map((member) => {
			const isLeader = boolean(member.isLeader, "战报接口缺少队长标记");
			return {
				userId: number$1(member.userId),
				userName: text(member.userName),
				isLeader,
				position: number$1(member.position),
				rewardSnapshot: member.rewardSnapshot === null || member.rewardSnapshot === void 0 ? null : record(member.rewardSnapshot)
			};
		})
	};
}
async function getBackendTeamPendingApplications(bid, uid) {
	return parseBackendTeamPendingApplications(record(await requestBackend(identity(bid), "get_players_id_team_pending_applications", { path: { id: uid } })));
}
function parseBackendTeamPendingApplications(value) {
	const data = record(value);
	return {
		leaderName: data.leaderName === null ? "未知" : text(data.leaderName),
		applications: rows(data.applications).map((item) => ({
			id: number$1(item.id),
			userId: number$1(item.userId),
			teamId: number$1(item.teamId),
			userName: item.userName === null ? "未知" : text(item.userName)
		}))
	};
}
async function getBackendTeamApplicationRecords(bid, uid) {
	const data = record(await requestBackend(identity(bid), "get_players_id_team_application_records", { path: { id: uid } }));
	if (typeof data.isLeader !== "boolean" || typeof data.canUseSecondLayerFeature !== "boolean") throw new Error("申请接口缺少身份或境界资格");
	return {
		isLeader: data.isLeader,
		canUseSecondLayerFeature: data.canUseSecondLayerFeature,
		realmName: text(data.realmName),
		applications: rows(data.applications).map((item) => ({
			id: number$1(item.id),
			leaderName: item.leaderName === null ? "未知" : text(item.leaderName),
			createdAt: date(item.createdAt)
		}))
	};
}
async function getBackendProfessionToolBag(bid, uid, typeName, page = 1) {
	return parseProfessionToolBag(await requestBackend(identity(bid), "get_players_id_profession_tools_bag", {
		path: { id: uid },
		query: {
			typeName,
			page
		}
	}));
}
function parseProfessionToolBag(value) {
	const data = record(value);
	if (!Array.isArray(data.types)) throw new Error("天工接口缺少分类");
	const capability = (value) => {
		if (value !== "replace" && value !== "lock" && value !== "unlock" && value !== "viewDetail" && value !== "lockAll" && value !== "unlockAll") throw new Error("天工接口返回未知能力");
		return value;
	};
	if (!Array.isArray(data.capabilities)) throw new Error("天工接口缺少页面能力");
	return {
		types: data.types.map(text),
		activeType: data.activeType === null ? null : text(data.activeType),
		page: number$1(data.page),
		total: number$1(data.total),
		pageSize: number$1(data.pageSize),
		totalPages: number$1(data.totalPages),
		capabilities: data.capabilities.map(capability),
		items: rows(data.items).map((item) => {
			if (typeof item.displayName !== "string" || typeof item.displayGrade !== "string" || !Array.isArray(item.capabilities)) throw new Error("天工接口缺少物品投影");
			return {
				id: number$1(item.id),
				toolId: number$1(item.toolId),
				name: item.displayName,
				typeName: item.typeName === null ? "未知" : text(item.typeName),
				grade: item.displayGrade,
				gradeId: item.gradeId === null ? 0 : number$1(item.gradeId),
				isEquipped: number$1(item.isEquipped),
				isLocked: number$1(item.isLocked),
				canReplace: boolean(item.canReplace),
				canToggleLock: boolean(item.canToggleLock),
				capabilities: item.capabilities.map(capability)
			};
		})
	};
}
async function getBackendSkillBookBag(bid, uid, skillType, page) {
	return parseSkillBookBag(await requestBackend(identity(bid), "get_players_id_skill_books_bag", {
		path: { id: uid },
		query: {
			view: "storage",
			skillType: skillType ?? void 0,
			page
		}
	}));
}
function parseRobotStorageSkillBooks(value) {
	const data = record(value);
	return {
		...parseSkillBookBag(data.bag),
		requestedType: text(data.requestedType)
	};
}
function parseSkillBookBag(value) {
	const data = record(value);
	if (!Array.isArray(data.items) || !Array.isArray(data.capabilities)) throw new Error("功法背包接口返回不完整");
	const capability = (value) => {
		const row = record(value);
		if (![
			"lock",
			"unlock",
			"learn",
			"decompose",
			"viewDetail",
			"lockAll",
			"unlockAll",
			"decomposeAll"
		].includes(row.kind)) throw new Error("功法背包接口返回未知能力");
		const kind = row.kind;
		const requiresSkillType = kind === "lockAll" || kind === "unlockAll";
		if (requiresSkillType && (typeof row.skillType !== "string" || !row.skillType)) throw new Error("功法背包批量能力缺少分类");
		return {
			kind,
			...requiresSkillType ? { skillType: row.skillType } : {}
		};
	};
	return {
		skillType: text(data.skillType),
		page: number$1(data.page),
		total: number$1(data.total),
		totalPages: number$1(data.totalPages),
		items: data.items.map((value) => {
			const item = record(value);
			if (!Array.isArray(item.capabilities)) throw new Error("功法背包接口缺少物品能力");
			if (typeof item.displayName !== "string" || typeof item.displayGrade !== "string" || typeof item.displaySkillType !== "string" || typeof item.unidentified !== "boolean" || !Array.isArray(item.attributeParts) || !item.attributeParts.every((part) => typeof part === "string")) throw new Error("功法背包接口缺少展示投影");
			return {
				id: number$1(item.id),
				skillBookId: number$1(item.skillBookId),
				status: number$1(item.status),
				isLocked: number$1(item.isLocked),
				quantity: number$1(item.quantity),
				identifiableCount: number$1(item.identifiableCount),
				displayName: item.displayName,
				displayGrade: item.displayGrade,
				displaySkillType: item.displaySkillType,
				unidentified: item.unidentified,
				attributeParts: item.attributeParts,
				physicalAttack: number$1(item.physicalAttack),
				magicAttack: number$1(item.magicAttack),
				physicalDefense: number$1(item.physicalDefense),
				magicDefense: number$1(item.magicDefense),
				hp: number$1(item.hp),
				physicalAttackPercent: number(item.physicalAttackPercent),
				magicAttackPercent: number(item.magicAttackPercent),
				physicalDefensePercent: number(item.physicalDefensePercent),
				magicDefensePercent: number(item.magicDefensePercent),
				hpPercent: number(item.hpPercent),
				speed: number$1(item.speed),
				critRate: number(item.critRate),
				critDamage: number(item.critDamage),
				maxPhysicalAttack: number$1(item.maxPhysicalAttack),
				maxMagicAttack: number$1(item.maxMagicAttack),
				maxPhysicalDefense: number$1(item.maxPhysicalDefense),
				maxMagicDefense: number$1(item.maxMagicDefense),
				maxHp: number$1(item.maxHp),
				maxPhysicalAttackPercent: number(item.maxPhysicalAttackPercent),
				maxMagicAttackPercent: number(item.maxMagicAttackPercent),
				maxPhysicalDefensePercent: number(item.maxPhysicalDefensePercent),
				maxMagicDefensePercent: number(item.maxMagicDefensePercent),
				maxHpPercent: number(item.maxHpPercent),
				maxSpeed: number$1(item.maxSpeed),
				maxCritRate: number(item.maxCritRate),
				maxCritDamage: number(item.maxCritDamage),
				name: item.name === null ? null : text(item.name),
				gradeId: item.gradeId === null ? null : number$1(item.gradeId),
				grade: item.grade === null ? "未知" : text(item.grade),
				realm: item.realm === null ? null : text(item.realm),
				skillType: item.skillType === null ? "未知" : text(item.skillType),
				capabilities: item.capabilities.map(capability)
			};
		}),
		capabilities: data.capabilities.map(capability)
	};
}
async function getBackendEquipmentBag(bid, uid, equipmentType, page) {
	return parseEquipmentBag(await requestBackend(identity(bid), "get_players_id_equipment_bag", {
		path: { id: uid },
		query: {
			view: "storage",
			equipmentType: equipmentType ?? void 0,
			page
		}
	}));
}
function parseRobotStorageEquipment(value) {
	const data = record(value);
	return {
		...parseEquipmentBag(data.bag),
		requestedType: text(data.requestedType)
	};
}
function parseEquipmentBag(value) {
	const data = record(value);
	if (!Array.isArray(data.types)) throw new Error("装备接口缺少分类");
	const capability = (row) => {
		if (![
			"equip",
			"lock",
			"unlock",
			"decompose",
			"viewDetail",
			"lockAll",
			"unlockAll",
			"decomposeAll"
		].includes(row.kind)) throw new Error("装备接口返回未知能力");
		if ((row.kind === "lockAll" || row.kind === "unlockAll") && (typeof row.equipmentType !== "string" || !row.equipmentType)) throw new Error("装备接口批量能力缺少分类");
		if (row.equipmentType !== void 0 && typeof row.equipmentType !== "string") throw new Error("装备接口能力分类无效");
		return row.equipmentType === void 0 ? { kind: row.kind } : {
			kind: row.kind,
			equipmentType: row.equipmentType
		};
	};
	const capabilities = (value) => rows(value).map(capability);
	return {
		types: data.types.map(text),
		activeType: data.activeType === null ? null : text(data.activeType),
		page: number$1(data.page),
		total: number$1(data.total),
		totalPages: number$1(data.totalPages),
		capabilities: capabilities(data.capabilities),
		items: rows(data.items).map((item) => {
			if (typeof item.displayName !== "string" || typeof item.displayEquipmentType !== "string" || typeof item.displayGrade !== "string" || !Array.isArray(item.attributeParts) || !item.attributeParts.every((part) => typeof part === "string")) throw new Error("装备背包接口缺少展示投影");
			return {
				id: number$1(item.id),
				equipmentId: number$1(item.equipmentId),
				isEquipped: number$1(item.isEquipped),
				isLocked: number$1(item.isLocked),
				name: item.name === null ? "未知装备" : text(item.name),
				equipmentType: item.equipmentType === null ? "未知" : text(item.equipmentType),
				grade: item.grade === null ? "未知" : text(item.grade),
				physicalAttack: number$1(item.physicalAttack),
				magicAttack: number$1(item.magicAttack),
				physicalDefense: number$1(item.physicalDefense),
				magicDefense: number$1(item.magicDefense),
				hp: number$1(item.hp),
				physicalAttackPercent: number(item.physicalAttackPercent),
				magicAttackPercent: number(item.magicAttackPercent),
				physicalDefensePercent: number(item.physicalDefensePercent),
				magicDefensePercent: number(item.magicDefensePercent),
				hpPercent: number(item.hpPercent),
				speed: number$1(item.speed),
				critRate: number(item.critRate),
				critDamage: number(item.critDamage),
				canEquip: boolean(item.canEquip, "装备接口缺少装备资格字段"),
				canLock: boolean(item.canLock, "装备接口缺少锁定资格字段"),
				canDecompose: boolean(item.canDecompose, "装备接口缺少分解资格字段"),
				capabilities: capabilities(item.capabilities),
				displayName: item.displayName,
				displayEquipmentType: item.displayEquipmentType,
				displayGrade: item.displayGrade,
				attributeParts: item.attributeParts
			};
		})
	};
}
async function getBackendMarketTrades(bid, uid, mode, page, pageSize) {
	return parseBackendMarketTrades(await requestBackend(identity(bid), "get_players_id_market_trades", {
		path: { id: uid },
		query: {
			mode,
			page,
			pageSize
		}
	}));
}
function parseBackendMarketTrades(value) {
	const data = record(value);
	return {
		total: number$1(data.total),
		currentPage: number$1(data.currentPage),
		totalPages: number$1(data.totalPages),
		rows: rows(data.items).map((item) => {
			const sellerExists = boolean(item.sellerExists, "交易记录缺少卖家关联状态");
			const sellerName = text(item.sellerName);
			const role = item.role;
			if (role !== "buy" && role !== "sell") throw new Error("交易记录缺少交易角色");
			return {
				id: number$1(item.id),
				listingId: number$1(item.listingId),
				role,
				sellerUserId: number$1(item.sellerUserId),
				seller: sellerExists ? { name: sellerName } : null,
				itemCategory: text(item.itemCategory),
				itemCategoryLabel: text(item.itemCategoryLabel),
				itemName: text(item.itemName),
				quantity: number$1(item.quantity),
				unitPriceAmount: number$1(item.unitPriceAmount),
				totalPriceAmount: number$1(item.totalPriceAmount),
				currencyCode: text(item.currencyCode),
				currencyName: text(item.currencyName),
				displayQuantity: number$1(item.displayQuantity),
				displayUnitPrice: number$1(item.displayUnitPrice),
				displayTotalPrice: number$1(item.displayTotalPrice),
				displayFee: number$1(item.displayFee),
				displaySellerReceive: number$1(item.displaySellerReceive),
				feeAmount: number$1(item.feeAmount),
				sellerReceivedAmount: number$1(item.sellerReceivedAmount),
				created_at: date(item.createdAt)
			};
		})
	};
}
function parseBackendDungeonDetail(value) {
	const data = record(value);
	const parseDrop = (value) => rows(value).map((drop) => ({
		category: text(drop.category),
		itemId: number$1(drop.itemId),
		name: text(drop.name),
		amount: number$1(drop.amount),
		probability: number$1(drop.probability)
	}));
	const firstClear = data.firstClearReward === null ? null : record(data.firstClearReward);
	const rewardParts = (value) => {
		if (!Array.isArray(value)) throw new Error("秘境首通奖励缺少列表");
		return value.map(text);
	};
	const reward = firstClear === null ? null : { parts: rewardParts(firstClear.parts) };
	return {
		id: number$1(data.id),
		name: text(data.name),
		isSingle: boolean(data.isSingle, "秘境接口缺少单人状态"),
		typeLabel: text(data.typeLabel),
		realmLimit: text(data.realmLimit),
		spiritCost: number$1(data.spiritCost),
		guildContributionCost: number$1(data.guildContributionCost),
		minPlayers: number$1(data.minPlayers),
		usedToday: number$1(data.usedToday),
		dailyLimit: number$1(data.dailyLimit),
		freeUsed: number$1(data.freeUsed),
		freeLimit: number$1(data.freeLimit),
		freeRemaining: data.freeRemaining === void 0 ? Math.max(0, number$1(data.freeLimit) - number$1(data.freeUsed)) : number$1(data.freeRemaining),
		expReward: number$1(data.expReward),
		currencyDrops: rows(data.currencyDrops).map((x) => ({
			code: text(x.code),
			name: text(x.name),
			amount: number$1(x.amount)
		})),
		skillDrops: parseDrop(data.skillDrops),
		materialDrops: parseDrop(data.materialDrops),
		hasCleared: boolean(data.hasCleared, "秘境接口缺少通关状态"),
		firstClearReward: reward,
		outputMultiplier: data.outputMultiplier === null ? null : number(data.outputMultiplier),
		outputAddPct: data.outputAddPct === null ? null : number(data.outputAddPct),
		inTeam: boolean(data.inTeam, "秘境接口缺少队伍状态")
	};
}
async function getBackendDungeonCatalog(bid, uid, page) {
	return parseBackendDungeonCatalog(await requestBackend(identity(bid), "get_players_id_dungeons_catalog", {
		path: { id: uid },
		query: {
			page,
			pageSize: 5
		}
	}));
}
function parseBackendDungeonCatalog(value) {
	const data = record(value);
	const inTeam = boolean(data.inTeam, "秘境接口缺少队伍状态");
	return {
		mentalValue: number$1(data.mentalValue),
		inTeam,
		realmLevel: number$1(data.realmLevel),
		realmStageLevel: number$1(data.realmStageLevel),
		canUseMeridian: boolean(data.canUseMeridian, "秘境接口缺少经脉资格"),
		canMatchDungeon: boolean(data.canMatchDungeon, "秘境接口缺少匹配资格"),
		pagination: {
			currentPage: number$1(data.currentPage),
			totalPages: number$1(data.totalPages),
			total: number$1(data.total)
		},
		items: rows(data.items).map((item) => {
			const isSingle = boolean(item.isSingle, "秘境接口缺少挑战状态");
			const hasCleared = boolean(item.hasCleared, "秘境接口缺少挑战状态");
			return {
				id: number$1(item.id),
				name: text(item.name),
				isSingle,
				hasCleared,
				spiritCost: number$1(item.spiritCost),
				freeLimit: item.freeLimit === void 0 ? null : number$1(item.freeLimit),
				freeRemaining: item.freeRemaining === void 0 ? null : number$1(item.freeRemaining),
				minRealmName: item.minRealmName === null ? null : text(item.minRealmName),
				maxRealmName: item.maxRealmName === null ? null : text(item.maxRealmName)
			};
		})
	};
}
async function getBackendGuildStorylineRecords(bid, uid) {
	return parseGuildStorylineRecords(await requestBackend(identity(bid), "get_players_id_guild_storyline_records", { path: { id: uid } }));
}
function parseGuildStorylineRecords(value) {
	const data = record(value);
	return {
		guildName: text(data.guildName),
		guildLevel: number$1(data.guildLevel),
		records: rows(data.records).map((row) => {
			const isEffective = boolean(row.isEffective, "宗门主线记录缺少有效状态");
			return {
				stageIndex: number$1(row.stageIndex),
				damageDealt: number$1(row.damageDealt),
				participationPoint: number$1(row.participationPoint),
				battleResult: number$1(row.battleResult),
				isEffective,
				attemptNo: number$1(row.attemptNo)
			};
		})
	};
}
function feedbackRow(item) {
	const isReplied = boolean(item.isReplied, "反馈接口缺少回复状态");
	return {
		id: number$1(item.id),
		content: text(item.content),
		isReplied,
		feedbackTime: date(item.feedbackTime)
	};
}
async function getBackendFeedbacks(bid, page) {
	return parseBackendFeedbacks(await requestBackend(identity(bid), "get_feedback_mine", { query: {
		page,
		pageSize: 5
	} }));
}
function parseBackendFeedbacks(value) {
	const data = record(value);
	const total = number$1(data.total);
	const pageSize = number$1(data.pageSize);
	if (pageSize !== 5) throw new Error("反馈接口分页大小不一致");
	return {
		feedbacks: rows(data.items).map(feedbackRow),
		total,
		currentPage: number$1(data.page),
		totalPages: Math.ceil(total / pageSize)
	};
}
async function getBackendFeedbackDetail(bid, feedbackId) {
	return parseBackendFeedbackDetail(await requestBackend(identity(bid), "get_feedback_feedbackId", { path: { feedbackId } }), feedbackId);
}
function parseBackendFeedbackDetail(value, feedbackId) {
	const data = record(value);
	const detail = feedbackRow(data);
	if (detail.id !== feedbackId) throw new Error("反馈详情返回对象不一致");
	return {
		...detail,
		reply: data.reply === null ? null : text(data.reply),
		"category.name": data.categoryName === null ? null : text(data.categoryName)
	};
}
async function getBackendEnemies(bid, uid) {
	return parseBackendEnemies(await requestBackend(identity(bid), "get_players_id_robbery_enemies", { path: { id: uid } }));
}
function parseBackendEnemies(value) {
	return rows(value).map((item) => {
		const attackerId = number$1(item.uid);
		return {
			uid: attackerId,
			name: item.name === null ? `玩家${attackerId}` : text(item.name),
			totalAttacks: number$1(item.totalAttacks),
			lastAttackTime: date(item.lastAttackTime),
			lastLogId: number$1(item.lastLogId),
			...item.reports !== void 0 ? { reports: rows(item.reports).map(parseRobberyRecord) } : {}
		};
	});
}
async function getBackendGuildMembers(bid, uid, page, pageSize) {
	return parseGuildMembers(await requestBackend(identity(bid), "get_players_id_guild_members", {
		path: { id: uid },
		query: {
			page,
			pageSize
		}
	}));
}
function parseGuildMembers(value) {
	const data = record(value);
	const status = text(data.membershipStatus);
	if (![
		"not_joined",
		"guild_missing",
		"members_missing",
		"joined"
	].includes(status)) throw new Error("宗门成员接口状态无效");
	return {
		membershipStatus: status,
		guildName: text(data.guildName),
		page: number$1(data.page),
		pageSize: number$1(data.pageSize),
		total: number$1(data.total),
		totalPages: number$1(data.totalPages),
		members: rows(data.members).map((item) => {
			const isOnLeave = boolean(item.isOnLeave, "宗门成员接口缺少职位状态");
			const isDeputy = boolean(item.isDeputy, "宗门成员接口缺少职位状态");
			const name = item.name === null ? null : text(item.name);
			const realmName = item.realmName === null ? null : text(item.realmName);
			return {
				userId: number$1(item.userId),
				roleId: number$1(item.roleId),
				roleName: item.roleName === null ? "弟子" : text(item.roleName),
				userName: name === null ? "未知" : `${name}（${realmName ?? "未知"}）`,
				dailyActivity: number$1(item.dailyActivity),
				weeklyActivity: number$1(item.weeklyActivity),
				contributionTotal: number$1(item.contributionTotal),
				isOnLeave,
				isDeputy,
				leaveEndAt: item.leaveEndAt === null ? void 0 : date(item.leaveEndAt)
			};
		})
	};
}

//#endregion
export { getBackendAchievements, getBackendBlocklist, getBackendDungeonCatalog, getBackendEmails, getBackendEncyclopedia, getBackendEncyclopediaDetail, getBackendEnemies, getBackendEquipmentBag, getBackendFeedbackDetail, getBackendFeedbacks, getBackendFriendAccess, getBackendFriendRequests, getBackendFriends, getBackendGachaCatalog, getBackendGachaGoods, getBackendGachaHistory, getBackendGachaOverview, getBackendGiftRecords, getBackendGuildAccess, getBackendGuildLogs, getBackendGuildMembers, getBackendGuildStorylineRecords, getBackendGuilds, getBackendLootboxes, getBackendMarketTrades, getBackendMasterRanking, getBackendMemories, getBackendProfessionToolBag, getBackendSkillBookBag, getBackendSocialAccess, getBackendSoulArtifactBag, getBackendStory, getBackendTeamApplicationRecords, getBackendTeamBattleDetail, getBackendTeamBattleRecords, getBackendTeamPendingApplications, getBackendTeams, getBackendToolCategories, parseBackendBlocklist, parseBackendDungeonCatalog, parseBackendDungeonDetail, parseBackendEmails, parseBackendEncyclopedia, parseBackendEncyclopediaDetail, parseBackendEnemies, parseBackendFeedbackDetail, parseBackendFeedbacks, parseBackendFriendRequests, parseBackendFriends, parseBackendGiftRecords, parseBackendGuilds, parseBackendLootboxes, parseBackendMarketTrades, parseBackendMemories, parseBackendStory, parseBackendTeamBattleDetail, parseBackendTeamBattleRecords, parseBackendTeamPendingApplications, parseBackendTeams, parseEquipmentBag, parseGachaCatalog, parseGachaGoods, parseGachaHistory, parseGachaOverview, parseGuildLogs, parseGuildMembers, parseGuildStorylineRecords, parseMasterRanking, parseProfessionToolBag, parseRobotStorageEquipment, parseRobotStorageSkillBooks, parseSkillBookBag, parseSoulArtifactBag, validateBackendAchievements };
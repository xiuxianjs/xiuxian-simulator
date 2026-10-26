import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-reset-reroll.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function text(value, message) {
	if (typeof value !== "string") throw new Error(message);
	return value;
}
function integer(value, message, positive = false) {
	if (!Number.isInteger(value) || positive && value <= 0) throw new Error(message);
	return value;
}
function bool(value, message) {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
}
function stringList(value, message) {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(message);
	return value;
}
function book(value, withType = false) {
	const data = row(value, "功法操作响应缺少功法信息");
	const skillType = data.skillType === void 0 ? void 0 : text(data.skillType, "功法操作响应缺少功法类型");
	if (withType && !skillType) throw new Error("功法操作响应缺少功法类型");
	return {
		id: integer(data.id, "功法操作响应缺少功法ID", true),
		name: text(data.name, "功法操作响应缺少功法名称"),
		...skillType === void 0 ? {} : { skillType },
		grade: text(data.grade, "功法操作响应缺少品级"),
		realm: text(data.realm, "功法操作响应缺少境界")
	};
}
function rerollPending(value) {
	const data = row(value, "换词响应缺少待确认结果");
	const pendingBook = book(data.skillBook);
	const targetPool = data.targetPool;
	if (targetPool !== "zero" && targetPool !== "active") throw new Error("换词响应的目标池无效");
	return {
		userSkillBookId: integer(data.userSkillBookId, "换词响应缺少功法ID", true),
		sourceLabel: text(data.sourceLabel, "换词响应缺少源词条"),
		targetLabel: text(data.targetLabel, "换词响应缺少目标词条"),
		skillBookName: pendingBook.name,
		gradeName: pendingBook.grade,
		realmName: pendingBook.realm,
		targetPool,
		targetWasActive: bool(data.targetWasActive, "换词响应缺少目标词条状态"),
		sourceCurrentText: text(data.sourceCurrentText, "换词响应缺少源词条数值"),
		sourceMaxText: text(data.sourceMaxText, "换词响应缺少源词条上限"),
		targetCurrentText: text(data.targetCurrentText, "换词响应缺少目标词条数值"),
		targetMaxText: text(data.targetMaxText, "换词响应缺少目标词条上限")
	};
}
function resetPending(value) {
	const data = row(value, "重制响应缺少待确认结果");
	const pendingBook = book(data.skillBook, true);
	return {
		userSkillBookId: integer(data.userSkillBookId, "重制响应缺少功法ID", true),
		skillBookName: pendingBook.name,
		skillType: pendingBook.skillType,
		gradeName: pendingBook.grade,
		realmName: pendingBook.realm,
		refundExp: integer(data.refundExp, "重制响应缺少经验返还"),
		refundSpiritStone: integer(data.refundSpiritStone, "重制响应缺少灵石返还"),
		upgradeCount: integer(data.upgradeCount, "重制响应缺少重制等级"),
		affectedAttrs: stringList(data.affectedAttrs, "重制响应缺少词条列表")
	};
}
function refundItems(value) {
	if (!Array.isArray(value)) throw new Error("重制响应缺少残页返还");
	return value.map((item) => {
		const data = row(item, "重制响应的残页返还无效");
		return {
			name: text(data.name, "重制响应的残页名称无效"),
			quantity: integer(data.quantity, "重制响应的残页数量无效", true),
			expValue: integer(data.expValue, "重制响应的残页经验无效", true)
		};
	});
}
function requireBid(bid) {
	if (!bid) throw new Error("操作缺少平台身份");
	return bid;
}
async function previewBackendSkillBookReroll(bid, uid, skillBookId, sourceLabel, request) {
	return parseSkillBookRerollPreview(await requestBackend(requireBid(bid), "post_players_id_skill_books_skillBookId_reroll", {
		path: {
			id: uid,
			skillBookId
		},
		body: sourceLabel ? { sourceLabel } : {},
		...writeContext(request)
	}));
}
function parseSkillBookRerollPreview(value) {
	const data = row(value, "换词响应不完整");
	const currentBook = book(data.skillBook);
	const mode = data.mode;
	if (mode === "list") {
		if (!Array.isArray(data.availableAttrs)) throw new Error("换词响应缺少可替换词条");
		return {
			success: true,
			mode,
			skillBook: currentBook,
			ownedCount: integer(data.ownedCount === void 0 ? 0 : data.ownedCount, "换词响应缺少换词符数量"),
			availableAttrs: data.availableAttrs.map((value) => {
				const attr = row(value, "换词响应的词条无效");
				return {
					label: text(attr.label, "换词响应的词条名称无效"),
					currentText: text(attr.currentText, "换词响应的词条数值无效"),
					maxText: text(attr.maxText, "换词响应的词条上限无效")
				};
			})
		};
	}
	if (mode !== "preview") throw new Error("换词响应模式无效");
	return {
		success: true,
		mode,
		skillBook: currentBook,
		ownedCount: integer(data.ownedCount === void 0 ? 0 : data.ownedCount, "换词响应缺少换词符数量"),
		pending: rerollPending(data.pending)
	};
}
async function confirmBackendSkillBookReroll(bid, uid, skillBookId, request) {
	return parseSkillBookRerollConfirm(await requestBackend(requireBid(bid), "post_players_id_skill_books_reroll_confirm", {
		path: { id: uid },
		body: skillBookId ? { skillBookId } : {},
		...writeContext(request)
	}));
}
function parseSkillBookRerollConfirm(value) {
	const pending = rerollPending(value);
	return {
		success: true,
		message: `已保留换词结果：${pending.sourceLabel} -> ${pending.targetLabel}`,
		pending
	};
}
async function cancelBackendSkillBookReroll(bid, uid, request) {
	return parseSkillBookRerollCancel(await requestBackend(requireBid(bid), "post_players_id_skill_books_reroll_cancel", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseSkillBookRerollCancel(value) {
	const pending = rerollPending(value);
	return {
		success: true,
		message: `已放弃换词结果：${pending.sourceLabel} -> ${pending.targetLabel}，换词符不返还`,
		pending
	};
}
async function previewBackendSkillBookReset(bid, uid, skillBookId, request) {
	return parseSkillBookResetPreview(await requestBackend(requireBid(bid), "post_players_id_skill_books_skillBookId_reset", {
		path: {
			id: uid,
			skillBookId
		},
		...writeContext(request)
	}));
}
function parseSkillBookResetPreview(value) {
	const pending = resetPending(row(value, "重制响应不完整").pending);
	return {
		success: true,
		message: "已生成功法重制预览，请在60秒内确认是否保留",
		skillBook: {
			id: pending.userSkillBookId,
			name: pending.skillBookName,
			skillType: pending.skillType
		},
		refundInfo: {
			exp: pending.refundExp,
			spiritStone: pending.refundSpiritStone,
			upgradeCount: pending.upgradeCount,
			affectedAttrs: pending.affectedAttrs
		},
		pendingData: pending
	};
}
function parseSkillBookResetConfirm(value) {
	const data = row(value, "重制响应不完整");
	const pending = resetPending(data.pending);
	return {
		success: true,
		message: `已重制功法「${pending.skillBookName}」`,
		skillBook: {
			id: pending.userSkillBookId,
			name: pending.skillBookName,
			skillType: pending.skillType
		},
		refundInfo: {
			exp: integer(data.refundExp === void 0 ? 0 : data.refundExp, "重制响应缺少经验返还"),
			spiritStone: integer(data.refundSpiritStone === void 0 ? 0 : data.refundSpiritStone, "重制响应缺少灵石返还"),
			upgradeCount: integer(data.upgradeCount === void 0 ? 0 : data.upgradeCount, "重制响应缺少重制等级"),
			affectedAttrs: stringList(data.affectedAttrs === void 0 ? [] : data.affectedAttrs, "重制响应缺少词条列表"),
			items: refundItems(data.items === void 0 ? [] : data.items)
		},
		pendingData: pending
	};
}
async function confirmBackendSkillBookReset(bid, uid, skillBookId, request) {
	return parseSkillBookResetConfirm(await requestBackend(requireBid(bid), "post_players_id_skill_books_reset_confirm", {
		path: { id: uid },
		body: skillBookId ? { skillBookId } : {},
		...writeContext(request)
	}));
}
async function cancelBackendSkillBookReset(bid, uid, request) {
	return parseSkillBookResetCancel(await requestBackend(requireBid(bid), "post_players_id_skill_books_reset_cancel", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseSkillBookResetCancel(value) {
	const pendingData = resetPending(value);
	return {
		success: true,
		message: `已取消功法重制：${pendingData.skillBookName} 保持原状`,
		pendingData
	};
}

//#endregion
export { cancelBackendSkillBookReroll, cancelBackendSkillBookReset, confirmBackendSkillBookReroll, confirmBackendSkillBookReset, parseSkillBookRerollCancel, parseSkillBookRerollConfirm, parseSkillBookRerollPreview, parseSkillBookResetCancel, parseSkillBookResetConfirm, parseSkillBookResetPreview, previewBackendSkillBookReroll, previewBackendSkillBookReset };
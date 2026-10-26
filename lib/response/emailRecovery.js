//#region src/response/emailRecovery.ts
/** Lifecycle, attachment eligibility and deletion confirmation stay server-owned. */
function emailRecoveryTips(operation, text) {
	if (!operation.startsWith("emails.")) return [];
	if (operation === "emails.list") return [{
		label: "查看邮件首页",
		command: "/我的邮件 1",
		description: "回到第一页核对当前可见邮件；列表空白或查询失败不证明奖励未发放，删除、分页和领取状态需分别确认，不自动重新兑换礼包"
	}];
	if (operation === "emails.detail" || /正确的邮件ID/.test(text)) return [{
		label: "选择当前邮件ID",
		command: "/我的邮件",
		description: "从本人当前列表使用查看按钮核对邮件ID，不使用页内序号；未查到不等于本次领取或删除已成功，也可能是不可见或结果未获确认"
	}];
	if (operation === "emails.claim-all" && /部分领取未完成/.test(text)) return [{
		label: "核对剩余邮件",
		command: "/我的邮件",
		description: "保留本次已领取数量，逐封核对当前附件状态；先前成功的邮件不会因其他邮件失败而回滚，不自动重放整批领取"
	}];
	if (/所有邮件附件已领取过|暂无可领取的邮件附件/.test(text)) return [{
		label: "核对邮件附件状态",
		command: "/我的邮件",
		description: "查看各封邮件的附件与当前状态；本条汇总未提供逐封成功明细，不能据此认定每封附件都已到账，也不自动重复整批领取"
	}];
	if (operation === "emails.delete-all" && /暂无可删除/.test(text)) return [{
		label: "查看可删除邮件",
		command: "/我的邮件",
		description: "批量只处理已领取邮件或已读且无附件的邮件；先查看当前状态，未领取附件不会由一键删除自动领取，不把单封删除当作绕过批量条件的建议"
	}];
	if (operation === "emails.claim" || operation === "emails.claim-all") return [{
		label: "先核对领取状态",
		command: "/我的邮件",
		description: "本次未获得完整领取确认，先查看邮件是否已领取及奖励状态；通用失败不能证明附件未到账，不自动重复领取或重新兑换礼包"
	}];
	return [{
		label: "先核对邮件状态",
		command: "/我的邮件",
		description: "先确认邮件仍可见及当前附件状态；删除或确认请求未获完整回执时不认定未删除，不自动重发确认，也不自动领取附件"
	}];
}

//#endregion
export { emailRecoveryTips };
//#region src/response/popularityRecovery.ts
function popularitySuccessTips(remainingLikes) {
	return [{
		label: "返回排行榜",
		command: "/排行榜",
		description: remainingLikes > 0 ? "本次已成功，同一玩家同一榜单当日不能重复点赞；剩余次数可选择其他道友，或该道友尚未点赞的受支持榜单入口，所有榜单共用每日5次额度" : "本次已成功，今日点赞额度已用完；所有榜单共用每日5次额度，换人或换榜不能增加次数，请按服务端日期次日再参与"
	}];
}
function popularityRecoveryTips(operation, text) {
	if (operation !== "popularity.like") return [];
	if (/今日点赞次数已用完/.test(text)) return [{
		label: "返回排行榜",
		command: "/排行榜",
		description: "所有榜单共用每日5次点赞额度，换人或换榜不能绕过今日上限；按服务端日期次日再参与，不重复提交当前点赞"
	}];
	if (/今日已经在.*点过赞/.test(text)) return [{
		label: "选择其他合规目标",
		command: "/排行榜",
		description: "同一玩家同一榜单当日只能点赞一次；若仍有剩余额度，可选择其他道友或该道友尚未点赞的受支持榜单，所有榜单的次数共用，不重放当前点赞"
	}];
	if (/不能给自己点赞|未找到被点赞的玩家|未能定位|点赞参数错误|参数不完整|不支持的人气榜类型/.test(text)) return [{
		label: "从榜单选择目标",
		command: "/排行榜",
		description: "使用当前榜单里其他道友的点赞按钮，核对UID或提及对象及榜单标识；人气榜用于查看收到的点赞，不是可提交的点赞来源类型，不猜测玩家编号或自动点赞"
	}];
	return [{
		label: "核对本人资产",
		command: "/我的信息",
		description: "点赞结果未获完整确认，不证明点赞或奖励未提交；先核对原回执与本人灵晶，不自动重试或切换目标继续写入"
	}, {
		label: "核对当前人气",
		command: "/人气排行榜",
		description: "榜单缓存可能延迟，暂未显示变化不能证明操作失败；持续异常时保留原指令和反馈联系运营"
	}];
}

//#endregion
export { popularityRecoveryTips, popularitySuccessTips };
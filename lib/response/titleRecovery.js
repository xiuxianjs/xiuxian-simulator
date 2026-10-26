//#region src/response/titleRecovery.ts
/** Owned row IDs and eligibility stay authoritative in TitleService/PVPRobberyService. */
function titleRecoveryTips(operation, text) {
	if (operation === "pvp.kill-god-title-claim") {
		if (/尚未配置/.test(text)) return [{
			label: "查看已持有称号",
			command: "/我的称号",
			description: "保留配置缺失反馈并联系管理员；提高排名不能补齐称号配置，也不自动重复领取"
		}];
		if (/上榜人数不足|仅杀神榜榜一/.test(text)) return [{
			label: "核对当前杀神榜",
			command: "/杀神榜",
			description: "按榜单核对当前人数与本人排名，人数和榜一条件都需满足；不保证排行变化后仍可领取，不自动发起战斗或重复领取"
		}];
		return [{
			label: "先核对称号到账",
			command: "/我的称号",
			description: "核对当前有效的“杀神”称号及佩戴状态；领取不会自动佩戴，请求未获确认时先查看结果，不更换请求自动重领"
		}];
	}
	if (![
		"titles.overview",
		"titles.activate",
		"titles.deactivate"
	].includes(operation)) return [];
	if (operation === "titles.overview") {
		if (/还没有获得任何称号|当前没有可用的有效称号/.test(text)) return [{
			label: "查看师门称号进度",
			command: "/我的师门",
			description: "核对累计出师人数及称号领取条件，未达标时先按当前培养进度安排；没有有效称号不代表从未获得过称号"
		}, {
			label: "查看杀神榜条件",
			command: "/杀神榜",
			description: "核对当前人数与排名，领取需同时满足服务端条件；这里只查询，不自动领取或参与战斗"
		}];
		return [{
			label: "查看本人信息",
			command: "/我的信息",
			description: "本次称号列表未取得完整结果，不能判断称号已失去或佩戴已取消；保留反馈后稍后手动重查，持续异常或配置缺失时联系管理员"
		}];
	}
	if (operation === "titles.activate" && /指定称号编号|选择称号|不存在|过期|record not found|参数无效/.test(text)) return [{
		label: "刷新我的有效称号",
		command: "/我的称号",
		description: "优先使用当前列表的佩戴按钮；参数是本人持有称号的记录ID，不是展示序号或称号模板ID，过期或不属于本人的记录不能佩戴"
	}];
	if (operation === "titles.deactivate" && /当前没有佩戴称号/.test(text)) return [{
		label: "查看现有称号",
		command: "/我的称号",
		description: "当前没有佩戴，无需重复卸下；卸下不会删除已持有称号，可在当前有效列表另选佩戴"
	}];
	return [{
		label: "先核对当前佩戴状态",
		command: "/我的称号",
		description: "本次操作未取得完整确认，状态可能已经写入；先查看当前佩戴与有效称号，再决定后续操作，不自动重试或认定原佩戴仍在"
	}];
}

//#endregion
export { titleRecoveryTips };
//#region src/response/storageBagRecovery.ts
function storageBagRecoveryTips(operation, text) {
	if (![
		"storage.menu",
		"storage.materials",
		"storage.props",
		"storage.profession-tools",
		"storage.skill-books",
		"storage.soul-artifacts"
	].includes(operation)) return [];
	const category = {
		"storage.materials": "材料",
		"storage.props": "道具",
		"storage.profession-tools": "天工",
		"storage.skill-books": "功法",
		"storage.soul-artifacts": "本命"
	}[operation] ?? "";
	if (text === "暂无天工类型") return [{
		label: "核对职业面板",
		command: "/我的职业",
		description: "当前没有可显示的工具类型，先核对职业面板；这不证明工具丢失或境界不足，持续无类型时保留原反馈联系运营"
	}];
	if (text === "该类型暂无天工工具" || text === "未提供替换入口") return [{
		label: "核对职业与工具",
		command: "/我的职业",
		description: "背包这里只展示当前分类未启用、未上架的工具；先核对职业面板与工具详情中的资格及保护状态，缺少替换入口不证明一定是境界不足，不自动卸下或解锁"
	}];
	if (text === "该类型暂无功法" || text === "未提供学习入口" || text === "暂无批量操作") return [{
		label: "核对当前功法",
		command: "/我的功法",
		description: "背包只展示当前筛选下可见的存储实例，先核对当前功法与背包分类、保护状态；缺少学习或批量入口不代表功法丢失，不自动解锁或分解"
	}];
	if (text === "暂无本命物" || text === "未提供炼化入口") return [{
		label: "核对当前本命物",
		command: "/我的本命物",
		description: "背包只展示未炼化且未上架的实例；先核对当前本命物和实例详情，缺少炼化入口时不要据此认定境界不足或自动解锁"
	}, {
		label: "核对上架状态",
		command: "/我的上架",
		description: "上架中的实例不在此背包显示，可核对本人挂单；是否下架由你决定"
	}];
	if (text === "该分类暂无物品") return [{
		label: "核对其他分类",
		command: "/储物袋",
		description: "这里只表示当前子分类没有记录，可切换分类核对持有物品；不代表整个储物袋为空，也不说明物品已被消耗"
	}];
	if (text === "当前页无记录") return [{
		label: "重新选择分类与页码",
		command: `/储物袋 ${category}`,
		description: "当前分类仍有记录，本页为空不等于全部用完；返回分类首页，再按当前分页查看"
	}];
	return [{
		label: "重新核对背包分类",
		command: "/储物袋",
		description: "查询未成功，无法据此判断物品数量或是否丢失；从储物袋重新选择分类，使用整数页码，持续失败时保留原反馈联系运营"
	}];
}

//#endregion
export { storageBagRecoveryTips };
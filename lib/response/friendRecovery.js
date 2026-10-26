//#region src/response/friendRecovery.ts
/** Recovery for the existing friend request, decision and removal contracts. */
function friendRecoveryTips(operation, text) {
	if (![
		"friends.request",
		"friends.accept",
		"friends.reject",
		"friends.remove",
		"friends.block",
		"friends.unblock",
		"friends.blocklist",
		"friends.overview",
		"friends.random",
		"friends.settings",
		"friends.settings-update"
	].includes(operation)) return [];
	if (/未初始化|未配置|响应不完整/.test(text)) return [];
	if (operation === "friends.block" || operation === "friends.unblock") {
		if (/操作失败，请稍后再试/.test(text)) return [{
			label: "核对当前黑名单",
			command: "/黑名单",
			description: "先查看本次目标是否仍在黑名单中，失败提示不能证明状态完全没变；核对后再决定后续操作"
		}, {
			label: "核对当前好友关系",
			command: "/我的好友",
			description: "拉黑与后续好友关系处理存在不同提交边界，黑名单和好友关系分别按当前查询结果确认"
		}];
		if (/黑名单数量已达上限|该用户已在黑名单中|该用户不在黑名单中|该记录不存在|记录 ID 超出可查询范围|使用方法：取消拉黑/.test(text)) return [{
			label: "查看本人黑名单",
			command: "/黑名单",
			description: "从本人当前列表核对记录ID与姓名，玩家UID不能代替黑名单记录ID；记录失效时重新查列表，满额时由你决定是否移除不需要的记录"
		}];
		if (/未找到名为|该用户不存在|不能拉黑自己|使用方法：拉黑/.test(text)) return [{
			label: "核对玩家完整道号",
			command: "/我的好友",
			description: "拉黑按玩家名称匹配，使用核对后的完整道号；UID、黑名单记录ID和 @提及不能代替名称，重名时先确认目标"
		}];
		if (operation === "friends.block" && /^已将.*加入黑名单/.test(text)) return [{
			label: "核对黑名单与关系",
			command: "/黑名单",
			description: "查看本次拉黑记录；黑名单写入与后续好友关系处理分开完成，不以本次提示代替好友关系查询"
		}, {
			label: "查看当前好友",
			command: "/我的好友",
			description: "核对关系处理结果，道侣关系受保护，拉黑不会自动解除道侣关系"
		}];
		if (operation === "friends.unblock" && /^已将.*移出黑名单/.test(text)) return [{
			label: "查看当前好友关系",
			command: "/我的好友",
			description: "取消的是本人黑名单记录，不会自动恢复好友；重新结交仍需符合双方条件并由对方同意"
		}];
		return [];
	}
	if (operation === "friends.blocklist" && /黑名单为空/.test(text)) return [{
		label: "查看本人接收设置",
		command: "/好友设置",
		description: "本人当前没有拉黑记录；如需管理是否接收新的结交申请，可先查看自己的好友设置"
	}];
	if (operation === "friends.overview" && /本页暂无好友|页码超出可查询范围/.test(text)) return [{
		label: "返回好友第一页",
		command: "/我的好友 1",
		description: "返回实际可查询的第一页核对数量；当前页为空不代表好友关系已经删除"
	}];
	if (operation === "friends.random" && /没有可以推荐的道友/.test(text) || operation === "friends.overview" && /^暂无好友/.test(text)) return [{
		label: "查看收到的申请",
		command: "/好友申请",
		description: "先核对本人收到的待处理结交申请；当前没有推荐候选不代表所有玩家都不存在，不自动解除拉黑或删除已有关系来增加候选"
	}];
	if (operation === "friends.settings-update") return [{
		label: "重新核对本人设置",
		command: "/好友设置",
		description: "本次设置未得到一致的成功确认，先查询当前接收状态；不要按旧开关继续判断，也不自动重放更新"
	}];
	if (operation === "friends.accept" && /对方好友数量已达上限/.test(text)) return [{
		label: "刷新收到的申请",
		command: "/好友申请",
		description: "申请人的好友已满，服务端已结束本次申请；需要对方整理自己的好友后重新申请，删除你自己的好友不能解除对方上限"
	}, {
		label: "核对现有关系",
		command: "/我的好友",
		description: "本次未建立好友关系，以当前好友列表为准，不重复同意旧申请"
	}];
	if (/对方暂时无法添加好友|对方待处理申请过多/.test(text)) return [{
		label: "查看现有好友",
		command: "/我的好友",
		description: "先等待对方处理其好友容量或收到的申请，再确认是否仍愿意结交；自己的申请收件箱不能清理对方积压，也不要重复提交同一申请"
	}];
	if (/好友数量已达上限/.test(text)) return [{
		label: "管理本人好友",
		command: "/我的好友",
		description: "核对本人好友数量与关系，是否删除不再需要的好友由你决定；腾出容量后再检查申请是否仍然有效"
	}];
	if (/申请不存在|该申请已处理或已过期|好友申请已过期|该申请已过期|申请 ID 超出可查询范围/.test(text)) return [{
		label: "刷新收到的申请",
		command: "/好友申请",
		description: "从本人当前待处理申请选择真实申请编号，玩家UID不能代替申请ID；已处理或过期的旧编号不能继续审核"
	}, {
		label: "核对现有关系",
		command: "/我的好友",
		description: "核对是否已成为好友；申请失效不代表本次已经同意或拒绝"
	}];
	if (/已发送过结交申请/.test(text)) return [{
		label: "核对现有关系",
		command: "/我的好友",
		description: "等待对方在自己的好友申请中处理，已有申请有效期内不要重复发送；本人“好友申请”只展示收到的申请"
	}];
	if (/你们已经是好友|不是你的好友|不是好友/.test(text)) return [{
		label: "查看当前好友",
		command: "/我的好友",
		description: "以当前好友列表核对关系与真实UID，再选择适用操作；旧申请或旧列表不能代替当前关系"
	}];
	if (/道侣关系不能直接删除|对方是你的道侣/.test(text)) return [{
		label: "查看道侣关系",
		command: "/我的道侣",
		description: "该关系受道侣规则保护，先查看当前道侣关系和可用操作，再自行决定如何处理；普通删除好友不会解除道侣关系"
	}];
	if (/你已拉黑对方/.test(text)) return [{
		label: "核对本人黑名单",
		command: "/黑名单",
		description: "查看当前拉黑记录，确需恢复往来时自行决定是否取消；取消拉黑不会自动成为好友，也不能保证对方接受申请"
	}];
	if (/对方已关闭好友申请|无法向该用户发送结交申请/.test(text)) return [{
		label: "查看当前关系",
		command: "/我的好友",
		description: "先核对现有关系并确认对方接收意愿；修改本人的好友接收设置不能解除对方限制，重复申请也不会获得权限"
	}];
	if (/不能添加自己|不能对自己|请输入有效|使用方法|该用户不存在|未找到ID/.test(text)) return [{
		label: "核对目标玩家",
		command: operation === "friends.remove" ? "/我的好友" : "/随机好友",
		description: "核对目标道友的真实UID，或直接 @已注册道友；选择其他玩家，不使用示例编号提交操作"
	}];
	if ((operation === "friends.accept" || operation === "friends.reject") && /操作失败，请稍后再试/.test(text)) return [{
		label: "核对申请与关系",
		command: "/好友申请",
		description: "先刷新本人收到的申请并核对好友关系，确认当前状态后再决定是否操作；保留原反馈，不将失败当成已同意或已拒绝"
	}, {
		label: "查看当前好友",
		command: "/我的好友",
		description: "以当前好友关系为准，不从旧申请推断本次结果"
	}];
	if (operation === "friends.remove" && /删除好友失败/.test(text)) return [{
		label: "核对当前好友",
		command: "/我的好友",
		description: "本次删除未获得成功确认，先核对当前关系并保留原反馈，再决定后续操作；不要把失败提示当作关系必然未变化"
	}];
	return [];
}

//#endregion
export { friendRecoveryTips };
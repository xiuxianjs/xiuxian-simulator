//#region src/response/equipmentRecovery.ts
/** Loadout recovery follows EquipmentService; selection and settlement are not repeated here. */
function equipmentRecoveryTips(operation, text) {
	if (operation === "storage.equipment") {
		if (/暂无装备类型|该类型暂无装备|暂无可用操作|暂无批量操作/.test(text)) return [{
			label: "核对当前穿戴",
			command: "/我的装备",
			description: "背包装备页展示当前分类内未穿戴且可见的装备；空分类或无可用操作不代表装备丢失，也不等于境界不足，不自动卸下或解锁来显示条目"
		}];
		return [{
			label: "重新选择装备分类",
			command: "/储物袋 装备",
			description: "回到分类入口再核对首页与当前总量；空页或查询失败不能证明没有持有装备，保留反馈，持续异常时联系管理员，不自动领取或重新购买"
		}];
	}
	if (operation === "equipment.detail") {
		if (/未装备任何/.test(text)) return [{
			label: "查看持有战斗装备",
			command: "/储物袋 装备",
			description: "当前所查部位没有穿戴装备，可先核对持有装备、部位和境界要求；没有穿戴不等于背包没有，不自动一键装备"
		}];
		return [{
			label: "查看当前装备部位",
			command: "/我的装备",
			description: "从当前穿戴面板核对部位名称；详情失败不能证明装备已卸下或丢失，不自动换装、卸下或重试写入"
		}];
	}
	if ([
		"equipment.decompose",
		"equipment.batch-decompose-query",
		"equipment.batch-decompose"
	].includes(operation)) {
		if (/参数错误|装备ID必须|instanceId 必须/.test(text)) return [{
			label: "选择本人装备实例",
			command: "/储物袋 装备",
			description: "使用本人当前背包装备实例ID，不使用模板ID或页内序号；先核对所选装备和保护状态，不生成示例ID分解按钮"
		}];
		if (/先卸下装备/.test(text)) return [{
			label: "核对当前穿戴部位",
			command: "/我的装备",
			description: "先确认所选装备是否仍在使用，再自行决定是否卸下；不自动卸下当前战斗装备后分解"
		}];
		if (/已锁定/.test(text) && operation === "equipment.decompose") return [{
			label: "核对受保护装备",
			command: "/储物袋 装备",
			description: "确认当前实例与保留意愿，锁定装备不能分解；只有明确要舍弃时再自行处理保护状态，不自动解锁"
		}];
		if (/暂无可分解|没有可分解/.test(text)) return [{
			label: "核对背包装备",
			command: "/储物袋 装备",
			description: "核对当前未装备、未锁定的装备和所选品级；无候选不代表整个背包为空，不默认解锁或卸下装备来凑数量"
		}];
		if (/无效的品级|预览失败|状态已变化|确认超时|已取消分解/.test(text)) return [{
			label: "重新查看分解范围",
			command: "/一键分解装备",
			description: "按当前装备状态重新选择范围并核对预估产出，新预览仍需你确认；旧预览不锁定具体实例，不沿用过期确认或自动执行"
		}];
		return [{
			label: "先核对装备与产出",
			command: "/储物袋 装备",
			description: "保留原回执，先核对原装备是否仍存在及实际产出；未取得完整结果不证明没有消耗或收益，不自动重放分解，配置异常时联系管理员"
		}];
	}
	if (![
		"equipment.equip",
		"equipment.unequip-one",
		"equipment.auto-equip",
		"equipment.equipped"
	].includes(operation)) return [];
	if (operation === "equipment.equip" && /境界不足/.test(text)) return [];
	if (/天工工具/.test(text)) return [{
		label: "查看持有天工工具",
		command: "/储物袋 天工",
		description: "此物品通过职业工具替换流程切换，不占普通战斗装备部位；先核对当前工具和职业资格，不反复使用战斗装备指令"
	}];
	if (/暂无装备类型数据/.test(text)) return [{
		label: "核对持有装备",
		command: "/储物袋 装备",
		description: "当前没有装备类型可展示，不能据此认定背包为空或境界不足；保留原反馈，持续异常时联系管理员核对类型配置"
	}];
	if (operation === "equipment.equipped") return [{
		label: "查看背包装备",
		command: "/储物袋 装备",
		description: "核对当前持有装备；穿戴面板空位或查询失败不证明装备已丢失，不自动穿戴、卸下或分解"
	}];
	if (operation === "equipment.equip" && /指定要装备|未找到该装备/.test(text)) return [{
		label: "核对未穿戴装备",
		command: "/储物袋 装备",
		description: "从本人当前背包选择装备实例ID或名称，模板ID和页内序号不能替代实例ID；原反馈若同时提及已装备，先核对当前穿戴"
	}, {
		label: "查看当前穿戴",
		command: "/我的装备",
		description: "确认该装备是否已经穿戴、位于哪个部位，再决定后续操作，不自动重复穿戴"
	}];
	if (operation === "equipment.unequip-one" && /指定要卸下|未找到|未装备任何/.test(text)) return [{
		label: "查看当前装备部位",
		command: "/我的装备",
		description: "按当前面板的部位名称选择卸下目标，卸下参数是装备类型，不是物品名或实例ID；该部位没有装备时无需重复卸下"
	}];
	if (operation === "equipment.auto-equip" && /无可用装备/.test(text)) return [{
		label: "核对可替换的战斗装备",
		command: "/储物袋 装备",
		description: "查看当前未穿戴装备、部位和境界要求；未找到可用替换不代表整个背包为空，一键结果仍以逐部位回执为准，不自动买装或重放整批"
	}];
	if (operation === "equipment.auto-equip" && /已是最佳/.test(text)) return [{
		label: "查看当前穿戴",
		command: "/我的装备",
		description: "当前候选范围内未触发更换，可按实际战斗需求核对各部位；无需反复提交一键装备，也不将本次评分结论扩大为所有阵容最优"
	}];
	return [{
		label: "先核对当前穿戴",
		command: "/我的装备",
		description: "本次操作未获完整确认，装备状态可能已写入；保留逐部位结果和原回执，先查看当前穿戴，不认定失败就没有更换，不自动重试或卸下恢复"
	}];
}

//#endregion
export { equipmentRecoveryTips };
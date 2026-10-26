//#region src/response/leaderboardRecovery.ts
const commands = {
	"leaderboard.menu": "/排行榜",
	"leaderboard.realm": "/境界排行榜",
	"leaderboard.realm-region": "/区境界排行榜",
	"leaderboard.popularity": "/人气排行榜",
	"leaderboard.battle": "/战力排行榜",
	"leaderboard.battle-region": "/区战力排行榜",
	"leaderboard.alchemy": "/丹师排行榜",
	"leaderboard.storyline": "/主线排行榜"
};
function leaderboardRecoveryTips(operation, text) {
	if (!commands[operation] || /炼气五层及以上方可开启/.test(text)) return [];
	if (/没有归属区/.test(text)) return [{
		label: "查看全服榜单",
		command: operation === "leaderboard.realm-region" ? "/境界排行榜" : "/战力排行榜",
		description: "当前缺少归属区，可先查看全服榜单并在个人信息核对归属；不自动迁区，也不把归属问题当作境界不足"
	}];
	if (/参数无效|Invalid parameter page/.test(text)) return [{
		label: "返回榜首",
		command: commands[operation],
		description: "从榜首使用当前分页按钮继续浏览；旧“附近/我的”入口兼容到榜首，个人名次只在返回的前50名范围显示"
	}];
	if (text === "本页无记录") return [{
		label: "返回榜首",
		command: commands[operation],
		description: "当前展示范围仍有记录，本页为空不等于个人数据清零；回到榜首核对当前分页"
	}];
	if (text === "榜单更新中") return [{
		label: "查看其他榜单",
		command: "/排行榜",
		description: "服务端正在统计，可先查看其他榜单，稍后再查询当前榜单；以返回的统计时间为准，不把旧快照当作实时战力"
	}];
	if (text === "暂无排行数据") return [{
		label: "查看其他榜单",
		command: "/排行榜",
		description: "当前展示范围暂无排行记录，可切换其他榜单；未显示本人不代表实力、修为或人气已清零，也不保证重新查询就能上榜"
	}];
	return [{
		label: "重新选择榜单",
		command: "/排行榜",
		description: "本次查询未获有效结果，先核对榜单入口；查询失败不能说明排名下降或数据清零，持续失败时保留原反馈联系运营"
	}];
}

//#endregion
export { leaderboardRecoveryTips };
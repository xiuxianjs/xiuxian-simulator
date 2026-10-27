import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { MSG_GUILD } from "../../../constants/messages.js";
import { formatGuildShopAutoRefreshHours, parseAutoRefreshHours } from "./view.js";

//#region src/response-apps/guild/autoRefreshShop/app.ts
/**
* 宗门商店自动刷新设置 App 层
* 客户端解析设置内容，服务保存配置与索引
*/
/**
* 设置宗门商店自动刷新
* @param params.uid 用户ID（user表中的id）
* @param params.param 参数：数字（0-23）设置刷新时间，"开启"启用自动刷新，"关闭"禁用自动刷新
*/
async function App(params) {
	try {
		const param = params.param.trim();
		const hours = parseAutoRefreshHours(param);
		const mode = hours ? "hours" : param === "开启" ? "enable" : param === "关闭" ? "disable" : "invalid";
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "auto_refresh",
			mode,
			...hours ? { hours } : {}
		}, params.request);
		const outcomeMessage = {
			not_joined: MSG_GUILD.NOT_JOINED,
			denied: MSG_GUILD.ONLY_LEADER,
			shop_missing: MSG_GUILD.SHOP_NOT_OPEN,
			hours_required: "请先设置1-3个自动刷新整点，再开启自动刷新",
			invalid_parameter: "参数无效，请输入1-3个整点小时，或输入“开启”“关闭”"
		};
		if (result.outcome !== "updated") return {
			code: "FAIL",
			data: {
				message: outcomeMessage[result.outcome],
				isLeader: result.isLeader
			}
		};
		return {
			code: "OK",
			data: {
				message: `商店自动刷新设置成功：${result.enabled ? `已开启，${formatGuildShopAutoRefreshHours(result.hours)}自动刷新` : "已关闭"}`,
				autoRefreshEnabled: result.enabled,
				autoRefreshHours: result.hours,
				isLeader: result.isLeader
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "设置自动刷新失败" }
		};
	}
}

//#endregion
export { App as default };
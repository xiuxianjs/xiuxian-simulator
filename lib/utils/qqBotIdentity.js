import { getConfigValue } from "alemonjs";

//#region src/utils/qqBotIdentity.ts
/** 与 QQ 适配器共用配置来源；每次读取以接收扫码后的配置更新。 */
function getQQBotAppIds() {
	const values = getConfigValue() ?? {};
	const config = {
		...values["qq-bot"],
		...values["@alemonjs/qq-bot"]
	};
	return (config.bots && Object.keys(config.bots).length ? Object.keys(config.bots) : [String(config.app_id ?? "").trim()]).filter((id) => /^[1-9]\d*$/.test(id));
}
function getQQBotAppId() {
	const ids = getQQBotAppIds();
	const values = getConfigValue() ?? {};
	const config = {
		...values["qq-bot"],
		...values["@alemonjs/qq-bot"]
	};
	const defaultBot = String(config.default_bot ?? "").trim();
	return ids.length === 1 ? ids[0] : ids.includes(defaultBot) ? defaultBot : "";
}

//#endregion
export { getQQBotAppId, getQQBotAppIds };
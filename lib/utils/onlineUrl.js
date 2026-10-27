import { getAppConfig } from "./appConfig.js";

//#region src/utils/onlineUrl.ts
/** 网页入口沿用当前机器人的服务器选择，保留各页面的业务参数。 */
function createOnlineUrl(path) {
	const url = new URL(path, "https://tatian-online.alemonjs.com");
	if (getAppConfig().backend?.channel_mode === true) url.searchParams.set("server", "channel");
	return url;
}

//#endregion
export { createOnlineUrl };
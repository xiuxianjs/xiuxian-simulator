import { name } from "../package.js";
import { getConfig } from "alemonjs";

//#region src/utils/appConfig.ts
/** 平台适配配置不依赖游戏数据库和缓存配置。 */
const getAppConfig = () => {
	return (getConfig().value ?? {})[name] ?? {};
};
const getOfficialGroupButton = () => {
	const config = getAppConfig();
	const url = config.official_group_url;
	return {
		pinned: config.official_group_button_pinned === true,
		url: typeof url === "string" ? url.trim() : ""
	};
};

//#endregion
export { getAppConfig, getOfficialGroupButton };
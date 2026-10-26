import { name } from "../package.js";
import { getConfig } from "alemonjs";

//#region src/utils/appConfig.ts
/** 平台适配配置不依赖游戏数据库和缓存配置。 */
const getAppConfig = () => {
	return (getConfig().value ?? {})[name] ?? {};
};

//#endregion
export { getAppConfig };
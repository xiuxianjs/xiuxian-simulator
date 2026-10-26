import { getAppConfig } from "../../utils/appConfig.js";
import { isValidTimeout } from "../core/helpers.js";
import { backendConnectionPools } from "./connection-pools.js";
import axios from "axios";

//#region src/api/bot/legacy-archive.ts
const legacySections = {
	资料: "profile",
	境界: "levels",
	装备: "equipment",
	本命: "fate",
	功法: "skills",
	财富: "wealth",
	储物袋: "bag",
	纳戒: "ring"
};
function archiveRow(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** 独立旧版只读 API；令牌仅由机器人服务端配置提供。 */
async function getLegacyArchive(uid, section, page = 1) {
	if (!/^[\p{L}\p{N}_:-]{1,50}$/u.test(uid) || !Number.isSafeInteger(page) || page < 1 || page > 1e6) throw new Error("旧版 UID 或页码无效。");
	const config = getAppConfig().legacy ?? {};
	const token = String(config.bot_token ?? "").trim();
	const timeout = Number(config.api_timeout_ms ?? 1e4);
	let url;
	try {
		url = new URL(String(config.api_url ?? "https://tatian-v2.alemonjs.com").trim());
	} catch {
		throw new Error("旧版资料服务地址配置无效，请联系运营。");
	}
	if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("旧版资料服务地址必须是 HTTP(S) origin，请联系运营。");
	if (token.length < 32 || /[\r\n]/.test(token) || !isValidTimeout(timeout)) throw new Error("旧版资料服务尚未正确配置，请联系运营。");
	let response;
	try {
		response = await axios.get(`${url.origin}/api/legacy/players/${encodeURIComponent(uid)}/${legacySections[section]}`, {
			...backendConnectionPools,
			headers: { Authorization: `Bearer ${token}` },
			params: {
				page,
				pageSize: 5
			},
			timeout,
			maxRedirects: 0,
			validateStatus: () => true
		});
	} catch {
		throw new Error("旧版资料服务暂时无法连接，请稍后再试。");
	}
	if (response.status === 404) throw new Error("未找到该旧版存档。请使用 /前世 旧UID 查询；这里的 UID 是旧版 user.uid，不是新版角色编号。");
	if (response.status === 401) throw new Error("旧版资料服务认证失败，请联系运营检查配置。");
	if (response.status !== 200) throw new Error("旧版资料查询失败，请稍后再试。");
	const body = response.data;
	if (!archiveRow(body) || body.uid !== uid || !archiveRow(body.data)) throw new Error("旧版资料响应不完整，请稍后再试。");
	return body.data;
}

//#endregion
export { archiveRow, getLegacyArchive, legacySections };
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { EncyclopediaFormatGui } from "../../utils/encyclopediaMessage.js";
import { onResponse } from "alemonjs";

//#region src/response/encyclopedia/res.ts
/** /图鉴 [分类] [子分类]：公共查询入口，分类和资料由网页管理。 */
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	await message.send(EncyclopediaFormatGui({
		text: e.MessageText ?? "",
		bid: e.UserId,
		isPrivate: e.isPrivate ?? false
	}));
});

//#endregion
export { res_default as default };
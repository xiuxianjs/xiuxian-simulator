import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { EncyclopediaFormatGui } from "../../../utils/encyclopediaMessage.js";
import { onResponse } from "alemonjs";

//#region src/response/encyclopedia/detail/res.ts
/** 保留旧 /图鉴详情 <分类> <编号>，转为直接打开网页条目。 */
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	await message.send(EncyclopediaFormatGui({
		text: e.MessageText ?? "",
		detail: true,
		bid: e.UserId,
		isPrivate: e.isPrivate ?? false
	}));
});

//#endregion
export { res_default as default };
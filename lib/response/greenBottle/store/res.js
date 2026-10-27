import { parseGreenBottleCapacity } from "../../../api/bot/green-bottle-storage-capacity.js";
import { parseGreenBottleStore } from "../../../api/bot/green-bottle-store.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import { parseStoreParams } from "../../../response-apps/greenBottle/store/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/greenBottle/store/res.ts
/**
* 小绿瓶存储指令
* 指令格式：/小绿瓶存储 <数量>
* 将溢出修为按服务端成本转换为小绿瓶
*/
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msgText = parseStoreParams(e.MessageText || "");
	if (!msgText) {
		const business = await loadFinalBusiness(e, next, "green-bottle.capacity", {}, parseGreenBottleCapacity);
		if (business.handled) return;
		const capacity = await business.load();
		const md = Format.createMarkdown();
		md.addText("当境界达到版本上限且修为溢出时，可将多余修为存入小绿瓶(特殊币种)");
		md.addNewline();
		md.addText(`每 ${capacity.experienceCost} 修为 = 1 瓶小绿瓶`);
		const maxAvailable = capacity.maxAvailable;
		if (maxAvailable > 0) {
			md.addNewline();
			md.addText(`当前可存储：${maxAvailable} 瓶`);
		}
		const footer = [
			{
				label: "存 1 瓶",
				command: "/小绿瓶存储 1"
			},
			{
				label: "存 10 瓶",
				command: "/小绿瓶存储 10"
			},
			{
				label: `全部存储(${maxAvailable})`,
				command: `/小绿瓶存储 ${maxAvailable || 9999}`
			}
		];
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "小绿瓶存储",
			content: md,
			footer
		}));
		return;
	}
	const parsed = parseInt(msgText, 10);
	if (isNaN(parsed) || parsed < 1) {
		const business = await loadFinalBusiness(e, next, "green-bottle.capacity", {}, parseGreenBottleCapacity);
		if (business.handled) return;
		const capacity = await business.load();
		const md = Format.createMarkdown();
		md.addText("❌ 数量必须为正整数");
		md.addNewline();
		md.addText(`💡 每 ${capacity.experienceCost} 修为可转换 1 瓶小绿瓶`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "小绿瓶存储",
				command: "/小绿瓶存储"
			}]
		}));
		return;
	}
	const business = await loadFinalBusiness(e, next, "green-bottle.store", { count: parsed }, parseGreenBottleStore);
	if (business.handled) return;
	const result = await business.load();
	const md = Format.createMarkdown();
	if (result.success) {
		md.addText("✅ 存储成功");
		md.addNewline();
		md.addText(`🧪 获得小绿瓶：${result.converted} 瓶`);
		if (result.converted < parsed) md.addText(`（溢出修为最多可转 ${result.converted} 瓶）`);
		md.addNewline();
		md.addText(`📦 当前小绿瓶：${result.totalBottles} 瓶`);
		md.addNewline();
		md.addText(`📊 剩余修为：${result.remainingExp}`);
	} else md.addText(`❌ ${result.message}`);
	const footer = result.success ? [{
		label: "继续存储",
		command: "/小绿瓶存储"
	}, {
		label: "我的信息",
		command: "/我"
	}] : [{
		label: "小绿瓶存储",
		command: "/小绿瓶存储"
	}];
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "小绿瓶存储",
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };
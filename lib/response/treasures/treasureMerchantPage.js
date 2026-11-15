import { section } from "../presentation/sections.js";
import "../presentation/index.js";
import { Format } from "alemonjs";

//#region src/response/treasures/treasureMerchantPage.ts
const number = (value) => new Intl.NumberFormat("zh-CN").format(value);
const treasureMerchantNavigation = [
	{
		label: "返回上古遗珍",
		command: "/上古遗珍",
		autoEnter: false
	},
	{
		label: "刷新商店",
		command: "/上古遗珍 秘宝商人",
		autoEnter: false
	},
	{
		label: "我的礼盒",
		command: "/储物袋 礼盒",
		autoEnter: false
	}
];
/** Each product follows the established shop card: name, price, quota, exchange. */
function buildTreasureMerchantPage(data) {
	const content = Format.createMarkdown();
	content.addText(`仙蕴：${data.xianYun}`).addNewline().addNewline();
	for (const product of data.products) {
		const period = product.period === "monthly" ? "月" : "周";
		const limit = product.remaining === null ? "不限购" : `${period}限购${product.limit} · 剩余${product.remaining}`;
		const lines = [`价格：${number(product.unitPrice)}仙蕴`, `条件：${limit}`];
		if (product.kind === "map" && product.nextUnitPrice !== void 0) lines.push(`本档兑换完后自动更新为每张${number(product.nextUnitPrice)}仙蕴。`);
		if (product.kind === "lootbox") lines.push("兑换后放入背包，开启时自选一件同稀有度完整宝物。");
		if (!product.available && product.unavailableReason) lines.push(product.unavailableReason);
		content.addBlockquote(section({
			title: product.name,
			lines,
			actions: product.available ? [{
				label: "兑换",
				command: `/上古遗珍 兑换 ${product.sku} 1`,
				autoEnter: false
			}] : []
		}));
	}
	content.addText("兑换链接填入预览指令，可修改末尾数量；确认后按本次清单结算。").addNewline();
	content.addText("藏宝图每次只兑换当前价位，换完本档后再查看新价格。周限购每周一、月限购每月1日北京时间0点重置。").addNewline();
	return content;
}

//#endregion
export { buildTreasureMerchantPage, treasureMerchantNavigation };
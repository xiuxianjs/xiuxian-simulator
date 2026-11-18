import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { parseBackendOwnPlayerShop } from "../../../../api/bot/player-shop-own.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/shop/playerShop/mine/res.ts
/** 共享导航 */
const SHOP_HEADER = [
	{
		label: "小店列表",
		command: "/小店"
	},
	{
		label: "我的小店",
		command: "/我的小店"
	},
	{
		label: "珍宝楼",
		command: "/珍宝楼"
	}
];
/**
* 我的小店指令
* - 指令格式：/我的小店
* - 展示自己店铺的详情信息
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的小店",
			content: md,
			header: SHOP_HEADER,
			footer: [
				{
					label: "重命名",
					command: "/命名店铺 "
				},
				{
					label: "店铺简介",
					command: "/店铺简介 "
				},
				{
					label: "调整上架",
					command: "/我的上架"
				},
				{
					label: "上架",
					command: "/交易上架"
				}
			]
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "player-shop.mine", {}, parseBackendOwnPlayerShop, next, async (reply) => {
			await sendFailure(reply.text);
		});
		if (loaded.handled) return;
		const shop = loaded.data;
		const contentMd = Format.createMarkdown();
		contentMd.addText(`店铺名：「${shop.shopName}」`);
		contentMd.addNewline();
		if (shop.description) {
			contentMd.addText(`简介：${shop.description}`);
			contentMd.addNewline();
		}
		contentMd.addNewline();
		contentMd.addText(`等级：${shop.levelName}（Lv.${shop.level}）`);
		contentMd.addNewline();
		contentMd.addText(`交易热度：${shop.heatScore}`);
		contentMd.addNewline();
		contentMd.addText(`累计成交：${shop.totalSales}笔`);
		contentMd.addNewline();
		contentMd.addText(`累计成交额：${shop.totalVolume} 灵晶`);
		contentMd.addNewline();
		contentMd.addText(`在售物品：${shop.activeListings}件`);
		contentMd.addNewline();
		contentMd.addNewline();
		contentMd.addBlockquote(Format.createMarkdown().addText("上架物品到珍宝楼即可增加热度").addNewline().addText("每笔成交 +10热度，每成交1000灵晶额外 +1热度").addNewline().addText("热度每日自然衰减2%，保持交易才能维持排名"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的小店",
			header: SHOP_HEADER,
			content: contentMd,
			footer: [
				{
					label: "重命名",
					command: "/命名店铺 "
				},
				{
					label: "店铺简介",
					command: "/店铺简介 "
				},
				{
					label: "调整上架",
					command: "/我的上架"
				},
				{
					label: "上架",
					command: "/交易上架"
				}
			]
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("获取店铺信息失败，请稍后再试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的小店",
			content: md,
			header: SHOP_HEADER,
			footer: [
				{
					label: "重命名",
					command: "/命名店铺 "
				},
				{
					label: "店铺简介",
					command: "/店铺简介 "
				},
				{
					label: "调整上架",
					command: "/我的上架"
				},
				{
					label: "上架",
					command: "/交易上架"
				}
			]
		}));
	}
});

//#endregion
export { res_default as default };
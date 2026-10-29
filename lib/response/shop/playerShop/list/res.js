import { FormatGui, createQuoteMarkdown } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { parseBackendShopList } from "../../../../api/bot/shop-queries.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/shop/playerShop/list/res.ts
/** 店铺等级对应的标识 */
const LEVEL_ICON = {
	1: "☆",
	2: "★",
	3: "★★",
	4: "★★★",
	5: "★★★★★"
};
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
* 小店列表指令
* - 指令格式：/小店 [页码]
* - 按热度排序展示所有营业中的店铺
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const m = (e.MessageText ?? "").trim().match(/小店(?:\s*(\d+))?/);
	const page = m?.[1] ? Math.max(1, Number(m[1])) : 1;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "修仙小店",
			content: md,
			footer: [{
				label: "返回",
				command: "/珍宝楼"
			}]
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "player-shop.list", { page: String(page) }, parseBackendShopList, next, async (reply) => {
			await sendFailure(reply.text);
		});
		if (loaded.handled) return;
		const contentMd = Format.createMarkdown();
		if (loaded.data.data.length === 0) {
			contentMd.addText("暂无开张的小店");
			contentMd.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "修仙小店",
				header: SHOP_HEADER,
				content: contentMd,
				footer: [{
					label: "坊市交易",
					command: "/更多 交易"
				}]
			}));
			return;
		}
		const startRank = (loaded.data.pagination.currentPage - 1) * 10;
		loaded.data.data.forEach((shop, idx) => {
			const rank = startRank + idx + 1;
			const icon = LEVEL_ICON[shop.level] ?? "☆";
			const detail = `热度：${shop.heatScore}、在售：${shop.activeListings}件、成交：${shop.totalSales}笔`;
			contentMd.addBlockquote(createQuoteMarkdown([
				`【${rank}】${icon}「${shop.shopName}」`,
				`店主：${shop.ownerName}(${shop.levelName})`,
				detail
			], [{
				label: "进店",
				command: `/逛店 ${shop.userId}`
			}]));
		});
		const { currentPage, totalPages, total } = loaded.data.pagination;
		const footer = [{
			label: "坊市交易",
			command: "/更多 交易"
		}];
		if (currentPage > 1) footer.push({
			label: "上一页",
			command: `/小店 ${currentPage - 1}`
		});
		if (currentPage < totalPages) footer.push({
			label: "下一页",
			command: `/小店 ${currentPage + 1}`
		});
		contentMd.addText(`第${currentPage}/${totalPages}页 共${total}家店铺`);
		contentMd.addNewline();
		contentMd.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "修仙小店",
			header: SHOP_HEADER,
			content: contentMd,
			footer
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("获取店铺列表失败");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "修仙小店",
			content: md,
			footer: [{
				label: "返回",
				command: "/珍宝楼"
			}]
		}));
	}
});

//#endregion
export { res_default as default };
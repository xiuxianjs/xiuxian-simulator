import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { Format } from "alemonjs";

//#region src/markdown/buttons/guild.ts
/**
* 宗门商店按钮
*/
const createGuildShopButtons = () => {
	const bt = Format.createMarkdown();
	bt.addNewline();
	bt.addNewline();
	bt.addButton(markdownButtonLabel("返回宗门"), { data: "/我的宗门" });
	bt.addText(" ");
	bt.addButton(markdownButtonLabel("刷新"), { data: "/宗门商店 刷新" });
	return bt;
};
/**
* 宗门商店兑换按钮
*/
const createGuildShopExchangeButtons = () => {
	return [[{
		label: "商店",
		command: "/宗门商店"
	}, {
		label: "返回宗门",
		command: "/我的宗门"
	}]];
};
/**
* 宗门红包列表翻页按钮
*/
const createGuildRedPacketButtons = (page, totalPages) => {
	const rows = [];
	const navRow = [];
	if (page > 1) navRow.push({
		label: "上一页",
		command: `/宗门红包 ${page - 1}`
	});
	if (page < totalPages) navRow.push({
		label: "下一页",
		command: `/宗门红包 ${page + 1}`
	});
	if (navRow.length > 0) rows.push(navRow);
	rows.push([
		{
			label: "发红包",
			command: "/发红包"
		},
		{
			label: "我发的红包",
			command: "/我发的红包"
		},
		{
			label: "返回宗门",
			command: "/我的宗门"
		}
	]);
	return rows;
};
/**
* 宗门精华翻页按钮
*/
const createGuildEssenceButtons = (page, totalPages) => {
	const rows = [];
	const navRow = [];
	if (page > 1) navRow.push({
		label: "上一页",
		command: `/宗门精华 ${page - 1}`
	});
	if (page < totalPages) navRow.push({
		label: "下一页",
		command: `/宗门精华 ${page + 1}`
	});
	if (navRow.length > 0) rows.push(navRow);
	rows.push([{
		label: "添加精华",
		command: "/添加精华"
	}, {
		label: "返回宗门",
		command: "/我的宗门"
	}]);
	return rows;
};
/**
* 宗门日志翻页按钮
*/
const createGuildLogButtons = (page, totalPages) => {
	const rows = [];
	const navRow = [];
	if (page > 1) navRow.push({
		label: "上一页",
		command: `/宗门日志 ${page - 1}`
	});
	if (page < totalPages) navRow.push({
		label: "下一页",
		command: `/宗门日志 ${page + 1}`
	});
	if (navRow.length > 0) rows.push(navRow);
	rows.push([{
		label: "返回宗门",
		command: "/我的宗门"
	}]);
	return rows;
};

//#endregion
export { createGuildEssenceButtons, createGuildLogButtons, createGuildRedPacketButtons, createGuildShopButtons, createGuildShopExchangeButtons };
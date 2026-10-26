import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseGuildMyRedPackets } from "../../../api/bot/guild-my-red-packets-queries.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/myRedPackets/res.ts
/**
* 我发的红包指令
* 指令格式：/我发的红包 或 /我发的红包 页码
*
* 展示自己发出的红包列表：
*   - 发放中的红包：显示领取进度和剩余时间
*   - 已领完的红包：显示已领完
*   - 已过期的红包：显示【已过期】，未回收的可点击回收
*   - 已回收的红包：显示【已回收】
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.my-red-packets", {}, parseGuildMyRedPackets, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "获取红包列表失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const guildName = loaded.data.guildName !== null && loaded.data.guildName !== "" ? loaded.data.guildName : "未知宗门";
	const allPackets = loaded.data.packets;
	const pageMatch = (e.MessageText ?? "").trim().match(/^[!！/#＃]?我发的红包(?:\s*(\d+))?$/);
	let page = pageMatch?.[1] ? parseInt(pageMatch[1], 10) : 1;
	if (!Number.isInteger(page) || page < 1) page = 1;
	const limit = 5;
	const offset = (page - 1) * limit;
	if (!allPackets || allPackets.length === 0) {
		const md = Format.createMarkdown();
		md.addText("你还没有发过红包。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const totalPages = Math.max(1, Math.ceil(allPackets.length / limit));
	if (page > totalPages) {
		const md = Format.createMarkdown();
		md.addBold(`【${guildName}】我发的红包`);
		md.addNewline();
		md.addText(`页码超出范围：总页数为 ${totalPages} 页`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const pageList = allPackets.slice(offset, offset + limit);
	const md = Format.createMarkdown();
	for (const p of pageList) {
		const packetId = Number(p.id);
		md.addText(`【${packetId}】${p.currencyName}×${Number(p.perAmount)} ${Number(p.claimedCount)}/${Number(p.packetCount)}份 ${p.statusText}`);
		if (p.canRecycle) addOptions(md, [{
			label: `回收 ${p.recycleAmount}${p.currencyName}`,
			command: `/回收红包 ${packetId}`
		}]);
		else md.addNewline();
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `【${guildName}】我发的红包`,
		content: md,
		footer: [{
			label: "发红包",
			command: "/发红包"
		}, {
			label: "宗门红包",
			command: "/宗门红包"
		}],
		nav: totalPages > 1 ? {
			current: page,
			total: totalPages,
			count: allPackets.length,
			command: "/我发的红包 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };
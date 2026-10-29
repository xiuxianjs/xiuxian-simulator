import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotCompanionPropose } from "../../../api/bot/companion-propose-robot.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/companion/propose/res.ts
/**
* 结为道侣指令
* - /结为道侣                   → 显示我的好友（排除已有道侣关系），带分页和[结缘]按钮
* - /结为道侣 2                 → 我的好友第2页
* - /结为道侣 <名称|UID|@目标>         → 发起道侣申请（仅一种誓约道具时直接使用；多种时列出供选择）
* - /结为道侣 <名称|UID|@目标> <序号>  → 直接使用第 <序号> 个誓约道具发起申请
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?结为道侣(\s+(.+))?$/);
	if (!match) return next();
	const args = (match?.[2]?.trim() ?? "").split(/\s+/).filter(Boolean);
	const first = args[0];
	const isPureNumber = !!first && /^\d+$/.test(first);
	const rawOathIndex = args.length >= 2 && /^\d+$/.test(args[1]) ? Number(args[1]) : void 0;
	const oathIndex = rawOathIndex === void 0 ? void 0 : Number.isSafeInteger(rawOathIndex) ? rawOathIndex : Number.MAX_SAFE_INTEGER;
	const isCommand = !!first && (oathIndex !== void 0 || !isPureNumber || Number(first) > 100);
	const mentioned = isCommand && !isPureNumber ? await mention.findOne() : null;
	const page = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) || 1 : 1;
	const input = isCommand ? {
		mode: "command",
		target: first,
		targetBid: mentioned?.data?.UserId ?? void 0,
		oathIndex,
		fallbackPage: isPureNumber ? Number(first) || 1 : 1
	} : {
		mode: "friends",
		page: String(page)
	};
	const response = await runRobotBusiness(e, "companion.propose", input, parseRobotCompanionPropose, next, async (reply) => {
		const md = Format.createMarkdown().addText(reply.text);
		if (reply.quote) md.addNewline().addBlockquote(Format.createMarkdown().addText(reply.quote));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: md,
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	if (response.data.mode === "command") {
		const command = response.data.command;
		const { preflight } = command;
		if (command.code === "COMPLETED") {
			const md = Format.createMarkdown();
			md.addText(command.mutationError ?? command.result?.message ?? "发起道侣申请失败，请稍后再试");
			if (!command.mutationError && command.result?.success) addOptions(md, [{
				label: "同意结缘",
				command: `/同意道侣 ${command.result.initiatorName}`
			}, {
				label: "拒绝结缘",
				command: `/拒绝道侣 ${command.result.initiatorName}`
			}]);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		} else {
			const oathItems = preflight.oathItems;
			const targetName = preflight.target.name;
			const selectMd = Format.createMarkdown();
			selectMd.addBold(`向「${targetName}」发起道侣申请`);
			selectMd.addNewline();
			selectMd.addText("请选择誓约道具：");
			selectMd.addNewline();
			selectMd.addNewline();
			for (let i = 0; i < oathItems.length; i++) {
				const item = oathItems[i];
				const typeLabel = item.oathType === "advanced" ? "高级誓约" : "普通誓约";
				selectMd.addText(`【${i + 1}】${item.name}（${typeLabel}）x${item.quantity}`);
				selectMd.addNewline();
				selectMd.addBlockquote(Format.createMarkdown().addText(`${item.desc}`));
			}
			selectMd.addNewline();
			const footer = [];
			for (let i = 0; i < oathItems.length; i++) footer.push({
				label: oathItems[i].name,
				command: `/结为道侣 ${targetName} ${i + 1}`
			});
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "选择誓约道具",
				content: selectMd,
				footer
			}));
			return;
		}
	}
	const { friends: eligibleFriends, currentPage, totalPages, totalCount } = response.data.preflight;
	if (totalCount === 0) {
		const noFriendMd = Format.createMarkdown();
		noFriendMd.addBold("【结为道侣】");
		noFriendMd.addNewline();
		noFriendMd.addText("当前没有可结缘的好友");
		noFriendMd.addNewline();
		noFriendMd.addBlockquote(Format.createMarkdown().addText("需要先 ").addButton(markdownButtonLabel("结交好友"), { data: "/结交 " }).addText("，双方成为好友后方可结缘"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: noFriendMd
		}));
		return;
	}
	const contentMd = Format.createMarkdown();
	contentMd.addBlockquote(Format.createMarkdown().addText("点击 [结缘] 向好友发起道侣申请"));
	contentMd.addText(totalPages > 1 ? "我的好友" : `我的好友（${totalCount}人）`);
	contentMd.addNewline();
	contentMd.addBlockquote(Format.createMarkdown().addText("要求：双方为好友且灵契值≥100，需持有誓约道具"));
	for (const friend of eligibleFriends) {
		contentMd.addText(`${friend.friendName}（${friend.friendRealm}）`);
		contentMd.addNewline();
		contentMd.addBlockquote(addOptions(Format.createMarkdown().addText(`${friend.spiritBondLevel}（${friend.intimacy}） `), [{
			label: "结缘",
			command: `/结为道侣 ${friend.friendName}`
		}]));
		contentMd.addNewline();
	}
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "结为道侣",
		header: [{
			label: "返回",
			command: "/我的道侣"
		}],
		content: contentMd,
		nav: totalPages > 1 ? {
			current: currentPage,
			total: totalPages,
			count: totalCount,
			command: "/结为道侣 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };
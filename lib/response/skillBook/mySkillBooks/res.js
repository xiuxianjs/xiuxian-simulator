import { parseRobotLearnedBooks } from "../../../api/bot/learned-books-queries.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { MIN_PAGE } from "../../../constants/common.js";
import { SKILL_TYPE_BATTLE, SKILL_TYPE_MYSTIC, SKILL_TYPE_PASSIVE } from "../../../constants/skillBook.js";
import "../../../constants/index.js";
import { buildLearnedBookListCommand, createLearnedBookSortRows, learnedBookSortLabel, parseLearnedBookListCommand } from "../../../utils/learnedBookSort.js";
import { formatSkillBookListItem } from "../../../utils/skillBookHelper.js";
import { skillInventoryRecoveryTips } from "../../skillInventoryRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/mySkillBooks/res.ts
const EMPTY_TOTAL = 0;
const SKILL_SLOTS = [
	SKILL_TYPE_BATTLE,
	SKILL_TYPE_MYSTIC,
	SKILL_TYPE_PASSIVE
];
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, parentNext] = useEvent();
	const selection = parseLearnedBookListCommand(e.MessageText ?? "");
	const pageCommand = buildLearnedBookListCommand(selection.sort, "{page}");
	const failed = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.learned", {
		...reply,
		title: reply.title || "我的功法"
	}), "footer"));
	const response = await runRobotBusiness(e, "skill-books.learned", {
		page: selection.page,
		...selection.sort ? { sort: selection.sort } : {}
	}, parseRobotLearnedBooks, parentNext, failed).catch(async () => {
		await failed({
			title: "",
			heading: "",
			text: "功法列表未获完整确认，请先核对当前列表与原反馈。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	const page = response.data.displayPage;
	const result = { data: response.data.page };
	const { inUseBooks, items, total, totalPages, currentPage, proficiencyPoints } = result.data;
	const emptyMessage = inUseBooks.length ? "💡当前可见列表为空，可核对装备槽位与隐藏列表" : "💡暂无已学习的功法";
	const slotContent = Format.createMarkdown();
	slotContent.addText(`持有熟练点：${proficiencyPoints}`);
	slotContent.addNewline();
	slotContent.addNewline();
	SKILL_SLOTS.forEach((slotType) => {
		const equipped = inUseBooks.find((book) => book.skillType === slotType);
		if (equipped) {
			const actionMd = Format.createMarkdown().addText(`${slotType}：${equipped.slotText} `);
			actionMd.addButton(markdownButtonLabel("选择"), { data: `/切换${slotType}` });
			actionMd.addText(" ");
			actionMd.addButton(markdownButtonLabel("查看"), { data: `/查看功法 ${equipped.id}` });
			actionMd.addText(" ");
			actionMd.addButton(markdownButtonLabel("换下"), { data: `/换下${slotType}` });
			slotContent.addBlockquote(actionMd);
		} else slotContent.addBlockquote(Format.createMarkdown().addText(`${slotType}：空 `).addButton(markdownButtonLabel("选择"), { data: `/切换${slotType}` }));
	});
	if (page === 1) {
		if (total === EMPTY_TOTAL) {
			slotContent.addText(emptyMessage).addNewline();
			appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips("skill-books.learned", "可见列表为空"));
		}
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的功法",
			header: [{
				label: "返回",
				command: "/属性面板"
			}],
			content: slotContent,
			footer: [
				...total > EMPTY_TOTAL ? [{
					label: "功法列表",
					command: buildLearnedBookListCommand(selection.sort)
				}] : [],
				...result.data.canUseFifthLayerFeature ? [{
					label: "战斗模板",
					command: "/战斗模板"
				}] : [],
				{
					label: "一键学习",
					command: "/一键学习功法"
				},
				{
					label: "功法书",
					command: "/储物袋 功法"
				},
				{
					label: "隐藏列表",
					command: "/我的隐藏功法"
				}
			],
			...total > EMPTY_TOTAL ? { nav: {
				current: 1,
				total: totalPages + 1,
				command: pageCommand
			} } : {}
		}));
		return;
	}
	if (total === EMPTY_TOTAL) {
		slotContent.addText(emptyMessage);
		appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips("skill-books.learned", "可见列表为空"));
		slotContent.addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的功法",
			header: [{
				label: "返回",
				command: "/属性面板"
			}],
			content: slotContent,
			footer: [{
				label: "一键学习",
				command: "/一键学习功法"
			}, {
				label: "功法书",
				command: "/储物袋 功法"
			}]
		}));
		return;
	}
	if (items.length === EMPTY_TOTAL && total > EMPTY_TOTAL) {
		slotContent.addText("❌ 页码超出范围");
		slotContent.addNewline();
		slotContent.addText(`总功法数: ${total}，请选择 2-${totalPages + 1} 之间的页码`);
		appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips("skill-books.learned", "页码超出范围"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的功法",
			header: [{
				label: "返回",
				command: "/属性面板"
			}],
			content: slotContent,
			nav: {
				current: 1 + 1,
				total: totalPages + 1,
				count: total,
				command: pageCommand
			},
			footer: [{
				label: "一键学习",
				command: "/一键学习功法"
			}, {
				label: "功法书",
				command: "/储物袋 功法"
			}]
		}));
		return;
	}
	const skillBookItems = items.map((skillBook) => ({
		id: skillBook.id,
		text: formatSkillBookListItem(skillBook, skillBook.id),
		attrText: skillBook.attributeSummary
	}));
	const listContent = Format.createMarkdown();
	listContent.addText(`已学功法${selection.sort ? ` · ${learnedBookSortLabel(selection.sort)}` : ""}`).addNewline();
	skillBookItems.forEach((item) => {
		const lines = [item.text];
		if (item.attrText) lines.push(item.attrText);
		listContent.addBlockquote(createQuoteMarkdown(lines, [{
			label: "查看",
			command: `/查看功法 ${item.id}`
		}, {
			label: "连续升级",
			command: `/升级功法 ${item.id} 选择`
		}]));
	});
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的功法",
		header: [{
			label: "返回",
			command: "/我的功法"
		}],
		content: listContent,
		footer: [...createLearnedBookSortRows(selection.sort), [
			...result.data.canUseFifthLayerFeature ? [{
				label: "战斗模板",
				command: "/战斗模板"
			}] : [],
			{
				label: "一键学习",
				command: "/一键学习功法"
			},
			{
				label: "一键分解预览",
				command: "/一键分解功法"
			},
			{
				label: "隐藏列表",
				command: "/我的隐藏功法"
			}
		]],
		nav: {
			current: currentPage + 1,
			total: totalPages + 1,
			count: total,
			command: pageCommand
		}
	}));
});

//#endregion
export { response as default };
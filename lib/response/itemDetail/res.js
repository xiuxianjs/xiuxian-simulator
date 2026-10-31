import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../middlewareReply.js";
import { parseItemDetail } from "../../api/bot/item-detail-queries.js";
import { detailRecoveryTips } from "../detailRecovery.js";
import { selects } from "../config.js";
import { loadFinalBusiness } from "../finalBusiness.js";
import App from "../../response-apps/itemDetail/app.js";
import { buildEquipmentDetail, buildItemDetail, buildProfessionToolDetail, buildSkillBookDetail } from "./builders.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/itemDetail/res.ts
/** 物品详情指令：通过名称查看物品/装备模板/功法模板信息 */
const COMMAND_PREFIX = /^(!|！|\/|#|＃)?物品详情\s*/;
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const raw = (e.MessageText ?? "").trim().replace(COMMAND_PREFIX, "").trim();
	const input = raw;
	const match = input.match(/^(道具|材料|物品|装备|天工|功法)\s+(\d+)$/);
	const query = match ? {
		category: {
			道具: "item",
			材料: "item",
			物品: "item",
			装备: "equipment",
			天工: "profession_tool",
			功法: "skill_book"
		}[match[1]],
		entryId: Number(match[2])
	} : { name: input };
	const business = await loadFinalBusiness(e, next, "items.detail", query, (value) => parseItemDetail(value, query));
	if (business.handled) return;
	const uid = e.uid;
	const result = await App({
		load: business.load,
		bid,
		uid,
		rawInput: raw
	});
	if (result.code === "NO_INPUT") {
		const md = Format.createMarkdown();
		md.addText("请输入物品名称");
		md.addNewline();
		md.addButton(markdownButtonLabel("储物袋"), { data: "/储物袋" });
		appendMiddlewareAdvice(md, detailRecoveryTips("items.detail", "缺少参数"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "物品详情",
			content: md
		}));
		return;
	}
	if (result.code === "LOAD_FAILED") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		appendMiddlewareAdvice(md, detailRecoveryTips("items.detail", "查询失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "物品详情",
			content: md
		}));
		return;
	}
	const { itemRow, equipRow, professionToolRow, sbRow, name, facts } = result.data;
	const contentMd = Format.createMarkdown();
	if (itemRow) {
		const item = itemRow;
		const grade = item.grade ?? null;
		buildItemDetail(item, grade, contentMd, uid, facts.item);
	} else if (equipRow) {
		const equip = equipRow;
		const grade = equip.grade ?? null;
		buildEquipmentDetail(equip, grade, contentMd, facts.equipment);
	} else if (professionToolRow) {
		const tool = professionToolRow;
		const grade = tool.grade ?? null;
		buildProfessionToolDetail(tool, grade, contentMd, facts.profession_tool);
	} else if (sbRow) {
		const sb = sbRow;
		const grade = sb.grade ?? null;
		buildSkillBookDetail(sb, grade, contentMd, facts.skill_book);
	} else {
		contentMd.addText(match ? `未找到${match[1]}模板（编号 ${match[2]}）` : `未找到名为「${name}」的物品、装备、天工或功法`);
		contentMd.addNewline();
		contentMd.addText("请检查名称是否正确");
		appendMiddlewareAdvice(contentMd, detailRecoveryTips("items.detail", "未找到模板"));
	}
	if (result.data.matches.length > 1) {
		const labels = {
			item: "物品",
			equipment: "装备",
			profession_tool: "天工",
			skill_book: "功法"
		};
		contentMd.addNewline().addText("存在跨分类同名模板，可按分类查看：");
		appendMiddlewareAdvice(contentMd, result.data.matches.map((entry) => ({
			command: `/物品详情 ${labels[entry.category]} ${entry.id}`,
			description: `${labels[entry.category]}：${entry.name}（模板编号 ${entry.id}），此处查询模板信息，不代表本人持有该实例`
		})));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "物品详情",
		content: contentMd
	}));
});

//#endregion
export { res_default as default };
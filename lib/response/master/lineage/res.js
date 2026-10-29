import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterLineage } from "../../../api/bot/master-lineage-queries.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/lineage/res.ts
const renderLineageNode = (md, node, depth) => {
	const indent = "  ".repeat(depth);
	const selfText = node.isSelf ? "【自己】" : "";
	const relationStatusText = node.relationStatusText === "已出师" ? "已出师" : node.relationStatusText;
	const relationText = relationStatusText ? ` · ${relationStatusText}` : "";
	md.addText(`${indent}${depth === 0 ? "始祖" : `第${depth}代`}：${node.userName}${selfText} · ${node.realmName}${relationText}`);
	md.addNewline();
	node.disciples.forEach((child) => {
		renderLineageNode(md, child, depth + 1);
	});
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "master.lineage", {}, parseMasterLineage, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		const md = Format.createMarkdown().addText("获取师谱失败，请稍后重试");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.lineage", "获取师谱失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addBold("【师谱】");
	md.addNewline();
	if (!result.root) {
		md.addText("你当前还未形成可追溯的师承谱系。");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.lineage", "未形成可追溯的师承谱系"));
	} else {
		renderLineageNode(md, result.root, 0);
		if (result.root.isSelf && result.root.disciples.length === 0) {
			md.addText("师谱当前仅展示本人。");
			appendMiddlewareAdvice(md, masterRecoveryTips("master.lineage", "师谱当前仅展示本人"));
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [[{
			label: "我的师门",
			command: "/我的师门"
		}, {
			label: "圣人榜",
			command: "/圣人榜"
		}]]
	}));
});

//#endregion
export { res_default as default };
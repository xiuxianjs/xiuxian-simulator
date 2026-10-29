import { Format, getAppConfigValue, useEvent, useMe, useMessage } from "alemonjs";
import { platform } from "@alemonjs/qq-bot";

//#region src/response/admins/res.ts
var res_default = async () => {
	const [ref, next] = useEvent();
	const event = ref.current;
	const match = /^(?:\/|#|＃)?(?:管理|权限|设置)(?:\s+(\d+))?\s*$/.exec(event.MessageText?.trim() ?? "");
	if (match && event.Platform === platform) {
		let groupQQ = null;
		if (match[1]) groupQQ = match[1];
		const [message] = useMessage();
		const md = Format.createMarkdown();
		const bt = Format.createButtonGroup();
		bt.addRow();
		if (groupQQ) {
			md.addBold("「修仙模拟器」权限设置");
			md.addNewline();
			md.addText("> ⚠️ 仅限群主可操作");
			md.addNewline();
			md.addNewline();
			md.addText("权限一、群内消息（单选）");
			md.addNewline();
			md.addText("权限二、群内主动发言（开关）");
			md.addNewline();
			const [me] = useMe();
			const share = await me.share();
			if (share?.data?.url) {
				const botUin = new URL(share?.data?.url).searchParams.get("robot_uin");
				const baseURL = "https://club.vip.qq.com/transfer";
				const key = "open_kuikly_info";
				const botUid = getAppConfigValue()?.botUid ?? "u_mJL2pN6Q7SuYuDZ60wyi6w";
				const openKuiklyInfo = {
					page_name: "ai_group_service_agreement_pop_page",
					groupCode: groupQQ,
					botUin,
					botUid,
					screen: 1
				};
				bt.addButton("打开设置", `${baseURL}?${key}=${encodeURIComponent(JSON.stringify(openKuiklyInfo))}`, { type: "link" });
			}
		} else {
			md.addBold("「修仙模拟器」权限设置");
			md.addNewline();
			md.addText("权限一、群内消息（单选）");
			md.addNewline();
			md.addText("- 全部消息(推荐,完整版)");
			md.addNewline();
			md.addText("- 仅@机器人(默认,单机版)");
			md.addNewline();
			md.addNewline();
			md.addText("权限二、群内主动发言（开关）");
			md.addNewline();
			md.addText("> 请输入群号,获得当前群权限设置");
			md.addNewline();
			md.addNewline();
			md.addText("💡 @修仙模拟器 /设置 「群号」");
			md.addNewline();
			bt.addButton("点击输入群号", "/设置 「群号」");
		}
		const format = Format.create();
		format.addMarkdown(md);
		format.addButtonGroup(bt);
		message.send({ format });
	} else next();
};

//#endregion
export { res_default as default };
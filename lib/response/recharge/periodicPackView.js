import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { buildRechargeProductCard, createRechargeProductQuote, offerPromotionLines } from "./productView.js";
import { Format } from "alemonjs";

//#region src/response/recharge/periodicPackView.ts
function buildPeriodicPackFeedback(reply) {
	const content = Format.createMarkdown();
	if (reply.rawLines) return content.addText(reply.rawLines.join("\n"));
	if (reply.heading) content.addBold(reply.heading).addNewline();
	if (!reply.blocks?.length || reply.blocks.map((block) => block.text).join("") !== reply.text) content.addText(reply.text).addNewline();
	if (reply.quote) content.addBlockquote(createRechargeProductQuote([reply.quote]));
	for (const block of reply.blocks ?? []) if (block.quoted) content.addBlockquote(createRechargeProductQuote([block.text], block.inlineButtons));
	else {
		content.addText(block.text).addNewline();
		for (const button of block.inlineButtons ?? []) content.addButton(markdownButtonLabel(button.label), {
			data: button.command,
			autoEnter: false
		});
	}
	for (const tip of reply.advice) content.addBlockquote(createRechargeProductQuote([tip.description], [{
		label: tip.command.replace(/^\//, ""),
		command: tip.command,
		autoEnter: false
	}]));
	return content;
}
function buildPeriodicPackProductPage(data, input = []) {
	const content = Format.createMarkdown();
	const category = data.period === "weekly" ? "周礼包" : "月礼包";
	const cycle = data.period === "weekly" ? "每周" : "每月";
	const label = (priceAmount) => `${priceAmount / 100}元`;
	const tierLabel = (product) => product.isBundle ? `${label(product.basePriceAmount)}全包` : data.period === "monthly" ? product.name : label(product.basePriceAmount);
	const shortLabels = {
		夺宝达人礼包: "夺宝达人",
		超大大大大灵脉: "超大灵脉"
	};
	if (!data.products.length) return content.addText(`${category}暂未开放。`);
	const selected = input.length === 0 ? data.products[0] : input.length === 1 ? data.products.find((product) => product.sku === input[0] || tierLabel(product) === input[0] || shortLabels[product.name] === input[0]) : void 0;
	for (const product of data.products) content.addButton(markdownButtonLabel(shortLabels[tierLabel(product)] ?? tierLabel(product), product === selected), {
		data: `/充值 ${category} ${tierLabel(product)}`,
		autoEnter: false
	});
	content.addNewline().addNewline();
	if (!selected) return content.addText(`请选择${data.products.map(tierLabel).join("、")}。`);
	content.absorb(buildRechargeProductCard({
		heading: `${tierLabel(selected)}${selected.isBundle || data.period === "monthly" ? "" : "礼包"} · ¥${(selected.priceAmount / 100).toFixed(2)} · ${cycle}限购${selected.remaining}/${selected.limit}`,
		emphasis: selected.label || void 0,
		metadata: [`${data.period === "weekly" ? "本周" : "本月"}自 ${data.periodStart} 起，统一在 ${data.periodEnd} 00:00 刷新（北京时间，周期结束）`, ...selected.isBundle ? [`原价 ¥${(selected.basePriceAmount / 100).toFixed(2)} · 已计入单购金额 ¥${(selected.creditedAmount / 100).toFixed(2)}`] : []],
		lines: [
			...selected.rewardParts.map((reward) => `${reward.name} ×${reward.quantity}`),
			...offerPromotionLines(selected.promotionTexts),
			...selected.isBundle ? ["已成功购买的本期单项按实付抵扣，全包仅补齐剩余权益；有退款或待核对订单时先核账。"] : [],
			selected.unavailableReason
		],
		rewardLineCount: selected.rewardParts.length,
		preserveEmptyLines: true,
		buttons: !data.unresolvedOrderNo && selected.available && selected.packageId !== null && selected.promotionTexts.length ? [{
			label: "购买",
			command: `/充值购买 ${selected.packageId}`,
			autoEnter: false
		}] : []
	}));
	if (!selected.promotionTexts.length && selected.available) content.addText("返利参与资格暂未取得，请刷新后购买。").addNewline();
	if (data.unresolvedOrderNo) content.addBlockquote(createRechargeProductQuote([`待核对订单 ${data.unresolvedOrderNo}，请先核对原订单。`], [{
		label: "查询原订单",
		command: `/查询充值订单 ${data.unresolvedOrderNo}`,
		autoEnter: false
	}, {
		label: "继续支付",
		command: `/继续支付 ${data.unresolvedOrderNo}`,
		autoEnter: false
	}]));
	return content;
}

//#endregion
export { buildPeriodicPackFeedback, buildPeriodicPackProductPage };
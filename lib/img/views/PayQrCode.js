import { PanelFailure, PanelShell, SectionTitle, buildTokens } from "./_panelShared.js";
import * as React from "react";

//#region src/img/views/PayQrCode.tsx
function PayQrCode({ data }) {
	if (!data) return /* @__PURE__ */ React.createElement(PanelFailure, { message: "支付二维码加载失败" });
	const T = buildTokens(data.theme);
	const { qrCodeDataUrl = "", packageName = "", yuan = "", orderNo = "" } = data ?? {};
	return /* @__PURE__ */ React.createElement(PanelShell, { theme: data.theme }, /* @__PURE__ */ React.createElement("div", { style: {
		position: "relative",
		zIndex: 1,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "12px",
		padding: "16px 16px 14px",
		borderBottom: `2px solid ${T.borderMid}`,
		background: T.headerBg
	} }, /* @__PURE__ */ React.createElement("div", { style: {
		display: "flex",
		flexDirection: "column",
		gap: "4px"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "24px",
		fontWeight: "bold",
		color: T.inkDark,
		letterSpacing: "2px"
	} }, "充值购买"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "13px",
		color: T.janglan
	} }, "请在 5 分钟内完成支付")), /* @__PURE__ */ React.createElement("div", { style: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-end",
		gap: "2px",
		border: `2px solid ${T.cinnabar}`,
		borderRadius: "10px 4px 8px 6px",
		padding: "8px 12px",
		background: "linear-gradient(160deg, rgba(200,45,20,0.15) 0%, rgba(160,30,10,0.06) 100%)"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "12px",
		color: T.cinnabar,
		letterSpacing: "2px"
	} }, "金额"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "26px",
		fontWeight: "bold",
		color: T.cinnabar,
		fontFamily: "tttgbnumber, monospace",
		lineHeight: 1
	} }, "¥", yuan))), /* @__PURE__ */ React.createElement("div", { style: {
		position: "relative",
		zIndex: 1,
		margin: "12px 12px 0",
		background: T.card,
		border: `1px solid ${T.border}`,
		borderRadius: "10px 4px 12px 5px",
		boxShadow: "inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)",
		overflow: "hidden"
	} }, /* @__PURE__ */ React.createElement(SectionTitle, { title: "订单信息" }), /* @__PURE__ */ React.createElement("div", { style: {
		padding: "10px 14px",
		display: "flex",
		flexDirection: "column",
		gap: "8px"
	} }, /* @__PURE__ */ React.createElement("div", { style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "10px",
		padding: "8px 10px",
		background: "rgba(255,248,235,0.32)",
		border: `1px solid ${T.border}`,
		borderRadius: "6px 2px 5px 3px"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "14px",
		color: T.inkLight
	} }, "套餐"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "16px",
		color: T.inkDark,
		fontWeight: "bold"
	} }, packageName)), /* @__PURE__ */ React.createElement("div", { style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "10px",
		padding: "8px 10px",
		background: "rgba(255,248,235,0.32)",
		border: `1px solid ${T.border}`,
		borderRadius: "6px 2px 5px 3px"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "14px",
		color: T.inkLight
	} }, "订单号"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "14px",
		color: T.inkDark,
		fontWeight: "bold",
		fontFamily: "monospace",
		textAlign: "right"
	} }, orderNo)), /* @__PURE__ */ React.createElement("div", { style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "10px",
		padding: "8px 10px",
		background: "rgba(255,248,235,0.32)",
		border: `1px solid ${T.border}`,
		borderRadius: "6px 2px 5px 3px"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "14px",
		color: T.inkLight
	} }, "有效期"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "14px",
		color: T.amber,
		fontWeight: "bold"
	} }, "5 分钟")))), /* @__PURE__ */ React.createElement("div", { style: {
		position: "relative",
		zIndex: 1,
		margin: "10px 12px 12px",
		background: T.card,
		border: `1px solid ${T.border}`,
		borderRadius: "5px 12px 4px 10px",
		boxShadow: "inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)",
		overflow: "hidden"
	} }, /* @__PURE__ */ React.createElement(SectionTitle, { title: "扫码支付" }), /* @__PURE__ */ React.createElement("div", { style: {
		padding: "14px 14px 16px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "12px"
	} }, /* @__PURE__ */ React.createElement("div", { style: {
		background: "#ffffff",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "10px",
		border: `1px solid ${T.border}`,
		borderRadius: "10px 4px 12px 5px",
		boxShadow: "0 2px 8px rgba(80,55,30,0.10)"
	} }, /* @__PURE__ */ React.createElement("img", {
		src: qrCodeDataUrl,
		style: {
			width: "240px",
			height: "240px"
		}
	})), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "16px",
		color: T.janglan,
		fontWeight: "bold"
	} }, "请扫描二维码完成支付"), /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "13px",
		color: T.inkLight
	} }, "支付完成后将自动发放奖励，请耐心等待"))), /* @__PURE__ */ React.createElement("div", { style: {
		position: "relative",
		zIndex: 1,
		padding: "8px 16px",
		textAlign: "center",
		borderTop: `1px solid ${T.border}`,
		background: "linear-gradient(180deg, rgba(200,185,155,0.10) 0%, rgba(215,200,170,0.22) 100%)"
	} }, /* @__PURE__ */ React.createElement("span", { style: {
		fontSize: "12px",
		color: T.inkLight
	} }, "若二维码失效，请重新发起充值指令生成新订单")));
}

//#endregion
export { PayQrCode as default };
import _lvy_asset_1_default from "../../_virtual/_lvy-asset_1.js";
import HTML from "./HTML.js";
import classNames from "classnames";
import * as React from "react";

//#region src/img/views/_panelShared.tsx
/**
* 水墨风面板共享：设计令牌 / 装饰 / 结构组件
* 图片面板共用本文件，保证风格统一。
*/
/** 设计令牌默认值（宣纸水墨，浅色） */
const T_DEFAULTS = {
	overlay: "rgba(232, 218, 192, 0.52)",
	inkDark: "#1c1408",
	inkMid: "#3e2c18",
	inkLight: "#7a6248",
	cinnabar: "#c22a12",
	cinnabarBg: "rgba(180,35,15,0.12)",
	cinnabarBorder: "rgba(180,35,15,0.45)",
	cyan: "#3a8a82",
	green: "#4a7a52",
	amber: "#a07828",
	yanbo: "#BDCFDD",
	janglan: "#526F7A",
	border: "rgba(80,55,30,0.22)",
	borderMid: "rgba(80,55,30,0.38)",
	borderCool: "rgba(82,111,122,0.30)",
	divider: "rgba(80,55,30,0.15)",
	card: "linear-gradient(145deg, rgba(250,242,225,0.55) 0%, rgba(232,218,192,0.35) 100%)",
	sectionBg: "linear-gradient(90deg, rgba(180,120,50,0.28) 0%, rgba(160,110,40,0.10) 60%, transparent 100%)",
	emptySlotBg: "rgba(200,185,155,0.35)",
	zebraRow: "rgba(250,242,225,0.30)",
	warmTagBg: "rgba(120,90,60,0.15)",
	headerBg: "linear-gradient(160deg, rgba(230,215,185,0.38) 0%, rgba(210,195,165,0.20) 100%)"
};
/** 深底暗黑模式默认令牌 */
const T_DARK = {
	overlay: "rgba(14,10,6,0.72)",
	inkDark: "#e8e0d0",
	inkMid: "#c0b090",
	inkLight: "#8a7a68",
	cinnabar: "#c22a12",
	cinnabarBg: "rgba(180,35,15,0.18)",
	cinnabarBorder: "rgba(180,35,15,0.55)",
	cyan: "#3a8a82",
	green: "#4a7a52",
	amber: "#a07828",
	yanbo: "#BDCFDD",
	janglan: "#526F7A",
	border: "rgba(200,180,130,0.18)",
	borderMid: "rgba(200,180,130,0.35)",
	borderCool: "rgba(82,111,122,0.22)",
	divider: "rgba(200,180,130,0.10)",
	card: "linear-gradient(145deg, rgba(30,22,15,0.75) 0%, rgba(20,15,10,0.55) 100%)",
	sectionBg: "linear-gradient(90deg, rgba(120,70,20,0.35) 0%, rgba(80,50,15,0.12) 60%, transparent 100%)",
	emptySlotBg: "rgba(30,22,15,0.55)",
	zebraRow: "rgba(30,22,15,0.40)",
	warmTagBg: "rgba(200,180,130,0.12)",
	headerBg: "linear-gradient(160deg, rgba(40,30,20,0.55) 0%, rgba(25,18,12,0.35) 100%)"
};
/** 从 rgba/hex 中提取 alpha（0~1），纯 hex 视为 1.0 */
function extractAlpha(color) {
	const m = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/);
	return m ? Math.min(1, Math.max(0, parseFloat(m[1]))) : 1;
}
/**
* 将 ThemeConfig 映射成完整 TTokens。
* 支持全部 9 个颜色字段 + inkMode；alpha 由用户值决定，不强行覆盖。
*/
function buildTokens(theme) {
	if (!theme) return { ...T_DEFAULTS };
	const base = { ...theme.inkMode === "dark" ? T_DARK : T_DEFAULTS };
	if (theme.accentColor) {
		base.cinnabar = theme.accentColor;
		base.cinnabarBg = hexOrRgbaWithAlpha(theme.accentColor, .12);
		base.cinnabarBorder = hexOrRgbaWithAlpha(theme.accentColor, .45);
	}
	if (theme.secondaryColor) base.janglan = theme.secondaryColor;
	if (theme.overlayColor) base.overlay = theme.overlayColor;
	if (theme.cardColor) {
		const a = extractAlpha(theme.cardColor);
		base.card = theme.cardColor;
		base.sectionBg = `linear-gradient(90deg, ${hexOrRgbaWithAlpha(theme.cardColor, a * .45)} 0%, ${hexOrRgbaWithAlpha(theme.cardColor, a * .15)} 60%, transparent 100%)`;
	}
	if (theme.inkColor) {
		const a = extractAlpha(theme.inkColor);
		base.inkDark = theme.inkColor;
		base.inkMid = hexOrRgbaWithAlpha(theme.inkColor, a * .7);
		base.inkLight = hexOrRgbaWithAlpha(theme.inkColor, a * .45);
	}
	if (theme.borderColor) {
		const a = extractAlpha(theme.borderColor);
		base.border = hexOrRgbaWithAlpha(theme.borderColor, a * .22);
		base.borderMid = hexOrRgbaWithAlpha(theme.borderColor, a * .38);
		base.borderCool = hexOrRgbaWithAlpha(theme.borderColor, a * .3);
		base.divider = hexOrRgbaWithAlpha(theme.borderColor, a * .15);
	}
	if (theme.textPrimaryColor) base.inkDark = theme.textPrimaryColor;
	if (theme.textSecondaryColor) {
		const a = extractAlpha(theme.textSecondaryColor);
		base.inkMid = theme.textSecondaryColor;
		base.inkLight = hexOrRgbaWithAlpha(theme.textSecondaryColor, a * .6);
	}
	if (theme.headerColor) {
		const a = extractAlpha(theme.headerColor);
		base.headerBg = `linear-gradient(160deg, ${hexOrRgbaWithAlpha(theme.headerColor, a * .55)} 0%, ${hexOrRgbaWithAlpha(theme.headerColor, a * .28)} 100%)`;
	}
	return base;
}
/** 把 hex 或 rgb 颜色替换 alpha，输出 rgba() 字符串 */
function hexOrRgbaWithAlpha(color, alpha) {
	const hex6 = color.match(/^#([0-9a-f]{6})$/i);
	if (hex6) return `rgba(${parseInt(hex6[1].slice(0, 2), 16)},${parseInt(hex6[1].slice(2, 4), 16)},${parseInt(hex6[1].slice(4, 6), 16)},${alpha})`;
	const hex3 = color.match(/^#([0-9a-f]{3})$/i);
	if (hex3) return `rgba(${parseInt(hex3[1][0] + hex3[1][0], 16)},${parseInt(hex3[1][1] + hex3[1][1], 16)},${parseInt(hex3[1][2] + hex3[1][2], 16)},${alpha})`;
	return color.replace(/rgba?\(([^)]+)\)/, (_, inner) => {
		return `rgba(${inner.split(",").slice(0, 3).join(",")},${alpha})`;
	});
}
/** Theme Context：所有面板通过 useContext 取令牌，PanelShell 注入覆盖值 */
const ThemeContext = React.createContext(T_DEFAULTS);
/** 向后兼容：保留 T 导出（指向默认值，历史引用不报错） */
const T = T_DEFAULTS;
function InkCloud({ width, top, left, right, color, opacity, flip }) {
	const h = Math.round(width * .55);
	return /* @__PURE__ */ React.createElement("svg", {
		width,
		height: h,
		viewBox: "0 0 200 110",
		style: {
			position: "absolute",
			top,
			left,
			right,
			opacity,
			pointerEvents: "none",
			transform: flip ? "scaleX(-1)" : void 0
		}
	}, /* @__PURE__ */ React.createElement("g", { fill: color }, /* @__PURE__ */ React.createElement("ellipse", {
		cx: "100",
		cy: "90",
		rx: "92",
		ry: "22"
	}), /* @__PURE__ */ React.createElement("circle", {
		cx: "52",
		cy: "68",
		r: "32"
	}), /* @__PURE__ */ React.createElement("circle", {
		cx: "88",
		cy: "52",
		r: "38"
	}), /* @__PURE__ */ React.createElement("circle", {
		cx: "130",
		cy: "58",
		r: "34"
	}), /* @__PURE__ */ React.createElement("circle", {
		cx: "162",
		cy: "72",
		r: "24"
	}), /* @__PURE__ */ React.createElement("circle", {
		cx: "28",
		cy: "80",
		r: "18"
	})));
}
/** 标准云朵装饰组合（与 AttributePanel 一致） */
function CloudDecor() {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(InkCloud, {
		width: 220,
		top: "-20px",
		left: "-70px",
		color: T.yanbo,
		opacity: .38
	}), /* @__PURE__ */ React.createElement(InkCloud, {
		width: 150,
		top: "20px",
		left: "-30px",
		color: "rgba(255,248,235,0.60)",
		opacity: 1,
		flip: true
	}), /* @__PURE__ */ React.createElement(InkCloud, {
		width: 180,
		top: "-15px",
		right: "-65px",
		color: T.janglan,
		opacity: .2,
		flip: true
	}), /* @__PURE__ */ React.createElement(InkCloud, {
		width: 110,
		top: "35px",
		right: "-25px",
		color: T.yanbo,
		opacity: .3
	}), /* @__PURE__ */ React.createElement(InkCloud, {
		width: 170,
		top: "55%",
		left: "-60px",
		color: "rgba(215,200,170,0.45)",
		opacity: 1
	}), /* @__PURE__ */ React.createElement(InkCloud, {
		width: 140,
		top: "82%",
		right: "-45px",
		color: "rgba(232,218,192,0.55)",
		opacity: 1,
		flip: true
	}));
}
function SectionTitle({ title, extra }) {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex items-center gap-2 px-[14px] py-[7px]"),
		style: {
			background: T.sectionBg,
			borderBottom: `1px solid ${T.borderCool}`
		}
	}, /* @__PURE__ */ React.createElement("div", {
		className: classNames("shrink-0 rounded-[3px_1px_4px_2px]"),
		style: {
			width: "4px",
			height: "18px",
			background: `linear-gradient(180deg, ${T.cinnabar} 0%, rgba(180,60,20,0.4) 100%)`,
			borderRadius: "3px 1px 4px 2px"
		}
	}), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[18px] font-bold tracking-[2px]"),
		style: { color: T.inkDark }
	}, title), extra ? /* @__PURE__ */ React.createElement("span", {
		className: classNames("ml-auto text-[14px]"),
		style: { color: T.inkLight }
	}, extra) : null);
}
function PanelCard({ children, margin = "10px 12px 0", radius = "10px 4px 12px 5px", borderColor }) {
	const T = React.useContext(ThemeContext);
	const effectiveBorderColor = borderColor ?? T.border;
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative z-[1] overflow-hidden"),
		style: {
			margin,
			background: T.card,
			border: `1px solid ${effectiveBorderColor}`,
			borderRadius: radius,
			boxShadow: "inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)"
		}
	}, children);
}
function PanelFooterBar({ text }) {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative z-[1] px-4 py-2 text-center"),
		style: {
			borderTop: `1px solid ${T.border}`,
			background: "linear-gradient(180deg, rgba(200,185,155,0.10) 0%, rgba(215,200,170,0.22) 100%)"
		}
	}, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[12px]"),
		style: { color: T.inkLight }
	}, text));
}
function PanelHeader({ avatarURL, daoName, uid, realmName, rightLabel, rightMain, rightSub }) {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative z-[1] flex items-center gap-[14px] px-4 pb-[14px] pt-4"),
		style: {
			borderBottom: `2px solid ${T.borderMid}`,
			background: T.headerBg
		}
	}, avatarURL ? /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex shrink-0 overflow-hidden rounded-full"),
		style: {
			width: "68px",
			height: "68px",
			borderRadius: "50%",
			border: `3px solid ${T.borderMid}`,
			background: "#d0c0a0",
			display: "flex"
		}
	}, /* @__PURE__ */ React.createElement("img", {
		className: classNames("h-full w-full object-cover"),
		src: avatarURL,
		style: {
			width: "100%",
			height: "100%",
			objectFit: "cover"
		}
	})) : /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex shrink-0 items-center justify-center rounded-full"),
		style: {
			width: "68px",
			height: "68px",
			borderRadius: "50%",
			border: `3px solid ${T.borderMid}`,
			background: "rgba(200,185,155,0.70)",
			display: "flex"
		}
	}, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[30px] font-bold"),
		style: { color: T.cinnabar }
	}, daoName.charAt(0))), /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-1 flex-col items-start gap-1") }, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[24px] font-bold tracking-[1px]"),
		style: { color: T.inkDark }
	}, daoName), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[14px]"),
		style: { color: T.inkDark }
	}, "UID ", uid), /* @__PURE__ */ React.createElement("span", {
		className: classNames("rounded-[4px] px-[9px] py-[2px] text-[14px] font-bold tracking-[1px]"),
		style: {
			color: "#fff",
			background: T.cinnabar,
			borderRadius: "4px"
		}
	}, realmName)), rightMain !== void 0 || rightLabel ? /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-col items-end gap-[2px]") }, rightLabel ? /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[13px]"),
		style: { color: T.inkLight }
	}, rightLabel) : null, rightMain, rightSub) : null);
}
function PanelHeroHeader({ avatarURL, daoName, uid, realmName, initialText, avatarBadgeNode, metaNode, rightNode }) {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative z-[1] flex items-center gap-[14px] px-4 pb-[14px] pt-4"),
		style: {
			borderBottom: `2px solid ${T.borderMid}`,
			background: T.headerBg
		}
	}, /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative shrink-0"),
		style: {
			width: "76px",
			height: "76px"
		}
	}, avatarURL ? /* @__PURE__ */ React.createElement("div", {
		className: classNames("overflow-hidden rounded-full"),
		style: {
			width: "76px",
			height: "76px",
			borderRadius: "50%",
			border: `3px solid ${T.borderMid}`,
			background: "#d0c0a0"
		}
	}, /* @__PURE__ */ React.createElement("img", {
		className: classNames("h-full w-full object-cover"),
		src: avatarURL,
		style: {
			width: "100%",
			height: "100%",
			objectFit: "cover"
		}
	})) : /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex items-center justify-center rounded-full"),
		style: {
			width: "76px",
			height: "76px",
			borderRadius: "50%",
			border: `3px solid ${T.borderMid}`,
			background: "rgba(200,185,155,0.70)",
			display: "flex"
		}
	}, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[36px] font-bold"),
		style: { color: T.cinnabar }
	}, (initialText ?? realmName.charAt(0)).charAt(0))), avatarBadgeNode ? /* @__PURE__ */ React.createElement("div", { style: {
		position: "absolute",
		right: "-2px",
		bottom: "-2px",
		zIndex: 1
	} }, avatarBadgeNode) : null), /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-1 flex-col items-start gap-[6px]") }, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[26px] font-bold tracking-[1px]"),
		style: { color: T.inkDark }
	}, daoName), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[18px]"),
		style: { color: T.inkDark }
	}, "UID ", uid), /* @__PURE__ */ React.createElement("span", {
		className: classNames("rounded-[4px] px-[9px] py-[2px] text-[16px] font-bold tracking-[1px]"),
		style: {
			color: "#fff",
			background: T.cinnabar,
			borderRadius: "4px"
		}
	}, realmName), metaNode ?? null), rightNode ?? null);
}
/** 标准面板容器（460px 宽 + 背景 + 云朵装饰） */
function PanelShell({ children, backgroundUrls, theme }) {
	const effectiveBgUrls = theme?.backgrounds ?? backgroundUrls;
	const bgSrc = effectiveBgUrls && effectiveBgUrls.length > 0 ? effectiveBgUrls[Math.floor(Math.random() * effectiveBgUrls.length)] : _lvy_asset_1_default;
	const tokens = buildTokens(theme);
	return /* @__PURE__ */ React.createElement(ThemeContext.Provider, { value: tokens }, /* @__PURE__ */ React.createElement(HTML, { style: { width: "460px" } }, /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex flex-col bg-cover bg-center"),
		id: "root",
		"data-theme": "light",
		style: {
			background: `url(${bgSrc})`,
			backgroundSize: "cover",
			backgroundPosition: "center"
		}
	}, /* @__PURE__ */ React.createElement("div", {
		className: classNames("relative flex min-h-full flex-col pb-2"),
		style: { background: tokens.overlay }
	}, /* @__PURE__ */ React.createElement(CloudDecor, null), children))));
}
/** 失败占位 */
function PanelFailure({ message = "数据加载失败" }) {
	const T = React.useContext(ThemeContext);
	return /* @__PURE__ */ React.createElement(HTML, null, /* @__PURE__ */ React.createElement("div", {
		className: classNames("p-5"),
		style: { color: T.inkDark }
	}, message));
}

//#endregion
export { CloudDecor, InkCloud, PanelCard, PanelFailure, PanelFooterBar, PanelHeader, PanelHeroHeader, PanelShell, SectionTitle, T, T_DARK, T_DEFAULTS, ThemeContext, buildTokens };
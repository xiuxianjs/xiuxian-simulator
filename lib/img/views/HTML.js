import _lvy_styles_c625a8af6f6c6f88c5c39fb4_default from "../../_virtual/_lvy-styles_c625a8af6f6c6f88c5c39fb4.js";
import _lvy_asset_1_default from "../../_virtual/_lvy-asset_1.js";
import { LinkStyleSheet } from "jsxp";
import classNames from "classnames";
import * as React from "react";

//#region src/img/views/HTML.tsx
const HTML = (props) => {
	const { linkStyleSheets = [], dangerouslySetInnerHTML, children, className, ...reSet } = props;
	return /* @__PURE__ */ React.createElement("html", { className: "p-0 m-0" }, /* @__PURE__ */ React.createElement("head", null, /* @__PURE__ */ React.createElement(LinkStyleSheet, { src: _lvy_styles_c625a8af6f6c6f88c5c39fb4_default }), linkStyleSheets.map((src, index) => /* @__PURE__ */ React.createElement(LinkStyleSheet, {
		key: index,
		src
	})), /* @__PURE__ */ React.createElement("meta", {
		httpEquiv: "content-type",
		content: "text/html;charset=utf-8"
	}), /* @__PURE__ */ React.createElement("style", { dangerouslySetInnerHTML: { __html: `
              @font-face {
                font-family: 'tttgbnumber';
                src: url('${_lvy_asset_1_default}'); 
                font-weight: normal; 
                font-style: normal; 
              }
              body { 
                font-family: 'tttgbnumber', 
                system-ui, sans-serif; 
              }
            ` } }), dangerouslySetInnerHTML && /* @__PURE__ */ React.createElement("style", { dangerouslySetInnerHTML })), /* @__PURE__ */ React.createElement("body", {
		className: classNames("p-0 m-0 w-full text-center", className),
		...reSet
	}, children));
};

//#endregion
export { HTML as default };
import { shopBuyHandler } from "../handler.js";

//#region src/response/shop/buy/res.ts
/**
* 统一商店购买入口
* 指令格式：/购买 <商品编号> [数量]
* 所有商店（万宝楼/签到/神奇/声望/积分/道侣）共用此指令，
* 商品编号在 wanbaolou_products 表中全局唯一。
*/
var res_default = shopBuyHandler;

//#endregion
export { res_default as default };
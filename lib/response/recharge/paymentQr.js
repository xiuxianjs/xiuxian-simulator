import { renderCachedImage } from "../../utils/imageRender.js";
import PayQrCode from "../../img/views/PayQrCode.js";
import { Format, ResultCode } from "alemonjs";
import QRCode from "qrcode";

//#region src/response/recharge/paymentQr.ts
async function sendPaymentQr(message, checkout) {
	const { orderNo, payAmount } = checkout.order;
	const qr = await QRCode.toBuffer(checkout.payUrl, {
		width: 300,
		margin: 1
	});
	const sendImage = async (image) => {
		const receipts = await message.send({ format: Format.create().addImage(image) });
		return receipts.length > 0 && receipts.every((receipt) => receipt.code === ResultCode.Ok);
	};
	try {
		const panel = await renderCachedImage(PayQrCode, {
			qrCodeDataUrl: `data:image/png;base64,${qr.toString("base64")}`,
			packageName: checkout.packageName,
			yuan: (payAmount / 100).toFixed(2),
			orderNo,
			theme: "default"
		}, "panel:recharge:pay");
		if (panel && await sendImage(panel)) return;
	} catch {}
	if (!await sendImage(await QRCode.toBuffer(checkout.payUrl, {
		width: 300,
		margin: 4
	}))) throw new Error("支付二维码未确认送达");
}

//#endregion
export { sendPaymentQr };
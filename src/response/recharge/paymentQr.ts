import type { BackendSponsorCheckout } from '@src/api/bot/sponsor-payment';
import PayQrCode from '@src/img/views/PayQrCode';
import { renderCachedImage } from '@src/utils/imageRender';
import type { useMessage } from '@src/utils/useMessage';
import { Format, ResultCode } from 'alemonjs';
import QRCode from 'qrcode';

type PaymentMessage = Pick<ReturnType<typeof useMessage>[0], 'send'>;

export async function sendPaymentQr(message: PaymentMessage, checkout: BackendSponsorCheckout) {
  const { orderNo, payAmount } = checkout.order;
  // 请勿使用 QQ 扫码或在 QQ 内打开链接。链接仅用于生成二维码，勿恢复 QQ 链接按钮。
  const qr = await QRCode.toBuffer(checkout.payUrl, { width: 300, margin: 1 });
  const sendImage = async (image: Buffer | string) => {
    const receipts = await message.send({ format: Format.create().addImage(image) });

    return receipts.length > 0 && receipts.every(receipt => receipt.code === ResultCode.Ok);
  };

  try {
    const panel = await renderCachedImage(
      PayQrCode,
      {
        qrCodeDataUrl: `data:image/png;base64,${qr.toString('base64')}`,
        packageName: checkout.packageName,
        yuan: (payAmount / 100).toFixed(2),
        orderNo,
        theme: 'default'
      },
      'panel:recharge:pay'
    );

    if (panel && (await sendImage(panel))) {
      return;
    }
  } catch {
    // 面板渲染或投递失败时，用同一订单的原始 PNG 走 QQ 图片上传。
  }

  const fallback = await QRCode.toBuffer(checkout.payUrl, { width: 300, margin: 4 });

  if (!(await sendImage(fallback))) {
    throw new Error('支付二维码未确认送达');
  }
}

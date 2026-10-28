import { Format, type FormatMarkDown } from 'alemonjs';
import type { parseSpiritVein, parseTreasureDailyPacks } from '@src/api/bot/treasures';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { createQuoteMarkdown, type GuiButton } from '@src/utils/messageHelper';

/** Shared with the existing month-card product: one quote contains the offer and its action. */
export function createRechargeProductQuote(lines: string[], buttons: GuiButton[] = []): FormatMarkDown {
  return createQuoteMarkdown(
    lines.filter(Boolean),
    buttons.map(button => ({ ...button, command: button.command ?? '', autoEnter: false }))
  );
}

export function buildSpiritVeinProductBlock(lease: ReturnType<typeof parseSpiritVein>): FormatMarkDown {
  return createRechargeProductQuote(
    [
      `灵脉租契 · ¥${(lease.priceAmount / 100).toFixed(2)}`,
      `购买即得 ${lease.immediateDaoCrystal}道晶`,
      `每日 ${lease.dailyCrystal}灵晶，共30收益日`,
      `续订延长收益日，每日金额不叠加；最多预存 ${lease.maxDays}日。`,
      lease.purchaseUnavailableReason ?? ''
    ],
    lease.packageId !== null && lease.canPurchase ? [{ label: '购买（私聊）', command: `/充值购买 ${lease.packageId}` }] : []
  );
}

const skuLabels = { small: '1元', medium: '6元', large: '18元', all: '30元全包' } as const;

export type DailyPackSku = keyof typeof skuLabels;
export function dailyPackSku(input?: string): DailyPackSku | undefined {
  if (input === undefined) {
    return 'small';
  }

  return (Object.keys(skuLabels) as DailyPackSku[]).find(sku => input === sku || input === skuLabels[sku]);
}

export function buildDailyPackProductPage(data: ReturnType<typeof parseTreasureDailyPacks>, selected: DailyPackSku | undefined): FormatMarkDown {
  const content = Format.createMarkdown();

  for (const sku of Object.keys(skuLabels) as DailyPackSku[]) {
    content.addButton(markdownButtonLabel(skuLabels[sku], sku === selected), { data: `/充值 日礼包 ${skuLabels[sku]}`, autoEnter: false });
  }
  content.addNewline();
  if (selected === undefined) {
    content.addText('请选择1元、6元、18元或30元全包。');

    return content;
  }
  const product = data.products.find(item => item.sku === selected);

  if (!product) {
    content.addText('该档商品暂未开放，请稍后刷新。');

    return content;
  }
  const name = selected === 'all' ? skuLabels.all : `${skuLabels[selected]}礼包`;
  const buttons: GuiButton[] = [];

  if (!data.unresolvedOrderNo) {
    if (selected === 'all' && product.priceAmount === 0 && product.canClaimFree) {
      buttons.push({ label: '领取剩余权益', command: '/上古遗珍 领取全包' });
    } else if (product.available && product.priceAmount > 0 && product.packageId !== null) {
      buttons.push({ label: '购买（私聊）', command: `/充值购买 ${product.packageId}` });
    }
  }
  content.addBlockquote(
    createRechargeProductQuote(
      [
        `${name} · ¥${(product.priceAmount / 100).toFixed(2)} · 每日限购${product.remaining}/${product.limit}`,
        product.label ? `${product.label.replace(/！+$/u, '')}！！！` : '',
        ...(selected === 'all' ? [`原价 ¥${(product.basePriceAmount / 100).toFixed(2)} · 已计入单购金额 ¥${(product.creditedAmount / 100).toFixed(2)}`] : []),
        ...product.rewardParts.map(
          reward => `${reward.name} ×${reward.quantity}${reward.independentRolls ? `（独立${reward.independentRolls}次，每次${reward.perRoll}片）` : ''}`
        ),
        ...product.promotionTexts,
        product.unavailableReason
      ],
      buttons
    )
  );
  if (data.unresolvedOrderNo) {
    content.addBlockquote(
      createRechargeProductQuote([`待核对订单 ${data.unresolvedOrderNo}，请继续核对原订单。`], [{ label: '我的订单', command: '/我的订单' }])
    );
  }

  return content;
}

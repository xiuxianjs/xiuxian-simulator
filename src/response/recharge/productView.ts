import { Format, type FormatMarkDown } from 'alemonjs';
import type { parseSpiritVein, parseTreasureDailyPacks } from '@src/api/bot/treasures';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { createQuoteMarkdown, type GuiButton } from '@src/utils/messageHelper';

/** Compact navigation and compatibility blocks; product cards use the structure below. */
export function createRechargeProductQuote(lines: string[], buttons: GuiButton[] = []): FormatMarkDown {
  return createQuoteMarkdown(
    lines.filter(Boolean),
    buttons.map(button => ({ ...button, command: button.command ?? '', autoEnter: false }))
  );
}

/** Current offers may group copy; original checkout/settlement snapshots stay verbatim. */
export function offerPromotionLines(lines: string[]): string[] {
  const copy = lines.map(line => line.replace(/^(不参加|按活动原规则参加)周返利$/u, '$1周周返利'));
  const groups = [
    copy.filter(line => line.startsWith('不参加')),
    copy.filter(line => line.startsWith('按活动原规则参加')),
    copy.filter(line => !line.startsWith('不参加') && !line.startsWith('按活动原规则参加') && !line.startsWith('实付')),
    copy.filter(line => line.startsWith('实付'))
  ].filter(group => group.length);

  return groups.flatMap(group => ['', ...group]);
}

export function buildRechargeProductCard(options: {
  heading: string;
  emphasis?: string;
  metadata?: string[];
  lines: string[];
  rewardLineCount?: number;
  preserveEmptyLines?: boolean;
  buttons?: GuiButton[];
}): FormatMarkDown {
  const content = Format.createMarkdown().addText(options.heading).addNewline();

  if (options.emphasis) {
    content.addBold(options.emphasis).addNewline();
  }
  for (const line of options.metadata?.filter(Boolean) ?? []) {
    content.addText(line).addNewline();
  }
  const lines = options.preserveEmptyLines ? [...options.lines] : options.lines.filter(Boolean);

  while (lines.at(-1) === '') {
    lines.pop();
  }

  if (lines.length) {
    let quote = createQuoteMarkdown(lines);
    const rewardLineCount = options.rewardLineCount ?? 0;

    if (rewardLineCount > 0) {
      quote = Format.createMarkdown();
      lines.forEach((line, index) => {
        if (index > 0) {
          quote.addNewline();
        }
        if (index < rewardLineCount) {
          quote.addBold(line);
        } else {
          quote.addText(line);
        }
      });
    }
    content.addNewline().addBlockquote(quote);
  }
  if (options.buttons?.length) {
    if (!lines.length) {
      content.addNewline();
    }
    for (const [index, button] of options.buttons.entries()) {
      if (index > 0) {
        content.addText(' ');
      }
      content.addButton(markdownButtonLabel(button.label), { data: button.command ?? '', autoEnter: false });
    }
  }
  content.addNewline().addNewline();

  return content;
}

export function buildSpiritVeinProductBlock(lease: ReturnType<typeof parseSpiritVein>): FormatMarkDown {
  return buildRechargeProductCard({
    heading: `灵脉租契 · ¥${(lease.priceAmount / 100).toFixed(2)}`,
    lines: [
      `购买即得 ${lease.immediateDaoCrystal}道晶`,
      `新购每日 ${lease.dailyCrystal}灵晶，共30收益日`,
      ...(lease.rightsNote ? [lease.rightsNote] : []),
      `续订延长收益日，每日金额不叠加；最多预存 ${lease.maxDays}日。`,
      lease.purchaseUnavailableReason ?? ''
    ],
    buttons: lease.packageId !== null && lease.canPurchase ? [{ label: '购买', command: `/充值购买 ${lease.packageId}` }] : []
  });
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
  content.addNewline().addNewline();
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

  if (selected === 'all' && product.priceAmount === 0 && product.canClaimFree) {
    buttons.push({ label: '领取剩余权益', command: '/上古遗珍 领取全包' });
  } else if (!data.unresolvedOrderNo && product.available && product.priceAmount > 0 && product.packageId !== null) {
    buttons.push({ label: '购买', command: `/充值购买 ${product.packageId}` });
  }
  content.absorb(
    buildRechargeProductCard({
      heading: `${name} · ¥${(product.priceAmount / 100).toFixed(2)} · 每日限购${product.remaining}/${product.limit}`,
      emphasis: product.label ? `${product.label.replace(/！+$/u, '')}！！！` : undefined,
      metadata:
        selected === 'all' ? [`原价 ¥${(product.basePriceAmount / 100).toFixed(2)} · 已计入单购金额 ¥${(product.creditedAmount / 100).toFixed(2)}`] : [],
      lines: [
        ...product.rewardParts.map(
          reward => `${reward.name} ×${reward.quantity}${reward.independentRolls ? `（独立${reward.independentRolls}次，每次${reward.perRoll}片）` : ''}`
        ),
        ...offerPromotionLines(product.promotionTexts),
        product.unavailableReason
      ],
      preserveEmptyLines: true,
      buttons
    })
  );
  if (data.unresolvedOrderNo) {
    content.addBlockquote(
      createRechargeProductQuote(
        [`待核对订单 ${data.unresolvedOrderNo}，请继续核对原订单。`],
        [
          { label: '查询原订单', command: `/查询充值订单 ${data.unresolvedOrderNo}`, autoEnter: false },
          { label: '我的订单', command: '/我的订单' }
        ]
      )
    );
  }

  return content;
}

// Frozen complete production handler before narrow guide balance reads; unrelated browse branch retained as oracle.
import { useMessage } from '@src/utils/useMessage';
import { createBackendRequestContext } from '@src/api/bot/context';
import App from '@src/response-apps/market/list/app';
import { selects } from '@src/response/config';
import {
  appendMarketCommandGuide,
  createMarketCommandBar,
  getMarketEmptyText,
  getMarketHeaderButtons,
  parseMarketCommand,
  shouldQueryMarket
} from '@src/response/market/command';
import { formatNumber } from '@src/utils/formatHelper';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';

const appendMarketCurrencyText = (md: ReturnType<typeof Format.createMarkdown>, spiritsCrystal: number) => {
  md.addText(`灵晶：${formatNumber(spiritsCrystal)}`);
  md.addNewline();
};

const appendQuotaText = (md: ReturnType<typeof Format.createMarkdown>, quota?: { dailyLimit: number; dailyUsed: number; remaining: number }) => {
  if (!quota) {
    return;
  }

  if (quota.remaining <= 0) {
    md.addText(`今日额度已用完（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
  } else {
    md.addText(`今日剩余额度：${formatNumber(quota.remaining)}（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
  }
  md.addNewline();
};

/**
 * 交易所列表 / 搜索 / 筛选指令
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const parsed = parseMarketCommand(text);

  if (!parsed) {
    return;
  }

  if (!shouldQueryMarket(parsed)) {
    const contentMd = Format.createMarkdown();
    const uid = typeof e.uid === 'number' ? e.uid : null;

    if (uid) {
      const result = await App({ bid, uid, page: parsed.page, request: createBackendRequestContext(e) });

      if (result.code === 'OK') {
        appendMarketCurrencyText(contentMd, result.data.spiritsCrystal);
      }
    }
    contentMd.addNewline();

    appendMarketCommandGuide(contentMd, parsed);
    contentMd.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: parsed.title,
        content: contentMd,
        header: getMarketHeaderButtons(),
        footer: createMarketCommandBar(parsed)
      })
    );

    return;
  }

  const uid = typeof e.uid === 'number' ? e.uid : null;
  const result = uid
    ? await App({
        bid,
        uid,
        categoryKey: parsed.categoryKey,
        keyword: parsed.keyword,
        sort: parsed.sort,
        page: parsed.page,
        request: createBackendRequestContext(e)
      })
    : { code: 'LOAD_FAILED' as const, data: { message: '查看珍宝楼失败，请稍后再试' } };

  if (result.code === 'LOAD_FAILED') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: parsed.title,
        content: md,
        header: getMarketHeaderButtons(),
        footer: createMarketCommandBar(parsed)
      })
    );

    return;
  }

  const { data } = result;
  const contentMd = Format.createMarkdown();

  appendMarketCurrencyText(contentMd, data.spiritsCrystal);
  appendQuotaText(contentMd, data.quota);
  contentMd.addNewline();

  appendMarketCommandGuide(contentMd, parsed);
  contentMd.addNewline();
  contentMd.addNewline();

  if (data.items.length === 0) {
    contentMd.addText(getMarketEmptyText(parsed));
    contentMd.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: parsed.title,
        content: contentMd,
        header: getMarketHeaderButtons(),
        footer: createMarketCommandBar(parsed)
      })
    );

    return;
  }

  /** 物品分类→详情指令参数映射 */
  const CATEGORY_DETAIL_MAP: Record<string, string> = {
    item: '物品',
    equipment: '装备',
    profession_tool: '天工',
    skill_book: '功法'
  };

  data.items.forEach(it => {
    const canBuy = it.canPurchase;
    const typeLabel = it.itemCategoryLabel;

    const lines = [`【${it.listingId}】【${typeLabel}】 ${it.itemName}×${it.quantity}`];
    const mktBtns: { label: string; command: string }[] = [];

    if (canBuy) {
      mktBtns.push({ label: '购买', command: `/选购 ${it.listingId}` });
    }

    const detailCN = CATEGORY_DETAIL_MAP[it.itemCategory];

    if (detailCN && it.templateItemId) {
      mktBtns.push({ label: '查看', command: `/物品详情 ${detailCN} ${it.templateItemId}` });
    }

    const extra = it.attributeView;

    if (extra?.attrText) {
      lines.push(`属性：${extra.attrText}`);
    }
    if (it.upgradeHint) {
      lines.push(`提示：${it.upgradeHint}`);
    }
    lines.push(`单价：${it.unitPriceAmount} ${it.currencyName}  卖家：${it.sellerName}`);
    contentMd.addBlockquote(createQuoteMarkdown(lines, mktBtns));
  });

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: parsed.title,
      content: contentMd,
      nav: {
        current: data.pagination.currentPage,
        total: data.pagination.totalPages,
        count: data.pagination.total,
        command: parsed.pageCommand
      },
      header: getMarketHeaderButtons(),
      footer: createMarketCommandBar(parsed)
    })
  );
});

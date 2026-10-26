import { useMessage } from '@src/utils/useMessage';
import { getBackendUnifiedShop } from '@src/api/bot/companion-shop-queries';
import { BackendAPIError } from '@src/api';
import { purchaseBackendShopOverview } from '@src/api/bot/interaction-overview';
import { createBackendRequestContext } from '@src/api/bot/context';
/**
 * 通用商店 handler 工厂
 * 生成可直接作为路由 handler 使用的 onResponse 回调
 * 为商店定规矩。
 *
 * 排序规则： 限购周期 > 境界限制 -> 解锁条件 > 权重
 *
 */
import { fromCurrencyCN, toCurrencyName } from '@src/constants';
import { displayCurrencyText } from '@src/constants/currency';
import type { ShopListProductItem } from '@src/api/schemas/companion-shop-query';
import { SHOP_META } from '@src/response/shop/meta';
import { selects } from '@src/response/config';
import { appendCurrencyCardToMd } from '@src/utils/currencyCardHelper';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
/** 情绪型商品购买后的氛围文本（道侣商店专属，无战力影响） */
const EMOTIONAL_ITEM_TEXT: Record<string, string> = {
  同心结: '两心相系，此结虽小，情意绵长。',
  三生缘: '三世之约，一缕红线，牵引无尽。',
  素心绢帕: '素帕轻柔，藏于袖间，心意已达。',
  灵溪玉佩: '玉润如水，随身守护，仙缘渐深。',
  静心竹笺: '竹笺清香，字迹未落，情已先到。',
  同心锁: '锁住流年，共守此心，岁月静好。',
  红线: '红线千里，命中注定，缘起于此。'
};

/**
 * 为情绪型商品（道侣商店）构建购买氛围文本
 * 仅作展示，不影响任何数值
 */
const buildEmotionalPurchaseText = (shopCode: string, itemName: string): string | undefined => {
  if (shopCode !== 'DAOLV') {
    return undefined;
  }

  return EMOTIONAL_ITEM_TEXT[itemName] ?? '此物轻巧，却承载着一份难以言说的心意。';
};

/** 商品类别 → 详情指令参数 */
const CATEGORY_CMD_MAP: Record<string, string> = {
  item: '物品',
  equipment: '装备',
  skill_book: '功法'
};

const getItemDetailCommand = (item: ShopListProductItem) => {
  const categoryCN = CATEGORY_CMD_MAP[item.category];

  if (!categoryCN || !item.itemId) {
    return undefined;
  }

  return `/物品详情 ${categoryCN} ${item.itemId}`;
};

/** 商店头部导航（所有商店共享） */
const SHOP_HEADER_BASE = [
  { label: '万宝楼', command: '/商店 万宝楼' },
  { label: '签到', command: '/商店 签到' },
  { label: '积分', command: '/商店 积分' },
  { label: '道侣', command: '/商店 道侣' },
  { label: '神奇', command: '/商店 神奇' },
  { label: '声望', command: '/商店 声望' }
];

const SHOP_CODE_MAP: Record<string, string> = {
  万宝楼: 'WANBAOLOU',
  签到: 'CHECKIN',
  签到商店: 'CHECKIN',
  积分: 'TOWER_SCORE',
  积分商店: 'TOWER_SCORE',
  道侣: 'DAOLV',
  道侣商店: 'DAOLV',
  神奇: 'SHENQI',
  神奇商店: 'SHENQI',
  声望: 'REPUTATION',
  声望商店: 'REPUTATION'
};

const SHOP_COMMAND_NAME: Record<string, string> = {
  WANBAOLOU: '万宝楼',
  CHECKIN: '签到',
  TOWER_SCORE: '积分',
  DAOLV: '道侣',
  SHENQI: '神奇',
  REPUTATION: '声望'
};

type ShopAccessState = {
  visibleShopCodes: string[];
  deniedReason: string | null;
};

const getShopHeader = (access: ShopAccessState) => SHOP_HEADER_BASE.filter(item => access.visibleShopCodes.includes(SHOP_CODE_MAP[item.command.slice('/商店 '.length)]));

function parseShopListArgs(text: string, defaultShopCode?: string) {
  const cleaned = defaultShopCode ? text.trim() : text.replace(/^(!|！|\/|#|＃)?商店\s*/, '').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let shopCode = defaultShopCode;
  let page = 1;

  for (const token of tokens) {
    if (!shopCode && SHOP_CODE_MAP[token]) {
      shopCode = SHOP_CODE_MAP[token];
      continue;
    }

    if (/^\d+$/.test(token)) {
      page = Math.max(1, Number(token));
    }
  }

  const cnMatch = cleaned.match(/(灵石|灵晶|道晶)/);
  const currencyCode = cnMatch ? fromCurrencyCN(cnMatch[1]) : undefined;

  if (!shopCode && currencyCode) {
    shopCode = 'WANBAOLOU';
  }

  return {
    shopCode,
    page,
    currencyCode
  };
}

// ==================== 列表 handler ====================

const formatItem = (item: ShopListProductItem) => {
  let price = `${item.priceAmount} ${item.priceCurrencyName}`;

  if (item.secondaryPriceAmount && item.secondaryPriceCurrencyName) {
    price += ` + ${item.secondaryPriceAmount} ${item.secondaryPriceCurrencyName}`;
  }

  const limitText = item.limit === -1 ? '♾️' : `${item.used}/${item.limit}`;
  const periodText = item.limit > 0 ? `${item.limitPeriodCN}` : '';
  const lockText = item.unlocked ? '' : ` 🔒${item.lockReason ?? '未解锁'}`;
  const grantText = item.quantity > 1 ? ` ×${item.quantity}` : '';

  return {
    limitText,
    periodText,
    lockText,
    grantText,
    price
  };
};

/**
 * 创建商店列表路由 handler
 * @param shopCode 商店代号，如 'CHECKIN' | 'SHENQI' | 'WANBAOLOU' 等；不传则支持 /商店 [分类] [页码]
 */
export const createShopListHandler = (shopCode?: string) => {
  return onResponse(selects, async e => {
    const [message] = useMessage();
    const bid = e?.UserId;
    const uid = e.uid as number;

    const text = e.MessageText?.trim() ?? '';
    const parsed = parseShopListArgs(text, shopCode);
    const activeShopCode = parsed.shopCode;
    const page = parsed.page;
    const currencyCode = parsed.currencyCode;
    let shopQuery: Awaited<ReturnType<typeof getBackendUnifiedShop>>;

    try {
      shopQuery = await getBackendUnifiedShop(bid, uid, page, activeShopCode, currencyCode);
    } catch {
      const md = Format.createMarkdown();

      const baseTitle = activeShopCode ? (SHOP_META[activeShopCode]?.name ?? '商店') : '商店（全部）';
      const errorTitle = currencyCode ? `${baseTitle}（${toCurrencyName(currencyCode)}）` : baseTitle;

      md.addText(`${errorTitle}暂不可用`);
      void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: errorTitle, content: md }));

      return;
    }
    const access = shopQuery.access;
    const renderCurrency = (md: ReturnType<typeof Format.createMarkdown>) => {
      appendCurrencyCardToMd(md, shopQuery.currencies, { hideZero: true });
    };
    const shopHeader = getShopHeader(access);
    const accessDeniedReason = access.deniedReason;
    const meta = activeShopCode ? SHOP_META[activeShopCode] : undefined;

    let title = meta?.name ?? '商店';

    if (currencyCode) {
      title = `${title}（${toCurrencyName(currencyCode)}）`;
    } else if (!activeShopCode) {
      title = '商店（全部）';
    }

    if (accessDeniedReason) {
      const md = Format.createMarkdown();

      renderCurrency(md);
      md.addText(accessDeniedReason);

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title,
          header: shopHeader,
          content: md
        })
      );

      return;
    }

    const result = shopQuery.result;

    if (result.data.length === 0) {
      const emptyMd = Format.createMarkdown();

      renderCurrency(emptyMd);
      emptyMd.addText('暂无商品');

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title,
          header: shopHeader,
          content: emptyMd
        })
      );

      return;
    }

    const contentMd = Format.createMarkdown();

    // 货币概览
    renderCurrency(contentMd);

    // 商品列表
    result.data.forEach((item: ShopListProductItem) => {
      const { limitText, periodText, lockText, grantText, price } = formatItem(item);
      const detailCommand = getItemDetailCommand(item);
      const itemMeta = SHOP_META[item.shopCode];

      const typeTag = item.typeLabel ? `【${item.typeLabel}】` : '';

      const lines = [`【${item.productId}】${typeTag}${item.name}${grantText}`];
      const shopBtns: { label: string; command: string }[] = [];
      const buyCmd = itemMeta?.buyCmd ?? '购买';

      if (item.unlocked) {
        shopBtns.push({ label: '购买', command: `/${buyCmd} ${item.productId}` });

        if (detailCommand) {
          shopBtns.push({ label: '详情', command: detailCommand });
        }
      } else {
        if (detailCommand) {
          shopBtns.push({ label: '详情', command: detailCommand });
        }
        lines.push(lockText);
      }
      lines.push(`${price}  ${periodText}${limitText}`);
      contentMd.addBlockquote(createQuoteMarkdown(lines, shopBtns));
    });

    // 万宝楼带币种筛选时翻页命令也带上币种
    const currencyCN = currencyCode ? toCurrencyName(currencyCode) : undefined;
    const listBaseCmd = activeShopCode ? `/商店 ${SHOP_COMMAND_NAME[activeShopCode] ?? meta?.name ?? ''}`.trim() : '/商店';
    const pageCmd = currencyCN ? `${listBaseCmd} ${currencyCN} {page}` : `${listBaseCmd} {page}`;

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title,
        header: shopHeader,
        content: contentMd,
        nav: {
          current: result.pagination.currentPage,
          total: result.pagination.totalPages,
          command: pageCmd
        }
      })
    );
  });
};

// ==================== 购买 handler ====================

/**
 * 统一商店购买 handler
 * 指令格式：/购买 <商品编号> [数量]
 * 商品编号全局唯一，自动根据 product.shopCode 识别所属商店
 */
export const shopBuyHandler = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const uid = e.uid as number;
  const fallbackTitle = '商店';
  const match = (e.MessageText?.trim() ?? '').match(/(\d+)(?:\s+(\d+))?(\s+确认)?$/);

  if (!match) {
    const content = Format.createMarkdown();

    content.addText('格式：购买 商品编号 数量');
    content.addNewline();
    content.addText('示例：购买 301（购买1个）或 购买 301 10（购买10个）');
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: fallbackTitle, content }));

    return;
  }
  const productId = Number(match[1]);
  const count = match[2] ? Number(match[2]) : 1;
  const confirmed = Boolean(match[3]);
  const request = createBackendRequestContext(e);
  let overview;

  try {
    overview = await purchaseBackendShopOverview(bid, uid, productId, count, confirmed, request);
  } catch (error) {
    const content = Format.createMarkdown();

    content.addText(error instanceof BackendAPIError ? error.message : '购买预检失败，请稍后再试');
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: fallbackTitle, content }));

    return;
  }
  const preview = overview.preview;
  const meta = SHOP_META[preview.shopCode];
  const shopName = meta?.name ?? fallbackTitle;

  if (preview.needsConfirmation && !confirmed) {
    const confirmCmd = `/${meta?.buyCmd ?? '购买'} ${productId}${count > 1 ? ` ${count}` : ''} 确认`;
    const content = Format.createMarkdown();

    content.addText('⚠️ 大额购买提醒');
    content.addNewline();
    content.addText(`将购买：${preview.name} ×${preview.granted}；合计：${displayCurrencyText(preview.paid)}`);
    content.addNewline();
    content.addText(`请发送：${confirmCmd}`);
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: shopName, content, footer: [{ label: '确认购买', command: confirmCmd }] }));

    return;
  }
  try {
    if (overview.purchaseError) {
      throw new BackendAPIError(overview.purchaseError);
    }
    const result = overview.result;

    if (!result) {
      throw new Error('商店结算响应不完整');
    }
    const content = Format.createMarkdown();

    if (meta?.listCmd) {
      content.addButton('返回', { data: `/${meta.listCmd}` });
      content.addNewline();
    }
    content.addText(`购买成功：${result.name}，支付${displayCurrencyText(result.paid)}，获得×${result.granted}`);
    const emotionalText = buildEmotionalPurchaseText(preview.shopCode, result.name);

    if (emotionalText) {
      content.addNewline();
      content.addBlockquote(Format.createMarkdown().addText(emotionalText));
    }
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: shopName, content }));
  } catch (error) {
    const content = Format.createMarkdown();

    content.addText(error instanceof BackendAPIError ? error.message : '购买失败，请稍后再试');
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: shopName, content }));
  }
});

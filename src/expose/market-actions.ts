import { parseRobotMarketBrowse, parseRobotMarketMessage, parseRobotMarketPurchase } from '../api/bot/market-robot-query';
import { parseMyMarketListings } from '../api/bot/my-market-listings';
import { parseRobotMarketSell } from '../api/bot/market-sell-query';
import { parseBackendMarketSellable } from '../api/bot/market-trade';
import { parseBackendMarketTrades } from '../api/bot/queries';
import { parseMarketCredibility } from '../api/bot/market-credibility';
import { parseBackendOwnPlayerShop } from '../api/bot/player-shop-own';
import { parseBackendShopList, parseBackendShopRanking } from '../api/bot/shop-queries';
import { parseBackendPlayerShopVisit } from '../api/bot/player-shop-visit-query';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const pagination = object(fields(integer, 'currentPage totalPages total'));
const commonItem = {
  ...fields(integer, 'listingId quantity unitPriceAmount'),
  ...fields(text, 'itemCategory itemCategoryLabel itemName currencyCode currencyName')
};
const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

type MarketCategory = 'prop' | 'material' | 'equipment' | 'profession_tool' | 'skill_book' | 'soul_artifact';
type BrowseInput = {
  page?: number;
  keyword?: string;
  category?: MarketCategory;
  subtype?: string;
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'grade_asc' | 'grade_desc';
};
const category = { type: 'string' as const, enum: ['prop', 'material', 'equipment', 'profession_tool', 'skill_book', 'soul_artifact'] };
const priceRange = object({
  ...fields(integer, 'minPrice maxPrice referencePrice templateItemId maxListingQuantity'),
  source: text,
  credibilityReady: boolean,
  fixedQuantity: boolean
});

export const marketActions = {
  visit_player_shop: observation<{ ownerUid: number; page?: number }>(
    '分页查看指定店铺及在售挂单；购买资格和价格是当前快照，实际购买需使用珍宝楼原报价确认。',
    'player-shop.visit',
    object({ ownerUid: id, page }, ['page']),
    object({
      currencies: object(fields(integer, 'spiritStone spiritsCrystal spiritsMilk signInCoin towerScore reputation tongxin greenBottle')),
      shop: object(
        {
          ...fields(integer, 'shopId userId heatScore totalSales totalVolume level status activeListings'),
          ...fields(text, 'ownerName shopName description levelName')
        },
        ['description']
      ),
      pagination,
      items: list(
        object(
          {
            ...commonItem,
            ...fields(integer, 'sellerUserId status templateItemId'),
            ...fields(text, 'sellerName itemType itemSubtype purchaseUnavailableReason lockedUntil createdAt expiresAt'),
            canPurchase: boolean,
            attributeAvailable: boolean,
            hasUpgraded: boolean,
            attributesJson: text
          },
          ['templateItemId', 'itemType', 'itemSubtype', 'purchaseUnavailableReason', 'lockedUntil', 'expiresAt', 'hasUpgraded']
        )
      )
    }),
    input => `/逛店 ${input.ownerUid} ${input.page ?? 1}`,
    (data, input) => {
      const result = parseBackendPlayerShopVisit(data);

      if (result.shop?.userId !== input.ownerUid) {
        throw new Error('店铺目标不匹配');
      }

      return {
        ...result,
        items: result.items.map(item => ({
          ...item,
          attributesJson: JSON.stringify({ attributes: item.attributes, attributeView: item.attributeView })
        }))
      };
    },
    input => ({ mode: 'visit', target: { uid: input.ownerUid }, page: String(input.page ?? 1) })
  ),
  get_my_player_shop: observation(
    '查询本人小店及成交统计；服务端可能先创建尚不存在的小店，再读取详情。',
    'player-shop.mine',
    object({}),
    object(
      {
        ...fields(integer, 'shopId userId heatScore totalSales totalVolume activeListings level status'),
        ...fields(text, 'ownerName shopName description levelName')
      },
      ['ownerName', 'shopName', 'description', 'level', 'status']
    ),
    () => '/我的小店',
    parseBackendOwnPlayerShop
  ),
  list_player_shops: observation<{ page?: number }>(
    '分页查询营业中的玩家小店；userId 可作为逛店目标。',
    'player-shop.list',
    object({ page }, ['page']),
    object({
      data: list(
        object(
          {
            ...fields(integer, 'shopId userId heatScore totalSales totalVolume level status activeListings'),
            ...fields(text, 'ownerName shopName description levelName')
          },
          ['description']
        )
      ),
      pagination
    }),
    input => `/小店 ${input.page ?? 1}`,
    parseBackendShopList,
    input => ({ page: String(input.page ?? 1) })
  ),
  get_player_shop_ranking: observation(
    '查询服务端提供的小店热度前 20 名。',
    'player-shop.ranking',
    object({}),
    list(object({ ...fields(integer, 'rank heatScore totalSales'), ...fields(text, 'shopName ownerName levelName') })),
    () => '/小店排行',
    parseBackendShopRanking
  ),
  rename_player_shop: mutation<{ name: string }>(
    '修改本人小店名称，服务端检查名称格式和占用情况。',
    'player-shop.rename',
    object({ name: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ message: text }),
    input => `/命名店铺 ${input.name}`,
    data => parseRobotMarketMessage(data)
  ),
  set_player_shop_description: mutation<{ description: string }>(
    '设置本人小店简介，服务端检查长度和内容。',
    'player-shop.description',
    object({ description: { type: 'string', minLength: 1, maxLength: 1000 } }),
    object({ message: text }),
    input => `/店铺简介 ${input.description}`,
    data => parseRobotMarketMessage(data)
  ),
  browse_market: observation<BrowseInput>(
    '分页查询珍宝楼挂单、价格、购买资格和交易额度；数据是当前快照，不能作为后续购买报价的保证。',
    'market.browse',
    object(
      {
        page,
        keyword: { type: 'string', maxLength: 100 },
        category,
        subtype: { type: 'string', maxLength: 100 },
        sort: { type: 'string', enum: ['latest', 'price_asc', 'price_desc', 'grade_asc', 'grade_desc'] }
      },
      ['page', 'keyword', 'category', 'subtype', 'sort']
    ),
    object({
      spiritsCrystal: integer,
      quota: object(fields(integer, 'dailyLimit dailyUsed remaining')),
      pagination,
      items: list(
        object(
          {
            ...commonItem,
            sellerUserId: integer,
            sellerName: text,
            canPurchase: boolean,
            purchaseUnavailableReason: text,
            upgradeHint: text,
            attributesJson: text
          },
          ['purchaseUnavailableReason']
        )
      )
    }),
    input => `/珍宝楼 ${input.page ?? 1}`,
    data => {
      const result = parseRobotMarketBrowse(data, 'browse');

      if (result.view !== 'browse') {
        throw new Error('珍宝楼查询回执不匹配');
      }

      return {
        ...result,
        items: result.items.map(item => ({
          ...item,
          attributesJson: JSON.stringify({ attributes: item.attributes, attributeView: item.attributeView })
        }))
      };
    },
    input => ({
      view: 'browse',
      categoryType: input.category ?? '',
      categorySubtype: input.subtype ?? '',
      keyword: input.keyword ?? '',
      sort: input.sort ?? 'latest',
      page: String(input.page ?? 1)
    })
  ),
  get_my_market_listings: observation<{ page?: number }>(
    '查询本人挂单及锁定状态；服务端会先刷新挂单锁与过期状态。',
    'market.my-listings',
    object({ page }, ['page']),
    object({
      pagination,
      items: list(
        object({ ...commonItem, totalPriceAmount: integer, lockTag: text, status: integer, lockedUntil: text, expiresAt: text, attributesJson: text }, [
          'lockedUntil',
          'expiresAt'
        ])
      )
    }),
    input => `/我的上架 ${input.page ?? 1}`,
    data => {
      const result = parseMyMarketListings(data);

      return {
        ...result,
        items: result.items.map(item => ({
          ...item,
          attributesJson: JSON.stringify({ attributes: item.attributes, attributeView: item.attributeView })
        }))
      };
    },
    input => ({ page: input.page ?? 1 })
  ),
  get_market_credibility: observation(
    '查询当前玩家交易信誉及每日免费下架额度；服务端可能初始化信誉记录。',
    'market.credibility',
    object({}),
    object({
      ...fields(integer, 'baseScore vipBonus monthCardBonus activityScore totalScore threshold dailyFreeCancelLimit maxScore'),
      isAboveThreshold: boolean,
      ...fields(text, 'progressBar statusText')
    }),
    () => '/信誉分',
    parseMarketCredibility
  ),
  get_market_sellable_assets: observation<{ category: MarketCategory; subtype?: string; page?: number }>(
    '查询本人可上架资产、数量和服务端定价范围；资产编号用于后续选择，资格和价格均可能变化。',
    'market.sell',
    object({ category, subtype: { type: 'string', maxLength: 100 }, page }, ['subtype', 'page']),
    object({
      ...fields(integer, 'total currentPage pageSize totalPages'),
      items: list(
        object(
          {
            ...fields(integer, 'userItemId templateId quantity'),
            ...fields(text, 'name category grade realm'),
            currentLowestPrice: integer,
            priceRange,
            attributesJson: text
          },
          ['currentLowestPrice', 'priceRange']
        )
      )
    }),
    input => `/交易上架 ${input.category}`,
    data => {
      const raw = data as Record<string, unknown>;

      if (raw?.mode !== 'list') {
        throw new Error('可上架资产回执不匹配');
      }
      const result = parseBackendMarketSellable(raw);

      return {
        ...result,
        items: result.items.map(item => ({
          ...item,
          attributesJson: JSON.stringify({ attributes: item.attributes, config: item.config })
        }))
      };
    },
    input => ({ mode: 'list', category: input.category, subtype: input.subtype ?? '', page: String(input.page ?? 1) })
  ),
  get_market_listing_price_range: observation<{ category: MarketCategory; userItemId: number }>(
    '查询指定资产的服务端上架价格范围和数量规则，不上架、不扣费；上架前需重新核对当前规则。',
    'market.sell',
    object({ category, userItemId: id }),
    object({ range: priceRange }),
    input => `/交易上架 ${input.category} ${input.userItemId}`,
    (data, input) => {
      const result = parseRobotMarketSell(data, 'start', input.category);

      if (result.mode !== 'start' || result.message !== undefined || result.listingId !== undefined) {
        throw new Error('上架预览回执不匹配');
      }

      return { range: result.range };
    },
    input => ({ mode: 'start', category: input.category, userItemId: input.userItemId, firstNumber: null, secondNumber: null })
  ),
  create_market_listing: mutation<{ category: MarketCategory; userItemId: number; quantity: number; unitPrice: number }>(
    '按指定数量和灵晶单价上架本人资产；服务端校验资产归属、定价、库存和手续费。固定数量资产必须传 1。',
    'market.sell',
    object({ category, userItemId: id, quantity: { type: 'integer', minimum: 1, maximum: 2147483647 }, unitPrice: id }),
    object({ listingId: id, message: text, range: priceRange }),
    input => `/交易上架 ${input.category} ${input.userItemId} ${input.quantity} ${input.unitPrice}`,
    (data, input) => {
      const result = parseRobotMarketSell(data, 'start', input.category);

      if (result.mode !== 'start' || !result.listingId || !result.message) {
        throw new Error('上架结算回执不完整');
      }

      return { listingId: result.listingId, message: result.message, range: result.range };
    },
    input => ({ mode: 'expose', category: input.category, userItemId: input.userItemId, quantity: input.quantity, unitPrice: input.unitPrice })
  ),
  preview_market_purchase: observation<{ listingId: number; quantity: number }>(
    '预览指定挂单和数量的当前报价；不会购买或扣款。报价是快照，后续结算需服务端锁内核对原报价。',
    'market.purchase',
    object({ listingId: id, quantity: { type: 'integer', minimum: 1, maximum: 2147483647 } }),
    object({
      preview: object({
        ...fields(integer, 'listingId quantity totalPrice'),
        ...fields(text, 'itemName currencyName overpriceWarning'),
        shouldConfirm: boolean
      })
    }),
    input => `/选购 ${input.listingId} ${input.quantity}`,
    (data, input) => {
      const result = parseRobotMarketPurchase(data);

      if (
        !('preview' in result) ||
        result.preview.listingId !== input.listingId ||
        result.preview.quantity !== input.quantity ||
        result.preview.totalPrice < 0
      ) {
        throw new Error('交易预览回执不匹配');
      }

      return result;
    },
    input => ({ listingId: input.listingId, quantity: input.quantity, confirmed: false, previewOnly: true })
  ),
  prepare_market_purchase: mutation<{ listingId: number; quantity: number }>(
    '获取指定挂单的原报价及确认引用；不购买。确认时核对原价格和商品，引用有效期与返回时间一致，跨消息重试使用同一引用。',
    'market.purchase',
    object({ listingId: id, quantity: { type: 'integer', minimum: 1, maximum: 2147483647 } }),
    object({
      preview: object({
        ...fields(integer, 'listingId quantity totalPrice'),
        ...fields(text, 'itemName currencyName overpriceWarning'),
        shouldConfirm: boolean
      }),
      reference: confirmationReferenceSchema,
      expiresAt: text
    }),
    input => `/选购 ${input.listingId} ${input.quantity}`,
    (data, input) => {
      const parsed = parseRobotMarketPurchase(data);
      const row = data as { reference?: unknown; expiresAt?: unknown };

      if (
        !('preview' in parsed) ||
        parsed.preview.listingId !== input.listingId ||
        parsed.preview.quantity !== input.quantity ||
        parsed.preview.totalPrice < 0 ||
        typeof row.reference !== 'string' ||
        typeof row.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(row.expiresAt))
      ) {
        throw new Error('购买引用预览回执不完整');
      }
      validateConfirmationReference(row.reference, 'm');

      return { ...parsed, reference: row.reference, expiresAt: row.expiresAt };
    },
    input => ({ listingId: input.listingId, quantity: input.quantity, referencePreview: true })
  ),
  confirm_market_purchase: mutation<{ reference: string }>(
    '确认原珍宝楼购买引用；服务端锁内核对原商品和报价，原引用重试返回同一事务回执。以结果明细判断实际购买或系统收回。',
    'market.purchase',
    object({ reference: confirmationReferenceSchema }),
    object({
      reference: confirmationReferenceSchema,
      result: object(
        {
          listingId: id,
          quantity: integer,
          totalPrice: integer,
          systemReclaimed: boolean,
          message: text,
          lines: list(
            object({ ...fields(integer, 'listingId sellerUserId quantity unitPriceAmount totalPrice'), systemReclaimed: boolean }, ['systemReclaimed'])
          )
        },
        ['quantity', 'totalPrice', 'systemReclaimed', 'lines']
      )
    }),
    () => '/选购',
    (data, input) => {
      const row = data as { reference?: unknown; result?: { listingId?: unknown; message?: unknown } } | null;

      if (
        row?.reference !== input.reference ||
        !Number.isSafeInteger(row.result?.listingId) ||
        Number(row.result?.listingId) < 1 ||
        typeof row.result?.message !== 'string'
      ) {
        throw new Error('市场购买结算回执不完整');
      }

      return row;
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'm')
  ),
  get_market_records: observation<{ page?: number; mode?: 'all' | 'buy' | 'sell' }>(
    '分页查询本人买入或卖出的交易记录，保留实际数量、单价、手续费和卖家到账。',
    'market.records',
    object({ page, mode: { type: 'string', enum: ['all', 'buy', 'sell'] } }, ['page', 'mode']),
    object({
      ...fields(integer, 'total currentPage totalPages'),
      rows: list(
        object(
          {
            ...fields(integer, 'id listingId sellerUserId quantity unitPriceAmount totalPriceAmount feeAmount sellerReceivedAmount'),
            ...fields(text, 'role itemCategory itemCategoryLabel itemName currencyCode currencyName createdAt'),
            sellerName: text
          },
          ['sellerName']
        )
      )
    }),
    input => `/我的交易记录 ${input.mode === 'buy' ? '买 ' : input.mode === 'sell' ? '卖 ' : ''}${input.page ?? 1}`,
    data => {
      const result = parseBackendMarketTrades(data);

      return { ...result, rows: result.rows.map(row => ({ ...row, createdAt: row.created_at.toISOString(), sellerName: row.seller?.name })) };
    },
    input => ({ mode: input.mode ?? 'all', page: String(input.page ?? 1) })
  ),
  cancel_market_listing: mutation<{ listingId: number }>(
    '下架本人指定挂单；服务端校验所有权和锁定状态，手续费等结果以回执为准。',
    'market.cancel',
    object({ listingId: id }),
    object({ message: text }),
    input => `/交易下架 ${input.listingId}`,
    parseRobotMarketMessage
  )
};

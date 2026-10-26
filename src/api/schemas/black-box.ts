/** Public Go DTOs only. Select every displayed field; never forward opaque private payloads. */
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Error('黑盒拍卖数据不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw Error('黑盒拍卖文本不完整');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw Error('黑盒拍卖数值无效');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw Error('黑盒拍卖状态不完整');
  }

  return value;
}
function array<T>(value: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw Error('黑盒拍卖列表不完整');
  }

  return value.map(parse);
}
function date(value: unknown) {
  const s = text(value);

  if (!Number.isFinite(Date.parse(s))) {
    throw Error('黑盒拍卖时间无效');
  }

  return s;
}
function enumValue<T extends string>(value: unknown, values: readonly T[]): T {
  const s = text(value);

  if (!values.includes(s as T)) {
    throw Error('黑盒拍卖状态无效');
  }

  return s as T;
}
const currencies = ['ALLOWANCE', 'SPIRIT_CRYSTAL', 'SPIRIT_MILK'] as const;
const statuses = [
  'reserved',
  'cancelled',
  'unconfirmed',
  'ineligible',
  'unfunded',
  'expired',
  'admitted',
  'won',
  'lost',
  'passed',
  'waiting',
  'unfilled',
  'system_cancelled',
  'missed'
] as const;

export const currencyName = { ALLOWANCE: '普通额度', SPIRIT_CRYSTAL: '灵晶', SPIRIT_MILK: '道晶' } as const;
export const statusName = {
  waiting: '等人中',
  unfilled: '流拍 · 人数不足',
  missed: '流拍 · 未入场',
  reserved: '已预约',
  cancelled: '已取消',
  system_cancelled: '系统取消',
  unconfirmed: '未确认',
  ineligible: '未通过资格检查',
  unfunded: '可用余额不足',
  expired: '系统取消',
  admitted: '已正式入场',
  won: '已竞得',
  lost: '未竞得',
  passed: '流拍'
} as const;
const optionalText = (r: Record<string, unknown>, key: string) => (r[key] === undefined ? undefined : text(r[key]));
const optionalNumber = (r: Record<string, unknown>, key: string) => (r[key] === undefined ? undefined : number(r[key]));

export function parseBlackBoxOverview(value: unknown) {
  const r = object(value);
  const schedule =
    r.schedule === undefined
      ? undefined
      : (() => {
          const s = object(r.schedule);

          return {
            admissionPolicy: s.admissionPolicy === undefined ? undefined : enumValue(s.admissionPolicy, ['click-window-v1'] as const),
            startsAt: s.startsAt === undefined ? undefined : date(s.startsAt),
            endsAt: s.endsAt === undefined ? undefined : date(s.endsAt),
            testWelfare: s.testWelfare === undefined ? false : boolean(s.testWelfare),
            day: number(s.day),
            date: date(s.date),
            teaserNames: array(s.teaserNames, text),
            sessions: array(s.sessions, v => {
              const x = object(v);

              return {
                id: text(x.id),
                joinClosesAt: x.joinClosesAt === undefined ? undefined : date(x.joinClosesAt),
                opensAt: date(x.opensAt),
                type: enumValue(x.type, ['普通场', '高级场'] as const),
                rooms: array(x.rooms, y => {
                  const z = object(y);

                  return {
                    status: z.status === undefined ? undefined : enumValue(z.status, ['pending', 'grouped', 'settled', 'cancelled'] as const),
                    id: text(z.id),
                    label: text(z.label),
                    currency: enumValue(z.currency, currencies),
                    floor: number(z.floor),
                    clue: text(z.clue)
                  };
                })
              };
            })
          };
        })();

  return {
    enabled: boolean(r.enabled),
    state: r.state === undefined ? undefined : enumValue(r.state, ['active', 'scheduled', 'ended', 'not_open'] as const),
    startsAt: r.startsAt === undefined ? undefined : date(r.startsAt),
    endsAt: r.endsAt === undefined ? undefined : date(r.endsAt),
    eventId: optionalNumber(r, 'eventId'),
    title: optionalText(r, 'title'),
    serverTime: date(r.serverTime),
    schedule,
    allowanceAvailable: number(r.allowanceAvailable),
    allowanceHeld: number(r.allowanceHeld),
    allowanceSpent: number(r.allowanceSpent),
    supplementGranted: boolean(r.supplementGranted),
    funds: array(r.funds, v => {
      const f = object(v);

      return { currency: enumValue(f.currency, currencies), available: number(f.available), held: number(f.held), total: number(f.total) };
    })
  };
}
export function parseBlackBoxReservation(value: unknown) {
  const r = object(value);

  return {
    notificationEnabled: r.notificationEnabled === undefined ? undefined : boolean(r.notificationEnabled),
    serverTime: date(r.serverTime),
    roomId: text(r.roomId),
    sessionId: text(r.sessionId),
    opensAt: date(r.opensAt),
    status: enumValue(r.status, statuses),
    joinClosesAt: r.joinClosesAt === undefined ? undefined : date(r.joinClosesAt),
    groupStartsAt: r.groupStartsAt === undefined ? undefined : date(r.groupStartsAt),
    confirmed: boolean(r.confirmed)
  };
}
export function parseBlackBoxHistory(value: unknown) {
  const r = object(value);

  return {
    serverTime: date(r.serverTime),
    page: number(r.page),
    hasMore: boolean(r.hasMore),
    items: array(r.items, v => {
      const x = object(v);

      return {
        admissionPolicy: x.admissionPolicy === undefined ? undefined : enumValue(x.admissionPolicy, ['click-window-v1'] as const),
        joinClosesAt: x.joinClosesAt === undefined ? undefined : date(x.joinClosesAt),
        groupStartsAt: x.groupStartsAt === undefined ? undefined : date(x.groupStartsAt),
        eventId: number(x.eventId),
        title: text(x.title),
        roomId: text(x.roomId),
        activityDay: number(x.activityDay),
        opensAt: date(x.opensAt),
        status: enumValue(x.status, statuses),
        statusReason: optionalText(x, 'statusReason'),
        confirmed: boolean(x.confirmed),
        currency: enumValue(x.currency, currencies),
        ownBid: number(x.ownBid),
        ownHeld: number(x.ownHeld),
        charged: number(x.charged)
      };
    })
  };
}
function parseProbe(value: unknown) {
  const r = object(value);

  return { id: text(r.id), label: text(r.label), purpose: optionalText(r, 'purpose'), answer: optionalText(r, 'answer') };
}
function parseAsset(value: unknown) {
  const r = object(value);

  return {
    category: enumValue(r.category, ['item', 'currency', 'equipment', 'skill_book', 'soul_artifact'] as const),
    name: text(r.name),
    quantity: number(r.quantity),
    assetId: optionalNumber(r, 'assetId'),
    templateId: optionalNumber(r, 'templateId')
  };
}
export function parseBlackBoxRoom(value: unknown) {
  const r = object(value),
    phase = enumValue(r.phase, ['appraisal', 'bidding', 'closed'] as const);
  const appraisal =
    r.appraisal === undefined
      ? undefined
      : (() => {
          const a = object(r.appraisal),
            d = object(a.disclosure);

          if (d.use_requirements_are_bid_eligibility !== false) {
            throw Error('物品使用条件不能成为竞拍资格');
          }
          const upgrade =
            d.upgrade_requirements === undefined
              ? undefined
              : (() => {
                  const u = object(d.upgrade_requirements);

                  return { materials: number(u.material_bodies), total: number(u.total_bodies_including_target), limit: number(u.per_instance_limit) };
                })();

          return {
            roomType: text(a.roomType),
            decisionGuide: optionalText(a, 'decisionGuide'),
            remaining: number(a.remaining),
            canRevealAll: boolean(a.canRevealAll),
            probes: array(a.probes, parseProbe),
            disclosure: {
              type: text(d.main_item_type),
              grade: optionalText(d, 'initial_grade') ?? optionalText(d, 'grade'),
              slot: optionalText(d, 'slot'),
              use: optionalText(d, 'main_use'),
              conditions: array(d.use_requirements, text),
              quantity: optionalNumber(d, 'fixed_main_quantity'),
              seeds: optionalNumber(d, 'seed_type_count'),
              upgrade
            }
          };
        })();

  if (phase !== 'closed' && (r.content !== undefined || r.result !== undefined)) {
    throw Error('黑盒揭晓时机无效');
  }
  const content =
    r.content === undefined
      ? undefined
      : (() => {
          const c = object(r.content);

          return {
            title: text(c.title),
            combinationSummary: optionalText(c, 'combinationSummary'),
            grade: text(c.grade),
            rewards: array(c.rewards, parseAsset),
            appraisals: c.appraisals === undefined ? [] : array(c.appraisals, parseProbe)
          };
        })();
  const result =
    r.result === undefined
      ? undefined
      : (() => {
          const x = object(r.result);

          return {
            outcome: enumValue(x.outcome, ['won', 'lost', 'passed', 'system_cancelled'] as const),
            explanation: optionalText(x, 'explanation'),
            charged: number(x.charged),
            released: number(x.released),
            releaseExpired: boolean(x.releaseExpired),
            activityDay: number(x.activityDay),
            dailySupplementGranted: boolean(x.dailySupplementGranted),
            assets: array(x.assets, parseAsset)
          };
        })();

  return {
    revealsAt: r.revealsAt === undefined ? undefined : date(r.revealsAt),
    groupStartsAt: r.groupStartsAt === undefined ? undefined : date(r.groupStartsAt),
    serverTime: date(r.serverTime),
    opensAt: date(r.opensAt),
    roomId: text(r.roomId),
    status: enumValue(r.status, ['admitted', 'won', 'lost', 'passed', 'system_cancelled'] as const),
    phase,
    currency: enumValue(r.currency, currencies),
    floor: number(r.floor),
    ownBid: number(r.ownBid),
    ownHeld: number(r.ownHeld),
    available: number(r.available),
    appraisal,
    content,
    result
  };
}
export function parseBlackBoxBidPreview(value: unknown) {
  const r = object(value);

  return { room: parseBlackBoxRoom(r.room), amount: number(r.amount) };
}
export type BlackBoxRoom = ReturnType<typeof parseBlackBoxRoom>;

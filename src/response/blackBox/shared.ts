import { markdownButtonLabel } from '@src/utils/buttonLabel';
import type { RobotBusinessOperation } from '@src/api/bot/robot-business';
import { SDKError } from '@src/api/core/error';
import { runRobotBusiness } from '@src/response/robotBusiness';
import type { GameEvent } from '@src/types/event';
import { formatGameTime } from '@src/utils/gameTime';
import { createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, useEvent, useRoute } from 'alemonjs';
import { selects } from '@src/response/config';

export type Button = GuiButton & { command: string; autoEnter?: boolean };
export const target = (eventId: number, roomId: string) => `${eventId} ${roomId}`;
export const clock = (date: string) => formatGameTime(date, 'MM-DD HH:mm:ss');

export function admittedPhaseLabel(serverTime: string, groupStartsAt?: string) {
  if (!groupStartsAt) {
    return '已入组 · 查看本组状态';
  }
  const elapsed = Date.parse(serverTime) - Date.parse(groupStartsAt);

  if (elapsed < 0) {
    return '已入组 · 等待开拍';
  }
  if (elapsed < 60000) {
    return '鉴宝中 · 查看本组';
  }
  if (elapsed < 180000) {
    return '暗标中 · 查看本组';
  }

  return '暗标已截止 · 等待结算';
}

export function reminderPhaseLabel(serverTime: string, opensAt: string, joinClosesAt?: string) {
  const now = Date.parse(serverTime);

  if (joinClosesAt && now >= Date.parse(joinClosesAt)) {
    return '入场已截止';
  }
  if (now < Date.parse(opensAt)) {
    return '待开场，开场后需点击入场';
  }

  return joinClosesAt ? '可入场' : '查看排期确认入场窗口';
}

export function createBlackBoxContext(e: GameEvent, overviewCommand: '/黑盒拍卖' | '/黑盒排期' = '/黑盒排期') {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [route] = useRoute(e);
  const args = route.rawArgs;
  const privateChat = isPrivateEvent(e);
  let title = '黑盒拍卖会';
  let content = Format.createMarkdown();
  let operation: RobotBusinessOperation | undefined;
  let received = false;
  let footer: Button[] = [
    ...(overviewCommand === '/黑盒拍卖' ? [] : [{ label: '拍卖首页', command: '/黑盒拍卖' }]),
    { label: '今日排期', command: '/黑盒排期' },
    { label: '我的记录', command: '/黑盒记录' }
  ];
  let nav: { current: number; hasNext: boolean; command: string } | undefined;
  const quote = (lines: string[], buttons: Button[] = []) => {
    const block = createQuoteMarkdown(lines.filter(Boolean));

    for (const button of buttons) {
      block
        .addText(' ')
        .addButton(markdownButtonLabel(`${button.label}`), {
          data: button.command,
          ...(button.autoEnter === undefined ? {} : { autoEnter: button.autoEnter })
        });
    }
    content.addBlockquote(block);
  };
  const send = () => message.send(FormatGui({ bid: e.UserId, isPrivate: privateChat, title, content, footer, nav }));

  async function call<T>(requestedOperation: RobotBusinessOperation, arguments_: Record<string, unknown>, parse: (v: unknown) => T): Promise<T | undefined> {
    operation = requestedOperation;
    received = false;
    const result = await runRobotBusiness(e, requestedOperation, arguments_, parse, next);

    received = true;

    return result.handled ? undefined : result.data;
  }
  const usage = () => quote(['请选择场次或查看我的预约。']);

  async function recover(error: unknown, reservationError = '预约结果待确认，请查看我的预约。') {
    logger.error('黑盒拍卖处理失败', {
      operation,
      received,
      message: error instanceof Error ? error.message : '未知异常',
      ...(error instanceof SDKError ? { code: error.code, status: error.status, requestId: error.requestId } : {})
    });
    content = Format.createMarkdown();
    footer = [];
    nav = undefined;
    const roomOperation = ['black-box.room', 'black-box.probe', 'black-box.bid-preview', 'black-box.bid'].includes(operation ?? '');
    const refresh: Button = roomOperation ? { label: '刷新', command: `/黑盒详情 ${args[0]} ${args[1]}` } : { label: '查看记录', command: '/黑盒记录' };
    const failures: Partial<Record<RobotBusinessOperation, string>> = {
      'black-box.bid': '报价结果待确认，请刷新核对报价与占用。',
      'black-box.probe': '鉴宝结果待确认，请刷新查看已查线索与剩余次数。',
      'black-box.reservation': reservationError,
      'black-box.bid-preview': '预览失败 · 尚未提交报价',
      'black-box.overview': overviewCommand === '/黑盒拍卖' ? '概览暂未获取，请刷新。' : '排期暂未获取，请刷新。'
    };

    quote(
      [received ? '回执展示失败，请刷新核对结果。' : (failures[operation!] ?? '记录暂未获取，请刷新。')],
      !received && operation === 'black-box.overview'
        ? [{ label: overviewCommand === '/黑盒拍卖' ? '刷新概览' : '刷新今日排期', command: `${overviewCommand}${args[0] ? ` ${args[0]}` : ''}` }]
        : [refresh]
    );
    await send();
  }

  return {
    args,
    privateChat,
    quote,
    send,
    call,
    usage,
    recover,
    setTitle(value: string) {
      title = value;
    },
    setNav(value: typeof nav) {
      nav = value;
    },
    setRoomFooter(ref: string, notifications = true) {
      footer = [
        ...(notifications
          ? [
              { label: '通知我', command: `/黑盒提醒 ${ref}` },
              { label: '取消通知', command: `/黑盒提醒 ${ref} 关闭` }
            ]
          : []),
        { label: '刷新本场', command: `/黑盒详情 ${ref}` },
        ...footer
      ];
    }
  };
}
export type BlackBoxContext = ReturnType<typeof createBlackBoxContext>;
export function validRoomArgs(args: string[], count: number): boolean {
  return args.length === count && /^\d+$/.test(args[0]) && Number.isSafeInteger(Number(args[0])) && Number(args[0]) > 0 && /^D\d{2}-\d{4}-[ABC]$/.test(args[1]);
}
export function roomInput(args: string[]) {
  return { eventId: Number(args[0]), roomId: args[1] };
}
export function bidInputHelp(view: BlackBoxContext) {
  if (!validRoomArgs(view.args.slice(0, 2), 2)) {
    view.usage();

    return;
  }
  const ref = target(Number(view.args[0]), view.args[1]);

  view.quote(
    ['请输入正整数报价，预览后再确认提交。'],
    [
      { label: '重新输入报价', command: `/黑盒出价 ${ref} `, autoEnter: false },
      { label: '返回本场', command: `/黑盒详情 ${ref}` }
    ]
  );
}

export function bidAmount(view: BlackBoxContext): number | undefined {
  const raw = view.args[2];
  const amount = Number(raw);

  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0) {
    view.quote(['报价须为正整数。']);
    bidInputHelp(view);

    return undefined;
  }

  return amount;
}

/** All auction commands, including reads and legacy aliases, share this gate. */
export function onBlackBoxResponse(handler: (event: GameEvent) => Promise<void>) {
  return onResponse(selects, async event => {
    if (!isPrivateEvent(event)) {
      const [message] = useMessage();
      const content = Format.createMarkdown().addBlockquote(createQuoteMarkdown(['黑盒拍卖仅限私聊，请私聊本机器人发送 /黑盒拍卖。']));

      await message.send(FormatGui({ bid: event.UserId, isPrivate: false, title: '黑盒拍卖会', content, footer: [], bar: false }));

      return;
    }
    await handler(event);
  });
}

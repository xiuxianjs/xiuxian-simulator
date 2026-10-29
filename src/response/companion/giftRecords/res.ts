import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { type GiftRecordMode } from '@src/utils/giftRecordPresentation';
import { parseRobotGiftRecords } from '@src/api/bot/companion-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const parseQuery = (text: string): { mode: GiftRecordMode; page: number } => {
  const normalized = (text ?? '').trim();
  const match = normalized.match(/^[!！/#＃]?赠礼记录(?:\s+(送出|收到))?(?:\s+(\d+))?\s*$/);
  const mode = match?.[1] === '送出' ? 'send' : match?.[1] === '收到' ? 'receive' : 'all';
  const page = match?.[2] ? Math.max(1, Number(match[2])) : 1;

  return { mode, page: Number.isFinite(page) ? Math.floor(page) : 1 };
};

const buildFilterButtons = (mode: GiftRecordMode) => [
  { label: '全部', selected: mode === 'all', command: '/赠礼记录' },
  { label: '送出', selected: mode === 'send', command: '/赠礼记录 送出' },
  { label: '收到', selected: mode === 'receive', command: '/赠礼记录 收到' }
];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const [, next] = useEvent();

  if (!/^[!！/#＃]?赠礼记录(?:\s+(送出|收到))?(?:\s+\d+)?\s*$/.test(text)) {
    return next();
  }

  const query = parseQuery(text);
  let response;

  try {
    response = await runRobotBusiness(
      e,
      'companion.gift-records',
      { mode: query.mode, page: String(query.page) },
      data => parseRobotGiftRecords(data, query.mode),
      next,
      async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: reply.title,
            content: Format.createMarkdown().addText(reply.text),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      }
    );
  } catch {
    void message.send(FormatGui({ isPrivate, bid, title: '赠礼记录', content: Format.createMarkdown().addText('查看赠礼记录失败，请稍后再试') }));

    return;
  }
  if (response.handled) {
    return;
  }
  const result = { data: response.data };
  const uid = e.uid as number;

  const { data } = result;
  const filterButtons = buildFilterButtons(query.mode);

  if (data.rows.length === 0) {
    const md = Format.createMarkdown();

    md.addText('暂无赠礼记录');
    md.addNewline();
    md.addText('可从好友页或赠送页进入赠礼流程。');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: data.title,
        content: md,
        header: [{ label: '返回好友', command: '/我的好友' }],
        footer: filterButtons
      })
    );

    return;
  }

  const md = Format.createMarkdown();

  md.addBlockquote(Format.createMarkdown().addText(`筛选：${query.mode === 'send' ? '送出' : query.mode === 'receive' ? '收到' : '全部'}`));

  for (const row of data.rows) {
    const isSender = row.senderUid === uid;
    const targetName = isSender ? row.receiverName : row.senderName;
    const actionText = isSender ? '送给' : '收到';
    const timeText = formatGameTime(row.created_at);
    const effectText = row.tongxinGained > 0 ? `灵契 +${row.intimacyGained} / 同心 +${row.tongxinGained}` : `灵契 +${row.intimacyGained}`;

    md.addText(`${timeText}【${row.relationText}${row.premium ? '·珍礼' : ''}】`);
    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText(`${actionText}：${targetName}`)
        .addNewline()
        .addText(`礼物：${row.giftName} x${row.quantity}`)
        .addNewline()
        .addText(`效果：${effectText}`)
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: data.title,
      header: [{ label: '返回好友', command: '/我的好友' }],
      content: md,
      nav: {
        current: data.currentPage,
        total: data.totalPages,
        count: data.total,
        command: `${data.cmdPrefix} {page}`
      },
      footer: filterButtons
    })
  );
});

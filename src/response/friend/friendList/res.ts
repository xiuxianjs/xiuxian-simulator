import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendFriends } from '@src/api/bot/queries';
import { parseGuardedSocialQuery } from '@src/api/bot/social-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { PAGE_SIZE } from '@src/constants';
/**
 * 我的好友指令
 */
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?我的好友\s*(\d+)?$/);
  const page = match?.[1] ? parseInt(match[1], 10) : 1;

  if (!Number.isFinite(page)) {
    const md = Format.createMarkdown().addText('页码超出可查询范围');

    appendMiddlewareAdvice(md, friendRecoveryTips('friends.overview', '页码超出可查询范围'));
    await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '我的好友', content: md }));

    return;
  }
  // Legacy query parsing normalizes an out-of-int64 page to page 1.
  const backendPage = page >= 2 ** 63 ? 0 : page;
  const result = await runRobotBusiness(
    e,
    'friends.overview',
    { page: backendPage, pageSize: PAGE_SIZE },
    data => parseGuardedSocialQuery(data, parseBackendFriends),
    next
  );

  if (result.handled) {
    return;
  }
  const { access: fifthLayerAccess, data } = result.data;
  const sparAccess = { ok: fifthLayerAccess.canUseSpar };

  if (!fifthLayerAccess.ok) {
    sendFifthLayerLockedPage({
      bid,
      isPrivate: e.isPrivate ?? false,
      message,
      title: '我的好友',
      realmName: fifthLayerAccess.realmName
    });

    return;
  }

  if (data === null) {
    return;
  }

  if (data.total === 0) {
    const md = Format.createMarkdown();

    md.addText('暂无好友');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.overview', '暂无好友'));
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '我的好友',
        header: [
          { label: '刷新', command: '/我的好友' },
          { label: '随机好友', command: '/随机好友' },
          { label: '结交', command: '/结交 ' },
          { label: '好友申请', command: '/好友申请' },
          { label: '赠礼记录', command: '/赠礼记录' },
          { label: '飞信收件', command: '/飞信' }
        ],
        content: md
      })
    );

    return;
  }

  const { list, total, maxFriends, currentPage, pageSize } = data;

  const md = Format.createMarkdown();

  md.addText(`好友数量：${total}/${maxFriends}`);
  if (!list.length) {
    md.addNewline().addText('本页暂无好友');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.overview', '本页暂无好友'));
  }
  md.addNewline();

  list.forEach(friend => {
    md.addText(`【${friend.relationText}】【${friend.spiritBondLevel}(${friend.intimacy})】${friend.friendName}`);
    md.addNewline();

    const friendBtns: { label: string; command: string }[] = [
      { label: '赠送', command: `/赠送 ${friend.friendId}` },
      { label: '飞信', command: `/发飞信 ${friend.friendId} ` },
      { label: '信息', command: `/查看信息 ${friend.friendId}` },
      { label: '灵田', command: `/查看灵田 ${friend.friendId}` },
      { label: '删除', command: `/删除好友 ${friend.friendId}` }
    ];

    if (sparAccess.ok) {
      friendBtns.splice(1, 0, { label: '比试', command: `/比试 ${friend.friendId}` });
    }

    if (friend.canProposeCompanion) {
      friendBtns.push({ label: '道侣', command: `/结为道侣 ${friend.friendName}` });
    }

    md.addNewline();
    addOptions(md, friendBtns);
  });

  void message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: '我的好友',
      header: [
        { label: '随机好友', command: '/随机好友' },
        { label: '结交', command: '/结交 ' },
        { label: '好友申请', command: '/好友申请' },
        { label: '赠礼记录', command: '/赠礼记录' },
        { label: '飞信收件', command: '/飞信' }
      ],
      content: md,
      nav: {
        current: currentPage,
        total: Math.ceil(total / pageSize),
        count: total,
        command: '/我的好友 {page}'
      }
    })
  );
});

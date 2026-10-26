import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { describeNotificationGroup } from '@src/notification/channel';
import type { NotificationTarget } from '@src/types/notification';
import { useMessage } from '@src/utils/useMessage';
/**
 * 我的设置指令
 * 使用 FormatGui 展示当前用户配置，并提供按钮快速切换
 */

import App from '@src/response-apps/message/settings/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();

  try {
    const result = await App({ event: e, next, includeGroup: !(e.isPrivate ?? e.name.startsWith('private.')) && !!e.ChannelId });

    if (!result) {
      return;
    }

    if (result.code !== 'OK') {
      const errMd = Format.createMarkdown();

      errMd.addText('获取设置失败，请稍后再试');

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '修行设置',
          content: errMd
        })
      );

      return;
    }

    const config = result.data;
    const isAuto = config.dungeonBattleMode === 'auto';
    const noMentalInTeam = config.teamDungeonNoMental;
    const confirmCrystal = config.confirmSpiritCrystal;
    const confirmDao = config.confirmDaoCrystal;
    const friendAutoApprove = config.autoApproveFriendTeam;
    const teamInviteEnabled = config.teamInviteEnabled;
    const teamAutoAcceptInvite = config.teamAutoAcceptInvite;

    // ── 内容区 ──
    const md = Format.createMarkdown();

    const setting = (label: string, state: string, description: string, buttons: { label: string; command: string }[]) => {
      const row = Format.createMarkdown().addText(`${label}：${state}`);

      for (const button of buttons) {
        row.addText(' ').addButton(markdownButtonLabel(`${button.label}`), { data: button.command });
      }
      row.addNewline().addText(description);
      md.addBlockquote(row);
    };

    setting('秘境战法', isAuto ? '自动' : '手动', isAuto ? '挑战后自动战斗至通关或失败。' : '每层手动确认继续挑战，可随时撤退保全收益。', [
      { label: isAuto ? '改为手动' : '改为自动', command: isAuto ? '/配置秘境模式 手动' : '/配置秘境模式 自动' }
    ]);
    setting(
      '闭关自动加速',
      config.meditationAutoBoost ? '开启' : '关闭',
      '默认关闭。开启后，下次闭关自动使用灵石提升修炼效率；出关结算费用，灵石不足时按普通修炼计算。',
      [{ label: config.meditationAutoBoost ? '关闭' : '开启', command: `/配置闭关自动加速 ${config.meditationAutoBoost ? '关闭' : '开启'}` }]
    );
    setting('组队精力', noMentalInTeam ? '不消耗' : '正常消耗', '不消耗精力时，不获得收益、不消耗次数；单人挑战仍按原规则结算。', [
      { label: noMentalInTeam ? '正常消耗' : '不消耗', command: noMentalInTeam ? '/配置组队精力 消耗' : '/配置组队精力 不消耗' }
    ]);
    setting('好友自动入队', friendAutoApprove ? '开启' : '关闭', '开启后，好友申请加入你的队伍时自动通过审批。', [
      { label: friendAutoApprove ? '关闭' : '开启', command: `/配置好友自动审批进队 ${friendAutoApprove ? '关闭' : '开启'}` }
    ]);
    setting('接受组队邀请', teamInviteEnabled ? '开启' : '关闭', '关闭后，其他队长将无法向你发送队伍邀请。', [
      { label: teamInviteEnabled ? '关闭' : '开启', command: `/配置接受队伍邀请 ${teamInviteEnabled ? '关闭' : '开启'}` }
    ]);
    const autoAcceptLabels: Record<string, string> = { none: '关闭', all: '所有人', friend: '仅好友', companion: '仅道侣' };
    const inviteOptions = [
      { key: 'all', label: '所有人' },
      { key: 'friend', label: '仅好友' },
      { key: 'companion', label: '仅道侣' },
      { key: 'none', label: '关闭' }
    ];

    setting(
      '自动赴约',
      autoAcceptLabels[teamAutoAcceptInvite] ?? '关闭',
      '符合条件的队伍邀请将自动同意并直接入队。',
      inviteOptions
        .filter(option => option.key !== teamAutoAcceptInvite)
        .map(option => ({ label: option.label, command: `/配置自动同意队伍邀请 ${option.label}` }))
    );
    setting('隐去行迹', config.hideProfile ? '开启' : '关闭', '开启后，他人仅能查看你的基本信息。', [
      { label: config.hideProfile ? '关闭' : '开启', command: `/配置信息隐藏 ${config.hideProfile ? '关闭' : '开启'}` }
    ]);
    setting(
      '购置确认',
      `灵晶${confirmCrystal > 0 ? `≥${confirmCrystal}` : '关闭'} ｜ 道晶${confirmDao > 0 ? `≥${confirmDao}` : '关闭'}`,
      '商城或珍宝楼购买总价达到阈值时，需二次确认。',
      [
        { label: '灵晶确认额', command: '/配置灵晶确认' },
        { label: '道晶确认额', command: '/配置道晶确认' }
      ]
    );
    const notificationMd = Format.createMarkdown();

    notificationMd.addBold('【传讯约定 · 群通知订阅】');
    notificationMd.addNewline();

    if (e.isPrivate || !e.ChannelId) {
      notificationMd.addText('🔵 请在需要接收通知的群内查看和管理。');
    } else {
      const subscription = config.subscription;
      const currentScope = e.Target?.scope === 'channel' || e.SpaceId?.startsWith('GUILD:') ? 'channel' : 'group';
      const isCurrentGroup =
        subscription?.isEnabled &&
        subscription.platform === String(e.Platform ?? '') &&
        subscription.channelId === String(e.ChannelId) &&
        subscription.targetScope === currentScope &&
        (!subscription.botId || subscription.botId === e.BotId);

      if (!subscription) {
        notificationMd.addText('🔴 未开启 ');
        notificationMd.addButton(markdownButtonLabel('开启本群订阅'), { data: '/开启群订阅' });
      } else if (subscription.isEnabled) {
        notificationMd.addText(isCurrentGroup ? '🟢 已在本群开启 ' : '🟡 已在其他群开启 ');
        if (!isCurrentGroup) {
          notificationMd.addButton(markdownButtonLabel('切换至本群'), { data: '/开启群订阅' });
          notificationMd.addText(' ');
        }
        notificationMd.addButton(markdownButtonLabel('关闭'), { data: '/关闭群订阅' });
        notificationMd.addNewline();
        const state = subscription.channelState;

        notificationMd.addText(
          state?.state === 'blocked'
            ? '群投递暂停：平台已关闭主动通知。授权恢复后自动恢复，订阅仍保留。'
            : state?.retryAt && state.retryAt > Date.now()
              ? '投递暂时失败，正在等待重试；订阅仍保留。'
              : state?.state === 'allowed'
                ? '群通知可用（最近状态）。'
                : '群权限尚未确认，将在发送失败时查询。'
        );
        if (subscription.failureCount > 0 && state?.state !== 'blocked') {
          notificationMd.addNewline();
          notificationMd.addText(`最近连续失败 ${subscription.failureCount} 次，不会因此自动关闭订阅。`);
        }
      } else if (subscription.lastError) {
        notificationMd.addText('🔴 订阅已关闭 ');
        notificationMd.addButton(markdownButtonLabel('开启本群订阅'), { data: '/开启群订阅' });
        notificationMd.addNewline();
        notificationMd.addText(`失败原因：${subscription.lastError}`);
      } else {
        notificationMd.addText('🔴 已关闭 ');
        notificationMd.addButton(markdownButtonLabel('开启本群订阅'), { data: '/开启群订阅' });
      }

      notificationMd.addNewline();
      try {
        if (result.data.groupSnapshotUnavailable) {
          throw new Error('群通道缓存不可用');
        }
        const target: NotificationTarget = { platform: String(e.Platform), BotId: e.BotId, scope: currentScope, targetId: String(e.ChannelId) };

        for (const line of await describeNotificationGroup(target, bid, result.data.groupSnapshot ?? null)) {
          notificationMd.addText(line).addNewline();
        }
      } catch (_error) {
        notificationMd.addText('群通道状态暂时无法确认。').addNewline();
      }
      notificationMd.addText('通知优先发往订阅群；无法投递时尝试已知私聊地址，也可在 /我的通知 查阅。');
    }

    notificationMd.addNewline();
    notificationMd.addButton(markdownButtonLabel('通知设置'), { data: '/通知设置' }).addText(' ');
    notificationMd.addButton(markdownButtonLabel('通知记录'), { data: '/我的通知' });
    md.addBlockquote(notificationMd);

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '修行设置',
        header: [
          { label: '道友小传', command: '/更多 个人资料' },
          { label: '藏经阁', command: '/更多 游戏资料' },
          { label: '账号安护', command: '/安全中心' }
        ],
        content: md,
        footer: [
          { label: '自动任务', command: '/任务面板 自动' },
          { label: '外观主题', command: '/我的主题' },
          { label: '回仙途百事', command: '/更多' }
        ]
      })
    );
  } catch (_error) {
    const errMd = Format.createMarkdown();

    errMd.addText('获取设置失败，请稍后再试');

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '修行设置',
        content: errMd
      })
    );
  }
});

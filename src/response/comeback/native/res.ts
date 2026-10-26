import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseNativeComebackOverview } from '@src/api/bot/native-comeback';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();
  const [, next] = useEvent();
  const renderFailure = async (text: string) => {
    const content = Format.createMarkdown();

    content.addText(text);
    await message.send(FormatGui({ isPrivate, bid, title: '回归活动', content, footer: [{ label: '我的信息', command: '/我的信息' }] }));
  };
  let data: ReturnType<typeof parseNativeComebackOverview>;

  try {
    const loaded = await runRobotBusiness(e, 'native-comeback.overview', {}, parseNativeComebackOverview, next, reply => renderFailure(reply.text));

    if (loaded.handled) {
      return;
    }
    data = loaded.data;
  } catch (error) {
    await renderFailure(error instanceof Error ? error.message : '加载本服回归奖励失败');

    return;
  }

  if (!data.enabled) {
    md.addText('本服回归活动暂未开启。');
  } else if (!data.current) {
    md.addText('当前未触发本服回归活动。');
    md.addNewline();
    md.addText(`小回归：沉默${data.rules.smallSilentDays}天及以上`);
    md.addNewline();
    md.addText(`大回归：沉默${data.rules.largeSilentDays}天及以上`);
  } else {
    const current = data.current;

    md.addText(`回归类型：${current.comebackTypeText}`);
    md.addNewline();
    md.addText(`触发沉默：${current.silentDays}天`);
    md.addNewline();
    md.addText(`有效剩余：${current.remainingText}`);
    md.addNewline();
    md.addText(`回归加成：修为获取 +${current.expBonusPercent}%`);
    md.addNewline();
    md.addText(`周期时长：${data.rules.expireDays}天`);
    md.addNewline();
    md.addNewline();
    md.addText(`7日签到（今日第${current.signIn.currentDayIndex}天）`);
    md.addNewline();
    current.signIn.days.forEach(day => {
      md.addText(`第${day.dayIndex}天【${day.statusText}】${day.rewardsPreviewText}`);
      md.addNewline();
    });
  }

  const footer = [] as { label: string; command: string }[];

  if (data.current?.signIn.canClaimToday) {
    footer.push({ label: '回归签到', command: '/回归签到' });
  }

  footer.push({ label: '我的信息', command: '/我的信息' });

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '回归活动',
      content: md,
      footer
    })
  );
});

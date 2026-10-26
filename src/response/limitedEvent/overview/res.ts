import { activeFeatureText, mentionsRetiredFeature } from '@src/response/retiredFeatures';
import { useMessage } from '@src/utils/useMessage';
/**
 * 限时活动 - 主入口
 * 指令：/限时活动
 * 展示当前所有进行中的限时活动总览
 */
import { parseBackendEventOverview } from '@src/api/bot/event-overview-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { EVENT_FOOTER, EVENT_HEADER } from '@src/response/limitedEvent/nav';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  let overview: ReturnType<typeof parseBackendEventOverview>;

  try {
    const response = await runRobotBusiness(e, 'limited-event.overview', {}, parseBackendEventOverview, parentNext, async reply => {
      await message.send(FormatGui({ isPrivate, bid, title: '限时活动', header: EVENT_HEADER, content: Format.createMarkdown().addText(reply.text) }));
    });

    if (response.handled) {
      return;
    }
    overview = response.data.filter(event => !mentionsRetiredFeature(event.eventTitle));
  } catch {
    md.addText('查看限时活动失败，请稍后再试');
    await message.send(FormatGui({ isPrivate, bid, title: '限时活动', header: EVENT_HEADER, content: md }));

    return;
  }

  if (!overview.length) {
    md.addText('当前没有进行中的限时活动');

    void message.send(FormatGui({ isPrivate, bid, title: '限时活动', header: EVENT_HEADER, content: md }));

    return;
  }

  for (const ev of overview) {
    md.addText(`🎉 【${ev.eventTitle}】`);
    md.addNewline();
    md.addBlockquote(
      Format.createMarkdown()
        .addText(activeFeatureText(ev.description))
        .addNewline()
        .addText(`活动时间：${ev.startTime} ~ ${ev.endTime}`)
        .addNewline()
        .addText(`${ev.paidTokenName}：${ev.paidToken} | ${ev.freeTokenName}：${ev.freeToken}`)
    );

    md.addText('📋 活动阶段：');
    md.addNewline();

    for (const sub of ev.subActivities.filter(sub => !mentionsRetiredFeature(sub.subTitle))) {
      const statusIcon = sub.isActive ? '🔥进行中' : '⏳';

      md.addBlockquote(Format.createMarkdown().addText(`${statusIcon} ${sub.subTitle}（${sub.startTime} ~ ${sub.endTime}）`));
    }

    md.addNewline();
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '限时活动',
      header: EVENT_HEADER,
      content: md,
      footer: EVENT_FOOTER
    })
  );
});

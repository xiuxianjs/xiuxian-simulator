import { commandText } from '@src/utils/commandPrefix';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
/**
 * 本命物信息指令
 * 指令：/本命物信息
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotSoulInfo } from '@src/api/bot/soul-artifact-overview-queries';
import { selects } from '@src/response/config';
import { appendSoulArtifactOverview } from '@src/response/soulArtifact/attributes';
import { soulArtifactActions, soulArtifactPageActions, soulArtifactBlockedAdvice } from '@src/response/soulArtifact/capabilities';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;

  const [, parentNext] = useEvent();
  const renderFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-artifacts.info', { ...reply, title: reply.title || '本命物信息' }), 'footer')
  );
  const response = await runRobotBusiness(
    e,
    'soul-artifacts.info',
    {},
    value => {
      const data = parseRobotSoulInfo(value);

      if (data.code === 'EQUIPPED') {
        const artifact = data.data.artifact;

        if (artifact.capabilities.some(capability => capability.instanceId !== artifact.instanceId)) {
          throw new Error('本命物操作目标不匹配');
        }
        soulArtifactActions(artifact.capabilities);
      }

      return data;
    },
    parentNext,
    renderFailure
  ).catch(async error => {
    logger.error('[本命物信息] 查询失败', error);
    await renderFailure({ title: '', heading: '', text: '本命物查询未获完整确认，请先核对本人状态与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const result = response.data;

  if (result.code === 'EMPTY') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    md.addNewline();
    md.addButton(markdownButtonLabel('积分商店'), { data: commandText('商店 积分') });
    md.addText(' ');
    md.addButton(markdownButtonLabel('珍宝楼'), { data: commandText('珍宝楼') });

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? e.name.startsWith('private.'),
        bid,
        title: '本命物信息',
        content: md
      })
    );

    return;
  }

  const contentMd = Format.createMarkdown();

  const artifact = result.code === 'EQUIPPED' ? result.data.artifact : undefined;

  if (result.code === 'EQUIPPED') {
    appendSoulArtifactOverview(contentMd, result.data.artifact);
  } else {
    contentMd.addText(result.data.message);
    contentMd.addNewline();
    contentMd.addBlockquote(
      Format.createMarkdown()
        .addText('可在储物袋中选择本命物进行炼化 ')
        .addButton(markdownButtonLabel('储物袋 · 本命'), { data: commandText('储物袋 本命') })
    );
  }

  appendMiddlewareAdvice(contentMd, soulArtifactBlockedAdvice([...(artifact?.capabilities ?? []), ...result.capabilities]));
  await message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? e.name.startsWith('private.'),
      bid,
      title: artifact ? `${artifact.name}（${artifact.gradeName}）` : '本命物信息',
      header: artifact ? [] : [{ label: '储物袋 · 本命', command: '/储物袋 本命' }],
      bar: artifact ? false : undefined,
      content: contentMd,
      footer: [...soulArtifactPageActions(result.capabilities), ...(artifact ? [] : [{ label: '我的主页', command: '/我' }])]
    })
  );
});

import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { soulWashFeedback } from '@src/response/soulArtifact/washFeedback';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulArtifactWashConfirm } from '@src/api/bot/soul-artifact-wash';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const [, parentNext] = useEvent();
  const renderFailure = soulWashFeedback(e, 'confirm');

  if (!/^[!！/#＃]?确认本命物洗涤$/.test((e.MessageText ?? '').trim())) {
    await renderFailure({ title: '', heading: '', text: '本命物洗涤确认与取消不接收参数，请按原预览选择确认或取消。', buttons: [], advice: [] });

    return;
  }
  const response = await runRobotBusiness(
    e,
    'soul-artifacts.wash-confirm',
    {},
    value => {
      const data = parseSoulArtifactWashConfirm(value);

      return { success: true, ...data };
    },
    parentNext,
    renderFailure
  ).catch(async () => {
    await renderFailure({ title: '', heading: '', text: '本命物洗涤结果未获完整确认，请先核对面板、原预览与洗涤石。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const result = response.data;
  const md = Format.createMarkdown();

  md.addBold('【本命物洗涤已保留】');
  md.addNewline();
  md.addText(result.message);
  if (result.pending.results.length) {
    md.addNewline();
  }

  md.addBlockquote(Format.createMarkdown().addText('查看面板： ').addButton(markdownButtonLabel('本命物信息'), { data: '/本命物信息' }));

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});

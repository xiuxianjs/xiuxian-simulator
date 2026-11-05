import { invalidateEventCommandEntry } from '@src/api/bot/command-entry';
import { invalidateEventBackendRobotIdentity } from '@src/api/bot/identity';
import { parseBackendRegistration } from '@src/api/bot/registration';
import { GUIDE_ACTION_BAR, NEWCOMER_PROLOGUE } from '@src/constants/newcomerGuide';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, onResponse, useEvent } from 'alemonjs';
import { guideText } from '../onboarding/aiNarration';
import { sendRegistrationNamePrompt } from './namePrompt';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [_, parentNext] = useEvent();

  const feedback = async (title: string, text: string): Promise<void> => {
    const md = Format.createMarkdown().addText(text);

    if (title) {
      md.addNewline();
    }
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title,
        content: md,
        ...(title ? { bar: [{ label: '重新输入道号', command: '/我是' }] } : {})
      })
    );
  };
  let result;

  try {
    const response = await runRobotBusiness(e, 'account.register', { region: e.GuildId ?? e.ChannelId ?? '' }, parseBackendRegistration, parentNext, reply => feedback(reply.title, reply.text)
    );

    if (response.handled) {
      return;
    }
    result = response.data;
  } catch {
    await feedback('', '创建存档失败，请稍后再试或联系运营。');

    return;
  }

  if (result.code === 'OK') {
    invalidateEventBackendRobotIdentity(e);
    invalidateEventCommandEntry(e);
  }

  if (result.code === 'EXISTING_USER') {
    // const md = Format.createMarkdown();

    // md.addText('可发送 /我 查看账号信息。');

    // md.addNewline();
    // await message.send(
    //   FormatGui({
    //     isPrivate,
    //     bid,
    //     title: '踏入仙途',
    //     content: md,
    //     footer: [
    //       { label: '我', command: '/我' },
    //       { label: '查看主线', command: '/查看主线' }
    //     ]
    //   })
    // );

    // 修改消息，变成 /我，交给后续的指令进行操作
    e.MessageText = '/我';

    parentNext();

    return;
  }

  if (result.code === 'NEED_NAME') {
    await sendRegistrationNamePrompt(e);

    return;
  }

  if (result.code === 'NEED_GENDER') {
    const name = result.data.playerName;
    const md = Format.createMarkdown().addText(`道号：${name}`).addNewline().addText('请选择角色性别。道号将在创建时再次核对，此时尚未创建角色。');

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '初入仙途',
        content: md,
        bar: [
          { label: '女修', command: `/我是 ${name} 女` },
          { label: '男修', command: `/我是 ${name} 男` }
        ]
      })
    );

    return;
  }

  const md = Format.createMarkdown();

  md.addBold('序章 · 山径遇险');
  md.addNewline();
  md.addText(`道号：${result.data.playerName}`);
  md.addNewline();
  md.addText(await guideText(NEWCOMER_PROLOGUE));

  md.addNewline();

  await message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: Format.createMarkdown().addBlockquote(md),
      bar: GUIDE_ACTION_BAR
    })
  );
});

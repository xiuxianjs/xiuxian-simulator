import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildStorylineRecords } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'guild.storyline-records', {}, parseGuildStorylineRecords, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '读取宗门主线记录失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const result = { data: loaded.data };
  const md = Format.createMarkdown();

  md.addBold('【宗门主线记录】');
  md.addNewline();
  md.addText(`宗门：${result.data.guildName} · ${result.data.guildLevel}级`);
  md.addNewline();
  md.addNewline();

  if (result.data.records.length === 0) {
    md.addText('今日还没有挑战记录');
  } else {
    result.data.records.forEach(record => {
      md.addText(
        `第${record.attemptNo}次 · 第${record.stageIndex}关 · 伤害${record.damageDealt} · 参与点${record.participationPoint} · ${record.isEffective ? '有效' : '无效'} · ${record.battleResult ? '胜' : '负'}`
      );
      md.addNewline();
    });
  }

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});

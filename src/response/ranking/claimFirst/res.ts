import { useMessage } from '@src/utils/useMessage';
/**
 * 领取通天塔首通排名奖励
 * 指令格式: /领取首通奖励 {排名} 或 /领取首通奖励 全部
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { rankingClaimArgument, parseRobotFirstClaim } from '@src/api/bot/ranking-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const loaded = await runRobotBusiness(
      e,
      'ranking.claim-first',
      { claimArg: rankingClaimArgument(e.MessageText || '', false) },
      parseRobotFirstClaim,
      next,
      async reply => {
        const md = Format.createMarkdown().addText('❌ 领取失败').addNewline().addNewline().addText(reply.text);

        await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '返回奖励页', command: '/首通排名奖励' }] }));
      }
    );

    if (loaded.handled) {
      return;
    }
    const result = loaded.data;

    if (result.code === 'PARAM_ERROR') {
      const md = Format.createMarkdown();

      md.addText('❌ 参数错误');
      md.addNewline();
      md.addNewline();
      md.addText('使用方法:');
      md.addNewline();
      md.addText('/领取首通奖励 [排名]');
      md.addNewline();
      md.addText('/领取首通奖励 全部');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.code === 'BATCH_SUCCESS') {
      const md = Format.createMarkdown();

      md.addText('✅ 批量领取成功');
      md.addNewline();
      md.addNewline();
      md.addText(`已领取 ${result.data.claimedCount} 个奖励：`);
      md.addNewline();
      md.addText(result.data.rewardTexts.join('、'));

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '',
          content: md,
          footer: [
            { label: '继续查看', command: '/首通排名奖励' },
            { label: '通天塔', command: '/通天塔' }
          ]
        })
      );

      return;
    }

    const md = Format.createMarkdown();

    md.addText('✅ 领取成功');
    md.addNewline();
    md.addNewline();
    md.addText(`第 ${result.data.ranking} 名奖励已领取：`);
    md.addNewline();
    md.addText(result.data.rewardTexts.join('、'));

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          { label: '继续领取', command: '/首通排名奖励' },
          { label: '通天塔', command: '/通天塔' }
        ]
      })
    );
  } catch {
    const md = Format.createMarkdown();

    md.addText('领取通天塔奖励失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

export default response;

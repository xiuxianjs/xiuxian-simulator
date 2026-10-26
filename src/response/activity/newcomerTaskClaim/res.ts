import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotNewcomerTaskReward } from '@src/api/bot/newcomer-activity';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 新人任务领取指令
 * 领取指定ID的任务里程碑奖励
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const text = e.MessageText.trim();
    const match = text.match(/新人任务领取\s+(\d+)/);

    const taskConfigId = match ? parseInt(match[1], 10) : null;
    const loaded = await runRobotBusiness(e, 'newcomer-activity.claim-task', { taskConfigId }, parseRobotNewcomerTaskReward, next, async reply => {
      await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
    });

    if (loaded.handled) {
      return;
    }
    const reward = loaded.data;
    const md = Format.createMarkdown();

    const rewardParts: string[] = [];

    if (reward.spiritCrystal > 0) {
      rewardParts.push(`灵晶×${reward.spiritCrystal}`);
    }

    if (reward.vipExpYuan > 0) {
      rewardParts.push(`VIP经验+${reward.vipExpYuan}`);
    }

    const rewardText = rewardParts.join('、') || '无';

    md.addBold('【新人狂欢】');
    md.addNewline();
    md.addText('任务里程碑奖励领取成功！');
    md.addNewline();
    md.addText(`获得：${rewardText}`);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  } catch (error) {
    logger.error('领取新人任务奖励失败:', error);
    const md = Format.createMarkdown();

    md.addText('领取失败，请稍后再试。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildHome } from '@src/api/bot/guild-home-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { buildGuildHomePage, type GuildHomeSection } from './view';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText ?? '').trim().match(/^[!！/#＃]?(?:我的宗门|查看势力)(?:\s+(活动|资料|管理))?$/);

  try {
    const loaded = await runRobotBusiness(e, 'guild.home', {}, parseGuildHome, next, async reply => {
      await message.send(FormatGui({ isPrivate, bid, title: '宗门', content: Format.createMarkdown().addText(reply.text) }));
    });

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;

    if (!data.hasGuild) {
      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '宗门',
          content: createQuoteMarkdown(['【寻觅宗门】', '尚未加入宗门，先寻访同道。']),
          footer: [
            { label: '宗门列表', command: '/宗门列表' },
            { label: '我的申请', command: '/我的申请' },
            ...(data.access.canCreateGuild ? [{ label: '创建宗门', command: '/创建宗门' }] : [])
          ]
        })
      );

      return;
    }
    const page = buildGuildHomePage(data, match?.[1] as GuildHomeSection | undefined);

    void message.send(FormatGui({ isPrivate, bid, ...page }));
  } catch (error) {
    logger.error('我的宗门指令处理失败:', error);
    void message.send(
      FormatGui({ isPrivate, bid, title: '宗门', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '获取宗门信息失败') })
    );
  }
});

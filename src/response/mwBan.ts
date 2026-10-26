import { platform, useMode } from '@alemonjs/qq-bot';
import type { GameEvent } from '@src/types/event';
import { normalizePrivateEvent } from '@src/utils/privateEvent';
// import { useMessage } from '@src/utils/useMessage';
import { useEvent } from 'alemonjs';

export default (e: GameEvent) => {
  // const [message] = useMessage();
  const [event] = useEvent({
    regular: /[\s\S]*/,
    selects: ['private.message.create', 'message.create', 'interaction.create', 'private.interaction.create']
  });
  const mode = useMode(event.current);

  // 标记是否私聊消息
  normalizePrivateEvent(e);

  // 标记是否来自QQ频道
  if (mode('guild') && event.current.Platform === platform) {
    e.isQQBotGuild = true;
  } else {
    e.isQQBotGroup = true;
  }

  if (e.isQQBotGuild) {
    // qqbot 频道是旧版本，不能接受旧版本的玩家创建。因为旧版本还活着，还在支持游玩。
    // const format = Format.create();
    // format.addText('最新版仅支持QQ群，更多信息请点击头像了解公共频道');
    // void message.send({ format });
    return;
  }

  return true;
};

import type { GameEvent } from '@src/types/event';
import { FormatGui } from '@src/utils/messageHelper';
import { formatName } from '@src/utils/name';
import { useMessage } from '@src/utils/useMessage';
import { Format } from 'alemonjs';

// Both registration entry and matched-business welcome use the same bubble.
export async function sendRegistrationNamePrompt(event: GameEvent): Promise<void> {
  const [message] = useMessage(event);
  const name = formatName(event.UserName);
  const md = Format.createMarkdown();

  md.addText('请输入你的道号，开始修仙之旅。');
  md.addNewline();
  await message.send(
    FormatGui({
      isPrivate: event.isPrivate ?? false,
      bid: event.UserId,
      content: md,
      bar: [{ label: `我是 ${name}`, command: `/我是 ${name}` }]
    })
  );
}

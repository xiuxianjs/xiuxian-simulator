import { useMessage } from '@src/utils/useMessage';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, type EventErrorContext } from 'alemonjs';

/** App error boundary: reply once, then stop the failed command. */
export async function handleCommandError({ event, error }: EventErrorContext): Promise<void> {
  if (!['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'].includes(event.name)) {
    return;
  }

  const [message] = useMessage(event);
  const content = Format.createMarkdown();

  content.addText(getCommandErrorMessage(error));
  await message.send(
    FormatGui({
      bid: event.UserId,
      isPrivate: event.name.startsWith('private.'),
      title: '操作未完成',
      content
    })
  );
}

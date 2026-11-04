import { onResponse, useEvent } from 'alemonjs';
import { customerSupportCommand } from '@src/api/bot/customer-support';
import { getBackendConfig } from '@src/api/bot/config';
import { getAppConfig } from '@src/utils/appConfig';
import { getCommandPrefix, hasCommandPrefix } from '@src/utils/commandPrefix';
import { useMessage } from '@src/utils/useMessage';
import { Format } from 'alemonjs';

const supportPlain = onResponse(['private.message.create'], async event => {
  const [, next] = useEvent();
  const content = event.MessageText ?? '';

  if (!content.trim() || hasCommandPrefix(content, getCommandPrefix(), false) || !getBackendConfig().channelMode || !getAppConfig().support_api_origin) {
    next();

    return;
  }
  try {
    const result = await customerSupportCommand(event, { action: 'message', content });

    if (!result.handled) {
      next();

      return;
    }
    if (result.notice) {
      const [message] = useMessage();

      await message.send({ format: Format.create().addText(result.notice) });
    }
  } catch {
    next();
  }
});

export default Object.assign(supportPlain, { customerSupportPlain: true as const });

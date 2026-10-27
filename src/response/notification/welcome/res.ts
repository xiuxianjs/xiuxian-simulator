import { useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';
import { sendNotificationWelcome } from '@src/notification/welcome';

export default async () => {
  const [event, next] = useEvent({ selects: ['private.friend.add', 'guild.join'] });

  try {
    const [message] = useMessage();

    if (!(await handleNotificationLifecycle(event.current))) {
      return;
    }
    await sendNotificationWelcome(event.current, data => message.send(data));
  } finally {
    next();
  }
};

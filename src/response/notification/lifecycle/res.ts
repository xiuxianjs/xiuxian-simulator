import { useEvent } from 'alemonjs';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';

export default async () => {
  const [event, next] = useEvent({ selects: ['private.friend.remove', 'guild.exit', 'member.remove'] });

  try {
    await handleNotificationLifecycle(event.current);
  } finally {
    next();
  }
};

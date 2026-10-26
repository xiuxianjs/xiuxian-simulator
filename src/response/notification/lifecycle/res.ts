import { useEvent } from 'alemonjs';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';

export default async () => {
  const [event] = useEvent({ selects: ['private.friend.remove', 'guild.exit', 'member.remove'] });

  await handleNotificationLifecycle(event.current);
};

import { useEvent } from 'alemonjs';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';

export default async () => {
  const [event, next] = useEvent({ selects: ['member.add'] });

  try {
    await handleNotificationLifecycle(event.current, true);
  } finally {
    next();
  }
};

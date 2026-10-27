import { useEvent } from 'alemonjs';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';
import { queueCommunityWelcome } from '@src/notification/communityDelivery';

export default async () => {
  const [event, next] = useEvent({ selects: ['member.add'] });

  try {
    if (!(await handleNotificationLifecycle(event.current))) {
      return;
    }
    await queueCommunityWelcome(event.current);
  } finally {
    next();
  }
};

import { useEvent } from 'alemonjs';
import { handleNotificationLifecycle } from '@src/notification/lifecycle';
import { queueCommunityWelcome } from '@src/notification/communityDelivery';

export default async () => {
  const [event] = useEvent({ selects: ['member.add'] });

  if (!(await handleNotificationLifecycle(event.current))) {
    return;
  }
  await queueCommunityWelcome(event.current);
};

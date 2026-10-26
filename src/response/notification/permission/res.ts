import { useMessage } from '@src/utils/useMessage';
import { handleCommunityJoinRequest } from '@src/notification/community';
import { sendNotificationWelcome } from '@src/notification/welcome';
import { handleNotificationPermissionEvent } from '@src/notification/channel';
import { useEvent } from 'alemonjs';

export default async () => {
  const [event] = useEvent({ selects: ['notice.create', 'private.notice.create'] });
  const [message] = useMessage();

  // 同一 notice 事件中的子类型由 Notice.type 区分。
  if (event.current.Notice?.type === 'message-permission') {
    await handleNotificationPermissionEvent(event.current);
    await sendNotificationWelcome(event.current, data => message.send(data));
  } else if (event.current.name === 'notice.create' && event.current.Notice?.type === 'join-request') {
    await handleCommunityJoinRequest(event.current);
  }
};

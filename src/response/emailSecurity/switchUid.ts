import { requirePrivateAccountMessage } from '@src/utils/privateAccountMessage';
import { useMessage } from '@src/utils/useMessage';
import { createBackendRequestContext } from '@src/api';
import switchUid from '@src/response-apps/emailSecurity/switchUid/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse } from 'alemonjs';

export default onResponse(selects, async e => {
  if (!(await requirePrivateAccountMessage(e))) {
    return;
  }
  const [message] = useMessage();
  const sendText = (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);
    void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '切换UID', content: md }));
  };

  try {
    const result = await switchUid({ bid: e.UserId, messageText: e.MessageText, request: createBackendRequestContext(e) });

    if (result.code === 'FAIL') {
      sendText(result.data.message);

      return;
    }
    const cacheText = result.data.cacheCleared ? '缓存已刷新。' : '角色已切换，缓存将在下次请求时刷新。';

    sendText(`已交换角色绑定：\n当前账号 ${result.data.fromUid}【${result.data.fromName}】→ ${result.data.toUid}【${result.data.toName}】\n${cacheText}`);
  } catch (error) {
    logger.error('切换UID指令处理失败:', error);
    sendText('系统错误，请稍后再试或联系运营');
  }
});

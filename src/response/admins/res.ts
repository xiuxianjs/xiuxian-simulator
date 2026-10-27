import { platform } from '@alemonjs/qq-bot';
import { Format, useEvent, useMessage } from 'alemonjs';

export default () => {
  const [ref] = useEvent();
  const event = ref.current;

  if (/管理/.test(event.MessageText) && event.Platform === platform) {
    // 尝试提取出群QQ
    const match = event.MessageText.match(/管理\s+(\d+)/);

    let groupQQ: string | null = null;

    if (match) {
      groupQQ = match[1];
    }
    const [message] = useMessage();

    // 提示仅限群主可以操作，设置机器人在群里的权限
    const md = Format.createMarkdown();
    const bt = Format.createButtonGroup();

    bt.addRow();

    if (match) {
      md.addBold('「修仙模拟器」权限设置');
      md.addNewline();
      md.addText('> ⚠️ 仅限群主可操作');
      md.addNewline();
      md.addNewline();
      md.addText('权限一、群内消息（单选）');
      md.addNewline();
      md.addText('权限二、群内主动发言（开关）');
      md.addNewline();

      const URL = 'https://club.vip.qq.com/transfer';
      // const URL = 'https://qq-bot-proxy/transfer-to-qq';
      const key = 'open_kuikly_info';
      const openKuiklyInfo = {
        page_name: 'ai_group_service_agreement_pop_page',
        groupCode: groupQQ,
        botUin: 2854210742,
        botUid: 'u_mJL2pN6Q7SuYuDZ60wyi6w',
        screen: 1
      };

      bt.addButton('打开设置', `${URL}?${key}=${encodeURIComponent(JSON.stringify(openKuiklyInfo))}`, {
        type: 'link'
      });
    } else {
      md.addBold('「修仙模拟器」权限设置');
      md.addNewline();
      md.addText('权限一、群内消息（单选）');
      md.addNewline();
      md.addText('- 获取群内全部消息(推荐,完整版)');
      md.addNewline();
      md.addText('- 仅获取@机器人的消息(默认,单机版)');
      md.addNewline();
      md.addText('权限二、群内主动发言（开关）');
      md.addNewline();
      md.addText('> 请输入群号,获得当前群权限设置');
      md.addNewline();
      md.addNewline();
      md.addText('💡 @修仙模拟器 /管理 <群号>');
      md.addNewline();
      bt.addButton('点击输入群号', '/管理 删除我并替换为群号后发送');
    }

    const format = Format.create();

    format.addMarkdown(md);
    format.addButtonGroup(bt);

    void message.send({ format });
  }
};

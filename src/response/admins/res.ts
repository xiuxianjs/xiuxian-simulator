import { platform } from '@alemonjs/qq-bot';
import { Format, getAppConfigValue, useEvent, useMe, useMessage } from 'alemonjs';

export default async () => {
  const [ref] = useEvent();
  const event = ref.current;

  if (/(管理|权限|设置)/.test(event.MessageText) && event.Platform === platform) {
    // 尝试提取出群QQ
    const match = event.MessageText.match(/(管理|权限|设置)\s+(\d+)/);

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

      const [me] = useMe();

      const share = await me.share();
      const url = share?.data?.url;

      if (url) {
        const obj = new URL(share?.data?.url);
        const botUin = obj.searchParams.get('robot_uin');
        const baseURL = 'https://club.vip.qq.com/transfer';
        const key = 'open_kuikly_info';

        const value = getAppConfigValue();
        const botUid = value?.botUid ?? 'u_mJL2pN6Q7SuYuDZ60wyi6w';

        const openKuiklyInfo = {
          page_name: 'ai_group_service_agreement_pop_page',
          groupCode: groupQQ,
          botUin: botUin,
          botUid: botUid,
          screen: 1
        };

        bt.addButton('打开设置', `${baseURL}?${key}=${encodeURIComponent(JSON.stringify(openKuiklyInfo))}`, {
          type: 'link'
        });
      }
    } else {
      md.addBold('「修仙模拟器」权限设置');
      md.addNewline();
      md.addText('权限一、群内消息（单选）');
      md.addNewline();
      md.addText('- 全部消息(推荐,完整版)');
      md.addNewline();
      md.addText('- 仅@机器人(默认,单机版)');
      md.addNewline();
      md.addNewline();
      md.addText('权限二、群内主动发言（开关）');
      md.addNewline();
      md.addText('> 请输入群号,获得当前群权限设置');
      md.addNewline();
      md.addNewline();
      md.addText('💡 @修仙模拟器 /设置 「群号」');
      md.addNewline();
      bt.addButton('点击输入群号', '/设置 「群号」');
    }

    const format = Format.create();

    format.addMarkdown(md);
    format.addButtonGroup(bt);

    void message.send({ format });
  }
};

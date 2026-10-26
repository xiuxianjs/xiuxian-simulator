import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterLineage } from '@src/api/bot/master-lineage-queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

type LineageNode = {
  userId: number;
  userName: string;
  realmName: string;
  isSelf: boolean;
  relationStatusText?: string;
  disciples: LineageNode[];
};

const renderLineageNode = (md: ReturnType<typeof Format.createMarkdown>, node: LineageNode, depth: number) => {
  const indent = '  '.repeat(depth);
  const selfText = node.isSelf ? '【自己】' : '';
  const relationStatusText = node.relationStatusText === '已出师' ? '已出师' : node.relationStatusText;
  const relationText = relationStatusText ? ` · ${relationStatusText}` : '';

  md.addText(`${indent}${depth === 0 ? '始祖' : `第${depth}代`}：${node.userName}${selfText} · ${node.realmName}${relationText}`);
  md.addNewline();

  node.disciples.forEach(child => {
    renderLineageNode(md, child, depth + 1);
  });
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let result: ReturnType<typeof parseMasterLineage>;

  try {
    const loaded = await runRobotBusiness(e, 'master.lineage', {}, parseMasterLineage, next);

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch {
    const md = Format.createMarkdown().addText('获取师谱失败，请稍后重试');

    appendMiddlewareAdvice(md, masterRecoveryTips('master.lineage', '获取师谱失败'));
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }
  const md = Format.createMarkdown();

  md.addBold('【师谱】');
  md.addNewline();

  if (!result.root) {
    md.addText('你当前还未形成可追溯的师承谱系。');
    appendMiddlewareAdvice(md, masterRecoveryTips('master.lineage', '未形成可追溯的师承谱系'));
  } else {
    renderLineageNode(md, result.root, 0);
    if (result.root.isSelf && result.root.disciples.length === 0) {
      md.addText('师谱当前仅展示本人。');
      appendMiddlewareAdvice(md, masterRecoveryTips('master.lineage', '师谱当前仅展示本人'));
    }
  }

  const footer = [
    { label: '我的师门', command: '/我的师门' },
    { label: '圣人榜', command: '/圣人榜' }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [footer] }));
});

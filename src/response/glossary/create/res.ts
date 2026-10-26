import { useMessage } from '@src/utils/useMessage';
/**
 * 录入词典
 *
 * 指令格式：
 *   /录入词典 词条名 内容
 *   /录入词典 词条名 分类 内容
 *
 * 权限：仅白名单玩家可操作
 * 风控：敏感词过滤 + 每日录入限额 + 操作日志
 */
import { parseRobotGlossaryUpsert, parseCreateParams } from '@src/api/bot/glossary-actions-robot';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { glossaryFeedbackMessage } from '../feedback';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const renderFeedback = async (reply: Parameters<typeof glossaryFeedbackMessage>[1]) => {
    await message.send(glossaryFeedbackMessage(e, reply));
  };

  const parsed = parseCreateParams(e.MessageText ?? '');
  const args = parsed.empty
    ? { mode: 'help', keyword: '', content: '' }
    : parsed.noContent
      ? { mode: 'invalid', keyword: parsed.keyword, content: '' }
      : { mode: 'write', keyword: parsed.keyword, content: parsed.content };
  const loaded = await runRobotBusiness(e, 'glossary.upsert', args, parseRobotGlossaryUpsert, next, renderFeedback);

  if (loaded.handled) {
    return;
  }
  // 空指令只读取配额以展示帮助；带有效参数的写入由服务端一次性裁决权限和额度。
  if (parsed.empty) {
    if (loaded.data.mode !== 'help') {
      throw new Error('词典帮助响应不完整');
    }
    const view = loaded.data.view;
    const quota = view.quota!;
    const used = quota.used!;
    const policy = view.policy!;
    const md = Format.createMarkdown();

    md.addText('格式：/录入词典 词条名 内容');
    md.addNewline();
    md.addText('例如：/录入词典 灵石 修仙界的通用货币');
    md.addNewline();
    md.addNewline();
    md.addText('也可指定分类：/录入词典 词条名 分类 内容');
    md.addNewline();
    md.addText(`可用分类：${policy.categories.join('、')}`);
    md.addNewline();
    md.addNewline();
    md.addText(`词条名上限${policy.keywordMaxLength}字，内容上限${policy.contentMaxLength}字`);
    md.addNewline();
    md.addText(`今日已录入：${used}/${quota.dailyLimit}`);

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '录入词典',
        content: md,
        footer: [
          { label: '返回词典', command: '/词典' },
          { label: '词典分类', command: '/词典分类' }
        ]
      })
    );

    return;
  }

  if (parsed.noContent || loaded.data.mode !== 'write') {
    throw new Error('词典录入响应不完整');
  }
  const result = loaded.data.result;
  const md = Format.createMarkdown();

  if (result.isNew) {
    md.addText(`✅ 词条「${parsed.keyword}」创建成功`);
    md.addNewline();
    md.addText(`分类：${result.category}`);
    md.addNewline();
    md.addText(`今日已录入：${result.used!}/${result.dailyLimit!}`);
  } else {
    md.addText(`✅ 词条「${parsed.keyword}」更新成功`);
    md.addNewline();
    md.addText(`分类：${result.category}`);
    md.addNewline();
    md.addText(`今日已录入：${result.used!}/${result.dailyLimit!}`);
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '词典',
      content: md,
      footer: [
        { label: '查看词条', command: `/词典 ${parsed.keyword}` },
        { label: '返回词典', command: '/词典' },
        { label: '继续录入', command: '/录入词典' }
      ]
    })
  );
});

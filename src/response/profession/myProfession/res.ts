import { parseProfessionDashboard } from '@src/api/bot/profession-dashboard-query';
import { herbalGardenTabs } from '@src/response/cavePlot/tabs';
import { selects } from '@src/response/config';
import { buildBubble, section } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText } from '@src/utils/commandPrefix';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const LINGZHI_GUIDE_START_COMMAND = '/加入灵药师';

/**
 * 洞府总览与职业面板共用服务端职业状态和交互。
 * 灵田地块经营由 /我的灵田 独立承载。
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const isCaveHome = /^\s*[/#＃]?(?:我的洞府|洞府)(?:\s|$)/.test(e.MessageText ?? '');
  const pane = /^\s*[/#＃]?\s*灵药师(?:\s+(指引))?\s*$/.exec(e.MessageText ?? '');

  if (!isCaveHome && !pane) {
    next();

    return;
  }

  try {
    const response = await runRobotBusiness(
      e,
      'profession.dashboard',
      isCaveHome ? { includeMeditationPreference: true } : {},
      parseProfessionDashboard,
      next,
      async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: isCaveHome ? '我的洞府' : '我的洞府 · 灵药园',
            content: Format.createMarkdown().addText(reply.text),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      }
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const md = Format.createMarkdown();
    const gates = result.data.access.features ?? {};
    const allowed = (id: string) => gates[id]?.realmReached === true;
    const locked = (id: string) => gates[id]?.lockedReason || '开放条件暂未提供，请稍后刷新。';
    const showAlchemy = allowed('alchemy');
    const showHerbalist = allowed('herbalist');

    if (isCaveHome) {
      const { meditationAutoBoost } = result.data;
      const nextBoostState = meditationAutoBoost ? '关闭' : '开启';
      const rooms = Format.createMarkdown()
        .addBold('修行静室')
        .addNewline()
        .addText(`闭关自动加速：${meditationAutoBoost === undefined ? '暂不可读取' : meditationAutoBoost ? '开启' : '关闭'}`);

      if (meditationAutoBoost !== undefined) {
        rooms.addText('   ').addButton(markdownButtonLabel(nextBoostState), { data: commandText(`/配置闭关自动加速 ${nextBoostState}`), autoEnter: false });
      }
      rooms.addNewline().addButton(markdownButtonLabel('前往闭关'), { data: commandText('/打坐'), autoEnter: false });

      const addRoom = (title: string, label: string, command: string) => {
        rooms
          .addNewline()
          .addBold(title)
          .addNewline()
          .addButton(markdownButtonLabel(label), { data: commandText(command), autoEnter: false });
      };

      if (showAlchemy) {
        addRoom('炼丹房', '前往炼丹', '/炼丹');
      }
      if (showHerbalist) {
        addRoom('灵药园', '前往种田', '/灵田');
      }
      if (allowed('forge')) {
        addRoom('锻造坊', '前往炼器', '/我的锻造');
      }
      addRoom('灵塘', '前往垂钓', '/垂钓');
      if (allowed('cave-formations')) {
        addRoom('护府阵法', '查看阵法', '/洞府阵法');
      }

      void message.send(FormatGui({ isPrivate, bid, title: '我的洞府', content: md.addBlockquote(rooms) }));

      return;
    }

    if (pane) {
      const title = '我的洞府 · 灵药园';

      if (!showHerbalist && !result.data.lingzhi.unlocked) {
        void message.send(
          buildBubble({ isPrivate, bid, title, sections: [{ lines: [locked('herbalist')] }], footer: [{ label: '洞府', command: '/我的洞府' }] })
        );

        return;
      }
      const lingzhi = result.data.lingzhi;

      if (pane[1] === '指引') {
        md.addBlockquote(
          section({
            lines: [
              '使用灵锄和灵土开垦空地，然后选择灵种播种。',
              '按地块状态浇灌、除虫或除草，成熟后收割。',
              '照料与互动经验有每日上限，收获经验另计。',
              ...(lingzhi.cultivationCostText ? [lingzhi.cultivationCostText] : [])
            ],
            actions: lingzhi.unlocked ? undefined : [{ label: '开始指引', command: LINGZHI_GUIDE_START_COMMAND }]
          })
        );
        if (lingzhi.unlocked) {
          md.addNewline().addBlockquote(
            section({
              lines: [
                `可开垦总上限：${lingzhi.maxPlots}块`,
                ...(lingzhi.cultivatedCount === undefined ? [] : [`已开垦：${lingzhi.cultivatedCount}块`]),
                ...(lingzhi.cultivatableCount === undefined ? [] : [`当前可开垦：${lingzhi.cultivatableCount}块（需备齐材料）`])
              ]
            })
          );
        }
        void message.send(
          FormatGui({ isPrivate, bid, title, header: herbalGardenTabs('guide'), content: md, footer: [{ label: '返回洞府', command: '/我的洞府' }] })
        );

        return;
      }
      const professionTitle = lingzhi.title.includes('灵药师') ? lingzhi.title : `${lingzhi.title}灵药师`;

      const lines = lingzhi.unlocked
        ? [`等级：${lingzhi.level}`, `经验：${lingzhi.nextExpRequired === null ? '--' : `${lingzhi.exp} / ${lingzhi.nextExpRequired}`}`]
        : ['状态：尚未加入'];

      md.addText('我的职业').addNewline();
      md.addBlockquote(
        section({
          title: lingzhi.unlocked ? professionTitle : '灵药师',
          lines,
          actions: lingzhi.unlocked ? undefined : [{ label: '开始指引', command: LINGZHI_GUIDE_START_COMMAND }]
        })
      );
      if (lingzhi.unlocked) {
        md.addNewline().addText('当前等级效果').addNewline();
        md.addBlockquote(
          section({
            lines: [
              `最多开垦：${lingzhi.maxPlots}块`,
              `品阶上限：${lingzhi.maxFieldGradeLabel}`,
              `产量加成：+${lingzhi.yieldBonus}株`,
              `照料与互动经验每日上限：${lingzhi.dailyExpGained}/${lingzhi.dailyExpCap}`
            ]
          })
        );
      }
      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title,
          header: herbalGardenTabs('profession'),
          content: md,
          footer: [...(lingzhi.unlocked ? [] : [{ label: '返回灵田', command: '/我的灵田' }]), { label: '返回洞府', command: '/我的洞府' }]
        })
      );
    }
  } catch (error) {
    logger.error(isCaveHome ? '获取洞府信息失败:' : '获取职业信息失败:', error);
    const md = Format.createMarkdown();

    md.addText(isCaveHome ? '获取洞府信息失败，请稍后重试' : '获取职业信息失败，请稍后重试');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

import { parseBackendPublicPlayerProfile } from '@src/api/bot/public-player-profile-query';
import { selects } from '@src/response/config';
import { errorBubble, section } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTargetSuggestions, targetSuggestionsBubble } from '@src/response/targetSuggestions';
import { FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { battlePanelTable, formatPanelNumber, legacyBattlePanelTable } from '@src/response/attributes/battlePanelTable';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, useEvent, useMention } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const [, next] = useEvent();
  const bubble = { isPrivate: isPrivateEvent(e), bid: e.UserId, title: '查看信息' };

  try {
    const target = await resolveRobotTarget(e.MessageText || '', mention);
    const result = await runRobotBusiness(
      e,
      'profile.view',
      { target, suggestTargets: true },
      value => parseTargetSuggestions(value, parseBackendPublicPlayerProfile),
      next
    );

    if (result.handled) {
      return;
    }
    if (result.data.mode === 'suggestions') {
      await message.send(targetSuggestionsBubble(e, '查看信息', result.data.ids, result.data.reason));

      return;
    }
    const { found, profile, cave, hideProfile, detail } = result.data.result;

    if (!found || !profile || !cave) {
      await message.send(errorBubble({ ...bubble, reason: '结果：未找到目标玩家。' }));

      return;
    }

    const lines = [`称号：${profile.activeTitle}`, `境界：${profile.realmName}`];

    if (detail?.combatPanel) {
      lines.push(`战力：${formatPanelNumber(detail.combatPanel.combatPower)}`);
    }
    if (detail && !hideProfile) {
      const { spiritRoot, talents } = detail;
      const innate: string[] = [];

      if (spiritRoot) {
        const root = spiritRoot.title.includes(spiritRoot.qualityName)
          ? spiritRoot.title
          : [spiritRoot.title, spiritRoot.qualityName].filter(Boolean).join(' · ');

        innate.push(`灵根：${spiritRoot.granted ? root : '尚未发放'}`);
      }
      if (talents?.granted) {
        for (const talent of talents.talents) {
          innate.push(`天赋：${talent.name} · ${talent.category}`, `效果：${talent.description}`, `状态：${talent.enabled ? '自动生效中' : '暂未开启'}`);
        }
      } else if (talents) {
        innate.push('天赋：尚未发放');
      }
      if (innate.length) {
        lines.push('', ...innate);
      }
    }

    lines.push('', `洞府关系：${cave.relationLabel}`, `灵气可见：${cave.canViewAura ? '可感知' : '不可感知'}`, `灵气浓度：${cave.auraText}`);
    if (cave.summary) {
      lines.push(cave.summary);
    }
    if (hideProfile) {
      lines.push('', '状态：该玩家已隐藏个人信息');
    } else if (detail) {
      lines.push(
        '',
        `五维：力量 ${detail.strength} · 智慧 ${detail.intelligence} · 体质 ${detail.constitution} · 敏捷 ${detail.agility} · 气运 ${detail.luck}`
      );
    }
    const content = Format.createMarkdown();

    content.addBlockquote(section({ title: profile.name, id: profile.mid ?? profile.uid, lines }));
    if (!hideProfile && detail) {
      const table = detail.combatPanel ? battlePanelTable(detail.combatPanel) : legacyBattlePanelTable(detail.battle);

      content.addNewline().addBold('战斗属性').addNewline().addNewline().addContent(table);
    }
    const footer: GuiButton[] = [];

    if (!hideProfile) {
      footer.push({ label: '查看配装', command: `/查看配装 ${profile.uid}` });
    }
    if (cave.relation !== 'self') {
      footer.push({ label: '打劫', command: `/打劫 ${profile.uid}` }, { label: '比试', command: `/比试 ${profile.uid}` });
    }
    await message.send(FormatGui({ ...bubble, content, footer }));
  } catch (error) {
    logger.error(error);
    await message.send(errorBubble({ ...bubble, reason: '结果：查看信息失败，请稍后再试。' }));
  }
});

import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { SKILL_TYPE_MAP } from '@src/constants';
import { parseBackendSkillBookUnequip } from '@src/api/bot/skill-book-unequip';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/** 创建换下功法指令处理器（战技、被动技、神通）。 */
const createUnequipHandler = (skillTypeName: string) => {
  return onResponse(selects, async e => {
    const [message] = useMessage();
    const bid = e?.UserId;
    const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
    const [, parentNext] = useEvent();
    const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.unequip', reply), 'footer'));
    const extra = (e.MessageText ?? '').replace(new RegExp(`^[!！/#＃]?换下${skillTypeName}\\s*`), '').trim();

    if (extra) {
      await failure({
        title: '',
        heading: '',
        text: `参数错误：/换下${skillTypeName} 不接编号、确认文字或其他参数，请先核对当前功法。`,
        buttons: [],
        advice: []
      });

      return;
    }
    const response = await runRobotBusiness(
      e,
      'skill-books.unequip',
      { skillType: skillTypeName },
      value => {
        const data = parseBackendSkillBookUnequip(value);

        if (data.outcome !== 'unequipped' || (data.skillBook?.skillType !== null && data.skillBook?.skillType !== skillTypeName)) {
          throw new Error('换下功法响应不完整');
        }

        return data;
      },
      parentNext,
      failure
    ).catch(async () => {
      await failure({ title: '', heading: '', text: `换下${skillTypeName}结果未获完整确认，请先核对当前装备与原回执。`, buttons: [], advice: [] });

      return { handled: true as const };
    });

    if (response.handled) {
      return;
    }
    const unequipResult = {
      skillBook: {
        name: response.data.skillBook?.name ?? '未知功法',
        skillType: response.data.skillBook?.skillType ?? skillTypeName
      }
    };
    const successMessage = ['✅ 换下成功', '', `【${unequipResult.skillBook.name}】`, `类型: ${unequipResult.skillBook.skillType}`].join('\n');
    const md = Format.createMarkdown();

    md.addText(successMessage);
    md.addNewline();
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '查看我的功法', command: '/我的功法' }] }));
  });
};

export const unequipBattleSkill = createUnequipHandler(SKILL_TYPE_MAP['战技']);
export const unequipPassiveSkill = createUnequipHandler(SKILL_TYPE_MAP['被动技']);
export const unequipMysticSkill = createUnequipHandler(SKILL_TYPE_MAP['神通']);
export default unequipBattleSkill;

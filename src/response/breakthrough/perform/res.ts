import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { parseRealmBreakthrough } from '@src/api/bot/realm-breakthrough';
import { useMessage } from '@src/utils/useMessage';
/**
 * 突破指令
 * 执行境界突破操作
 */
import App from '@src/response-apps/breakthrough/perform/app';
import { selects } from '@src/response/config';
import { createBackendRequestContext } from '@src/api/bot/context';
import { FormatGui, GuiButton } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
import { sendOnboardingFollowup } from '@src/response/onboarding/followup';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

/**
 * 突破指令处理函数
 */
export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const request = createBackendRequestContext(e);
  const business = await loadFinalBusiness(e, next, 'realm.breakthrough', {}, parseRealmBreakthrough);

  if (business.handled) {
    return;
  }
  const uid = e.uid as number;
  const result = await App({ load: business.load, uid, bid, request });
  const md = Format.createMarkdown();

  switch (result.code) {
    case 'REALM_CAPPED': {
      md.addText(`当前最高开放境界为「${result.data.realmName}」`);
      md.addNewline();
      md.addText('更高境界尚未开放，请等待后续更新。');

      void message.send(FormatGui({ isPrivate, bid, title: '无法突破', content: md }));

      return;
    }
    case 'SUCCESS': {
      const { newRealm, unlockedRecipes, isNewStage, newStageName, masterStageMessages } = result.data;

      md.addText(`新境界：${newRealm.name}`);
      md.addNewline();
      md.addText(`等级：${newRealm.level}`);
      md.addNewline();
      md.addText(`灵力：${newRealm.spiritualPower}`);
      md.addNewline();
      md.addText(`速度：${newRealm.speed}`);
      md.addNewline();
      md.addText(`法术攻击：${newRealm.magicAttack}`);
      md.addNewline();
      md.addText(`物理攻击：${newRealm.physicalAttack}`);
      md.addNewline();
      md.addText(`法术防御：${newRealm.magicDefense}`);
      md.addNewline();
      md.addText(`物理防御：${newRealm.physicalDefense}`);
      md.addNewline();
      md.addText(`修为上限：${newRealm.experienceLimit}`);

      if (unlockedRecipes.length > 0) {
        md.addNewline();
        md.addNewline();
        md.addText(`🎉 丹方领悟：${unlockedRecipes.map(n => `「${n}」`).join('、')}`);
      }

      // 大境界里程碑独白（每个大境界只触发一次）
      if (isNewStage && newStageName) {
        const MILESTONE_TEXTS: Record<string, string> = {
          筑基: '从此刻起，你不再只是一个会引气入体的散修。筑基已成，根基扎下，后面的路比你想象的还要长。',
          结丹: '金丹凝聚的那一刻，你感受到了一种不同以往的沉甸甸。这一步，很多人一辈子都走不到。',
          元婴: '元婴出窍，灵识扩展到了你从未触碰过的范围。仙途从这里，才真正开始。',
          化神: '化神之后，你与天地的关系变了。不再只是渺小的存在，你开始能感受到它在看你。',
          炼虚: '炼虚一境，虚实之间，你站在了大多数修士望尘莫及的地方。',
          合体: '合体期。天道开始真正把你当回事了，所以接下来的考验也会更重。',
          大乘: '大乘。传说中的境界，你踏进来了。你不知道自己是什么感觉，但你知道，这是真的。'
        };

        const milestoneText = MILESTONE_TEXTS[newStageName] ?? `你踏入了${newStageName}境界。这一步，走到这里的人，都留下了自己的故事。`;

        md.addNewline();
        md.addNewline();
        md.addBlockquote(Format.createMarkdown().addText(`✦ ${milestoneText}`));
      }

      if ((masterStageMessages?.length ?? 0) > 0) {
        md.addNewline();
        md.addNewline();
        md.addText('师门反馈：');
        md.addNewline();
        masterStageMessages?.forEach(line => {
          md.addBlockquote(Format.createMarkdown().addText(line));
        });
      }

      if (await sendOnboardingFollowup(e, business, '突破成功', md)) {
        return;
      }
      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '突破成功',
          content: md,
          footer: [{ label: '我的境界', command: '/我的境界' }]
        })
      );

      return;
    }
    case 'FAIL': {
      const failMsg = result.data.message;

      md.addText('突破失败');
      md.addNewline();
      md.addText(failMsg);
      appendMiddlewareAdvice(
        md,
        withBusinessRecovery('realm.breakthrough', {
          title: '',
          heading: '',
          text: failMsg,
          buttons: [],
          advice: []
        }).advice
      );

      const footer: GuiButton[] | undefined = result.data.isStageFull ? [{ label: '晋级', command: '/晋级' }] : undefined;

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));

      return;
    }
    case 'ERROR': {
      md.addText(result.data.message);

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
    }
  }
});

import { getBackendFirstRechargeInfo } from '@src/api/bot/first-recharge-queries';
import { displayCurrencyText } from '@src/constants/currency';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { activeFeatureText } from '@src/response/retiredFeatures';
import { useMessage } from '@src/utils/useMessage';
/**
 * 充值信息指令
 * 展示充值套餐、实际奖励与权益
 * 数据从 DB 读取，保证与后台配置一致
 */
import { parseRobotRechargeCatalog } from '@src/api/bot/recharge-info';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { parseSpiritVein, parseTreasureDailyPacks } from '@src/api/bot/treasures';
import { createBackendRequestContext } from '@src/api/bot/context';
import { parseRechargePeriodicPacks } from '@src/api/bot/recharge-periodic-packs';
import { buildPeriodicPackFeedback, buildPeriodicPackProductPage } from '../periodicPackView';
import { handlePeriodicPackReset } from '../periodicPackReset';
import { section } from '@src/response/presentation/sections';
import type { BusinessFeedbackRenderer } from '@src/response/feedbackRenderer';
import { buildRechargeProductCard, buildSpiritVeinProductBlock, buildDailyPackProductPage, dailyPackSku } from '../productView';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = isPrivateEvent(e);
  const [, parentNext] = useEvent();
  const category = e.MessageText.trim().replace(/^[/#＃!！]?(?:充值说明|充值信息|充值)\s*/, '');
  const dailyCategory = /^(?:日礼包|每日礼包)(?:\s|$)/.test(category);
  const periodicCategory = /^(周礼包|月礼包)(?:\s|$)/.exec(category)?.[1];
  const periodicInput = periodicCategory ? category.split(/\s+/).slice(1) : [];
  const resetCommand = periodicCategory && ['重置', '确认重置'].includes(periodicInput[0]);
  const pageTitle = dailyCategory ? '每日礼包' : (periodicCategory ?? (category === '灵脉租契' ? '灵脉租契' : '充值'));

  if ((dailyCategory || periodicCategory) && !isPrivate) {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: pageTitle,
        content: Format.createMarkdown().addText(
          resetCommand
            ? '礼包额度重置仅支持私聊，请在私聊中打开我的特权。'
            : `${dailyCategory ? '日礼包' : periodicCategory}仅支持私聊，请在私聊中发送 /充值 ${dailyCategory ? '日礼包' : periodicCategory}。`
        ),
        bar: false
      })
    );

    return;
  }
  if (resetCommand) {
    await handlePeriodicPackReset(e, periodicCategory === '周礼包' ? 'weekly' : 'monthly', periodicInput, parentNext);

    return;
  }

  try {
    const response = await runRobotBusiness(e, 'recharge.catalog', { private: isPrivate }, parseRobotRechargeCatalog, parentNext, async reply => {
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title: pageTitle,
          content: Format.createMarkdown().addText(activeFeatureText(reply.text)),
          footer: [{ label: '返回权益', command: '/我的权益', autoEnter: false }]
        })
      );
    });

    if (response.handled) {
      return;
    }
    const result = response.data;

    const md = Format.createMarkdown();

    // 商品标题与购买按钮在引用外，奖励和资格说明在引用内。
    const addPackage = (pkg: (typeof result.normalPackages)[number], rewards = pkg.rewardParts, benefits: string[] = [], intro?: string) => {
      const card = buildRechargeProductCard({
        heading: `${pkg.name} · ¥${pkg.yuan.toFixed(2)}${pkg.limitText}`,
        emphasis: pkg.doubleText.replace(/^\s*·\s*/u, '').trim() || undefined,
        intro,
        lines: [...benefits, ...(pkg.description ? [pkg.description] : []), ...(rewards.length ? [`奖励：${rewards.join('、')}`] : [])],
        buttons: [{ label: '购买', command: `/充值购买 ${pkg.id}` }]
      });

      md.absorb(card);
    };

    const giftPage = category.match(/^首充礼包(?:\s+(\d+))?$/);
    const selected =
      periodicCategory ??
      (dailyCategory ? '日礼包' : giftPage ? '首充礼包' : ['道晶套餐', '月卡', '金手指', '优惠礼包', '灵脉租契'].includes(category) ? category : '');
    let giftNav: { current: number; total: number; command: string } | undefined;
    const claimedTiers: Array<{ tierAmountYuan: number }> = [];

    // 首充赠礼属于充值入口，和付费优惠礼包分开展示；状态以服务端为准。
    if (!selected || selected === '首充礼包') {
      try {
        const first = await getBackendFirstRechargeInfo(bid, e.uid as number);
        const total = Math.max(1, Math.ceil(first.tiers.length / 5));
        const page = Math.max(1, Math.min(total, Number(giftPage?.[1] ?? 1)));

        for (const tier of first.tiers.slice((page - 1) * 5, page * 5)) {
          if (!selected && tier.status === 'claimed') {
            claimedTiers.push({ tierAmountYuan: tier.tierAmountYuan });

            continue;
          }
          const suffix = `· ${tier.tierAmountYuan}元档${tier.status === 'claimable' ? ' · 可领取' : ''}`;

          md.addBlockquote(
            section({
              title: '首充礼包',
              suffix,
              lines: [`简介：首次充值满 ¥${tier.tierAmountYuan} 解锁，达标即送成长礼包`, `奖励：${displayCurrencyText(tier.rewardText)}`],
              actions: tier.status === 'claimable' ? [{ label: '领取', command: `/领取礼包奖励 ${tier.tierAmountYuan}` }] : []
            })
          );
        }
        if (selected === '首充礼包') {
          if (!first.tiers.length) {
            md.addText('暂无首充礼包');
          }
          giftNav = { current: page, total, command: '/充值 首充礼包 {page}' };
        } else if (total > 1) {
          md.addBlockquote(section({ title: '首充礼包', lines: ['说明：还有更多档位'], actions: [{ label: '查看全部', command: '/充值 首充礼包' }] }));
        }
      } catch (error) {
        logger.warn('首充礼包查询失败', error);
        md.addBlockquote(section({ title: '首充礼包', lines: ['状态：暂未获取'], actions: [{ label: '刷新', command: '/充值' }] }));
      }
    }

    if (!selected) {
      md.addBlockquote(
        section({
          title: '道晶套餐',
          lines: [`数量：${result.normalPackages.length}款`, '简介：充值道晶，即时到账，多档可选'],
          actions: [{ label: '查看', command: '/充值 道晶套餐' }]
        })
      );
      md.addBlockquote(
        section({ title: '灵脉租契', lines: ['简介：按收益日每日发放灵晶的长效租契'], actions: [{ label: '查看', command: '/充值 灵脉租契' }] })
      );
      md.addBlockquote(section({ title: '每日礼包', lines: ['简介：每日可购的小额礼包，仅私聊查看'], actions: [{ label: '查看', command: '/充值 日礼包' }] }));
      md.addBlockquote(section({ title: '周礼包', lines: ['简介：每周可购的中额礼包，仅私聊查看'], actions: [{ label: '查看', command: '/充值 周礼包' }] }));
      md.addBlockquote(section({ title: '月礼包', lines: ['简介：每月可购的大额礼包，仅私聊查看'], actions: [{ label: '查看', command: '/充值 月礼包' }] }));
      md.addBlockquote(
        section({
          title: '月卡',
          lines: [result.monthCard ? `价格：¥${result.monthCard.package.yuan}` : '状态：暂未开放', '简介：每日灵晶与多项便利特权'],
          actions: [
            { label: '查看', command: '/充值 月卡' },
            ...(result.monthCard ? [{ label: '购买', command: `/充值购买 ${result.monthCard.package.id}` }] : [])
          ]
        })
      );
      md.addBlockquote(
        section({
          title: '金手指',
          lines: [result.seclusionPass ? `价格：¥${result.seclusionPass.package.yuan}` : '状态：暂未开放', '简介：闭关、探索等修为加成与额外权益'],
          actions: [
            { label: '查看', command: '/充值 金手指' },
            ...(result.seclusionPass ? [{ label: '购买', command: `/充值购买 ${result.seclusionPass.package.id}` }] : [])
          ]
        })
      );
      if (result.firstChargePackages.length) {
        result.firstChargePackages.forEach(pkg => addPackage(pkg, pkg.rewardParts, [], '简介：限时优惠礼包，档位见下'));
      }
      for (const tier of claimedTiers) {
        md.addBlockquote(section({ title: `首充礼包 · ${tier.tierAmountYuan}元档`, suffix: '· 已领取', lines: [] }));
      }
    }
    if (selected === '道晶套餐') {
      if (result.normalPackages.length) {
        result.normalPackages.forEach(pkg => addPackage(pkg, pkg.rewardParts, [], '简介：充值道晶，即时到账'));
      } else {
        md.addText('暂无套餐上架');
      }
    }
    if (selected === '月卡') {
      if (result.monthCard) {
        addPackage(
          result.monthCard.package,
          result.monthCard.instantRewards,
          result.benefitView.monthCardPrivilegeLines,
          '简介：每日灵晶与多项便利特权，30 日有效'
        );
      } else {
        md.addText('月卡暂未开放');
      }
    }
    if (selected === '金手指') {
      if (result.seclusionPass) {
        addPackage(
          result.seclusionPass.package,
          result.seclusionPass.instantRewards,
          result.benefitView.seclusionPassPrivilegeLines,
          '简介：闭关、探索等修为加成与额外权益'
        );
      } else {
        md.addText(result.benefitView.seclusionPassFallbackLine);
      }
    }
    if (selected === '优惠礼包' && result.firstChargePackages.length) {
      result.firstChargePackages.forEach(pkg => addPackage(pkg, pkg.rewardParts, [], '简介：限时优惠礼包，档位见下'));
    }
    if (periodicCategory) {
      const period = periodicCategory === '周礼包' ? 'weekly' : 'monthly';
      const renderFeedback: BusinessFeedbackRenderer = async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: pageTitle,
            content: buildPeriodicPackFeedback(reply),
            ...(reply.nav ? { nav: { ...reply.nav, autoEnter: false } } : {}),
            footer: reply.buttons.map(button => ({ ...button, autoEnter: false }))
          })
        );
      };

      renderFeedback.preservesAdvice = true;
      const loaded = await runRobotBusiness(
        e,
        'recharge.periodic-packs',
        { period },
        parseRechargePeriodicPacks,
        parentNext,
        renderFeedback,
        createBackendRequestContext(e, 'recharge.periodic-packs')
      );

      if (loaded.handled) {
        return;
      }
      if (loaded.data.period !== period) {
        throw new Error('礼包周期响应不一致');
      }
      md.absorb(buildPeriodicPackProductPage(loaded.data, periodicInput));
    }
    if (selected === '灵脉租契' || selected === '日礼包') {
      const loaded =
        selected === '灵脉租契'
          ? await runRobotBusiness(
              e,
              'spirit-vein.overview',
              {},
              parseSpiritVein,
              parentNext,
              undefined,
              createBackendRequestContext(e, 'spirit-vein.overview')
            )
          : await runRobotBusiness(
              e,
              'treasures.daily-packs',
              {},
              parseTreasureDailyPacks,
              parentNext,
              undefined,
              createBackendRequestContext(e, 'treasures.daily-packs')
            );

      if (loaded.handled) {
        return;
      }
      if (selected === '灵脉租契') {
        md.absorb(buildSpiritVeinProductBlock(loaded.data as ReturnType<typeof parseSpiritVein>));
      } else {
        const input = category.split(/\s+/).slice(1);

        md.absorb(buildDailyPackProductPage(loaded.data as ReturnType<typeof parseTreasureDailyPacks>, input.length > 1 ? undefined : dailyPackSku(input[0])));
      }
    }

    if (!isPrivate && selected) {
      md.addNewline().addText('请在私聊中购买。');
    }
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: pageTitle,
        content: md,
        ...(giftNav ? { nav: { ...giftNav, autoEnter: false } } : {}),
        header: [
          { label: '返回权益', command: '/我的权益', autoEnter: false },
          ...(selected ? [{ label: '商品分类', command: '/充值', autoEnter: false }] : [])
        ],
        footer: [
          { label: '灵脉租契', command: '/充值 灵脉租契', autoEnter: false },
          ...(result.showNewcomerRebate ? [{ label: '新人返利', command: '/新人返利', autoEnter: false }] : []),
          ...(result.showWeeklyRebate ? [{ label: '周周返利', command: '/周周返利', autoEnter: false }] : [])
        ]
      })
    );
  } catch (err) {
    logger.error('充值信息渲染失败', err);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: pageTitle,
        content: Format.createMarkdown().addText('⚠️ 读取充值信息失败，请稍后重试'),
        footer: [
          { label: '返回权益', command: '/我的权益', autoEnter: false },
          { label: '重试', command: '/充值', autoEnter: false }
        ]
      })
    );
  }
});

import { useMessage } from '@src/utils/useMessage';
import App from '@src/response-apps/storyline/list/app';
import { selects } from '@src/response/config';
import { addOptions, createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';

/**
 * 查看主线 / 副本列表 指令响应
 * 指令格式：
 *   /副本列表       → 章节总览（等同 /查看主线）
 *   /查看主线       → 章节总览（第1页，倒序）
 *   /查看主线 p2    → 章节总览第2页
 *   /查看主线 5     → 第 5 章详情（关卡列表）
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const uid = e.uid as number;
  // 匹配 /查看主线、/查看主线 p2、/查看主线 5
  const m = e.MessageText.trim().match(/^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+(\d+))|(?:\s+p(\d+)))?$/);
  const chapterArg = m?.[3] ? Number(m[3]) : null;
  const pageArg = m?.[4] ? Number(m[4]) : null;

  const result = await App({ uid, bid, chapterArg, pageArg });

  const dungeonEntryButtons = [
    { label: '秘境', command: '/查看秘境' },
    { label: '凶兽', command: '/凶兽' },
    ...(result.access.canUseMeridian ? [{ label: '妖塔', command: '/妖塔' }] : [])
  ] as const;

  // ── 章节总览（倒序 + 分页） ──
  if (chapterArg === null) {
    if (result.code !== 'OVERVIEW') {
      const errMd = Format.createMarkdown();

      errMd.addText(result.code === 'LOAD_FAILED' ? result.data.message : '查询主线失败');

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '副本',
          header: [...dungeonEntryButtons],
          content: errMd
        })
      );

      return;
    }

    const contentMd = Format.createMarkdown();

    // 副标题信息
    contentMd.addBlockquote(createQuoteMarkdown([`精力：${result.data.mentalValue}`], [{ label: '✛', command: '/服用 精力丹 1' }]));
    contentMd.addBlockquote(
      createQuoteMarkdown([`主线累计: ${result.data.milestoneTotalStars}⭐ `], [{ label: result.data.achievementLabel, command: '/成就 主线' }])
    );

    contentMd.addNewline();
    contentMd.addNewline();

    for (const arcData of result.data.arcs) {
      const chs = arcData.chapters;

      if (chs.length === 0) {
        continue;
      }

      contentMd.addText(`${arcData.arc}篇`);
      contentMd.addNewline();

      for (const ch of chs) {
        contentMd.addBlockquote(
          createQuoteMarkdown(
            [`${ch.chestIcon}第${ch.chapterNumber}章 ${ch.name} ${ch.starsText} ${ch.progressText} `],
            [{ label: '详情', command: `/查看主线 ${ch.chapterNumber}` }]
          )
        );
      }

      contentMd.addNewline();
    }

    // 宝箱一键领取入口
    if (result.data.showClaimAllChests) {
      contentMd.addText(`📦 可领取宝箱：${result.data.totalClaimableChests}个 `);

      addOptions(contentMd, [{ label: '一键领取', command: '/一键领取宝箱' }]);

      contentMd.addNewline();
    }

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '副本',
        header: [...dungeonEntryButtons],
        content: contentMd,
        nav:
          result.data.totalPages > 1
            ? {
                current: result.data.currentPage,
                total: result.data.totalPages,
                count: result.data.totalCount,
                command: '/查看主线 p{page}'
              }
            : undefined
      })
    );

    return;
  }

  // ── 章节详情 ──
  if (result.code === 'DETAIL_FAILED' || result.code === 'LOAD_FAILED') {
    const errMd = Format.createMarkdown();

    errMd.addText(result.data.message);

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '副本',
        header: [{ label: '返回', command: '/查看主线' }, ...dungeonEntryButtons],
        content: errMd
      })
    );

    return;
  }

  if (result.code !== 'DETAIL') {
    return;
  }

  const chapter = result.data;
  const stageList = result.data.stages;
  const detailMd = Format.createMarkdown();

  // 副标题信息
  detailMd.addBlockquote(
    Format.createMarkdown().addText(`精力：${result.data.mentalValue}`).addNewline().addText(`星级进度：${chapter.totalStars}/${chapter.maxStars}⭐`)
  );

  for (const [_, s] of stageList.entries()) {
    const eliteTag = s.isElite ? '(精英)' : '';
    const stageButtons: { label: string; command: string }[] = [];

    if (s.canSweep) {
      stageButtons.push({ label: '扫荡', command: `/主线扫荡 ${s.stageLabel}` });

      if (s.showBulkSweep) {
        stageButtons.push({ label: `×${s.maxSweepTimes}`, command: `/主线扫荡 ${s.stageLabel} ${s.maxSweepTimes}` });
      }
    } else {
      stageButtons.push({ label: '挑战', command: `/主线挑战 ${s.stageLabel}` });
    }
    if (s.canMatch) {
      stageButtons.push({ label: '匹配', command: `/匹配主线 ${s.stageLabel}` });
    }

    detailMd.addBlockquote(
      createQuoteMarkdown(
        [
          `【${s.stageLabel}】${s.monsterDisplayName}${eliteTag}`,
          `消耗：精力${s.spiritCost}`,
          s.rewardText,
          `今日：${s.dailyUsed}/${s.dailyLimit}，星级：${s.starsDisplay}`
        ],
        stageButtons
      )
    );
  }

  // ── 宝箱进度 ──
  if (result.data.chests.length > 0) {
    detailMd.addText(`宝箱（${chapter.totalStars}/${chapter.maxStars}⭐）`);
    detailMd.addNewline();

    for (const chest of result.data.chests) {
      if (chest.claimed) {
        detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} ✅`);
        detailMd.addNewline();
      } else if (chest.unlocked) {
        detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} `);

        addOptions(detailMd, [{ label: '领取', command: `/领取宝箱 ${chapter.chapterNumber} ${chest.index}` }]);
      } else {
        detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} 🔒`);
        detailMd.addNewline();
      }
    }
    detailMd.addNewline();

    // 如果有多个可领取的宝箱，显示一键领取
    if (result.data.canClaimChestCount > 1 && !false) {
      detailMd.addButton('一键领取', { data: `/领取宝箱 ${chapter.chapterNumber}` });
      detailMd.addText(' ');
    }
  }

  // 翻章导航
  if (result.data.showPrevChapter && !false) {
    detailMd.addButton('上一章', { data: `/查看主线 ${chapter.chapterNumber - 1}` });
    detailMd.addText('  ');
  }

  if (result.data.showNextChapter && !false) {
    detailMd.addButton('下一章', { data: `/查看主线 ${chapter.chapterNumber + 1}` });
    detailMd.addText('  ');
  }

  detailMd.addNewline();

  void message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: `${chapter.arc}篇 - 第${chapter.chapterNumber}章 ${chapter.chapterName}`,
      header: [{ label: '返回', command: '/查看主线' }, ...dungeonEntryButtons],
      content: detailMd
    })
  );
});

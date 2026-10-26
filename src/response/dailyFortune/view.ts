import { formatGameDate } from '@src/utils/gameTime';
import { Format } from 'alemonjs';
import type { DailyFortuneResult } from '@src/api/bot/daily-fortune';

export function dailyFortuneContent(data: DailyFortuneResult) {
  const story =
    data.mentalPills > data.qiPills
      ? '云游丹师赠你一份修行资粮，其中精力丹尤为丰厚。'
      : data.qiPills > data.mentalPills
        ? '云游丹师赠你一份修行资粮，其中元力丹尤为丰厚。'
        : data.mentalPills >= 3
          ? '你与群中道友结下一段善缘，寻得前人留下的丰厚资粮！'
          : '你与群中道友结下一段善缘，获赠一份修行资粮。';
  const quote = Format.createMarkdown();

  quote.addText(data.alreadyClaimed ? '今日机缘已领取，以下为当天结果，不会重复发奖。' : story);
  quote.addNewline().addText(`精力丹 ×${data.mentalPills} · 元力丹 ×${data.qiPills}`);
  quote.addNewline().addText(`灵石 ×${data.spiritStone} · 灵晶 ×${data.spiritCrystal}`);
  quote.addNewline().addText(`${formatGameDate(data.date)} · 明日北京时间零点后可再来探寻。`);

  return Format.createMarkdown().addBlockquote(quote);
}

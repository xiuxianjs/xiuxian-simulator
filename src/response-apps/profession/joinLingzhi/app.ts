import type { BackendRequestContext } from '@src/api/bot/context';
import { continueCurrentBackendLingzhiGuide, startBackendLingzhiGuide } from '@src/api/bot/lingzhi-guide';
import type { LingzhiGuideStep } from '@src/api/schemas/lingzhi-guide';
import { logger } from 'alemonjs';
import { isLingzhiGuideContinue } from '@src/api/bot/lingzhi-robot-guide';

export type JoinLingzhiResult =
  | { code: 'INVALID_USER'; data?: undefined }
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'GUIDE_COMPLETED'; data: { message: string } }
  | { code: 'SHOW_STEP'; data: { step: LingzhiGuideStep } };

export default async function App(params: { bid?: string; uid?: number; messageText?: string; request?: BackendRequestContext }): Promise<JoinLingzhiResult> {
  if (!params.uid) {
    return { code: 'INVALID_USER' };
  }

  const uid = params.uid;

  try {
    const isContinue = isLingzhiGuideContinue(params.messageText);

    if (isContinue) {
      const advanced = await continueCurrentBackendLingzhiGuide(params.bid, uid, params.request, params.messageText);

      if (!advanced.session && !advanced.completed) {
        return { code: 'FAIL', data: { message: '你还未开始灵药师指引，请先使用 /加入灵药师' } };
      }

      if (advanced.completed) {
        return {
          code: 'GUIDE_COMPLETED',
          data: {
            message: '灵药师指引已完成。\n已为你备好洞府灵田、灵锄，请前往 /灵田 查看。'
          }
        };
      }

      if (!advanced.session) {
        return {
          code: 'FAIL',
          data: {
            message: '推进灵药师指引失败，请稍后重试。'
          }
        };
      }

      return {
        code: 'SHOW_STEP',
        data: {
          step: advanced.session.step
        }
      };
    }

    const started = await startBackendLingzhiGuide(params.bid, uid, params.request, params.messageText);

    if (!started.session) {
      return {
        code: 'FAIL',
        data: {
          message: '开启灵药师指引失败，请稍后重试。'
        }
      };
    }

    return {
      code: 'SHOW_STEP',
      data: {
        step: started.session.step
      }
    };
  } catch (error) {
    logger.error('灵药师指引 app 处理失败:', error);

    return {
      code: 'FAIL',
      data: {
        message: '灵药师指引处理失败，请稍后重试。'
      }
    };
  }
}

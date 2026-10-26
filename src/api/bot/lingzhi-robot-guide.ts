import { parseLingzhiGuideState } from './lingzhi-guide';

export function isLingzhiGuideContinue(messageText?: string) {
  const msg = (messageText ?? '').trim();

  return msg.includes('继续灵药指引') || msg.includes('继续');
}

export function parseRobotLingzhiGuide(value: unknown) {
  const state = parseLingzhiGuideState(value);

  if (state.completed) {
    return { code: 'GUIDE_COMPLETED' as const, data: { message: state.activation?.message ?? '灵药师指引已完成，请前往 /灵田 查看。' } };
  }
  if (state.session) {
    return { code: 'SHOW_STEP' as const, data: { step: state.session.step } };
  }
  throw new Error('灵药师指引分支不完整');
}

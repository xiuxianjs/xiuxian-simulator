import type { RecoveryTip } from './adventureRecovery';

/** Navigation follows local gift redemption and mail delivery states. */
export function giftCodeRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation === 'gift-codes.hub') {
    return [
      { label: '查看本人信息', command: '/我的信息', description: '兑换入口暂未取得完整结果；保留原反馈后稍后手动查看入口，不据此判断已有兑换或邮件失效' }
    ];
  }
  if (operation !== 'gift-codes.redeem') {
    return [];
  }
  if (/不能为空|输入礼包码|未输入礼包码/.test(text)) {
    return [
      {
        label: '查看兑换入口',
        command: '/兑换码',
        description: '输入 /礼包码 后附真实兑换码；示例文本不是可领取的礼包，不在群内公开个人专属码'
      }
    ];
  }
  if (/个人领取上限|礼包码已领取|奖励已领取/.test(text)) {
    return [
      {
        label: '核对已发邮件',
        command: '/我的邮件',
        description: '先核对之前的礼包邮件与领取状态；达到个人上限不代表上限会每日重置，更换请求或换码不保证绕过同批次、同类型限制'
      }
    ];
  }
  if (/已被使用或正在处理中|正在处理中/.test(text)) {
    return [
      {
        label: '先核对礼包邮件',
        command: '/我的邮件',
        description: '处理中与已使用需以原反馈为准，不能只凭这次提示判断是否已发给本人；若服务端已说明礼包发送，先核对邮件并核对领取状态，不自动重领或重复发奖'
      }
    ];
  }
  if (/不在有效期|不存在或已失效|已领完|无效|已过期/.test(text)) {
    return [
      {
        label: '查看兑换入口',
        command: '/兑换码',
        description: '向兑换码发布方核对完整码、适用活动、开始与结束时间及剩余名额；尚未开始和已过期不能混为一谈，补修为或换请求不能恢复失效码'
      }
    ];
  }

  return [
    {
      label: '先核对当前邮件',
      command: '/我的邮件',
      description: '本次兑换未获完整确认，先查看礼包邮件并保留原反馈；没有完整回执不能认定未发奖，不自动重新兑换，持续异常或配置缺失时联系管理员'
    }
  ];
}

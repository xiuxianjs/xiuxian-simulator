/**
 * 输入系统自带名字，
 * 根据原则进行切割
 * 1、去掉所有字符
 * 2、长度仅保留1-8个字
 */
export function formatName(name?: string): string {
  if (!name) {
    return '某某某';
  }
  // 仅保留中文、英文、数字，其他字符都去掉
  const chineseName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

  // 保留1-8个字
  const formattedName = chineseName.slice(0, 8);

  return formattedName ?? '某某某';
}

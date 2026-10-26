// 头像直接使用平台提供的地址，保持异步调用接口。
export const createAvatar = (avatarURL?: string): Promise<string> => Promise.resolve(avatarURL ?? '');

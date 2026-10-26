export type StorageMainResult = { code: 'OK'; data: { message: string } };

export default function App(): StorageMainResult {
  return { code: 'OK', data: { message: '点击下方分类查看物品' } };
}

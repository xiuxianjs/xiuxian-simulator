/** 服务端小绿瓶转换结算。失败资格也以服务端结果回执表达。 */
export type GreenBottleStoreResult =
  | { success: true; message: string; experienceCost: number; converted: number; remainingExp: number; totalBottles: number }
  | { success: false; message: string; experienceCost: number };

/** 仅用于 /小绿瓶存储 无参数展示的服务端只读投影。 */
export interface GreenBottleStorageCapacityQuery {
  experienceCost: number;
  maxAvailable: number;
  canStore: boolean;
}

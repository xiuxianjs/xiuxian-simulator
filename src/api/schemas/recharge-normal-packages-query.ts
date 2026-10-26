/** 仅用于 /充值购买 未指定套餐 ID 时的普通套餐展示。 */
export interface RechargeNormalPackage {
  id: number;
  name: string;
  yuan: number;
  priceAmount: number;
  grantSpiritMilk: number;
  doubleAvailable: boolean;
  doubleClaimed: boolean;
}

export interface RechargeNormalPackagesQueryData {
  packages: RechargeNormalPackage[];
}

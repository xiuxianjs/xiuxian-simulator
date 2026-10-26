//#region src/types/battle.ts
/**
* 战斗系统类型定义
*/
/**
* 攻击模组枚举
* 定义不同的攻击范围和目标选择优先级规则
* 优先级顺序：前后排原则 > 就近原则 > 就左原则（位置序号小）
*/
let AttackModule = /* @__PURE__ */ function(AttackModule) {
	/** 对位单个 - 前排优先 */
	AttackModule["SINGLE_FRONT_PRIORITY"] = "single_front_priority";
	/** 对位单个 - 后排优先 */
	AttackModule["SINGLE_BACK_PRIORITY"] = "single_back_priority";
	/** 对位整列 - 前排优先 */
	AttackModule["COLUMN_FRONT_PRIORITY"] = "column_front_priority";
	/** 对位整列 - 后排优先 */
	AttackModule["COLUMN_BACK_PRIORITY"] = "column_back_priority";
	/** 对位整排 - 前排优先 */
	AttackModule["ROW_FRONT_PRIORITY"] = "row_front_priority";
	/** 对位整排 - 后排优先 */
	AttackModule["ROW_BACK_PRIORITY"] = "row_back_priority";
	/** 全体伤害 */
	AttackModule["ALL_ENEMIES"] = "all_enemies";
	return AttackModule;
}({});
/**
* 阵位定义（便于理解位置）
* 前排：位置1、2、3
* 后排：位置4、5、6
*
* 阵位布局：
* 前排: 1 2 3
* 后排: 4 5 6
*
* 列信息：
* 列1: 位置1、4
* 列2: 位置2、5
* 列3: 位置3、6
*/
const POSITION_GROUPS = {
	FRONT_ROW: [
		1,
		2,
		3
	],
	BACK_ROW: [
		4,
		5,
		6
	],
	COLUMN_1: [1, 4],
	COLUMN_2: [2, 5],
	COLUMN_3: [3, 6]
};

//#endregion
export { AttackModule, POSITION_GROUPS };
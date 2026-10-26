import { EMPTY_STRING, FIRST_ARG_INDEX, MIN_INDEX } from "../constants/common.js";

//#region src/utils/commandParser.ts
/**
* 命令解析工具
*/
/**
* 从消息中提取参数
* @param messageText 原始消息文本
* @param commandPattern 命令前缀正则表达式
* @returns 参数数组
*/
const extractArgs = (messageText, commandPattern) => {
	const cleanText = (messageText || "").replace(commandPattern, "").trim();
	return cleanText ? cleanText.split(/\s+/) : [];
};
/**
* 解析技能书编号
* @param args 参数数组
* @param argIndex 参数索引，默认第一个参数
* @returns 解析结果
*/
const parseSkillBookIndex = (args, argIndex = 0) => {
	const indexStr = args[argIndex];
	if (!indexStr || indexStr === "") return {
		success: false,
		errorMessage: "编号参数不能为空"
	};
	const index = parseInt(indexStr, 10);
	if (isNaN(index) || index < 1) return {
		success: false,
		errorMessage: "编号必须是大于0的数字"
	};
	return {
		success: true,
		value: index
	};
};
/**
* 解析页码
* @param args 参数数组
* @param argIndex 参数索引，默认第一个参数
* @param defaultPage 默认页码
* @returns 解析结果
*/
const parsePageNumber = (args, argIndex = 0, defaultPage = 1) => {
	const pageStr = args[argIndex];
	if (!pageStr || pageStr === "") return {
		success: true,
		value: defaultPage
	};
	const page = parseInt(pageStr, 10);
	if (isNaN(page)) return {
		success: false,
		errorMessage: "页码必须是数字"
	};
	if (page < 1) return {
		success: false,
		errorMessage: "页码必须大于0"
	};
	return {
		success: true,
		value: page
	};
};
/**
* 检查参数是否为指定关键字
* @param args 参数数组
* @param keyword 关键字
* @param argIndex 参数索引，默认第一个参数
* @returns 是否匹配
*/
const hasKeyword = (args, keyword, argIndex = 0) => {
	return args[argIndex] === keyword;
};
/**
* 构建技能书编号范围错误提示
* @param currentCount 当前数量
* @returns 错误提示文本
*/
const buildIndexOutOfRangeMessage = (currentCount) => {
	if (currentCount === 0) return "当前没有可用的功法";
	return `编号超出范围\n\n当前共有 ${currentCount} 个功法\n请输入 1-${currentCount} 之间的编号`;
};

//#endregion
export { buildIndexOutOfRangeMessage, extractArgs, hasKeyword, parsePageNumber, parseSkillBookIndex };
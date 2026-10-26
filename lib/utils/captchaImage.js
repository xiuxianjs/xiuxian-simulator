import sharp from "sharp";

//#region src/utils/captchaImage.ts
/** 平台图片转换；挑战生成、存储和校验由服务端负责。 */
function svgToPngBuffer(svgString) {
	return sharp(Buffer.from(svgString)).png().toBuffer();
}

//#endregion
export { svgToPngBuffer };
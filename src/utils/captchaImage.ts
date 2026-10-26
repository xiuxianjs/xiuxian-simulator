/** 平台图片转换；挑战生成、存储和校验由服务端负责。 */
import sharp from 'sharp';

export function svgToPngBuffer(svgString: string): Promise<Buffer> {
  return sharp(Buffer.from(svgString)).png().toBuffer();
}

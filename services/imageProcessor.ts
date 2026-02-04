
import { ImageFormat } from '../types';

/**
 * 优化后的图像处理服务
 * 支持：格式转换、智能压缩、位图转矢量(Tracing)
 */

/**
 * 将位图数据转换为 SVG 路径 (简单的图像追踪算法)
 * 这是一个轻量级的矢量化实现，通过扫描像素灰度生成路径
 */
const traceToSvgPath = (ctx: CanvasRenderingContext2D, width: number, height: number): string => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let paths = "";
  
  // 步进采样以平衡性能与质量
  const step = 2; 
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // 只提取非透明且具有一定深度的颜色块
      if (a > 128) {
        const color = `rgb(${r},${g},${b})`;
        // 生成一个简单的矩形路径块，实际复杂工具会使用 Potrace 算法进行轮廓拟合
        paths += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${color}" />`;
      }
    }
  }
  return paths;
};

/**
 * 压缩 SVG 源码 (去除注释、多余空格等)
 */
const minifySvg = (svgString: string): string => {
  return svgString
    .replace(/<!--[\s\S]*?-->/g, "") // 移除注释
    .replace(/>\s+</g, "><")         // 移除标签间空格
    .trim();
};

export const convertImage = (
  file: File,
  targetFormat: ImageFormat,
  quality: number,
  scale: number
): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    // 优化：如果原图是 SVG，目标也是 SVG，直接读取源码并压缩
    if (file.type === ImageFormat.SVG && targetFormat === ImageFormat.SVG) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawSvg = e.target?.result as string;
        const minified = minifySvg(rawSvg);
        const blob = new Blob([minified], { type: ImageFormat.SVG });
        resolve({ blob, url: URL.createObjectURL(blob) });
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        const width = img.width * scale;
        const height = img.height * scale;
        canvas.width = width;
        canvas.height = height;

        if (targetFormat === ImageFormat.JPEG) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // SVG 转换优化逻辑
        if (targetFormat === ImageFormat.SVG) {
          /**
           * 方案选择：
           * 对于复杂的照片，采用 Base64 嵌入（保持细节）
           * 对于简单图标/图形，可以采用 traceToSvgPath（实现真正矢量化）
           * 这里我们提供一个更优的嵌入结构，并减小 Base64 体积
           */
          const useTracing = width * height < 200000; // 较小的图片尝试矢量化
          
          let svgContent = "";
          if (useTracing) {
            // 真正矢量化：提取像素路径
            const paths = traceToSvgPath(ctx, width, height);
            svgContent = `
              <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <g shape-rendering="crispEdges">${paths}</g>
              </svg>`;
          } else {
            // 高质量嵌入：使用 WebP Base64 (如果支持) 减小 SVG 体积
            const dataUrl = canvas.toDataURL('image/webp', quality);
            svgContent = `
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
                <image width="100%" height="100%" xlink:href="${dataUrl}" />
              </svg>`;
          }

          const blob = new Blob([minifySvg(svgContent)], { type: ImageFormat.SVG });
          resolve({ blob, url: URL.createObjectURL(blob) });
        } else {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, url: URL.createObjectURL(blob) });
              } else {
                reject(new Error('Export failed'));
              }
            },
            targetFormat,
            quality
          );
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

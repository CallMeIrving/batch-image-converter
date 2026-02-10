import { ImageFormat } from '../types.ts';

/**
 * Basic image tracing: converts non-transparent pixels to small SVG rectangles.
 * Good for icons and simple graphics.
 */
const traceToSvgPath = (ctx: CanvasRenderingContext2D, width: number, height: number): string => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let paths = "";
  const step = 2; // Pixel stepping for performance balance
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 128) {
        const color = `rgb(${r},${g},${b})`;
        paths += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${color}" />`;
      }
    }
  }
  return paths;
};

/**
 * Minifies SVG source code by removing comments and unnecessary whitespace.
 */
const minifySvg = (svgString: string): string => {
  return svgString
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
};

export const convertImage = (
  file: File,
  targetFormat: ImageFormat,
  quality: number,
  scale: number
): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    // Optimization: SVG to SVG pass-through with minification
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
          reject(new Error('Canvas context failure'));
          return;
        }

        const width = img.width * scale;
        const height = img.height * scale;
        canvas.width = width;
        canvas.height = height;

        // Fill background for non-alpha formats like JPEG
        if (targetFormat === ImageFormat.JPEG) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Advanced SVG conversion
        if (targetFormat === ImageFormat.SVG) {
          const useTracing = width * height < 150000; // Only trace relatively small images
          let svgContent = "";
          if (useTracing) {
            const paths = traceToSvgPath(ctx, width, height);
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g shape-rendering="crispEdges">${paths}</g></svg>`;
          } else {
            // High-quality embedding using WebP base64
            const dataUrl = canvas.toDataURL('image/webp', quality);
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}"><image width="100%" height="100%" xlink:href="${dataUrl}" /></svg>`;
          }
          const blob = new Blob([minifySvg(svgContent)], { type: ImageFormat.SVG });
          resolve({ blob, url: URL.createObjectURL(blob) });
        } else {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, url: URL.createObjectURL(blob) });
              else reject(new Error('Blob generation failed'));
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
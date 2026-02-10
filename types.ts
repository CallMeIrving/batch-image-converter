
export enum ImageFormat {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  WEBP = 'image/webp',
  GIF = 'image/gif',
  SVG = 'image/svg+xml'
}

export enum AppMode {
  CONVERT = 'convert',
  COMPRESS = 'compress'
}

export type Language = 'zh' | 'en';

export type ConversionStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  format: ImageFormat;
  status: ConversionStatus;
  resultUrl?: string;
  resultSize?: number;
  error?: string;
}

export interface GlobalSettings {
  mode: AppMode;
  targetFormat: ImageFormat | 'original';
  quality: number;
  scale: number;
}

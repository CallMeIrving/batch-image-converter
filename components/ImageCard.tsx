
import React from 'react';
import { ImageFile } from '../types';
import { formatSize } from '../services/imageProcessor';
import { X, CheckCircle, Loader2, AlertCircle, Download, FileImage } from 'lucide-react';

interface ImageCardProps {
  image: ImageFile;
  onRemove: (id: string) => void;
}

/**
 * 单个图片项卡片组件
 * 展示原始尺寸、处理后尺寸及下载操作
 */
const ImageCard: React.FC<ImageCardProps> = ({ image, onRemove }) => {
  return (
    <div className="glass rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:border-sky-500/50 flex flex-col h-full border border-slate-700/50 bg-slate-800/10">
      {/* 图片预览区 */}
      <div className="relative aspect-[16/10] bg-slate-900/50 overflow-hidden">
        {image.status === 'processing' && (
          <div className="absolute inset-0 z-10 bg-slate-900/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        )}
        <img
          src={image.previewUrl}
          alt={image.file.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* 移除按钮 */}
        <button
          onClick={() => onRemove(image.id)}
          className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md"
        >
          <X size={14} />
        </button>
      </div>

      {/* 信息展示区 */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xs font-bold text-slate-200 truncate mb-3" title={image.file.name}>
          {image.file.name}
        </h3>
        
        <div className="flex items-center justify-between text-[10px] font-bold">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase tracking-tighter">原始体积</span>
              <span className="text-slate-300">{formatSize(image.originalSize)}</span>
            </div>
            {image.resultSize && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 uppercase tracking-tighter">处理后</span>
                <span className="text-sky-400">{formatSize(image.resultSize)}</span>
              </div>
            )}
          </div>
          
          {/* 状态图标 */}
          <div className="flex items-center">
            {image.status === 'completed' && <CheckCircle size={18} className="text-emerald-500" />}
            {image.status === 'error' && <AlertCircle size={18} className="text-rose-500" />}
            {image.status === 'idle' && <FileImage size={18} className="text-slate-700" />}
          </div>
        </div>

        {/* 成功后的单文件下载按钮 */}
        {image.status === 'completed' && image.resultUrl && (
          <a
            href={image.resultUrl}
            download={`pixelflex-${image.file.name}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-sky-500/10"
          >
            <Download size={14} />
            保存图片
          </a>
        )}

        {/* 错误提示 */}
        {image.status === 'error' && (
          <div className="mt-4 text-[10px] text-rose-400 bg-rose-400/5 p-2 rounded border border-rose-400/20 font-medium">
            {image.error || '处理过程中出现错误'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCard;

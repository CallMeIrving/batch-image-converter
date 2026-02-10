
import React from 'react';
import { ImageFile } from '../types.ts';
import { formatSize } from '../services/imageProcessor.ts';
import { X, CheckCircle, Loader2, AlertCircle, Download, FileImage } from 'lucide-react';
import { useTranslation } from '../App.tsx';

interface ImageCardProps {
  image: ImageFile;
  onRemove: (id: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onRemove }) => {
  const { t } = useTranslation();

  return (
    <div className="glass rounded-2xl overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-sky-500/5 hover:border-sky-500/50 flex flex-col h-full border border-slate-700/50 bg-slate-800/10">
      <div className="relative aspect-[1.4] bg-slate-900/80 overflow-hidden">
        {image.status === 'processing' && (
          <div className="absolute inset-0 z-10 bg-slate-900/70 flex items-center justify-center backdrop-blur-[2px]">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          </div>
        )}
        <img
          src={image.previewUrl}
          alt={image.file.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        <button
          onClick={() => onRemove(image.id)}
          className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-xl"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-sm font-bold text-slate-200 truncate mb-4" title={image.file.name}>
          {image.file.name}
        </h3>
        
        <div className="flex items-center justify-between text-[11px] font-bold">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 uppercase tracking-widest">{t('card_original')}</span>
              <span className="text-slate-300">{formatSize(image.originalSize)}</span>
            </div>
            {image.resultSize && (
              <div className="flex items-center gap-3">
                <span className="text-slate-500 uppercase tracking-widest">{t('card_result')}</span>
                <span className="text-sky-400">{formatSize(image.resultSize)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {image.status === 'completed' && <CheckCircle size={20} className="text-emerald-500" />}
            {image.status === 'error' && <AlertCircle size={20} className="text-rose-500" />}
            {image.status === 'idle' && <FileImage size={20} className="text-slate-700" />}
          </div>
        </div>

        {image.status === 'completed' && image.resultUrl && (
          <a
            href={image.resultUrl}
            download={`pixelflex-${image.file.name}`}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-95"
          >
            <Download size={16} />
            {t('card_download')}
          </a>
        )}

        {image.status === 'error' && (
          <div className="mt-6 text-[11px] text-rose-400 bg-rose-400/5 p-3 rounded-xl border border-rose-400/20 font-semibold text-center">
            {image.error || t('card_error')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCard;

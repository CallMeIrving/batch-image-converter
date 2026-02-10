
import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../App.tsx';

interface UploaderProps {
  onFilesSelected: (files: File[]) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesSelected }) => {
  const { t } = useTranslation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative group border-2 border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-800/20 transition-all duration-500 rounded-3xl p-16 text-center cursor-pointer overflow-hidden"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      
      <div className="relative z-0">
        <div className="mb-6 inline-flex items-center justify-center p-6 bg-sky-500/10 rounded-2xl group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-500">
          <Upload className="w-12 h-12 text-sky-400" />
        </div>
        <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">{t('uploader_title')}</h2>
        <p className="text-slate-400 max-w-sm mx-auto text-lg leading-relaxed">
          {t('uploader_desc')}
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span className="px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">{t('uploader_tag_no_server')}</span>
        <span className="px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">{t('uploader_tag_svg')}</span>
        <span className="px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">{t('uploader_tag_speed')}</span>
      </div>

      <div className="absolute top-0 right-0 p-8 opacity-5">
        <ImageIcon size={180} className="rotate-12" />
      </div>
    </div>
  );
};

export default Uploader;

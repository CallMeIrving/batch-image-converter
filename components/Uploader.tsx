
import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface UploaderProps {
  onFilesSelected: (files: File[]) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesSelected }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Fix: Add explicit File type to filter parameter to avoid 'unknown' type error
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
      className="relative group border-2 border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-800/20 transition-all rounded-2xl p-12 text-center cursor-pointer overflow-hidden"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      
      <div className="relative z-0">
        <div className="mb-4 inline-flex items-center justify-center p-4 bg-sky-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
          <Upload className="w-10 h-10 text-sky-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-100">Drop your images here</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Support batch processing for JPG, PNG, WebP, and more. Max file size: 20MB.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
        <span className="px-3 py-1 bg-slate-800 rounded-full">BATCH CONVERSION</span>
        <span className="px-3 py-1 bg-slate-800 rounded-full">SMART OPTIMIZATION</span>
        <span className="px-3 py-1 bg-slate-800 rounded-full">PRIVACY FIRST</span>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <ImageIcon size={160} className="rotate-12" />
      </div>
    </div>
  );
};

export default Uploader;
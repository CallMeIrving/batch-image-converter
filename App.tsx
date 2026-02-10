
import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { ImageFile, ImageFormat, GlobalSettings, AppMode, Language } from './types.ts';
import { convertImage } from './services/imageProcessor.ts';
import { translations, TranslationKeys } from './services/translations.ts';
import Uploader from './components/Uploader.tsx';
import ImageCard from './components/ImageCard.tsx';
import JSZip from 'jszip';
import { 
  Settings2, Play, Trash2, Zap, Layers, LayoutGrid, 
  Loader2, Archive, Minimize2, RefreshCw, Sparkles, FolderDown, Languages
} from 'lucide-react';

// i18n Context
const LanguageContext = createContext<{
  lang: Language;
  t: (key: TranslationKeys) => string;
  setLang: (lang: Language) => void;
}>({
  lang: 'zh',
  t: (key) => translations.zh[key],
  setLang: () => {},
});

export const useTranslation = () => useContext(LanguageContext);

const App: React.FC = () => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('pixelflex_lang');
    return (saved as Language) || 'zh';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('pixelflex_lang', newLang);
  };

  const t = (key: TranslationKeys) => translations[lang][key] || key;

  const [mode, setMode] = useState<AppMode>(AppMode.CONVERT);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({
    mode: AppMode.CONVERT,
    targetFormat: ImageFormat.WEBP,
    quality: 0.8,
    scale: 1.0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isExportingToFolder, setIsExportingToFolder] = useState(false);

  const supportsFileSystemAccess = 'showDirectoryPicker' in window;

  useEffect(() => {
    if (mode === AppMode.COMPRESS) {
      setSettings(s => ({ ...s, targetFormat: 'original', quality: 0.6 }));
    } else {
      setSettings(s => ({ ...s, targetFormat: ImageFormat.WEBP, quality: 0.8 }));
    }
  }, [mode]);

  const handleFilesSelected = (files: File[]) => {
    const newImages: ImageFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      format: file.type as ImageFormat,
      status: 'idle',
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        if (removed.resultUrl) URL.revokeObjectURL(removed.resultUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.previewUrl);
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl);
    });
    setImages([]);
  };

  const processImages = async () => {
    setIsProcessing(true);
    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      if (updatedImages[i].status === 'completed') continue;

      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, status: 'processing' } : img
      ));

      try {
        const targetFormat = settings.targetFormat === 'original' 
          ? updatedImages[i].format 
          : settings.targetFormat as ImageFormat;

        const { blob, url } = await convertImage(
          updatedImages[i].file,
          targetFormat,
          settings.quality,
          settings.scale
        );
        
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'completed', resultUrl: url, resultSize: blob.size } : img
        ));
      } catch (err: any) {
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'error', error: err.message } : img
        ));
      }
    }
    setIsProcessing(false);
  };

  const downloadAsZip = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.resultUrl);
    if (completedImages.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();

    try {
      const promises = completedImages.map(async (img) => {
        const response = await fetch(img.resultUrl!);
        const blob = await response.blob();
        let ext = blob.type.split('/')[1].split('+')[0];
        if (ext === 'jpeg') ext = 'jpg';
        const baseName = img.file.name.split('.').slice(0, -1).join('.');
        zip.file(`${baseName}.${ext}`, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `pixelflex_${mode}_${new Date().getTime()}.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error("ZIP Error:", error);
      alert(t('alert_zip_fail'));
    } finally {
      setIsZipping(false);
    }
  };

  const exportToFolder = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.resultUrl);
    if (completedImages.length === 0) return;

    if (!supportsFileSystemAccess) {
      alert(t('alert_folder_unsupported'));
      return;
    }

    setIsExportingToFolder(true);
    try {
      // @ts-ignore
      const directoryHandle = await window.showDirectoryPicker();
      
      for (const img of completedImages) {
        const response = await fetch(img.resultUrl!);
        const blob = await response.blob();
        
        let ext = blob.type.split('/')[1].split('+')[0];
        if (ext === 'jpeg') ext = 'jpg';
        const baseName = img.file.name.split('.').slice(0, -1).join('.');
        const fileName = `${baseName}.${ext}`;

        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
      alert(t('alert_folder_success'));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Folder Export Error:", err);
        alert(t('alert_folder_fail') + err.message);
      }
    } finally {
      setIsExportingToFolder(false);
    }
  };

  const hasCompleted = images.some(img => img.status === 'completed');

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      <div className="min-h-screen pb-20 selection:bg-sky-500/30 bg-[#0f172a]">
        <nav className="sticky top-0 z-50 glass border-b border-slate-800/50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Zap className="text-white w-6 h-6 fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white hidden sm:block">PixelFlex</span>
            </div>

            <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setMode(AppMode.CONVERT)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === AppMode.CONVERT 
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw size={16} />
                {t('nav_convert')}
              </button>
              <button
                onClick={() => setMode(AppMode.COMPRESS)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === AppMode.COMPRESS 
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Minimize2 size={16} />
                {t('nav_compress')}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                <Sparkles size={12} className="text-amber-500" />
                <span>{t('ai_badge')}</span>
              </div>
              
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                <Languages size={14} />
                <span className="w-12 text-center">{lang === 'zh' ? 'EN' : '中文'}</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <section>
              <Uploader onFilesSelected={handleFilesSelected} />
            </section>

            {images.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={18} className="text-sky-400" />
                    <h2 className="text-lg font-semibold text-slate-100">{t('queue_title')} ({images.length})</h2>
                  </div>
                  <button 
                    onClick={clearAll}
                    className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors uppercase font-bold"
                  >
                    <Trash2 size={14} />
                    {t('clear_list')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {images.map(img => (
                    <ImageCard key={img.id} image={img} onRemove={removeImage} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="glass rounded-2xl p-6 sticky top-28 space-y-8 border-slate-700/30">
              <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
                <Settings2 className="text-sky-400" size={20} />
                <h2 className="text-lg font-bold">{t('config_title')}</h2>
              </div>

              {mode === AppMode.CONVERT && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-300">{t('target_format')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ImageFormat).map(([key, value]) => (
                      <button
                        key={value}
                        onClick={() => setSettings(s => ({ ...s, targetFormat: value }))}
                        className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                          settings.targetFormat === value 
                          ? 'bg-sky-500 border-sky-400 text-white shadow-lg' 
                          : 'bg-slate-800/30 text-slate-500 hover:text-slate-300 border-slate-700'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === AppMode.COMPRESS && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-300">{t('strategy_title')}</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSettings(s => ({ ...s, targetFormat: 'original', quality: 0.6 }))}
                      className={`w-full py-4 px-4 rounded-xl text-sm font-bold flex items-center justify-between transition-all border ${
                        settings.targetFormat === 'original' 
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400' 
                        : 'bg-slate-800/30 text-slate-500 border-slate-700'
                      }`}
                    >
                      <div className="text-left">
                        <p>{t('strategy_max_title')}</p>
                        <p className="text-[10px] font-normal opacity-60">{t('strategy_max_desc')}</p>
                      </div>
                      {settings.targetFormat === 'original' && <Zap size={16} fill="currentColor" />}
                    </button>
                    <button
                      onClick={() => setSettings(s => ({ ...s, targetFormat: ImageFormat.WEBP, quality: 0.75 }))}
                      className={`w-full py-4 px-4 rounded-xl text-sm font-bold flex items-center justify-between transition-all border ${
                        settings.targetFormat === ImageFormat.WEBP 
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400' 
                        : 'bg-slate-800/30 text-slate-500 border-slate-700'
                      }`}
                    >
                      <div className="text-left">
                        <p>{t('strategy_web_title')}</p>
                        <p className="text-[10px] font-normal opacity-60">{t('strategy_web_desc')}</p>
                      </div>
                      {settings.targetFormat === ImageFormat.WEBP && <Sparkles size={16} fill="currentColor" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6 pt-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {mode === AppMode.CONVERT ? t('quality_label') : t('compress_label')}
                    </label>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded">
                      {Math.round(settings.quality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range" min="0.05" max="1" step="0.01"
                    value={settings.quality}
                    onChange={(e) => setSettings(s => ({ ...s, quality: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('scale_label')}</label>
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                      x{settings.scale.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range" min="0.1" max="2" step="0.1"
                    value={settings.scale}
                    onChange={(e) => setSettings(s => ({ ...s, scale: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <button
                  onClick={processImages}
                  disabled={isProcessing || images.length === 0}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 disabled:from-slate-800 disabled:to-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-sky-500/10 hover:shadow-sky-500/30 transition-all active:scale-95"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                  {isProcessing ? t('btn_processing') : mode === AppMode.CONVERT ? t('btn_process_convert') : t('btn_process_compress')}
                </button>

                {hasCompleted && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={downloadAsZip}
                      disabled={isZipping || isExportingToFolder}
                      className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isZipping ? <Loader2 className="animate-spin" size={18} /> : <Archive size={18} />}
                      {t('btn_download_zip')}
                    </button>
                    
                    {supportsFileSystemAccess && (
                      <button
                        onClick={exportToFolder}
                        disabled={isZipping || isExportingToFolder}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isExportingToFolder ? <Loader2 className="animate-spin" size={18} /> : <FolderDown size={18} />}
                        {t('btn_save_folder')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-20 py-10 border-t border-slate-800/50 text-center space-y-2">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
            &copy; 2024 PixelFlex. Local & Secure.
          </p>
        </footer>
      </div>
    </LanguageContext.Provider>
  );
};

export default App;

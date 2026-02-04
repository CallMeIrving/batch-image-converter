
import React, { useState, useCallback, useEffect } from 'react';
import { ImageFile, ImageFormat, GlobalSettings, AppMode } from './types';
import { convertImage } from './services/imageProcessor';
import Uploader from './components/Uploader';
import ImageCard from './components/ImageCard';
import JSZip from 'jszip';
import { 
  Settings2, Play, Trash2, Zap, Layers, LayoutGrid, 
  Loader2, Archive, Minimize2, RefreshCw, Gauge, Sparkles, ChevronRight
} from 'lucide-react';

/**
 * PixelFlex 主应用组件
 * 负责状态管理、模式切换及核心转换逻辑的分发
 */
const App: React.FC = () => {
  // 当前应用模式：格式转换 或 图片压缩
  const [mode, setMode] = useState<AppMode>(AppMode.CONVERT);
  // 已上传的图片列表
  const [images, setImages] = useState<ImageFile[]>([]);
  // 全局配置项
  const [settings, setSettings] = useState<GlobalSettings>({
    mode: AppMode.CONVERT,
    targetFormat: ImageFormat.WEBP,
    quality: 0.8,
    scale: 1.0,
  });
  // 处理状态锁
  const [isProcessing, setIsProcessing] = useState(false);
  // 压缩包生成状态锁
  const [isZipping, setIsZipping] = useState(false);

  /**
   * 当切换模式时，自动调整默认参数
   * 压缩模式默认：保持原格式 + 60%质量
   * 转换模式默认：WebP格式 + 80%质量
   */
  useEffect(() => {
    if (mode === AppMode.COMPRESS) {
      setSettings(s => ({ ...s, targetFormat: 'original', quality: 0.6 }));
    } else {
      setSettings(s => ({ ...s, targetFormat: ImageFormat.WEBP, quality: 0.8 }));
    }
  }, [mode]);

  /**
   * 处理文件上传回调
   * 将 File 对象封装为带状态的 ImageFile 对象
   */
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

  /**
   * 从队列中移除指定图片并释放内存
   */
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

  /**
   * 清空所有图片队列
   */
  const clearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.previewUrl);
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl);
    });
    setImages([]);
  };

  /**
   * 核心处理函数：循环队列进行图片转换/压缩
   */
  const processImages = async () => {
    setIsProcessing(true);
    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      // 跳过已经处理成功的图片
      if (updatedImages[i].status === 'completed') continue;

      // 更新当前图片为处理中状态
      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, status: 'processing' } : img
      ));

      try {
        // 确定最终目标格式（压缩模式下可能选择"保持原格式"）
        const targetFormat = settings.targetFormat === 'original' 
          ? updatedImages[i].format 
          : settings.targetFormat as ImageFormat;

        // 调用 Canvas 处理服务
        const { blob, url } = await convertImage(
          updatedImages[i].file,
          targetFormat,
          settings.quality,
          settings.scale
        );
        
        // 更新处理成功后的结果信息
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'completed', resultUrl: url, resultSize: blob.size } : img
        ));
      } catch (err: any) {
        // 捕获并记录错误
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'error', error: err.message } : img
        ));
      }
    }
    setIsProcessing(false);
  };

  /**
   * 导出功能：将所有已处理完成的图片打包为 ZIP 下载
   */
  const downloadAsZip = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.resultUrl);
    if (completedImages.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();

    try {
      const promises = completedImages.map(async (img) => {
        const response = await fetch(img.resultUrl!);
        const blob = await response.blob();
        
        // 处理扩展名，特殊处理 SVG 和 JPEG
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
      alert("生成压缩包失败，请检查浏览器权限。");
    } finally {
      setIsZipping(false);
    }
  };

  const hasCompleted = images.some(img => img.status === 'completed');

  return (
    <div className="min-h-screen pb-20 selection:bg-sky-500/30">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">PixelFlex</span>
          </div>

          {/* 模式切换菜单：核心功能入口 */}
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
              格式转换
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
              图片压缩
            </button>
          </div>
          
          <div className="hidden md:flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">
            <Sparkles size={12} className="text-amber-500" />
            <span>AI Powered Processing</span>
          </div>
        </div>
      </nav>

      {/* 主界面布局 */}
      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧：工作区（上传、列表） */}
        <div className="lg:col-span-8 space-y-6">
          <section>
            <Uploader onFilesSelected={handleFilesSelected} />
          </section>

          {images.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <LayoutGrid size={18} className="text-sky-400" />
                  <h2 className="text-lg font-semibold text-slate-100">队列清单 ({images.length})</h2>
                </div>
                <button 
                  onClick={clearAll}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors uppercase font-bold"
                >
                  <Trash2 size={14} />
                  清空列表
                </button>
              </div>

              {/* 响应式图片网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {images.map(img => (
                  <ImageCard key={img.id} image={img} onRemove={removeImage} />
                ))}
              </div>
            </section>
          )}

          {/* 空状态展示 */}
          {images.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 opacity-10 select-none border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
              <Layers size={80} className="mb-4" />
              <p className="text-xl font-medium tracking-tight">拖拽或点击上方区域开始</p>
            </div>
          )}
        </div>

        {/* 右侧：设置面板（参数、执行按钮） */}
        <div className="lg:col-span-4">
          <div className="glass rounded-2xl p-6 sticky top-28 space-y-8 border-slate-700/30">
            <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
              <Settings2 className="text-sky-400" size={20} />
              <h2 className="text-lg font-bold">参数配置</h2>
            </div>

            {/* 模式特有设置：格式转换 */}
            {mode === AppMode.CONVERT && (
              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-300">目标输出格式</label>
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

            {/* 模式特有设置：图片压缩 */}
            {mode === AppMode.COMPRESS && (
              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-300">优化策略</label>
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
                      <p>极致压缩</p>
                      <p className="text-[10px] font-normal opacity-60">保持原格式，大幅减小体积</p>
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
                      <p>网页优化 (推荐)</p>
                      <p className="text-[10px] font-normal opacity-60">自动转为 WebP，平衡画质与大小</p>
                    </div>
                    {settings.targetFormat === ImageFormat.WEBP && <Sparkles size={16} fill="currentColor" />}
                  </button>
                </div>
              </div>
            )}

            {/* 通用设置：质量与缩放 */}
            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {mode === AppMode.CONVERT ? '画质质量' : '压缩强度'}
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">尺寸缩放</label>
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

            {/* 批量执行区域 */}
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <button
                onClick={processImages}
                disabled={isProcessing || images.length === 0}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 disabled:from-slate-800 disabled:to-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-sky-500/10 hover:shadow-sky-500/30 transition-all active:scale-95"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                {isProcessing ? '正在处理队列...' : mode === AppMode.CONVERT ? '执行格式转换' : '开始压缩优化'}
              </button>

              {hasCompleted && (
                <button
                  onClick={downloadAsZip}
                  disabled={isZipping}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isZipping ? <Loader2 className="animate-spin" size={18} /> : <Archive size={18} />}
                  打包下载全部
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 底部版权信息 */}
      <footer className="mt-20 py-10 border-t border-slate-800/50 text-center space-y-2">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          &copy; 2024 PixelFlex Studio. Local & Private.
        </p>
        <p className="text-slate-700 text-[9px]">
          您的数据不会上传到服务器，所有处理均在您的浏览器本地完成。
        </p>
      </footer>
    </div>
  );
};

export default App;

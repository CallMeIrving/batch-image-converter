# PixelFlex | 极简美学批量图片转换工具

PixelFlex 是一款高性能、全本地运行的批量图片处理工具。它结合了现代化的玻璃拟态（Glassmorphism）设计与强大的浏览器端图像处理能力。

## ✨ 功能特性

- **🚀 极速转换**：完全在浏览器本地处理，无需上传服务器，保护隐私且速度极快。
- **📦 批量处理**：支持一次性拖入多张图片，统一配置参数。
- **🛠️ 格式互转**：支持 PNG, JPEG, WebP, GIF 互转。
- **🎨 矢量追踪**：内置 SVG Tracing 技术，可将位图转换为轻量化的 SVG 路径。
- **📉 智能压缩**：预设“极致压缩”与“网页优化”策略。
- **📁 文件夹导出**：支持调用现代浏览器 API，直接将处理后的图片保存到选定的本地文件夹。
- **🌍 多语言支持**：默认支持中文（简体）与英文。

## 🛠️ 技术栈

- **Core**: React 19 + TypeScript
- **UI**: Tailwind CSS + Lucide Icons
- **Logic**: Canvas API + File System Access API
- **Compression**: JSZip (用于打包下载)

## 🚀 本地开发


1. 安装依赖：
   ```bash
   npm install
   npm run dev
或
   pnpm i
   pnpm dev
   ```
## 📄 开源协议

MIT License.

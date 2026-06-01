# 手机脱离电脑使用说明

本应用的目标是：**打卡时完全不依赖电脑**。

## 推荐使用方式

1. 先把本项目构建后的静态文件部署到一个公网 HTTPS 地址。
2. 用安卓手机浏览器打开该 HTTPS 地址。
3. 通过浏览器菜单选择“添加到主屏幕”或“安装应用”。
4. 之后从手机桌面图标打开使用。

完成安装后：

- 打卡记录只保存在手机当前浏览器/PWA 的本机存储中。
- 电脑不参与打卡，也不会同步手机数据。
- 已加载过应用后，断网也可以继续打开和记录。
- 换手机、换浏览器、卸载 PWA、清理浏览器数据前，必须先导出 JSON 备份。

## 为什么仍需要公网 HTTPS

PWA 的“添加到主屏幕”和离线缓存通常要求 HTTPS。手机不在电脑同一局域网时，不能依赖 `npm run dev` 提供的局域网地址。因此需要把 `dist/` 发布到公网静态托管服务。

## 最简单部署方案：Netlify Drop

适合不想配置命令行的人：

1. 在电脑上运行：

   ```bash
   npm run build
   ```

2. 打开 Netlify Drop：<https://app.netlify.com/drop>
3. 把本项目的 `dist` 文件夹拖进去。
4. Netlify 会生成一个 HTTPS 网址。
5. 用手机打开该网址并添加到主屏幕。

注意：以后如果修改代码，需要重新 build 并重新上传 `dist`。

## GitHub Pages 方案

如果该项目放到 GitHub 仓库，可使用 `.github/workflows/deploy.yml` 自动发布：

1. 新建 GitHub 仓库并推送项目。
2. 在仓库 Settings → Pages 中选择 GitHub Actions。
3. 每次推送到 `main` 分支后，自动构建并发布。
4. 手机访问 GitHub Pages 的 HTTPS 地址并安装。

## Vercel / Cloudflare Pages 方案

也可以导入该项目仓库：

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## 手机端日常操作原则

- 只用手机上的桌面 PWA 打卡。
- 不在电脑浏览器中点“我已打卡”。
- 如果必须在新手机继续使用，先在旧手机导出 JSON，再在新手机导入。

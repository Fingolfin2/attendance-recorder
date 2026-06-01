# APK 封装说明

本项目使用 Capacitor 将 `phone-standalone/attendance-recorder.html` 封装为 Android APK。

## 当前封装口径

- APK 内置单文件网页资源，不需要公网部署。
- 数据保存在 APK WebView 的本机 `localStorage` 中。
- 卸载 APK 或清除应用数据会删除记录；请先在“备份”页导出 JSON。
- APK 不与电脑同步，不需要电脑开机。

## 本机当前状态\n\n我已经生成了 Android 工程并完成 Capacitor 同步，但当前这台电脑没有检测到 Java/JDK、Android SDK 或 JAVA_HOME，所以本机暂时不能直接产出 APK。错误为：JAVA_HOME is not set and no 'java' command could be found in your PATH。\n\n你有两种打包方式：\n\n1. 安装本机 Android 构建环境后在电脑上打包。\n2. 把项目推到 GitHub，使用 .github/workflows/build-apk.yml 在 GitHub Actions 云端构建 APK，并从 Artifacts 下载。\n\n## 构建前置环境

需要安装：

1. JDK 17 或更高版本。
2. Android Studio 或 Android SDK。
3. Android SDK Build Tools / Platform Tools。
4. 设置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`。

## 构建命令

```bash
npm run apk:prepare
npm run apk:debug
```

生成位置通常为：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

将该 APK 复制到手机安装即可。第一次安装可能需要在安卓设置中允许“安装未知来源应用”。

## GitHub Actions 云端构建\n\n如果不想在本机安装 JDK/Android Studio：\n\n1. 将整个 D:\\code\\attendance-recorder 推送到 GitHub 仓库。\n2. 打开仓库 Actions。\n3. 运行 Build Android APK 工作流。\n4. 构建完成后，在该次 workflow run 的 Artifacts 中下载 ttendance-recorder-debug-apk。\n5. 解压后得到 pp-debug.apk，复制到手机安装。\n\n这是 debug APK，适合自用安装；如果要正式分发，需要再做 release 签名。\n\n## 更新 APK 内网页

修改 `phone-standalone/attendance-recorder.html` 后运行：

```bash
npm run apk:prepare
npm run apk:debug
```


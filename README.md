# 每日打卡记录器

独立的安卓手机专用 PWA，用于按“分时段区间有效打卡次数”规则记录每日打卡。发布到公网 HTTPS 后，日常打卡完全脱离电脑。

## 功能

- 北京时间 `Asia/Shanghai` 作为唯一业务时间口径。
- 三个有效时段：`07:00-12:00`、`12:00-18:00`、`18:00之后`；`00:00-07:00` 不计有效。
- 同一日期同一时段多次打卡只计 1 次有效打卡。
- 跨时段打卡与上一条有效打卡必须严格超过 4 小时才计有效。
- 月度应打卡次数：`ceil(40 × (当月日数 - 节假日数) / 当月日数)`。
- 本机浏览器保存数据，支持 JSON 导出/导入。
- 支持补录、修改、删除打卡记录，并要求备注；操作写入审计日志。
- 内置 2025、2026 年中国大陆放假安排，并支持用户自定义节假日/工作日覆盖。

## 开发运行

```bash
npm install
npm run dev
```

开发预览可以使用 `npm run dev`。正式手机使用不要依赖同一局域网电脑，请先构建并部署到公网 HTTPS。详见 `docs/PHONE_ONLY.md`。正式构建：

```bash
npm run build
npm run preview
```

## 测试

```bash
npm test
npm run build
```

## 数据格式

浏览器本地保存键：`attendance-recorder:v1`。

```ts
interface AppData {
  version: 1
  punches: PunchRecord[]
  holidayOverrides: HolidayOverride[]
  auditLogs: AuditLog[]
}
```

- `PunchRecord.occurredAt`：实际打卡/补录发生时间，ISO 字符串。
- `PunchRecord.createdAt`：记录创建时间，ISO 字符串。
- `PunchRecord.source`：`button` 或 `manual`。
- `HolidayOverride.date`：`YYYY-MM-DD`。
- `HolidayOverride.isHoliday`：`true` 表示该日按节假日扣减，`false` 表示覆盖为非节假日。

所有统计均由原始记录实时计算，不保存派生统计值。

## 节假日维护

内置节假日在 `src/lib/holidays.ts` 中维护。当前 2025、2026 年内置表参考中国政府网发布的《国务院办公厅关于2025年部分节假日安排的通知》（https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm）与《国务院办公厅关于2026年部分节假日安排的通知》（https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm）。未来年份不做“万年自动推断”，因为中国大陆放假与调休安排每年由官方发布。维护方式：

1. 官方发布下一年度安排后，在 `BUILTIN_HOLIDAYS` 中追加该年度放假日期。
2. 用户也可在页面“节假日”中添加覆盖规则；覆盖规则优先于内置表。
3. 换手机或清浏览器数据前，先在“备份”页导出 JSON。

## APK 封装\n\n已加入 Capacitor Android 工程，可将手机单文件版封装为 APK。当前本机缺少 JDK/Android SDK，不能直接在本机产出 APK；可安装 Android Studio/JDK 后运行 
pm run apk:debug，或推送到 GitHub 后用 .github/workflows/build-apk.yml 云端构建。详见 docs/APK.md。\n\n## 手机纯文件版\n\n如果只是自己使用、希望直接复制到手机且不部署网站，可以使用：phone-standalone/attendance-recorder.html。详见 phone-standalone/README.md。\n\n该方式不需要电脑开机，但从 ile:// 打开时不是标准 PWA，浏览器本地存储也和手机浏览器/文件来源绑定。\n\n## 手机脱离电脑使用\n\n- 电脑只用于一次性构建/发布，不作为打卡入口。\n- 手机通过公网 HTTPS 地址安装到桌面后，打卡记录只保存在手机本机。\n- 已打开并缓存后，断网也可继续使用。\n- 详细部署与安装见 `docs/PHONE_ONLY.md`。\n\n## PWA/离线说明

`public/manifest.webmanifest` 提供安卓添加到桌面信息；`public/sw.js` 缓存应用壳和访问过的构建资源。数据仍只保存在本机浏览器，不上传服务器。





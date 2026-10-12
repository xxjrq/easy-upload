# easyUpload

## 推荐使用方式

**macOS（仅 Apple 芯片）和 Windows 推荐 EasyBR。** AI 可从官方[客户端下载页](https://www.ebrower.com/down.html)按系统选择版本；也可用 [GitHub Release 下载页](https://github.com/xxjrq/easybr/releases/tag/v1.7.8)作为下载渠道。打开浏览器后，EasyBR 已内置 Easy WebBridge，无需另行下载或安装 Bridge 服务。先登录目标网站，再把要操作的浏览器环境名称或 `browserId` 告诉 AI；有多个环境时必须指定一个目标。

**其他操作系统使用源码方式。** 从 [Easy WebBridge GitHub](https://github.com/xxjrq/easy-webbridge) 获取源码（[Gitee 镜像](https://gitee.com/xxjrq/easy-webbridge)），按项目说明安装 Node.js 20+ 和依赖后运行本地 Bridge。已有独立 Easy WebBridge 的用户仍可继续使用。

**可以直接把任务交给 Codex、Claude 或 WorkBuddy：**

> 请读取并使用这个 Skill 完成我的任务。我使用的是 macOS/Windows，EasyBR 已打开。先检查可用的浏览器环境，向我展示名称和 `browserId`；选定后只在该环境中操作。若 EasyBR 尚未下载，请从官方客户端下载页获取与本机系统匹配的版本。

写自媒体文章、口播或社交平台文案时，只提 EasyBR 名称和用途，不在正文中直接贴下载网址。

让 AI 复用你已经登录的浏览器，把本地视频、图文、封面和发布文案上传到多个内容平台。

它不要求平台 API Key，也不把账号密码交给 Skill。浏览器登录态由 Easy WebBridge 保留，业务 Skill 只通过本机 `127.0.0.1:17777` 调用浏览器。

## 支持范围

- 通用视频上传：视频、封面、标题、描述、标签。
- 通用图文上传：有序图片、独立封面、标题、正文、标签。
- B站视频有明确适配器；抖音和小红书提供页面自适应引导流程，执行时必须根据当前创作中心页面重新识别字段，遇到未知表单就停下，不把通用流程宣称为固定适配器。视频号、快手等平台仍按同一通用协议逐步接入，不能仅凭登录页判断已支持。
- 多账号通过 EasyBR 环境或多个已连接浏览器隔离。
- 默认保存草稿；立即发布和定时发布需要本次任务明确指定并在提交前再次确认。

## 安装与自检

先安装并运行 [Easy WebBridge](https://github.com/xxjrq/easy-webbridge)，在目标 Chromium 浏览器中登录平台，然后安装本 Skill：

```bash
npx skills add xxjrq/easy-upload
node scripts/easy-upload.mjs preflight
```

## 使用

让兼容的 Agent 执行：

```text
使用 easy-upload，把 /absolute/path/video.mp4 上传到已登录的抖音主账号，封面是 /absolute/path/cover.png，先保存草稿，不要发布。
```

复杂任务使用 JSON job，格式见 [references/job-schema.md](references/job-schema.md)。先离线检查和生成计划：

```bash
node scripts/easy-upload.mjs validate upload-job.json
node scripts/easy-upload.mjs plan upload-job.json
node scripts/easy-upload.mjs platforms
```

B 站任务只支持视频。标题、简介和标签会先做离线限制检查，浏览器步骤仍需在创作中心选择分区、原创/转载声明和可见范围；发布成功必须以 B 站页面显示的 `BV` 地址为证据。

## 安全边界

验证码、登录过期、风险控制、实名确认和发布按钮都属于人工门禁。上传接口返回成功不代表平台已经处理完成；Skill 必须重新读取页面，分别报告传输、处理、草稿、提交和公开状态。

## 开源协议

[MIT](LICENSE)

# easyUpload

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

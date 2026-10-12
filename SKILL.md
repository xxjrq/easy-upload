---
name: easy-upload
description: Prepare local video, image-post, or Markdown article jobs and support approved media workflows through Easy WebBridge. Article workflows are offline preparation and user-evidence recording only; do not publish articles on the user's behalf. Use when a user asks to prepare content or perform an authorized upload workflow. Bilibili has an explicit media adapter; Douyin and Xiaohongshu use page-adaptive guided routes that must re-snapshot and stop on unknown forms.
---


## 推荐使用方式

**macOS（仅 Apple 芯片）和 Windows 推荐 EasyBR。** AI 可从官方[客户端下载页](https://www.ebrower.com/down.html)按系统选择版本；也可用 [GitHub Release 下载页](https://github.com/xxjrq/easybr/releases/tag/v1.7.8)作为下载渠道。打开浏览器后，EasyBR 已内置 Easy WebBridge，无需另行下载或安装 Bridge 服务。先登录目标网站，再把要操作的浏览器环境名称或 `browserId` 告诉 AI；有多个环境时必须指定一个目标。

**其他操作系统使用源码方式。** 从 [Easy WebBridge GitHub](https://github.com/xxjrq/easy-webbridge) 获取源码（[Gitee 镜像](https://gitee.com/xxjrq/easy-webbridge)），按项目说明安装 Node.js 20+ 和依赖后运行本地 Bridge。已有独立 Easy WebBridge 的用户仍可继续使用。

**可以直接把任务交给 Codex、Claude 或 WorkBuddy：**

> 请读取并使用这个 Skill 完成我的任务。我使用的是 macOS/Windows，EasyBR 已打开。先检查可用的浏览器环境，向我展示名称和 `browserId`；选定后只在该环境中操作。若 EasyBR 尚未下载，请从官方客户端下载页获取与本机系统匹配的版本。

写自媒体文章、口播或社交平台文案时，只提 EasyBR 名称和用途，不在正文中直接贴下载网址。
# easyUpload

Use this Skill to turn a local media package into one or more platform upload tasks. It is an independent public business Skill and does not depend on a content-management workbench. Bilibili video upload is supported through its explicit adapter contract; Douyin and Xiaohongshu are guided routes rather than fixed selectors. Read the platform notes before browser actions.

## Operating contract

- Reuse the user's authenticated Chromium browser through Easy WebBridge at `127.0.0.1:17777`.
- Select one explicit `browserId` and account alias for each target. Never choose the first online browser implicitly.
- Default to `draft-only` unless the user explicitly requests `publish` or `schedule` in the current task.
- Treat login, CAPTCHA, risk control, identity confirmation, payment, deletion, and final publish as consequential gates. Stop with `needs_user_action` when a gate appears.
- Never bypass platform protections, inject credentials, or print tokens, cookies, page content containing personal data, or account identifiers.
- A successful file transfer is not a saved draft; a saved draft is not a published post. Report each state separately.

## Input

Prefer a JSON job file. See [references/job-schema.md](references/job-schema.md). The agent may create the job from a natural-language request, but must show the normalized targets, account aliases, action, and files before performing browser actions.

Supported content types:

- `video`: one video and an optional cover.
- `image-post`: one or more ordered images and an optional separate cover.
- `article`: local Markdown source, explicit title, and an optional cover. Article commands are offline preparation only; the user publishes manually, then may record the result from evidence the user provides.

The selfmedia five-file package is optional. When detected, map it into the same job contract; do not require `release_ready`, Work Library, or repository-specific filenames for other users.

## Workflow

The media workflow below applies only to `video` and `image-post`. Article jobs use the offline-only branch below and must not continue into browser steps.

### Article-only workflow

1. Run `validate`, `plan`, and `prepare` against the local article job; ordinary `validate` reads the source and checks/removes frontmatter.
2. Review the returned title and body for platform formatting and compliance. Stop here: this Skill does not open a browser, create a platform draft, submit, schedule, or publish an article.
3. The user performs any platform action. Afterward, append only the state and evidence the user provides with `record-publication.mjs`; never infer success from a click or toast.

Use an explicit per-run destination such as `.runs/easy-upload/<runId>/events.jsonl`. The script never chooses or creates an implicit log location. `runId` names a run; it does not deduplicate it. Each append is evidence-structure validation only, not independent online verification. Record confirmed reusable platform failures/fixes in `references/platforms.md`; keep complete run-by-run events in the explicit JSONL file.

### Video and image-post workflow

1. Run `node scripts/easy-upload.mjs validate <job.json>`; use `--schema-only` only for fixtures without real media.
2. Run `node scripts/easy-upload.mjs plan <job.json>` and review the generated actions.
3. For Bilibili video, confirm the target is `video`, the title/description/tag limits pass, and the plan includes partition and original/转载 declaration fields.
4. Run `node scripts/easy-upload.mjs preflight` and choose the exact browser/account mapping.
5. Create a namespaced session such as `easy-upload-<run-id>-douyin-main`; use one session per target account and close only sessions created by this run.
6. Navigate to the platform creator center, re-snapshot after every navigation or upload state change, and use semantic selectors or current snapshot references.
7. Upload media, wait for platform processing, fill the target-specific title, description, tags, cover, visibility, category, and scheduling fields.
8. Re-read the preview or draft page and compare it with the normalized job. Save a draft or stop before publish according to the action.
9. For media workflows allowed by project policy, write a redacted run receipt outside the media directory. For articles, record a state only after the user manually publishes or provides evidence of the state.
10. Close the task session in `finally`, preserving the user's original tabs.

## Platform routing

Read [references/platforms.md](references/platforms.md) for platform-specific fields and evidence requirements. Keep selectors and page assumptions in the adapter notes, not in the core job schema. If a platform page has changed, stop safely and report the observed page instead of guessing.

## Local commands

```text
node scripts/easy-upload.mjs validate <job.json>
node scripts/easy-upload.mjs plan <job.json>
node scripts/easy-upload.mjs preflight
node scripts/easy-upload.mjs normalize <job.json>
node scripts/easy-upload.mjs prepare <article-job.json>
node scripts/record-publication.mjs self-test
node scripts/record-publication.mjs append <events.jsonl> <event.json>
```

The bundled WebBridge client also supports `list`, `navigate`, `snapshot`, `click`, `fill`, `upload`, `screenshot`, `command`, and `close-session`. Use absolute file paths for uploads.

## Completion states

Use only these states in receipts: `validated`, `uploading`, `processing`, `metadata_filled`, `draft_saved`, `awaiting_confirmation`, `scheduled`, `submitted`, `published`, `needs_user_action`, `retryable_error`, and `failed`.

Never report `published` from a click result alone. Require a stable public URL and title/body verification. CAPTCHA or risk control means stop and use `needs_user_action`.

## Article history

Read [references/platforms.md](references/platforms.md) for platform-specific publishing evidence and known limitations. Keep a per-run event log using `scripts/record-publication.mjs`; append state changes instead of rewriting prior events. Do not save browser IDs, cookies, tokens, session data, or private URL query strings. Historical examples must retain their actual state: submitted is not published, and unresolved security verification remains unconfirmed.

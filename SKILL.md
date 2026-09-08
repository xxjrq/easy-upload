---
name: easy-upload
description: Upload local videos, image posts, covers, captions, and tags to authenticated content-platform creator centers through Easy WebBridge. Use when a user asks to upload or publish a finished media package to Douyin, Xiaohongshu, Bilibili, or another supported platform. Bilibili has an explicit adapter; Douyin and Xiaohongshu use page-adaptive guided routes that must re-snapshot and stop on unknown forms. Reuse an existing logged-in browser; do not ask for platform API keys.
---

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

The selfmedia five-file package is optional. When detected, map it into the same job contract; do not require `release_ready`, Work Library, or repository-specific filenames for other users.

## Workflow

1. Run `node scripts/easy-upload.mjs validate <job.json>`; use `--schema-only` only for fixtures without real media.
2. Run `node scripts/easy-upload.mjs plan <job.json>` and review the generated actions.
3. For Bilibili, confirm the target is `video`, the title/description/tag limits pass, and the plan includes partition and original/转载 declaration fields.
4. Run `node scripts/easy-upload.mjs preflight` and choose the exact browser/account mapping.
5. Create a namespaced session such as `easy-upload-<run-id>-douyin-main`; use one session per target account and close only sessions created by this run.
6. Navigate to the platform creator center, re-snapshot after every navigation or upload state change, and use semantic selectors or current snapshot references.
7. Upload media, wait for platform processing, fill the target-specific title, description, tags, cover, visibility, category, and scheduling fields.
8. Re-read the preview or draft page and compare it with the normalized job. Save a draft or stop before publish according to the action.
9. Write a redacted run receipt outside the media directory. Include target, account alias, state, timestamps, and user-action blockers; never include tokens or cookies.
10. Close the task session in `finally`, preserving the user's original tabs.

## Platform routing

Read [references/platforms.md](references/platforms.md) for platform-specific fields and evidence requirements. Keep selectors and page assumptions in the adapter notes, not in the core job schema. If a platform page has changed, stop safely and report the observed page instead of guessing.

## Local commands

```text
node scripts/easy-upload.mjs validate <job.json>
node scripts/easy-upload.mjs plan <job.json>
node scripts/easy-upload.mjs preflight
node scripts/easy-upload.mjs normalize <job.json>
```

The bundled WebBridge client also supports `list`, `navigate`, `snapshot`, `click`, `fill`, `upload`, `screenshot`, `command`, and `close-session`. Use absolute file paths for uploads.

## Completion states

Use only these states in receipts: `validated`, `uploading`, `processing`, `metadata_filled`, `draft_saved`, `awaiting_confirmation`, `scheduled`, `submitted`, `published`, `needs_user_action`, `retryable_error`, and `failed`.

Never report `published` from a click result alone. Require the platform page to show the resulting post state or a stable post URL.

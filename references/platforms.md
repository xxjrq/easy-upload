# Platform Adapter Notes

The core job is platform-neutral. Each adapter must inspect the current creator-center page before using selectors and must record visible evidence for every terminal state.

## Douyin（页面自适应引导流程）

- Video target: upload one video, use the supplied cover when the page exposes a cover upload or frame-selection control, then fill title, description, tags, visibility, and schedule fields.
- Image-post target: upload ordered images and verify the preview order before saving.
- Do not assume a title limit, cover control, or scheduling control is stable; read the current page and stop on an unknown form.
- Evidence: creator-center URL, account alias, upload/processing result, preview or draft status, and final public URL only when the page displays it.
- This is not a fixed selector adapter. Re-snapshot the current form and stop when required fields or actions are not identifiable.

## Xiaohongshu（页面自适应引导流程）

- Keep one adapter per platform even when the source copy is shared.
- Require platform-specific category, copyright/original declaration, cover, visibility, and scheduling fields when shown.
- Never map a missing field to a guessed default if it changes the legal or distribution meaning.
- This is not a fixed selector adapter. Re-snapshot the current form and stop when required fields or actions are not identifiable.

## WeChat Channels

- Treat this as a generic route until a separate verified adapter and browser fixture exist.

## Bilibili

- Creator center: `https://member.bilibili.com/platform/upload/video`.
- Supported content: video only. `image-post` is rejected before any browser action.
- Required workflow fields when the current page shows them: video file, cover, title, description, tags, partition, original/转载 declaration, visibility, and publish or draft action.
- Offline limits enforced by the adapter: title at most 80 Unicode characters, description at most 2000 Unicode characters, at most 12 tags, and each tag at most 20 Unicode characters. These are validation guards; the page remains authoritative if Bilibili changes a limit.
- A selfmedia release package uses the `B站/视频号` title, description, and tag rows. It must not silently reuse the Douyin copy when a Bilibili row exists.
- Account routing for the user's EasyBR environment is explicit: use the selected `browserId` and account alias (for example `自媒体`), never the first online browser.
- Evidence for `draft_saved`: creator-center URL, selected account alias, processing-complete state, preview/title/cover summary, and visible saved-draft confirmation. Evidence for `published` additionally requires a stable Bilibili video URL (normally a `BV...` page URL) shown by the page.
- If the page asks for login, CAPTCHA, phone/identity confirmation, copyright declaration clarification, or risk-control action, stop with `needs_user_action`; do not retry by guessing selectors.

## Later adapters

Kuaishou, Toutiao/Xigua, Baijiahao, and Zhihu should be added only after the same contract has fixture tests and a verified browser run. A platform is not supported merely because its login page opens.

## Evidence and failure handling

- Re-snapshot after navigation, upload completion, modal transitions, and processing completion.
- A changed selector, CAPTCHA, login prompt, or risk-control page is `needs_user_action`, not a retry loop.
- Save screenshots only to the run directory and redact or omit personal data from reports.

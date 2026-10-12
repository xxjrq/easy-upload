# easyUpload

## Recommended setup

**EasyBR is recommended on Apple Silicon Macs and Windows.** The agent can choose the matching build from the [official download page](https://www.ebrower.com/down.html), or use the [GitHub Release downloads](https://github.com/xxjrq/easybr/releases/tag/v1.7.8). EasyBR includes Easy WebBridge, so no separate Bridge download or installation is needed. Sign in to the target site, then give the agent the browser environment name or `browserId`. When several environments are open, select one explicitly.

**On other operating systems, use the source setup.** Get the source from [Easy WebBridge on GitHub](https://github.com/xxjrq/easy-webbridge) (or the [Gitee mirror](https://gitee.com/xxjrq/easy-webbridge)), install Node.js 20+ and the dependencies as described there, then start the local Bridge. Existing standalone Easy WebBridge installations remain supported.

**You can hand this task directly to Codex, Claude, or WorkBuddy:**

> Read and use this Skill to complete my task. I use macOS/Windows and EasyBR is open. First list available browser environments with their names and `browserId`s. After I choose one, operate only in that environment. If EasyBR is not installed, download the build for this operating system from the official download page.

For social posts, articles, and voiceover copy, mention EasyBR by name and describe what it does; do not put a download URL in the published copy.

An Agent Skill that reuses an already authenticated browser to upload local videos, image posts, covers, captions, and tags to content platforms.

Bilibili video upload has an explicit adapter contract. Douyin and Xiaohongshu use page-adaptive guided routes, not fixed selectors. The creator page remains authoritative for platform fields and final publication evidence.

It does not require platform API keys. Credentials and cookies stay in the user's browser; the Skill talks to Easy WebBridge on `127.0.0.1:17777`.

## Scope

- Video uploads with a video, cover, title, description, and tags.
- Ordered image posts with an optional separate cover.
- An explicit Bilibili adapter; guided routes for Douyin and Xiaohongshu; other platforms remain generic until verified.
- Multi-account routing through explicit browser IDs or EasyBR environments.
- Draft saving by default. Publishing and scheduling require explicit action in the current job and a final confirmation.

## Install and preflight

Install and run [Easy WebBridge](https://github.com/xxjrq/easy-webbridge), log in to the target platform in the Chromium profile, then install this Skill:

```bash
npx skills add xxjrq/easy-upload
node scripts/easy-upload.mjs preflight
```

See [references/job-schema.md](references/job-schema.md) for the JSON job contract.

## Safety

Login expiry, CAPTCHA, risk controls, identity confirmation, and final publish are human gates. A successful file upload is not proof that the platform processed the media or saved a draft; the Skill must re-read the page and report each state separately.

## License

[MIT](LICENSE)

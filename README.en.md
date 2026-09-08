# easyUpload

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

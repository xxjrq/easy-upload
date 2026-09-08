# Upload Job Schema

The public contract is JSON so it works without a package-specific dependency. Agents may accept natural language and must normalize it to this shape before browser actions.

To upload a selfmedia release package, use this source-only form and keep the same target contract:

```json
{
  "source": {
    "type": "selfmedia-release",
    "directory": "/absolute/path/to/发布成品"
  },
  "targets": [{ "platform": "douyin", "account": "main", "action": "draft-only" }]
}
```

The adapter reads the current five-file video package or numbered image-post package and converts it to the public contract. It does not update the content workbench or modify source files.

```json
{
  "content": {
    "type": "video",
    "media": "/absolute/path/video.mp4",
    "cover": "/absolute/path/cover.png",
    "title": "一个标题",
    "description": "正文和行动引导",
    "tags": ["AI工具", "效率"]
  },
  "targets": [
    {
      "platform": "douyin",
      "account": "main",
      "action": "draft-only"
    }
  ]
}
```

## Required fields

- `content.type`: `video` or `image-post`.
- `content.media`: a string for video or a non-empty ordered array for image posts.
- `content.title`: non-empty string. Platform-specific length checks happen in the adapter.
- `content.description`: string; an empty description is allowed only when the platform supports it.
- `targets`: one or more targets with `platform` and `account`.

## Optional fields

- `content.cover`: a local image path.
- `content.tags`: ordered strings without a leading `#`; the adapter applies platform formatting.
- `content.visibility`: platform-supported visibility value.
- `target.action`: `draft-only` (default), `publish`, or `schedule`.
- `target.publishAt`: ISO 8601 timestamp required for `schedule`.
- `target.overrides`: platform-specific values such as category, original-content declaration, or source label.
- `runId`: a stable caller-provided idempotency key.

For Bilibili video targets, `target.overrides` may carry `title`, `description`, `tags`, `category`, and `originalDeclaration`. The browser page still controls the final partition and declaration options; missing legal or distribution fields must not be guessed.

## Safety rules

- Paths must be absolute or resolve relative to the job file and must be regular files.
- Do not place credentials, cookies, access tokens, or browser IDs in the job file. Browser IDs are selected at runtime and only referenced by account alias in receipts.
- Do not silently reuse one target's account for another target.
- `publish` and `schedule` require an explicit action in the current job; an old job file must not escalate a new `draft-only` request.

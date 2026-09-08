#!/usr/bin/env node

import { access, readFile, stat, readdir } from "node:fs/promises";
import { isAbsolute, resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PLATFORMS = new Set(["douyin", "xiaohongshu", "bilibili", "wechat-channels", "kuaishou", "toutiao", "zhihu"]);
const ACTIONS = new Set(["draft-only", "publish", "schedule"]);
const TYPES = new Set(["video", "image-post"]);

const PLATFORM_DEFINITIONS = {
  douyin: { contentTypes: ["video", "image-post"], titleMax: null, descriptionMax: null, tagMax: null },
  xiaohongshu: { contentTypes: ["video", "image-post"], titleMax: null, descriptionMax: null, tagMax: null },
  bilibili: {
    contentTypes: ["video"],
    titleMax: 80,
    descriptionMax: 2000,
    tagMax: 12,
    tagLengthMax: 20,
    creatorCenterUrl: "https://member.bilibili.com/platform/upload/video",
  },
  "wechat-channels": { contentTypes: ["video"], titleMax: null, descriptionMax: null, tagMax: null },
  kuaishou: { contentTypes: ["video", "image-post"], titleMax: null, descriptionMax: null, tagMax: null },
  toutiao: { contentTypes: ["video", "image-post"], titleMax: null, descriptionMax: null, tagMax: null },
  zhihu: { contentTypes: ["video", "image-post"], titleMax: null, descriptionMax: null, tagMax: null },
};

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function loadJson(path) {
  const absolute = resolve(path);
  let raw;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    fail("job-not-found", `Cannot read job file: ${absolute}`, { cause: error.code });
  }
  try {
    return { job: JSON.parse(raw), path: absolute };
  } catch (error) {
    fail("invalid-json", `Job file is not valid JSON: ${absolute}`, { cause: error.message });
  }
}

function string(value, name, { optional = false } = {}) {
  if (optional && value == null) return null;
  if (typeof value !== "string" || !value.trim()) fail("invalid-field", `${name} must be a non-empty string`);
  return value.trim();
}

function resolvePath(value, jobPath, name) {
  const raw = string(value, name);
  return isAbsolute(raw) ? raw : resolve(dirname(jobPath), raw);
}

async function checkFile(path, name, schemaOnly) {
  if (schemaOnly) return { path, exists: null };
  try {
    const info = await stat(path);
    if (!info.isFile()) fail("invalid-media", `${name} is not a regular file: ${path}`);
    if (info.size === 0) fail("invalid-media", `${name} is empty: ${path}`);
    return { path, exists: true, sizeBytes: info.size };
  } catch (error) {
    if (error.code === "ENOENT") fail("media-not-found", `${name} does not exist: ${path}`);
    throw error;
  }
}

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const body = text.slice(start + heading.length);
  const end = nextHeading ? body.indexOf(nextHeading) : -1;
  return (end < 0 ? body : body.slice(0, end)).trim();
}

function platformLine(text, platform) {
  const escaped = platform.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:\\d+[.、]\\s*)?${escaped}[：:]\\s*(.+)`, "m"));
  return match?.[1]?.trim() || "";
}

function platformTitleLine(text, platform) {
  return platformLine(text, `${platform}标题`);
}

function hashtags(text) {
  return [...text.matchAll(/#[^\s#]+/g)].map((match) => match[0]);
}

function platformDefinition(platform) {
  return PLATFORM_DEFINITIONS[platform] || { contentTypes: [...TYPES], titleMax: null, descriptionMax: null, tagMax: null };
}

function validatePlatformContent(platform, content, target, index) {
  const definition = platformDefinition(platform);
  if (!definition.contentTypes.includes(content.type)) {
    fail("unsupported-content", `${platform} does not support content.type: ${content.type}`, { target: index });
  }
  const overrides = target.overrides && typeof target.overrides === "object" ? target.overrides : {};
  const title = overrides.title == null ? content.title : string(overrides.title, `targets[${index}].overrides.title`);
  const description = overrides.description == null ? content.description : String(overrides.description);
  const tags = overrides.tags == null ? content.tags : normalizeTags(overrides.tags);
  if (definition.titleMax && [...title].length > definition.titleMax) {
    fail("platform-limit", `${platform} title exceeds ${definition.titleMax} Unicode characters`, { target: index, field: "title" });
  }
  if (definition.descriptionMax && [...description].length > definition.descriptionMax) {
    fail("platform-limit", `${platform} description exceeds ${definition.descriptionMax} Unicode characters`, { target: index, field: "description" });
  }
  if (definition.tagMax && tags.length > definition.tagMax) {
    fail("platform-limit", `${platform} accepts at most ${definition.tagMax} tags`, { target: index, field: "tags" });
  }
  if (definition.tagLengthMax && tags.some((tag) => [...tag].length > definition.tagLengthMax)) {
    fail("platform-limit", `${platform} tags must be at most ${definition.tagLengthMax} Unicode characters each`, { target: index, field: "tags" });
  }
}

async function selfmediaJob(source, jobPath) {
  const directory = resolve(dirname(jobPath), string(source.directory, "source.directory"));
  let names;
  try {
    names = new Set(await readdir(directory));
  } catch (error) {
    fail("selfmedia-invalid", `Cannot read selfmedia directory: ${directory}`, { cause: error.code });
  }
  const copyPath = join(directory, "00-发布文案.txt");
  const copy = await readFile(copyPath, "utf8").catch(() => fail("selfmedia-invalid", `Missing selfmedia copy: ${copyPath}`));
  const video = join(directory, "01-发布视频.mp4");
  const videoExists = names.has("01-发布视频.mp4");
  const imageFiles = [...names].filter((name) => /^\d+-图文-\d+-9比16\.png$/.test(name)).sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  const type = videoExists ? "video" : imageFiles.length > 0 ? "image-post" : fail("selfmedia-invalid", `No supported video or image files in ${directory}`);
  const titleBlock = section(copy, "=== 标题", "=== 描述") || section(copy, "三个可发布标题", "三个可发布描述");
  const descriptionBlock = section(copy, "=== 描述", "=== 话题/标签") || section(copy, "三个可发布描述", "话题/标签");
  const tagBlock = section(copy, "=== 话题/标签", "=== 图片顺序说明") || section(copy, "话题/标签", "完整配音文案时间线");
  const platformContent = {
    douyin: {
      title: platformTitleLine(titleBlock, "抖音"),
      description: section(descriptionBlock, "【抖音】", "【B站/视频号】").trim(),
      tags: platformLine(tagBlock, "抖音"),
    },
    bilibili: {
      title: platformTitleLine(titleBlock, "B站/视频号"),
      description: section(descriptionBlock, "【B站/视频号】", "【小红书】").trim(),
      tags: platformLine(tagBlock, "B站/视频号"),
    },
    xiaohongshu: {
      title: platformTitleLine(titleBlock, "小红书"),
      description: section(descriptionBlock, "【小红书】", null).trim(),
      tags: platformLine(tagBlock, "小红书"),
    },
  };
  const title = platformContent.douyin.title || platformContent.xiaohongshu.title || platformContent.bilibili.title;
  const description = platformContent.douyin.description || platformContent.xiaohongshu.description || platformContent.bilibili.description;
  const tagLine = platformContent.douyin.tags || platformContent.xiaohongshu.tags || platformContent.bilibili.tags || hashtags(tagBlock).join(" ");
  if (!title) fail("selfmedia-invalid", `Cannot parse a platform title from ${copyPath}`);
  const content = type === "video"
    ? { type, media: video, cover: join(directory, "02-竖封面-3比4.png"), title, description, tags: tagLine.split(/\s+/).filter(Boolean) }
    : { type, media: imageFiles.map((name) => join(directory, name)), cover: names.has("01-图文封面-9比16.png") ? join(directory, "01-图文封面-9比16.png") : null, title, description, tags: tagLine.split(/\s+/).filter(Boolean) };
  return { content, platformContent, sourceDirectory: directory };
}

function normalizeTags(tags) {
  if (tags == null) return [];
  if (!Array.isArray(tags)) fail("invalid-field", "content.tags must be an array");
  const seen = new Set();
  return tags.map((tag, index) => {
    const value = string(tag, `content.tags[${index}]`).replace(/^#+/, "");
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) fail("duplicate-tag", `Duplicate tag: ${value}`);
    seen.add(key);
    return value;
  });
}

async function normalizeJob(input, jobPath, { schemaOnly = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("invalid-job", "Job must be a JSON object");
  const imported = input.source?.type === "selfmedia-release" ? await selfmediaJob(input.source, jobPath) : null;
  const content = imported?.content || input.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) fail("invalid-field", "content is required");
  const type = string(content.type, "content.type");
  if (!TYPES.has(type)) fail("invalid-type", `Unsupported content.type: ${type}`);
  const mediaValues = type === "video" ? [content.media] : content.media;
  if (!Array.isArray(mediaValues) || mediaValues.length === 0) fail("invalid-field", "content.media must contain at least one file");
  const media = [];
  for (let index = 0; index < mediaValues.length; index += 1) {
    const path = resolvePath(mediaValues[index], jobPath, `content.media[${index}]`);
    media.push(await checkFile(path, `content.media[${index}]`, schemaOnly));
  }
  const cover = content.cover == null ? null : await checkFile(resolvePath(content.cover, jobPath, "content.cover"), "content.cover", schemaOnly);
  const title = string(content.title, "content.title");
  const description = content.description == null
    ? ""
    : typeof content.description === "string"
      ? content.description.trim()
      : fail("invalid-field", "content.description must be a string");
  if (!Array.isArray(input.targets) || input.targets.length === 0) fail("invalid-field", "targets must contain at least one target");
  const targets = input.targets.map((target, index) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) fail("invalid-target", `targets[${index}] must be an object`);
    const platform = string(target.platform, `targets[${index}].platform`).toLowerCase();
    if (!PLATFORMS.has(platform)) fail("unsupported-platform", `Unsupported platform: ${platform}`);
    const account = string(target.account, `targets[${index}].account`);
    const action = target.action == null ? "draft-only" : string(target.action, `targets[${index}].action`);
    if (!ACTIONS.has(action)) fail("invalid-action", `Unsupported action: ${action}`);
    const publishAt = target.publishAt == null ? null : string(target.publishAt, `targets[${index}].publishAt`);
    if (action === "schedule") {
      if (!publishAt || Number.isNaN(Date.parse(publishAt))) fail("invalid-schedule", `targets[${index}].publishAt must be an ISO timestamp`);
      if (Date.parse(publishAt) <= Date.now()) fail("invalid-schedule", `targets[${index}].publishAt must be in the future`);
    }
    if (action !== "schedule" && publishAt) fail("invalid-schedule", `publishAt is only valid with schedule: targets[${index}]`);
    const importedContent = imported?.platformContent?.[platform];
    const overrides = {
      ...(importedContent?.title ? { title: importedContent.title } : {}),
      ...(importedContent?.description ? { description: importedContent.description } : {}),
      ...(importedContent?.tags ? { tags: normalizeTags(importedContent.tags.split(/\s+/).filter(Boolean)) } : {}),
      ...(target.overrides || {}),
    };
    const normalizedTarget = { platform, account, action, ...(publishAt ? { publishAt } : {}), ...(Object.keys(overrides).length ? { overrides } : {}) };
    validatePlatformContent(platform, { type, title, description, tags: normalizeTags(content.tags) }, normalizedTarget, index);
    return normalizedTarget;
  });
  const runId = input.runId == null ? null : string(input.runId, "runId");
  return {
    schemaVersion: "1.0",
    ...(runId ? { runId } : {}),
    ...(imported ? { source: { type: "selfmedia-release", directory: imported.sourceDirectory } } : {}),
    content: { type, media, ...(cover ? { cover } : {}), title, description, tags: normalizeTags(content.tags) },
    targets,
  };
}

function plan(normalized) {
  return normalized.targets.map((target) => ({
    platform: target.platform,
    account: target.account,
    action: target.action,
    steps: [
      "select the explicit Easy WebBridge browser/account mapping",
      "create a namespaced task session",
      `upload ${normalized.content.type === "video" ? "the video" : `${normalized.content.media.length} ordered images`}`,
      "wait for platform processing and re-snapshot",
      "fill title, description, tags, cover, and platform-required fields",
      ...(target.platform === "bilibili" ? ["select the current partition, original/转载 declaration, visibility, and any platform-required fields"] : []),
      target.action === "draft-only" ? "verify and save draft" : target.action === "schedule" ? "verify schedule summary and request confirmation before scheduling" : "verify publish summary and request confirmation before publishing",
    ],
  }));
}

async function selfTest() {
  const jobPath = resolve(ROOT, "fixtures/jobs/video.json");
  const { job, path } = await loadJson(jobPath);
  const normalized = await normalizeJob(job, path, { schemaOnly: true });
  if (normalized.targets[0].action !== "draft-only") fail("self-test", "default action was not draft-only");
  if (plan(normalized).length !== 2) fail("self-test", "expected two targets in video fixture");
  const image = await loadJson(resolve(ROOT, "fixtures/jobs/image-post.json"));
  const imageNormalized = await normalizeJob(image.job, image.path, { schemaOnly: true });
  if (imageNormalized.content.media.length !== 2) fail("self-test", "image fixture order was not preserved");
  let duplicateFailed = false;
  try {
    await normalizeJob({ ...job, content: { ...job.content, tags: ["same", "#same"] } }, path, { schemaOnly: true });
  } catch (error) {
    duplicateFailed = error.code === "duplicate-tag";
  }
  if (!duplicateFailed) fail("self-test", "duplicate tags were accepted");
  const bilibili = await normalizeJob({
    content: {
      type: "video",
      media: "/tmp/demo.mp4",
      title: "B站上传验收",
      description: "用于验证 B 站视频字段。",
      tags: ["GitHub", "开源工具"],
    },
    targets: [{ platform: "bilibili", account: "自媒体", action: "draft-only", overrides: { category: "知识" } }],
  }, jobPath, { schemaOnly: true });
  if (bilibili.targets[0].platform !== "bilibili" || !plan(bilibili)[0].steps.some((step) => step.includes("partition"))) {
    fail("self-test", "bilibili adapter plan was not generated");
  }
  let imageRejected = false;
  try {
    await normalizeJob({
      content: { type: "image-post", media: ["/tmp/a.png"], title: "B站图文", description: "", tags: [] },
      targets: [{ platform: "bilibili", account: "自媒体" }],
    }, jobPath, { schemaOnly: true });
  } catch (error) {
    imageRejected = error.code === "unsupported-content";
  }
  if (!imageRejected) fail("self-test", "bilibili accepted an image-post target");
  let titleRejected = false;
  try {
    await normalizeJob({
      content: { type: "video", media: "/tmp/a.mp4", title: "长".repeat(81), description: "", tags: [] },
      targets: [{ platform: "bilibili", account: "自媒体" }],
    }, jobPath, { schemaOnly: true });
  } catch (error) {
    titleRejected = error.code === "platform-limit";
  }
  if (!titleRejected) fail("self-test", "bilibili title limit was not enforced");
  output({ ok: true, tests: ["video-schema", "image-order", "draft-default", "duplicate-tags", "bilibili-video-only", "bilibili-fields", "bilibili-title-limit"] });
}

async function main() {
  const [command, argument, ...flags] = process.argv.slice(2);
  if (command === "self-test") return selfTest();
  if (command === "platforms") return output(Object.fromEntries(Object.entries(PLATFORM_DEFINITIONS).map(([platform, definition]) => [platform, { ...definition, status: platform === "bilibili" ? "adapter-ready" : ["douyin", "xiaohongshu"].includes(platform) ? "guided-route" : "generic-route" }])));
  if (command === "preflight") {
    const script = resolve(ROOT, "scripts/easy-webbridge-client.mjs");
    const { spawn } = await import("node:child_process");
    const child = spawn(process.execPath, [script, "preflight"], { stdio: "inherit" });
    return new Promise((resolvePromise) => child.on("exit", (code) => { process.exitCode = code ?? 1; resolvePromise(); }));
  }
  if (!["validate", "normalize", "plan"].includes(command) || !argument) fail("usage", "Usage: easy-upload.mjs validate|normalize|plan <job.json> [--schema-only] or platforms");
  const { job, path } = await loadJson(argument);
  const normalized = await normalizeJob(job, path, { schemaOnly: flags.includes("--schema-only") });
  if (command === "validate") return output({ ok: true, job: normalized });
  if (command === "normalize") return output(normalized);
  return output({ ok: true, runId: normalized.runId || null, actions: plan(normalized) });
}

main().catch((error) => {
  output({ ok: false, code: error.code || "error", error: error.message, ...(error.details || {}) });
  process.exitCode = 1;
});

#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.EASY_WEBBRIDGE_URL || "http://127.0.0.1:17777";

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function token() {
  if (process.env.EASY_WEBBRIDGE_TOKEN) return process.env.EASY_WEBBRIDGE_TOKEN;
  try {
    return (await readFile(join(homedir(), ".easy-webbridge", "bridge-token"), "utf8")).trim();
  } catch {
    throw new Error("Easy WebBridge token not found; install and pair the runtime first.");
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Easy WebBridge HTTP ${response.status}`);
  return body;
}

async function command(browserId, action, args = {}) {
  if (!browserId) throw new Error("browserId is required");
  return request(`/v1/browsers/${encodeURIComponent(browserId)}/commands`, {
    method: "POST",
    body: JSON.stringify({ action, args }),
  });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function main() {
  const [verb, ...args] = process.argv.slice(2);
  if (verb === "preflight") {
    const health = await fetch(`${baseUrl}/health`).then((response) => response.ok ? response.json() : null).catch(() => null);
    if (!health?.ok) throw new Error(`Easy WebBridge is not running at ${baseUrl}`);
    const result = await request("/v1/browsers");
    return print({ ok: true, runtime: { url: baseUrl, service: health.service }, browsers: (result.browsers || []).filter((item) => item.online).map((item) => ({ browserId: item.browserId, name: item.displayName || item.name || item.browserId, platform: item.platform || null })) });
  }
  if (verb === "list") return print(await request("/v1/browsers"));
  const browserId = args[0];
  if (["snapshot", "screenshot"].includes(verb)) return print(await command(browserId, verb, args[1] ? { tabId: Number(args[1]) } : {}));
  if (verb === "navigate") {
    const url = args[1];
    if (!url) throw new Error("navigate requires a URL");
    const session = valueAfter(args, "--session");
    const groupTitle = valueAfter(args, "--group-title");
    return print(await command(browserId, "navigate", { url, newTab: args.includes("--new-tab"), ...(session ? { session } : {}), ...(groupTitle ? { groupTitle } : {}) }));
  }
  if (verb === "click" || verb === "fill") {
    const selector = args[1];
    if (!selector) throw new Error(`${verb} requires a selector`);
    const payload = { selector, ...(verb === "fill" ? { value: args[2] } : {}), ...(args.at(-1) && /^\d+$/.test(args.at(-1)) ? { tabId: Number(args.at(-1)) } : {}) };
    return print(await command(browserId, verb, payload));
  }
  if (verb === "upload") {
    const selector = args[1];
    const files = args.slice(2).filter((value) => !/^\d+$/.test(value));
    if (!selector || files.length === 0) throw new Error("upload requires a selector and at least one absolute file");
    return print(await command(browserId, "upload", { selector, files }));
  }
  if (verb === "close-session") return print(await command(browserId, "close_session", { session: args[1] }));
  if (verb === "command") return print(await command(browserId, args[1], JSON.parse(args[2] || "{}")));
  throw new Error("Usage: easy-webbridge-client.mjs preflight|list|navigate|snapshot|click|fill|upload|close-session|command");
}

main().catch((error) => {
  print({ ok: false, error: error.message });
  process.exitCode = 1;
});

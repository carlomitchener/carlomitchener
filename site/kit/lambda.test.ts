import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lambda, modules, type Get, type Head, type Wake } from "./lambda.ts";

/* FIXTURES */

const SHA = "0123456789abcdef0123456789abcdef01234567";
const SHELF = "fedcba9876543210fedcba9876543210fedcba98";
const HOLD = mkdtempSync(join(tmpdir(), "head-"));

process.env.SHELF_REPO = "owner/shelf";

const had = process.env.DRY_DIR;
delete process.env.DRY_DIR;

const net = lambda({
  source: "owner/net",
  head: "build/net/head",
  dir: "/tmp/net",
  agent: "net-builder",
  bucket: "NET_BUCKET",
  folder: "site",
  shelf: "SHELF_REPO",
  sources: ["push", "schedule", "automator", "manual"],
  local: join(HOLD, "net"),
});

const shop = lambda({
  source: "owner/shop",
  head: "data/build/head",
  dir: "/tmp/shop",
  agent: "shop-builder",
  bucket: "SHOP_BUCKET",
  folder: "site",
  local: join(HOLD, "shop"),
  hash: () => "d0",
});

if (had) process.env.DRY_DIR = had;

const stored: Head = { sha: "aaaaaaabbbbbbbcccccccdddddddeeeeeeefffff", etag: "old", shelf: SHELF, shelfEtag: "shelf-old", data: "" };

const reply = (body: unknown, opts: { ok?: boolean; status?: number; etag?: string } = {}) => ({
  ok: opts.ok ?? true,
  status: opts.status ?? 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
  headers: { get: (name: string) => (name === "etag" ? (opts.etag ?? null) : null) },
});

const github = (plan: { compare?: string; code?: number; poll?: number; sha?: string; etag?: string }): Get => async (url) => {
  if (url.includes("/compare/")) return plan.compare ? reply({ status: plan.compare }) : reply({}, { ok: false, status: plan.code ?? 404 });
  if (plan.poll === 304) return reply({}, { ok: false, status: 304 });
  return reply({ sha: plan.sha }, { etag: plan.etag });
};

const wake = (on: Wake["on"], sha: string): Wake => ({ source: "push", on, sha });

/* EVENT */

test("the payload parser reads a schedule tick and both push wakes", () => {
  expect(net.readEvent(JSON.stringify({ source: "schedule" }))).toEqual({ source: "schedule", on: "", sha: "" });
  expect(net.readEvent(JSON.stringify({ source: "push", repo: "owner/net", sha: SHA }))).toEqual({ source: "push", on: "source", sha: SHA });
  expect(net.readEvent(JSON.stringify({ source: "push", repo: "owner/shelf", sha: SHA }))).toEqual({ source: "push", on: "shelf", sha: SHA });
});

test("the payload parser survives junk, an unknown source and a source word the site does not take", () => {
  expect(net.readEvent("")).toEqual({ source: "", on: "", sha: "" });
  expect(net.readEvent("not json")).toEqual({ source: "", on: "", sha: "" });
  expect(net.readEvent(JSON.stringify({ source: "nonsense", repo: "owner/net" }))).toEqual({ source: "", on: "source", sha: "" });
  expect(shop.readEvent(JSON.stringify({ source: "automator", repo: "owner/shop" }))).toEqual({ source: "", on: "source", sha: "" });
});

test("the payload parser keeps a good sha, lowercases it and drops a malformed one", () => {
  const pin = (sha: string) => net.readEvent(JSON.stringify({ source: "manual", repo: "owner/net", sha })).sha;
  expect(pin(SHA)).toBe(SHA);
  expect(pin(SHA.toUpperCase())).toBe(SHA);
  expect(pin("nope")).toBe("");
  expect(pin("../../x/y/tar.gz/main")).toBe("");
  expect(pin(`${SHA}0`)).toBe("");
});

test("a sha with no repo, or another repo's, names no target", () => {
  expect(net.readEvent(JSON.stringify({ body: JSON.stringify({ source: "manual", sha: SHA }) }))).toEqual({ source: "manual", on: "", sha: SHA });
  expect(net.readEvent(JSON.stringify({ source: "push", repo: "owner/fork", sha: SHA }))).toEqual({ source: "push", on: "", sha: SHA });
});

/* GITHUB */

test("the ancestor check accepts a sha main is ahead of or identical to", async () => {
  expect(await net.onMain("owner/net", SHA, github({ compare: "ahead" }))).toBe(true);
  expect(await net.onMain("owner/shelf", SHA, github({ compare: "identical" }))).toBe(true);
});

test("the ancestor check refuses another status, a refused compare and a dead fetch", async () => {
  expect(await net.onMain("owner/net", SHA, github({ compare: "behind" }))).toBe(false);
  expect(await net.onMain("owner/net", SHA, github({ compare: "diverged" }))).toBe(false);
  expect(await net.onMain("owner/net", SHA, github({ code: 403 }))).toBe(false);
  expect(
    await net.onMain("owner/net", SHA, async () => {
      throw new Error("getaddrinfo ENOTFOUND api.github.com");
    }),
  ).toBe(false);
});

/* PLAN */

test("a wake for a sha already built is a no-op, and an unfinished head never answers seen", () => {
  const done: Head = { ...stored, sha: SHA };
  expect(net.seen(wake("source", SHA), done)).toBe(SHA.slice(0, 7));
  expect(net.seen(wake("shelf", SHELF), done)).toBe(`shelf ${SHELF.slice(0, 7)}`);
  expect(net.seen(wake("source", SHA), { ...done, shelf: "" })).toBe("");
  expect(net.seen(wake("source", SHA), { ...done, sha: "" })).toBe("");
});

test("a site with a data hash never answers seen, because the data moves without the sha", () => {
  expect(shop.seen(wake("source", SHA), { ...stored, sha: SHA, data: "d0" })).toBe("");
});

test("a sha wake stores an empty etag", async () => {
  const out = await net.freshen(wake("source", SHA), stored, github({ compare: "ahead", sha: "polled", etag: "fresh" }));
  expect(out.sha).toBe(SHA);
  expect(out.etag).toBe("");
});

test("a sha with no repo beside it falls to the etag poll", async () => {
  const out = await net.freshen(wake("", SHA), stored, github({ compare: "ahead", sha: "polled", etag: "fresh" }));
  expect(out.sha).toBe("polled");
  expect(out.etag).toBe("fresh");
});

test("a refused compare falls to the etag poll", async () => {
  const out = await net.freshen(wake("source", SHA), stored, github({ code: 403, sha: "polled", etag: "fresh" }));
  expect(out.sha).toBe("polled");
});

test("a 304 from the etag poll keeps the stored mark", async () => {
  const out = await net.freshen({ source: "schedule", on: "", sha: "" }, stored, github({ poll: 304 }));
  expect(out).toEqual(stored);
});

/* HEAD */

test("the head file carries only the lines the site uses", async () => {
  await net.writeHead(null, { sha: SHA, etag: "e", shelf: SHELF, shelfEtag: "se", data: "ignored" });
  expect(readFileSync(join(HOLD, "net", "head"), "utf8")).toBe(`${SHA}\ne\n${SHELF}\nse\n`);
  expect(await net.readHead(null)).toEqual({ sha: SHA, etag: "e", shelf: SHELF, shelfEtag: "se", data: "" });
  await shop.writeHead(null, { sha: SHA, etag: "e", shelf: "no", shelfEtag: "no", data: "d0" });
  expect(readFileSync(join(HOLD, "shop", "head"), "utf8")).toBe(`${SHA}\ne\nd0\n`);
  expect(await shop.readHead(null)).toEqual({ sha: SHA, etag: "e", shelf: "", shelfEtag: "", data: "d0" });
});

/* MODULES */

test("the modules step takes the layer only when it holds this lockfile", () => {
  const site = mkdtempSync(join(tmpdir(), "site-"));
  const layer = mkdtempSync(join(tmpdir(), "layer-"));
  writeFileSync(join(site, "bun.lock"), "lock");
  expect(modules(site, layer)).toBe("absent");
  writeFileSync(join(layer, "bun.lock.sha256"), "nope\n");
  expect(modules(site, layer)).toBe("stale");
  writeFileSync(join(layer, "bun.lock.sha256"), `${new Bun.CryptoHasher("sha256").update("lock").digest("hex")}\n`);
  expect(modules(site, layer)).toBe("layer");
});

import { expect, test } from "bun:test";
import { onMain, readEvent, SOURCE } from "./site.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";

const says = (status: string) => async () => ({ ok: true, status: 200, json: async () => ({ status }) });
const code = (status: number) => async () => ({ ok: false, status, json: async () => ({}) });
const dead = async () => {
  throw new Error("getaddrinfo ENOTFOUND api.github.com");
};

test("the payload parser keeps a good sha and drops a malformed one", () => {
  const pin = (sha: string) => readEvent(JSON.stringify({ source: "manual", repo: SOURCE, sha })).sha;
  expect(pin(SHA)).toBe(SHA);
  expect(pin("nope")).toBe("");
  expect(pin("../../x/y/tar.gz/main")).toBe("");
  expect(pin(SHA.toUpperCase())).toBe("");
  expect(pin(`${SHA}0`)).toBe("");
});

test("the payload parser ignores a sha sent for another repo", () => {
  expect(readEvent(JSON.stringify({ source: "push", repo: "someone/fork", sha: SHA })))
    .toEqual({ source: "push", on: "", sha: "" });
  expect(readEvent(JSON.stringify({ source: "push", sha: SHA }))).toEqual({ source: "push", on: "", sha: "" });
});

test("the payload parser survives junk and an unknown source", () => {
  expect(readEvent("")).toEqual({ source: "", on: "", sha: "" });
  expect(readEvent("not json")).toEqual({ source: "", on: "", sha: "" });
  expect(readEvent(JSON.stringify({ source: "nonsense", repo: SOURCE }))).toEqual({ source: "", on: "source", sha: "" });
});

test("the ancestor check accepts a sha main is ahead of or identical to", async () => {
  expect(await onMain(SHA, says("ahead"))).toBe(true);
  expect(await onMain(SHA, says("identical"))).toBe(true);
});

test("the ancestor check refuses another status, an unknown sha and a dead fetch", async () => {
  expect(await onMain(SHA, says("behind"))).toBe(false);
  expect(await onMain(SHA, says("diverged"))).toBe(false);
  expect(await onMain(SHA, code(404))).toBe(false);
  expect(await onMain(SHA, dead)).toBe(false);
});

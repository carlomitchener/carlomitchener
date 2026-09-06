import hashlib
import os

from common import (
    APEX, BUCKET, DIST_DIR, SITE_DIR, aws, env, gate, guard_bucket, maybe, say, stream, verb, verdict,
)

# PLAN

PREFIX = f"s3://{BUCKET}/site"
ART = "art/*"
HASHED = ["ui/*", "js/*", "mark.png", "favicon.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]
IMMUTABLE = "public, max-age=31536000, immutable"
FRESH = "max-age=0, must-revalidate"

def first(dry):
    cmd = ["aws", "s3", "sync", DIST_DIR, PREFIX, "--exclude", ART, "--exclude", "*"]
    for pattern in HASHED:
        cmd += ["--include", pattern]
    cmd += ["--cache-control", IMMUTABLE]
    if dry: cmd.append("--dryrun")
    return cmd

def second(dry):
    cmd = ["aws", "s3", "sync", DIST_DIR, PREFIX, "--delete", "--exclude", ART]
    for pattern in HASHED:
        cmd += ["--exclude", pattern]
    cmd += ["--cache-control", FRESH]
    if dry: cmd.append("--dryrun")
    return cmd

MANIFEST = os.path.join(DIST_DIR, "manifest.webmanifest")
MANIFEST_TYPE = "application/manifest+json"

def stale():
    if not os.path.exists(MANIFEST): return False
    found = maybe("s3api", "head-object", "--bucket", BUCKET, "--key", "site/manifest.webmanifest")
    if not found: return True
    if found.get("ContentType") != MANIFEST_TYPE: return True
    with open(MANIFEST, "rb") as handle:
        local = hashlib.md5(handle.read()).hexdigest()
    return found.get("ETag", "").strip('"') != local

def fixup(dry):
    cmd = [
        "aws", "s3", "cp", os.path.join(DIST_DIR, "manifest.webmanifest"),
        f"{PREFIX}/manifest.webmanifest",
        "--content-type", MANIFEST_TYPE,
        "--cache-control", FRESH,
    ]
    if dry: cmd.append("--dryrun")
    return cmd

# VERBS

def ready():
    if not os.path.isdir(DIST_DIR):
        raise SystemExit("refuse: site/dist is missing, run deploy.py build --yes")
    guard_bucket(BUCKET)

def build():
    if not gate("build the site", [f"bun run build in {SITE_DIR}", f"writes {DIST_DIR}"]): return
    kit = env("MRLYJS")
    if kit: say(f"kit from {kit}")
    stream("bun", "run", "build", cwd=SITE_DIR)

def plan():
    ready()
    say(f"PLAN two dry runs into {PREFIX}, both excluding {ART}")
    for cmd in (first(True), second(True)):
        stream(*cmd)
    verdict(True, "manifest", "would be re-typed" if stale() else "already application/manifest+json")

def push():
    ready()
    if not gate("push the site", [
        f"sync hashed assets into {PREFIX} with {IMMUTABLE}",
        f"sync the rest into {PREFIX} with {FRESH} and --delete",
        f"both passes exclude {ART}",
    ]): return
    for cmd in (first(False), second(False)):
        stream(*cmd)
    if stale(): stream(*fixup(False))
    say(f"pushed {DIST_DIR} to {PREFIX}")

def status():
    ready()
    local = sum(len(files) for _, _, files in os.walk(DIST_DIR))
    verdict(local > 0, "dist", f"{local} files in site/dist")
    listing = aws("s3api", "list-objects-v2", "--bucket", BUCKET, "--prefix", "site/", "--query", "length(Contents)")
    verdict(bool(listing), "bucket", f"{listing or 0} objects under site/")
    art = aws("s3api", "list-objects-v2", "--bucket", BUCKET, "--prefix", "site/art/", "--query", "length(Contents)")
    verdict(True, "art", f"{art or 0} objects under site/art/, never touched by push")
    say(f"proof         curl -I https://{APEX}/")

VERBS = {"build": build, "plan": plan, "push": push, "status": status}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()

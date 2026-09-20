import base64
import hashlib
import os

from env import SHOP_DIR, gate, say, verb
from shopify import graphql, token

THEME_DIR = os.path.join(SHOP_DIR, "theme")
NAME = "theme"
TEXT = (".liquid", ".json", ".js", ".css", ".svg", ".txt")
PAGE = 50

# QUERIES

THEMES = """
query {
    themes(first: 50) {
        nodes { id name role }
    }
}
"""

FILES = """
query($id: ID!, $cursor: String) {
    theme(id: $id) {
        files(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { filename checksumMd5 }
        }
    }
}
"""

UPSERT = """
mutation($id: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $id, files: $files) {
        upsertedThemeFiles { filename }
        userErrors { filename code message }
    }
}
"""

DELETE = """
mutation($id: ID!, $files: [String!]!) {
    themeFilesDelete(themeId: $id, files: $files) {
        deletedThemeFiles { filename }
        userErrors { filename code message }
    }
}
"""

PUBLISH = """
mutation($id: ID!) {
    themePublish(id: $id) {
        theme { id name role }
        userErrors { field message }
    }
}
"""

# THEME

def themes(access):
    return graphql(access, THEMES)["themes"]["nodes"]

def find(access):
    for node in themes(access):
        if node["name"] == NAME: return node
    raise SystemExit(f"refuse: no theme named {NAME} on the shop; run `theme list`")

def remote(access, theme):
    sums = {}
    cursor = None
    while True:
        page = graphql(access, FILES, {"id": theme["id"], "cursor": cursor})["theme"]["files"]
        for node in page["nodes"]: sums[node["filename"]] = node["checksumMd5"] or ""
        if not page["pageInfo"]["hasNextPage"]: break
        cursor = page["pageInfo"]["endCursor"]
    return sums

def local():
    files = {}
    for root, _, names in os.walk(THEME_DIR):
        for name in sorted(names):
            path = os.path.join(root, name)
            files[os.path.relpath(path, THEME_DIR)] = path
    return files

def body(path):
    if path.endswith(TEXT):
        with open(path) as handle:
            return {"type": "TEXT", "value": handle.read()}
    with open(path, "rb") as handle:
        return {"type": "BASE64", "value": base64.b64encode(handle.read()).decode()}

def md5(path):
    with open(path, "rb") as handle:
        return hashlib.md5(handle.read()).hexdigest()

def compare(access, theme):
    files = local()
    sums = remote(access, theme)
    changed = [name for name, path in files.items() if sums.get(name) != md5(path)]
    stale = [name for name in sums if name not in files]
    return files, changed, stale

def errors(result):
    for error in result["userErrors"]:
        say(f"  {error.get('filename') or error.get('field')} {error['message']}")
    return bool(result["userErrors"])

# LIST

def list_():
    for node in themes(token()):
        say(f"  {node['role']:12} {node['name']}  {node['id']}")

# STATUS

def status():
    access = token()
    theme = find(access)
    files, changed, stale = compare(access, theme)
    for name in changed: say(f"  changed {name}")
    for name in stale: say(f"  stale {name}")
    if not changed and not stale:
        say(f"{theme['name']} ({theme['role']}) holds every file in theme/, {len(files)} files")
        return
    say(f"{theme['name']} ({theme['role']}) is behind theme/: {len(changed)} to push, {len(stale)} to remove")
    raise SystemExit(1)

# PUSH

def push():
    access = token()
    theme = find(access)
    files, changed, stale = compare(access, theme)
    if not changed and not stale:
        say(f"{theme['name']} ({theme['role']}) already holds every file in theme/, nothing to push")
        return
    if not gate("theme push", [
        f"upsert {len(changed)} changed files from theme/ into {theme['name']} ({theme['role']}) {theme['id']}",
        f"delete {len(stale)} files that are on the shop but not in theme/",
    ]): return
    names = sorted(changed)
    for start in range(0, len(names), PAGE):
        chunk = [{"filename": name, "body": body(files[name])} for name in names[start:start + PAGE]]
        result = graphql(access, UPSERT, {"id": theme["id"], "files": chunk})["themeFilesUpsert"]
        if errors(result): raise SystemExit("push failed")
        for name in names[start:start + PAGE]: say(f"  up {name}")
    if stale:
        result = graphql(access, DELETE, {"id": theme["id"], "files": stale})["themeFilesDelete"]
        if errors(result): raise SystemExit("delete failed")
        for name in stale: say(f"  rm {name}")
    say(f"{len(names)} files pushed, {len(stale)} removed")

# PUBLISH

def publish():
    access = token()
    theme = find(access)
    if theme["role"] == "MAIN":
        say(f"{theme['name']} is already live")
        return
    if not gate("theme publish", [
        f"make {theme['name']} {theme['id']} the live theme; the current one steps down to unpublished",
    ]): return
    result = graphql(access, PUBLISH, {"id": theme["id"]})["themePublish"]
    if errors(result): raise SystemExit("publish failed")
    say(f"{theme['name']} is live")

# MAIN

VERBS = {
    "list": list_,
    "status": status,
    "push": push,
    "publish": publish,
}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()

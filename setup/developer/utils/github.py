import fnmatch
import glob
import os
import subprocess
import sys
from datetime import datetime

# SETUP

OWNERS = {"<you>"}

MAX_MB = 25

SECRETS = (".env", ".env.*", "*.env", ".dev.vars", ".dev.vars.*")

UTILS = os.path.dirname(os.path.abspath(__file__))

BACKUP = os.path.join(os.path.dirname(UTILS), "private", "backup")

BASE = os.path.dirname(os.path.dirname(os.path.dirname(UTILS)))

ENV = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}

CONFLICT = "this Mac and GitHub changed the same lines; nothing is lost. Open Claude here and say: push had a conflict"

# REPOS

class Repo:
    def __init__(self, owner, name):
        self.folder = f"{owner}/{name}"
        self.dir = os.path.join(BASE, owner, name)
        self.mine = owner in OWNERS
        self.url = out(self, "remote", "get-url", "origin") if os.path.exists(os.path.join(self.dir, ".git")) else ""

def repos():
    for git_dir in sorted(glob.glob(os.path.join(BASE, "*", "*", ".git"))):
        yield Repo(*os.path.relpath(os.path.dirname(git_dir), BASE).split(os.sep))

def pick(token):
    hits = [repo for repo in repos() if token in (repo.folder, repo.folder.split("/")[1])]
    if len(hits) != 1:
        sys.exit(f"'{token}' matches {', '.join(repo.folder for repo in hits) or 'no repo'}; type github for the list")
    return hits[0]

# HELPERS

def run(cwd, *cmd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, stdin=subprocess.DEVNULL, env=ENV)

def git(repo, *args):
    return run(repo.dir, "git", *args)

def ok(repo, *args):
    return git(repo, *args).returncode == 0

def out(repo, *args):
    return git(repo, *args).stdout.strip()

def why(result):
    lines = (result.stderr.strip() or result.stdout.strip() or "failed").splitlines()
    return ([line for line in lines if line.startswith(("error:", "fatal:"))] or lines)[-1]

def say(repo, text, code=0):
    print(f"{repo.folder}: {text}")
    return code

def gh(repo, done, *args):
    result = run(repo.dir, "gh", *args)
    return say(repo, why(result), 1) if result.returncode else say(repo, done)

def risky(name, size):
    base = os.path.basename(name).lower()
    if name.split("/")[0] == "private":
        return "private"
    if any(fnmatch.fnmatch(base, pattern) for pattern in SECRETS) and not base.endswith(".example"):
        return "a secrets file"
    if size > MAX_MB * 2**20:
        return f"over {MAX_MB} MB"

def skip(repo, name):
    path = os.path.join(repo.dir, name)
    if os.path.exists(os.path.join(path, ".git")):
        return "it's a separate repo"
    return risky(name, os.lstat(path).st_size)

def leaks(repo):
    listed = git(repo, "rev-list", "--objects", "HEAD", "--not", "--remotes=origin").stdout
    checked = subprocess.run(["git", "cat-file", "--batch-check=%(objecttype) %(objectsize) %(rest)"], cwd=repo.dir, input=listed, capture_output=True, text=True, env=ENV).stdout
    blobs = [line.split(" ", 2) for line in checked.splitlines() if line.startswith("blob ")]
    return [f"{path} ({reason})" for _, size, path in blobs if (reason := risky(path, int(size)))]

def stage(repo):
    result = git(repo, "add", "-A", "--ignore-errors")
    if result.returncode:
        say(repo, f"some files could not be saved: {why(result)}")
    skipped = []
    for name in filter(None, git(repo, "diff", "--cached", "--no-renames", "-z", "--name-only", "--diff-filter=AMT").stdout.split("\0")):
        if reason := skip(repo, name):
            skipped.append(name)
            say(repo, f"skipped {name} ({reason})")
    if skipped:
        git(repo, "--literal-pathspecs", "reset", "-q", "--", *skipped)

def ready(repo):
    if not repo.url:
        return say(repo, f"not on GitHub yet: github new {repo.folder}", 1)
    if out(repo, "branch", "--show-current") != "main" or out(repo, "ls-files", "-u"):
        return say(repo, "not on main, or a merge is half done; nothing touched, ask Claude", 1)
    return 0

# COMMANDS

def status(repo):
    if not repo.url:
        return say(repo, f"not on GitHub yet: github new {repo.folder}")
    changed = len(out(repo, "status", "--porcelain").splitlines())
    ahead = len(out(repo, "rev-list", "HEAD", "--not", "--remotes=origin").splitlines())
    parts = [f"{changed} changed" if changed else "clean"]
    if ahead:
        parts.append(f"{ahead} not uploaded")
    if not repo.mine:
        parts.append("not yours, push skips it")
    return say(repo, ", ".join(parts))

def push(repo, note):
    if ready(repo):
        return 1
    stage(repo)
    if not ok(repo, "diff", "--cached", "--quiet"):
        result = git(repo, "commit", "-q", "-m", note or f"Backup {datetime.now():%Y-%m-%d %H:%M}")
        if result.returncode:
            return say(repo, why(result), 1)
    if not ok(repo, "rev-parse", "-q", "--verify", "HEAD"):
        return say(repo, "nothing to back up yet")
    if not ok(repo, "fetch", "-q", "origin"):
        return say(repo, "could not reach GitHub; your work is saved on this Mac, try again later", 1)
    remote = ok(repo, "rev-parse", "-q", "--verify", "origin/main")
    if remote and not ok(repo, "merge-base", "HEAD", "origin/main"):
        return say(repo, "GitHub's history was replaced (github fresh?); nothing uploaded, ask Claude", 1)
    if remote and not ok(repo, "merge-base", "--is-ancestor", "origin/main", "HEAD"):
        stashes = out(repo, "stash", "list")
        if not ok(repo, "rebase", "-q", "--autostash", "origin/main"):
            git(repo, "rebase", "--abort")
            return say(repo, CONFLICT, 1)
        if out(repo, "stash", "list") != stashes:
            return say(repo, CONFLICT.replace("; nothing is lost", "; your unsaved changes are safe in git's stash"), 1)
    if remote and not out(repo, "rev-list", "origin/main..HEAD"):
        return say(repo, "up to date")
    if bad := leaks(repo):
        return say(repo, f"won't upload {', '.join(bad)}; nothing uploaded, ask Claude", 1)
    result = git(repo, "push", "-q", "-u", "origin", "main")
    return say(repo, why(result), 1) if result.returncode else say(repo, "backed up")

def fresh(repo):
    if not repo.mine:
        return say(repo, "not yours; nothing touched", 1)
    if ready(repo):
        return 1
    if not sys.stdin.isatty():
        return say(repo, "fresh only runs in your own Terminal: it rewrites history on GitHub", 1)
    if input(f"This replaces all of {repo.folder}'s history on GitHub with one new save.\nType {repo.folder} to go on: ").strip() != repo.folder:
        return say(repo, "cancelled", 1)
    os.makedirs(BACKUP, exist_ok=True)
    bundle = os.path.join(BACKUP, f"{repo.folder.replace('/', '.')}.{datetime.now():%Y-%m-%d-%H%M%S}.bundle")
    if not ok(repo, "fetch", "-q", "origin") or not ok(repo, "bundle", "create", bundle, "--all"):
        return say(repo, "could not back up the history; nothing touched", 1)
    stage(repo)
    tracked = [name for name in git(repo, "ls-files", "-z").stdout.split("\0") if name and skip(repo, name)]
    if tracked:
        git(repo, "--literal-pathspecs", "rm", "--cached", "-q", "--", *tracked)
    before = out(repo, "rev-parse", "HEAD")
    commit = out(repo, "commit-tree", out(repo, "write-tree"), "-m", f"Fresh start {datetime.now():%Y-%m-%d}")
    if not commit or not ok(repo, "update-ref", "refs/heads/main", commit):
        return say(repo, "could not make the fresh save; nothing uploaded", 1)
    result = git(repo, "push", "-q", "--force-with-lease", "origin", "main")
    if result.returncode:
        git(repo, "reset", "-q", before)
        return say(repo, f"{why(result)}; nothing changed", 1)
    return say(repo, f"fresh start uploaded; the old history is in {os.path.relpath(bundle, BASE)}")

def lock(repo, target=None):
    return gh(repo, "locked: no issues, wiki, discussions or projects", "repo", "edit", target or repo.url, "--enable-issues=false", "--enable-wiki=false", "--enable-discussions=false", "--enable-projects=false")

def new(slug, visibility):
    owner, _, name = slug.partition("/")
    if not owner or not name or "/" in name:
        sys.exit("github new <owner>/<repo> [public]")
    if owner not in OWNERS:
        sys.exit(f"{slug}: add {owner} to OWNERS in utils/github.py first; nothing touched")
    found = run(BASE, "gh", "repo", "view", slug, "--json", "visibility", "--jq", ".visibility")
    if found.returncode:
        created = run(BASE, "gh", "repo", "create", slug, f"--{visibility}")
        if created.returncode:
            sys.exit(f"{slug}: {why(created)}")
    elif found.stdout.strip().lower() != visibility:
        sys.exit(f"{slug}: already on GitHub as {found.stdout.strip().lower()}; nothing touched")
    os.makedirs(os.path.join(BASE, owner, name), exist_ok=True)
    repo = Repo(owner, name)
    if not repo.url:
        git(repo, "init", "-q", "-b", "main")
        git(repo, "remote", "add", "origin", f"https://github.com/{slug}.git")
    if found.returncode:
        lock(repo, slug)
    return say(repo, "ready; push uploads it")

# TERMINAL

HELP = """github <command>

  push [note]                  back up every repo you own to GitHub
  status                       what changed in every repo
  new <owner>/<repo> [public]  make a folder and its GitHub repo, private unless public
  web <repo>                   open a repo on github.com
  public <repo>                make a repo public: anyone can see it
  private <repo>               make a repo private
  lock <repo>                  turn off issues, wiki, discussions and projects
  fresh <repo>                 replace a repo's history with one new save; in your own Terminal
"""

def terminal():
    match sys.argv[1:]:
        case ["push", *note]:
            sys.exit(max((push(repo, " ".join(note)) for repo in repos() if repo.mine), default=0))
        case ["status"]:
            sys.exit(max((status(repo) for repo in repos()), default=0))
        case ["new", slug, *visibility] if visibility in ([], ["public"], ["private"]):
            sys.exit(new(slug, (visibility or ["private"])[0]))
        case ["web", token]:
            sys.exit(gh(repo := pick(token), "opened", "browse", "-R", repo.url))
        case [("public" | "private") as visibility, token]:
            sys.exit(gh(repo := pick(token), f"now {visibility}", "repo", "edit", repo.url, f"--visibility={visibility}", "--accept-visibility-change-consequences"))
        case ["lock", token]:
            sys.exit(lock(pick(token)))
        case ["fresh", token]:
            sys.exit(fresh(pick(token)))
        case args:
            print(HELP)
            for repo in repos():
                print(f"  {repo.folder}" + ("" if repo.mine else " (not yours)"))
            sys.exit(1 if args else 0)

if __name__ == "__main__":
    terminal()

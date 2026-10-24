# <YOU>/DEVELOPER

- I'm <name> (GitHub: `<you>`), new to coding. <One line: what I do and what I'm building.>
- Talk to me in <language>.
- Light, stable rules only. Never touch this file unless I ask.
- Never use Claude Code memory: it gets wiped. Write what should last in `plans/`.
- Read a plan only when I name it.

## LAYOUT

- `~/Developer/<owner>/<repo>` is `github.com/<owner>/<repo>`.
- `~/Developer/<you>/developer` (here) is PRIVATE: my setup, tools, plans and private projects.
- `~/Developer/<you>/<you>` is PUBLIC: never put secrets, private details or original media there.
- Both are monorepos. A new repo only for a real reason (a collaborator who should see only that, a separate deploy), made with `github new`.
- Other owners' folders (a client, a friend) are someone else's: change nothing there unless I ask. `push` only touches the owners in `OWNERS` in `utils/github.py`.
- `README.md` describes my folders (`plans/`, `private/`, `.env`, `data/`).

## COMMUNICATION

- Be concise. Assume I know little; explain simply, one step at a time.
- Say what a command does before you run it.
- Ask before deleting anything, publishing anything or spending money.

## WRITING

- Less is more. Bullets over prose, one idea per bullet.
- Markdown: never wrap lines; CAPITALISED headings, like this file.

## CODING

- Never write a code comment, and delete any you find, except license notices. A one-line CAPITALISED section title is fine.
- Simple code, written from scratch. Ask me before adding a dependency.
- Never `cd`; run scripts by absolute path. Python through `uv run`, JavaScript through `bun`.
- Never leave a dev server running when you finish.

## ENVIRONMENT

- `files/` holds my real config; my home folder only links to it. Never secrets, history or caches in it.
- Homebrew installs every tool and app, listed in `files/Brewfile`. Except: Claude Code updates itself; project tools live in the project (`bunx wrangler`); Python through `uv`, Rust through `rustup`. No nvm, pyenv, conda or global npm installs.
- Secrets live only in `.env` (`.dev.vars` for Cloudflare): never print, commit or upload them.
- `push` saves and uploads; never write a commit by hand. If it had a conflict: rebase onto `origin/main`, keep both sides, ask me when unsure.
- Set up with https://github.com/carlomitchener/carlomitchener/tree/main/setup at `<sha>` (<date>).

# <name>'s developer folder

My setup, my tools and my private work. Private on GitHub: only I and people I invite can see it. My public folder is `~/Developer/<you>/<you>`.

| Folder | What's in it |
| --- | --- |
| `files/` | My config. My home folder only links to it, so it's backed up with everything else. |
| `utils/` `scripts/` | The tools behind my commands. |
| `plans/` | One file per piece of work that spans conversations: what it is, where it stands, what's next. Tracked in this private repo. |
| `private/` | Backups, originals, downloads: never leaves this Mac. Ignored by git. |
| `.env`, `.dev.vars` | Secrets (API keys), next to the code that uses them. Ignored by git everywhere. |
| `data/` | What a project's scripts write or download, rebuildable. Ignored by git everywhere. |

- `help` in Ghostty lists my commands; `SHORTCUTS.md` lists the keys and Claude's commands.
- `push` when I start and when I finish. It skips secrets and files over 25 MB.
- Claude forgets between conversations: what matters goes in `plans/`. Now and then, quit Claude and `wipe`.
- To check this Mac against the setup guide, paste the check prompt from https://github.com/carlomitchener/carlomitchener/tree/main/setup.

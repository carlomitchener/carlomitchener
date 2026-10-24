# SETUP

An opinionated Mac setup for coding with Claude: one way to do each thing, so a beginner never has to choose.

Claude: someone gave you this guide to set up their Mac like Carlo's. Assume they have never coded and their Mac is a mess. The templates sit next to this file, in `developer/` and `public/`: fetch each with `curl` from `https://raw.githubusercontent.com/carlomitchener/carlomitchener/main/setup/`, never WebFetch (it summarizes). Read this guide and every template before you start. `developer/CLAUDE.md` holds the rules that last, and they apply from now; filling and updating it is part of setup and check. This guide holds only what setting up needs.

## HOW TO WORK

- Look before you change. Say what each step does and why, and wait for a yes before changing the Mac.
- Never delete what you replace: move it to `private/backup/<date>/`, keeping its path from `~`. Trash things only on a yes.
- You can't type passwords or answer interactive prompts. For the Homebrew installer, `sudo`, `chsh` and every sign-in, give them the command to paste into Terminal, and wait. Never ask for a password or key in chat, and never repeat a secret you find: read config files with secret values masked.
- Your shell doesn't see tools installed after you started: use full paths, or load Homebrew's `shellenv` first.
- Every step is safe to repeat: check, then do only what's missing. Keep `plans/setup.md` (their answers, steps done, NEXT) current, so a new session can pick up.
- The standard is a default, not a law: a tool they already use and want to keep stays, noted in `CLAUDE.md`.

## THE STANDARD

```
~
├── .zshenv                   → files/zshenv (sets ZDOTDIR, the only zsh file in ~)
├── .config/zsh/.zshrc        → files/zshrc
├── .config/zsh/.zprofile     → files/zprofile
├── .config/zsh/.zsh_history  a real file: history never goes in git
├── .config/git/config        → files/gitconfig
├── .config/git/ignore        → files/gitignore
├── .config/ghostty/config    → files/ghostty
├── .cache/zsh/               must exist: zsh keeps its completion cache there
├── .claude/settings.json     → files/claude.json
├── Library/Application Support/Code/User/settings.json → files/vscode.json
└── Developer/<you>/
    ├── developer/            github.com/<you>/developer, PRIVATE: "the developer folder"; Claude starts here
    │   ├── CLAUDE.md  README.md  SHORTCUTS.md  .python-version
    │   ├── .gitignore        write it: /private/
    │   ├── .claude/settings.json   write it: the public folder in permissions.additionalDirectories, full path
    │   ├── files/            Brewfile, and the real files linked above
    │   ├── utils/github.py   push, status, github
    │   ├── scripts/          ports.sh  spaghetti.sh  wipe.sh
    │   ├── plans/            empty at first
    │   └── private/          empty at first; the README's folder table says what these are
    └── <you>/                github.com/<you>/<you>, PUBLIC: README.md is their GitHub profile; LICENSE only if they chose MIT
```

The login shell is `/bin/zsh`. GitHub goes over HTTPS, signed in through `gh`: no SSH keys.

## SETUP

No `~/Developer/*/developer` yet, or its `plans/setup.md` lists unfinished steps. Interview, survey (read only), show a one-line-per-step plan, get a yes, then go.

1. **Interview**, in rounds, recommended answers first; use your question tool if you have one:
   - first name, language, what they do, and the one project they want to build: where is it now?
   - GitHub username. None yet: they make one at github.com/signup (short and lowercase, it becomes a folder name; two-factor on);
   - what the project needs: a website (Cloudflare recommended), video or audio (`ffmpeg`), PDFs (`poppler`), Python or data (`uv`, already there), Rust, Docker; accounts: AWS, Stripe, others with API keys;
   - project private (recommended, in the developer folder) or public (in the public folder);
   - Claude plan: Pro (effort `medium`) or Max (`high`); answers: Concise (recommended), Explanatory or Learning;
   - their GitHub profile: a line about them and links, or nothing; an MIT license on the public folder (default no, only on a clear yes);
   - does someone help them? Their GitHub username.
2. **Survey**: macOS, chip, free space, admin, shell, Homebrew, tools and version managers, shell and git config, `~/Developer`, `~/.claude`, `/Applications`, projects in iCloud or Dropbox. Not an admin, or under ~20 GB free: sort that out first. A backup drive: suggest Time Machine first.
3. **Homebrew and gh**, signed in to GitHub. Skip Homebrew's advice to edit `~/.zprofile`: `files/zprofile` does it. An Intel Mac uses `/usr/local`, not `/opt/homebrew`: adjust the templates. An Intel Homebrew on an Apple Silicon Mac gets replaced.
4. **The two folders**: clone what exists on GitHub (`push` only works on `main`, so a `master` branch becomes `main`; a public `<you>/developer` must turn private before anything goes in), or create them. Download the templates without overwriting and fill every placeholder (`<owner>/<repo>` is a pattern, not a placeholder). Add their accounts to `autoMode.environment`. With a helper, `CLAUDE.md` gets a conflict rule: their version wins for content, the helper's for code.
5. **Shell and git**: they close every other terminal first (open shells rewrite history when they close). Show their old shell files in a table, line by line; carry over what's still needed, drop version-manager lines (a pinned Node comes from brew's `node@<version>`, Python from `uv`), never carry secrets (they go to a project's `.env` later). Back up the old files, move `.zsh_history`, link. `gh auth setup-git` writes git's sign-in into `files/gitconfig`. A work or school email goes in `files/gitconfig-<org>`, included for `~/Developer/<org>/`.
6. **Tools and apps**: add what they need to the Brewfile and run `brew bundle`; it takes over the Brewfile's apps already installed from websites. Never force-replace the app you're running in: if taking it over fails, leave it out. Install Claude Code if it's missing. Rust keeps `CARGO_HOME` and `RUSTUP_HOME` in `~/.local/share`, set in `files/zshenv`.
7. **Accounts**: they sign in themselves (wrangler, AWS, Stripe), and paste API keys into `.env` themselves, never in chat.
8. **GitHub**: `github new <you>/developer`, then `github new <you>/<you> public`. Invite the helper to both.
9. **Ghostty, VS Code, Claude**: link, merging what they had changed. Ghostty's config in `~/Library/Application Support/com.mitchellh.ghostty/` beats ours: merge it in and back it up. In `files/claude.json`, set effort and output style:
   - Opus 5.5 reads effort only from `modelSettings.claude-opus-5-5.effortLevel`; the top-level `effortLevel` is for later models;
   - the model stays Opus: Fable on Pro is billed as extra usage;
   - every `autoMode` list keeps `"$defaults"`, or Claude Code's built-in safety rules are dropped;
   - the Claude app remembers the mode per folder, over the settings: open the developer folder once and pick Auto.
10. **Their project**: move it into the developer folder (or the public one), and write its plan in `plans/`. Never nest a repo: one with a GitHub remote stays its own, at `~/Developer/<owner>/<repo>`; one without gets its own with `github new`, or is folded in, its `.git` going to the backup. Moving out of iCloud removes it from their other devices: say so. Copy, check it works, then trash the original on a yes. Big originals go in `private/`. `carlo` and `mrly` in `files/zshrc` are examples: replace them with one short go-to function per folder they use (their developer folder, their projects, other owners), each with its `help` line. Commands they'll run often (`serve`, `deploy`) become functions too.
11. **Tidy the home folder**, one group at a time, on a yes (TIDY).
12. **Finish**: write this guide's latest commit and today's date into `CLAUDE.md`; no placeholder left; mark `plans/setup.md` done; first `push`; a short tour (`help`, `status`, the README in VS Code's preview). Then they quit this Claude and every old terminal, and start fresh: their developer folder's shortcut, then `claude`.

## CHECK

It's set up, or they asked for a check. Theirs is the developer folder `~/.zshenv` links into. Change nothing before a yes, and judge `push` from `status` and `gh auth status` without running it. Compare their Mac with THE STANDARD and the templates (links, tools, `brew bundle check`, `claude.json`, `CLAUDE.md`, `OWNERS`) and show one short list:

- **broken**, fix first: a dead link, a missing tool, `push` failing, an `autoMode` list without `"$defaults"`, a secret tracked in git;
- **different**: works, but not the standard. Offer to align, one at a time; keeping theirs is fine;
- **extra**: fine, say what it is.

Fix only what they say yes to. Their `CLAUDE.md` names the commit of this guide they were set up with: diff the templates since then (none recorded: against `main`) and carry the changes into their files, then update the commit and date. An older layout gets a migration plan, started only on a yes.

## TIDY

A handful of dotfiles in `~` is the goal; zero is impossible.

- Keep: `.config` `.cache` `.local` `.zshenv` `.claude` `.claude.json` `.ssh` `.gnupg` `.aws` (the CLI insists) `.docker` `.vscode*` `.homebrew`, and macOS's own (`.Trash` `.CFUserTextEncoding` `.DS_Store` `.hushlogin`).
- Old shell files (`.zshrc` `.zprofile` `.zlogin` `.bash*` `.profile` `.zcompdump*` `.zsh_sessions`): back up, then trash. A `.zsh_history` that comes back was written by a terminal left open: append it to `~/.config/zsh/.zsh_history`.
- Installers (Docker, others) keep adding lines to `~/.zshrc` or `~/.zprofile`, which zsh now ignores: move the lines into `files/` and trash the file.
- `.npm` `.bun` `.nvm` `.pyenv` `.volta` `.oh-my-zsh`, conda folders, leftover histories: trash once nothing needs them.
- Anything else: ask.

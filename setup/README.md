# Setup

An opinionated Mac setup for coding with Claude, for people who have never coded: one way to do each thing, chosen so you don't have to. It's my own setup, made for the friends and family I help get started.

There's no script to run. You give this guide to Claude, and Claude sets up your Mac with you: it asks what you need, looks around, explains each step and waits for your OK. When a step needs your password or a sign-in, you type it into Terminal yourself: Claude never sees it.

## You need

- A Mac with an administrator account, your Mac password, and about an hour.
- A [Claude Pro or Max](https://claude.com/pricing) plan.
- A GitHub account. None yet? Claude helps you make one.

## Start

1. Install [the Claude app](https://claude.ai/download), sign in, open the **Code** tab and pick your home folder (the one with your name). Or use [Claude Code](https://claude.com/claude-code) in Terminal, started in your home folder.
2. Pick **Opus 5.5**, effort **high** (**medium** on Pro saves your usage).
3. Paste this:

```
Set up my Mac with Carlo's setup guide. Download it in full with curl (not WebFetch), read all of it, then follow it with me step by step:
curl -fsSL https://raw.githubusercontent.com/carlomitchener/carlomitchener/main/setup/SETUP.md
```

Stopped halfway? Paste it again: Claude picks up where you left off.

Already set up? Paste this instead, and Claude fixes only what you say yes to:

```
Check my Mac against Carlo's setup guide. Download it in full with curl (not WebFetch) and follow its check mode:
curl -fsSL https://raw.githubusercontent.com/carlomitchener/carlomitchener/main/setup/SETUP.md
```

## What you get

- Two folders on GitHub: `~/Developer/you/developer`, private, for your setup, tools and work (Claude starts here), and `~/Developer/you/you`, public, your GitHub profile.
- Every tool and app installed by Homebrew: Ghostty for the terminal, VS Code to read files, Claude to do the work.
- `push` backs up everything, your settings included. Your commands: [developer/README.md](developer/README.md). Claude's rules: [developer/CLAUDE.md](developer/CLAUDE.md).

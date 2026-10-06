@AGENTS.md

# Local dev setup: .env.local (API key)

This project reads `GEMINI_API_KEY` (and optional `GEMINI_MODEL`) from
`.env.local` to power the resident chat feature. `.env.local` is gitignored
on purpose (it holds a real secret) and is therefore **never present in a
freshly created git worktree** — every new feature worktree starts without it.

Before running `npm run dev` (or anything that hits `/api/chat`) in a new
worktree, copy `.env.local` from any sibling worktree that already has it
filled in, e.g.:

    cp ../<a-worktree-that-already-has-it>/.env.local .env.local

(Sibling worktrees live under `.claude/worktrees/` at the repo root — list
them with `git worktree list` to find one with a working `.env.local`.)

Do this as one of the first setup steps for any task that needs to actually
run the app, regardless of what the task prompt says. If no sibling
worktree has a filled-in `.env.local`, ask the user for their Gemini API
key (https://aistudio.google.com/apikey) and have them fill it in
themselves — never type, guess, or fabricate the key.

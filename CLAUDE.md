# By Red OS — project instructions

## Always give KP a preview link after UI / design work

When a task ships a visual change (new page, redesigned page, restyled component that owns a route), end the turn with a **Preview** section containing a clickable local URL for every route that was touched.

Rules:
- Base URL is `http://localhost:3000` (Next.js dev default for this repo — `next dev` in `package.json`).
- Format each link as a markdown auto-link so it renders clickable in the terminal: `- [/login](http://localhost:3000/login)`.
- List one link per route that changed. If a shared component changed, list every public route that renders it (best effort — don't spam every page).
- Underneath the list, add one line: **Dev server:** `pnpm dev` — so KP can start it himself if it isn't already running. Never start the dev server without being asked.
- Skip this section for pure backend / script / config changes with no visible UI surface.

Template:

```
## Preview
- [/login](http://localhost:3000/login)
- [/tasks](http://localhost:3000/tasks)

Dev server: `pnpm dev`
```

## Scope

These instructions apply to the By Red OS repo only. Global behavior (tone, format, Lead Systems Architect mode) lives in `~/.claude/CLAUDE.md`.

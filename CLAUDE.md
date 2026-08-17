# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build  -- this is also the only type check
npm run lint     # oxlint (not eslint)
npm run preview  # serve the production build from dist/
```

There is no test framework in this project. `npm run build` is what catches type errors;
`tsconfig.app.json` sets `noUnusedLocals` / `noUnusedParameters`, so an unused variable
fails the build, not just the lint.

## Setup that the code depends on

The app cannot run without a live Supabase project:

1. Run `supabase/schema.sql` in the Supabase SQL Editor (creates `todos`, enables RLS,
   creates the four policies, adds the table to the `supabase_realtime` publication).
2. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

`.env` is gitignored and currently still holds the placeholder values, so a fresh checkout
throws at startup — `src/lib/supabaseClient.ts` deliberately throws at import time when
either variable is missing. Only `VITE_`-prefixed variables reach the browser bundle.

`schema.sql` is a paste-into-the-SQL-editor script, not a migration system. The table uses
`create table if not exists`, but the `create policy` statements are not idempotent and will
error on a re-run. When changing the schema, update this file *and* the hand-written `Todo`
interface in `src/types.ts` — there are no generated Supabase types.

## Architecture

A single-page React 19 + TypeScript + Vite app. No router, no state library, no server code —
Supabase is the entire backend.

`src/App.tsx` is the only gate: it reads `supabase.auth.getSession()` once, subscribes to
`onAuthStateChange`, and renders `<Auth />` or `<TodoList session={session} />`. Everything
below that point assumes an authenticated session and receives it as a prop.

`src/lib/supabaseClient.ts` exports a module-level singleton client. Import it directly; do
not create additional clients (a second client would break the shared realtime connection and
session storage).

### Security lives in Postgres, not in the TypeScript

This is the most important thing to understand before editing queries. `TodoList.tsx` fetches
with a bare `supabase.from('todos').select('*')` and updates/deletes with only `.eq('id', ...)`
— no `user_id` filter anywhere. That is intentional: the RLS policies in `supabase/schema.sql`
scope every row to `auth.uid()`. Do not "fix" these queries by adding user filters, and do not
assume a missing filter is a bug.

The corollary: the anon key ships to the browser, so any new table is fully exposed unless it
has `enable row level security` plus policies. Adding a table means adding its policies in the
same change.

`todos.user_id` also has `default auth.uid()`, so an insert that omits `user_id` still lands on
the right user; the insert policy rejects any attempt to write someone else's id.

### Realtime is the write-back path

`TodoList.tsx` subscribes to `postgres_changes` on `todos` (filtered to the current `user_id`)
and applies INSERT / UPDATE / DELETE to local state from the payload. The mutation handlers
(`addTodo`, `toggleTodo`, `deleteTodo`) intentionally do **not** update state themselves — the
list refreshes because the change comes back over the channel. If you add optimistic updates,
keep the existing id-dedup guard in the INSERT branch or rows will appear twice.

The subscription is created in a `useEffect` keyed on `userId` and torn down with
`supabase.removeChannel(channel)`; React StrictMode double-mounts in dev, so any new
subscription needs the same cleanup.

Realtime only works if the table is in the `supabase_realtime` publication — the last line of
`schema.sql`.

## Conventions

- UI strings and code comments are Turkish written in plain ASCII, without Turkish diacritics
  ("Yukleniyor...", "Cikis yap", "Henuz gorev yok."). Match that when adding text.
- Errors from Supabase calls are destructured (`const { data, error } = await ...`), surfaced
  through a local `error` state, and rendered as `<p className="error">`. There is no toast or
  global error boundary.
- Styling is plain CSS in `src/App.css` and `src/index.css` with hand-written class names.

## Repo note

This directory is not its own git repository — it sits inside the repo rooted at
`C:\Users\erdin`. Git commands run from here operate on that home-directory repo, which
tracks unrelated files. Do not commit from here without checking `git rev-parse --show-toplevel`
first.

## Purpose

This is a learning project for Supabase, not production code. `README.md` maps each Supabase
concept to the file that demonstrates it and lists intended next exercises (OAuth via
`signInWithOAuth`, Supabase Storage, due dates, categories). When adding features, prefer the
smallest change that makes the concept legible over production hardening.

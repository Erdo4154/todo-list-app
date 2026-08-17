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

1. Run the files in `supabase/` in the SQL Editor, in numeric order: `schema.sql` (creates
   `todos`, enables RLS, creates the four policies, adds the table to the `supabase_realtime`
   publication), then `02_categories.sql` (creates `categories`, adds `todos.category_id`).
2. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

`.env` is gitignored and currently still holds the placeholder values, so a fresh checkout
throws at startup — `src/lib/supabaseClient.ts` deliberately throws at import time when
either variable is missing. Only `VITE_`-prefixed variables reach the browser bundle.

These are paste-into-the-SQL-editor scripts, not a migration system. Tables use
`create table if not exists`, but `create policy` statements are not idempotent and will error
on a re-run. When changing the schema, update the SQL *and* the hand-written interfaces in
`src/types.ts` — there are no generated Supabase types.

`src/types.ts` distinguishes `TodoRow` (the raw table row) from `Todo` (`TodoRow` plus the
embedded `categories` relation). That split is load-bearing — see the realtime note below.

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

One channel carries two `.on('postgres_changes', ...)` handlers, for `todos` and `categories`.

A realtime payload is the **raw row only** — it never contains embedded relations. So a todo
arriving over the channel has `category_id` but no `categories` object, while the same todo
from the initial `.select('*, categories(...)')` has both. `attachCategory()` closes that gap
by resolving the relation from `categoriesRef`. The ref exists so the subscription does not
have to be torn down and rebuilt every time the category list changes.

The subscription is created in a `useEffect` keyed on `userId` and torn down with
`supabase.removeChannel(channel)`; React StrictMode double-mounts in dev, so any new
subscription needs the same cleanup.

Realtime only works if the table is in the `supabase_realtime` publication — the last line of
`schema.sql`.

## Conventions

- UI strings and code comments are Turkish with proper diacritics ("Yükleniyor...", "Çıkış yap",
  "Henüz görev yok."). Write new text the same way — do not strip to ASCII. Source files are
  UTF-8; `index.html` sets `charset="UTF-8"` and `lang="tr"`.
- Errors from Supabase calls are destructured (`const { data, error } = await ...`), surfaced
  through a local `error` state, and rendered as `<p className="error">`. There is no toast or
  global error boundary.
- Styling is plain CSS in `src/App.css` and `src/index.css` with hand-written class names.

## Repo note

This directory is its own git repository (`origin`:
https://github.com/Erdo4154/todo-list-app, public), but it is nested inside another repo
rooted at `C:\Users\erdin` that tracks unrelated home-directory files. The nesting is
harmless as long as commands run from this directory; if something looks like it is touching
files outside the project, check `git rev-parse --show-toplevel` — it must print the
`supabase-todo-app` path.

`.env` is intentionally not in the repo, so a fresh clone cannot run until it is recreated
from `.env.example`. Keep it that way: the anon key is safe to expose in a browser bundle,
but committing it to a public repo hands out the project's URL and key together, leaving RLS
as the only thing standing between a stranger and the database.

## Purpose

This is a learning project for Supabase, not production code. `README.md` maps each Supabase
concept to the file that demonstrates it and lists intended next exercises (OAuth via
`signInWithOAuth`, Supabase Storage, due dates, categories). When adding features, prefer the
smallest change that makes the concept legible over production hardening.

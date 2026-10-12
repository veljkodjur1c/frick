# Nexus (working title)

Private mini social app for 5 friends. Each week the team gets a list of tasks (some shared, some individual).
Every completed task deals damage to a weekly League of Legends boss. If the team's combined points reach
the boss HP before the week ends, the boss dies and everyone gets a collectible Monster can for the
achievement shelf. Each player also has an individual LoL-style rank (Iron IV -> Challenger) that changes
with weekly LP gains/losses.

UI language: Serbian (Latin script). Code, comments, commit messages, branch names: English.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres, Storage (proof images)
- Vercel: hosting + preview deployments per PR
- PWA (installable on Android and iOS), mobile-first design

## Project structure
- `src/app/`              routes and pages (one folder per feature: `/feed`, `/tasks`, `/boss`, `/shelf`)
- `src/components/`       shared UI components
- `src/features/<name>/`  feature code (components, hooks, queries) - each person owns their features
- `src/lib/supabase/`     Supabase client helpers (browser + server)
- `src/lib/game/`         PURE game logic (points, boss HP, LP, rank). No DB or UI imports. Must have unit tests.
- `supabase/migrations/`  ALL schema changes live here as SQL migrations. Never change the schema only in the dashboard.

## Game rules (source of truth, change here first)
- Week runs Monday 00:00 to Sunday 23:59 (Europe/Belgrade).
- Sunday evening is "champ select": players propose tasks and vote; approved tasks activate at the start of the week.
- Task types: `check` (just tick it) and `proof` (needs a photo). A proof task is `pending` until 2 of the other
  4 members vote Legit; majority Cap rejects it. Unvoted proofs are auto-accepted at week end.
- Each task has `points` and a `scope` (`team` = everyone has it, `solo` = one person).
- Boss dies if total approved points >= boss HP at week end.
- LP: placeholder numbers until we decide: each completed task +X, fewer than 5 completed tasks in a week -Y,
  boss kill gives everyone a bonus. Keep all numbers in `src/lib/game/config.ts`.
- Weekly awards: MVP (most points) and "Feeder of the week" (fewest points).

## Conventions
- Never push to `main`. Work on `feature/<short-name>`, open a PR, the other person reviews.
- Small PRs (aim for under ~300 changed lines). Merge often, pull `main` often.
- Commit messages: imperative, English (`Add proof upload form`).
- TypeScript strict. No `any` unless commented why.
- Database: Row Level Security ON for every table. Only authenticated group members can read/write.
- Secrets live in `.env.local` (gitignored). Never commit keys. Only `NEXT_PUBLIC_*` vars may reach the browser.
- New table or column = new file in `supabase/migrations/` (`npx supabase migration new <name>`).
- If you need something another feature owns (e.g. the `tasks` table), ask the owner or wait for their PR to merge.

## Commands
- `npm run dev`   start dev server
- `npm run lint`  lint
- `npm test`      unit tests (game logic)
- `npx supabase db push`  apply migrations to the linked Supabase project (only migrations that are merged to main)

## Before opening a PR
Run `npm run lint` and `npm test`, check the feature on a phone-sized screen, and describe in the PR what changed and how to test it.

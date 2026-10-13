# Nexus (working title)

Private mini social app for 5 friends. Each week the team gets a list of tasks (some shared, some individual).
Every completed task deals damage to a weekly League of Legends boss. If the team's combined points reach
the boss HP before the week ends, the boss dies and everyone gets a collectible Monster can for the
achievement shelf. Each player also has an individual LoL-style rank (Iron IV -> Challenger) that changes
with weekly LP gains/losses.

UI language: Serbian (Latin script). Code, comments, commit messages, branch names: English.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS v4 (design tokens in `src/app/globals.css`)
- Supabase: Auth, Postgres, Storage (proof images)
- Vercel: hosting + preview deployments per PR
- PWA (installable on Android and iOS), mobile-first design

## Project structure
- `src/app/`              routes and pages (one folder per feature: `/feed`, `/tasks`, `/boss`, `/shelf`)
- `src/components/`       app frame (`AppShell`, `BottomNav`, `TopBar`)
- `src/components/ui/`    design system: the ONLY shared UI building blocks (see "Design system" below)
- `src/features/<name>/`  feature code (components, hooks, queries) - each person owns their features
  (`auth`: login/sign-up form + actions, `profile`: profile form, avatar upload, `feed`: posts,
  `tasks`: weekly task list, ticking `check` tasks)
- `src/lib/supabase/`     Supabase helpers: `client.ts` (browser), `server.ts` (server), `auth.ts` (current user),
  `proxy.ts` (session refresh), `admin.ts` (service role, server only)
- `src/lib/cn.ts`, `src/lib/format.ts`  small helpers (class joining, Serbian number format)
- `src/lib/redirect.ts`   `safeNextPath()`: sanitizes `?next=` redirect targets
- `src/lib/game/`         PURE game logic (points, boss HP, LP, rank). No DB or UI imports. Must have unit tests.
- `scripts/`              dev scripts (`seed-dev.mjs`, `generate-icons.mjs`)
- `supabase/migrations/`  ALL schema changes live here as SQL migrations. Never change the schema only in the dashboard.

## Design system (read before building any UI)
Look: dark only, League client "Hextech" feel. Near-black blue backgrounds, gold for frames, titles, rank and
rewards, Hextech teal for the main action. Most of the UI is calm and slightly rounded; the gold cut-corner
frame is saved for special moments (boss, rank, weekly awards, rewards) so it stays special.
Mobile-first: the app is a 448px column (`AppShell`), tap targets at least 44px tall.
Live preview of everything: run `npm run dev` and open `/design`.

### Tokens (`src/app/globals.css`)
The default Tailwind palette, radii and shadows are switched off. `text-zinc-400`, `bg-amber-300`,
`rounded-2xl`, `shadow-lg` produce nothing. Use only these:
- Backgrounds: `bg-abyss` (page), `bg-deep` (nav, sheets), `bg-surface` (cards), `bg-raised` (inputs, hover, items in cards)
- Borders: `border-line`
- Text: `text-fg` (main), `text-fg-muted` (secondary), `text-fg-faint` (placeholder/disabled only)
- Gold `gold-100 ... gold-700`, Hextech `hextech-100 ... hextech-900`
- Status: `success` (Legit, done), `danger` (Cap, errors), `pending` (waiting for votes), `boss`, `boss-trail`
- Rank tiers: `rank-iron ... rank-challenger` (emblems only, not text)
- Radius: `rounded-sm` badges/checkboxes, `rounded-md` buttons/inputs, `rounded-lg` cards/images, `rounded-full` avatars
- Shadows: `shadow-card`, `shadow-sheet`, `shadow-glow-gold`, `shadow-glow-hextech`
- Spacing: the normal Tailwind scale. Page padding comes from `AppShell`. Between sections `gap-6`, inside a card `gap-3`.
- Opacity modifiers are fine: `bg-success/15`, `bg-deep/95`.

Never hardcode a color (`#c8aa6e`, `text-[#...]`, a hex value in `style`). Missing a token? Add it to `globals.css`
in the same PR, put it on `/design`, and say so in the PR description.

### Type
- `font-display` (Cinzel): page titles, boss name, rank names, award titles, section dividers. Short words only.
- Everything else is Inter (the default `font-sans`). Body `text-base`, meta `text-sm text-fg-muted`.
- No `uppercase` text. Numbers that change use `tabular-nums`; format them with `formatNumber()` from `@/lib/format`.

### Components (`import { ... } from "@/components/ui"`)
| Component | Use for |
|---|---|
| `PageHeader` | Top of every tab page (the page's only h1) |
| `Button`, `buttonClasses()` | All buttons. `primary` = the one main action on a screen, `secondary`, `ghost`, `success` (Legit), `danger` (Cap). `buttonClasses()` styles a `<Link>` as a button |
| `Card` | `default` for normal content, `inset` inside another card, `framed` (gold cut corners) only for boss/rank/awards/rewards |
| `Badge` | Points (`gold`), scope (Tim/Solo), proof status (`pending`/`success`/`danger`) |
| `Avatar` | Profile pictures, initials fallback, `highlight="mvp"` / `"feeder"` |
| `RankBadge`, `RankEmblem`, `rankLabel()` | Rank display (Iron IV ... Challenger) |
| `BossHealthBar` | The weekly boss HP, with the damage trail animation |
| `ProgressBar` | Any other progress (tasks done, LP to next division, votes) |
| `Checkbox` | `check` tasks and any yes/no row (`strike` crosses out when done) |
| `Input`, `Textarea` | Form fields with `label`, `hint`, `error` |
| `SegmentedControl` | Switching views of one list (Svi / Tim / Solo) |
| `Sheet` | Bottom sheet for anything modal (proof upload, voting, proposing a task) |
| `Divider` | Hairline, or with `label` a gold section break (e.g. between weeks in the feed) |
| `EmptyState`, `Skeleton`, `Spinner` | Empty lists and loading |

### Rules
- Never build your own button, card, input, badge, modal etc. inside a feature. Use the ones above.
- Feature-specific pieces (e.g. `TaskRow`, `FeedPost`, `ProofVoteSheet`) live in `src/features/<name>/` and are
  composed from `ui` components.
- `className` on a ui component is for layout (margin, width, grid placement), not for restyling it.
  Need a different look? Add a variant to the component.
- Need a new shared component or variant? Add it in `src/components/ui/`, export it from `index.ts`, add an example
  to `/design`. Tell the other person first so we don't both build the same thing; best as a small PR merged before
  the feature PR.
- UI text: Serbian, sentence case. Buttons say what happens ("Pošalji dokaz", not "Potvrdi"). Empty states say what to do next.
- Motion only to show that something changed (boss hit, sheet opening). Reduced motion is handled in `globals.css`.
- Check new screens at phone width (about 390px) before opening a PR.

## Game rules (source of truth, change here first)
- Week runs Monday 00:00 to Sunday 23:59 (Europe/Belgrade).
- Sunday evening is "champ select": players propose tasks and vote; approved tasks activate at the start of the week.
- Task types: `check` (just tick it) and `proof` (needs a photo). A proof task is `pending` until 2 of the other
  4 members vote Legit; majority Cap (3 of the other 4) rejects it. Unvoted proofs are auto-accepted at week end.
  After a Cap the player may send a new photo while the week is active. Others vote on proofs in the feed.
- Each task has `points` and a `scope` (`team` = everyone has it, `solo` = one person).
- Boss dies if total approved points >= boss HP at week end.
- LP: placeholder numbers until we decide: each completed task +X, fewer than 5 completed tasks in a week -Y,
  boss kill gives everyone a bonus. Keep all numbers in `src/lib/game/config.ts`.
- Weekly awards: MVP (most points) and "Feeder of the week" (fewest points).
- Champ select details (PLACEHOLDER numbers): opens Sunday 18:00 and closes at Monday 00:00. Each player proposes
  tasks (title, `check`/`proof`, `team`/`solo`, 5-100 points; a solo task is for the player who proposes it) and
  votes Za/Protiv on any proposal, their own too. A proposal with at least 3 Za votes becomes a task next week; the rest
  are rejected. Logic in `src/lib/game/champSelect.ts`; `syncWeekPhase()` opens champ select and activates the week
  when a page that shows week data loads, so no cron is needed for it.
- In code: every number lives in `src/lib/game/config.ts` (undecided ones are marked PLACEHOLDER). Week math
  (`weekStartOf`, `weekEndOf`, `nextWeekStart`, `currentWeekStart`, `dayOfWeek`, all Europe/Belgrade) is in
  `src/lib/game/week.ts`. Never compute week boundaries with `getDay()` or UTC dates yourself.
- Points (`approvedPoints` for a player or the boss damage, `weeklyProgress`) are in `src/lib/game/points.ts`.
- Rank comes only from total LP (`profiles.lp`, never below 0): Iron IV starts at 0 and every 100 LP is one division
  up to Diamond I; Master from 2800, Grandmaster from 3200, Challenger from 3600 (PLACEHOLDER). `rankFromLp`, `nextRank`,
  `weeklyLpChange`, `applyLpChange` and `rankChange` are in `src/lib/game/rank.ts`; show a rank with
  `<RankBadge {...rankFromLp(lp)} />`.

## Auth & data access
- `src/proxy.ts` refreshes the session on every request and sends logged-out users to `/login`, the only public route.
- Server code gets the user with `requireUser()` (redirects to `/login`) or `getCurrentUser()` (returns null) from
  `@/lib/supabase/auth`. Pages calling them sit inside `<Suspense>`.
- Every Server Action checks the user itself. Never trust a user id sent from the client.
- Normal reads/writes use `createClient()` (server or browser) and go through RLS.
- `createAdminClient()` (`@/lib/supabase/admin`) uses the service role key and bypasses RLS. Only for server code
  (Server Actions, Route Handlers, cron, and `syncWeekPhase()` during a page render) that writes system tables
  (`weeks`, `bosses`, `tasks`, `awards`, `cans`), after checking the user. Never import it from a Client Component.

## Storage
- `avatars`: public bucket, `profiles.avatar_url` is a plain public URL.
- `post-images`: private bucket, read through short-lived signed URLs created on the server.

## Conventions
- Never push to `main`. Work on `feature/<short-name>` and open a PR. A review by the other person is welcome but
  not required: once lint, tests and the Vercel preview pass, the author may squash-merge their own PR.
  For stacked PRs, merge the lower one first and point the next one at `main` before merging it.
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
- `npm run seed:dev`  dry run of the dev seed (current week, boss, tasks); `npm run seed:dev -- --yes` writes,
  add `--reset` to recreate the week's tasks. Needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- `npx next typegen && npx tsc --noEmit`  type check (`tsc` needs the route types from `next typegen` first)

## Before opening a PR
Run `npm run lint` and `npm test`, check the feature on a phone-sized screen, and describe in the PR what changed and how to test it.

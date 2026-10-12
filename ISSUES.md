# Početni Issue-i (kopirajte u GitHub Issues)

Labele: `person-A` (ti: sistem igre), `person-B` (drug: društveni deo), `setup`, `later`

## Faza 0 - Setup (zajedno, jedan radi, drugi pregleda)
1. **Kostur projekta**: `create-next-app` (TypeScript, Tailwind, App Router), CLAUDE.md u root, `.gitignore` sa `.env.local`. [setup]
2. **Supabase projekat + šema baze**: tabele `profiles`, `weeks`, `tasks`, `task_proposals`, `task_votes`, `completions`, `proof_votes`, `bosses`, `awards`, `cans`. Sve kao migracije, RLS uključen. [setup]
3. **Vercel deploy + env varijable**, proveriti da PR preview radi. [setup]
4. **PWA osnova**: manifest, ikonice, "Add to Home Screen" test na Androidu i iPhone-u. [setup]

## Faza 1
5. **Login + profil** (ime, avatar, nickname). [person-A]
6. **Upload slike + feed** (Supabase Storage, lista objava, najnovije prvo). [person-B]

## Faza 2
7. **Champ select**: predlaganje taskova + glasanje + aktiviranje u ponedeljak. [person-A]
8. **Štikliranje taskova** (`check` tip) + poeni. [person-A]
9. **Task sa dokazom** (`proof` tip): upload slike, status pending, Legit/Cap glasanje (2 od 4 za prihvatanje). [person-B]
10. **Boss HP bar** (zbir poena tima, animacija pri udarcu, tekući boss za nedelju). [person-B]

## Faza 3
11. **LP i rank sistem** (`src/lib/game/`, čista logika + unit testovi): Iron IV -> Challenger, padanje/penjanje. [person-A]
12. **Nedeljni obračun** (cron: boss pobeda/poraz, LP, MVP, Feeder nedelje, otvaranje nove nedelje). [person-A]
13. **Achievement polica**: Monster limenke po bojama, sive dok se ne osvoje. [person-B]
14. **Feed polish**: reakcije/komentari, MVP okvir profila. [person-B]

## Later
15. Honor sistem na kraju nedelje.
16. Push notifikacije.
17. Težina bossa raste iz nedelje u nedelju.

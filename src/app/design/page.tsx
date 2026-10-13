import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  buttonClasses,
  Card,
  Divider,
  EmptyState,
  Input,
  PageHeader,
  ProgressBar,
  RankBadge,
  Skeleton,
  Textarea,
  type RankTier,
} from "@/components/ui";
import { MonsterCan } from "@/features/shelf/MonsterCan";
import { CAN_FLAVORS } from "@/lib/game/cans";
import { BossDemo, SheetDemo, TaskListDemo } from "./Demos";

export const metadata: Metadata = { title: "Design system · Nexus" };

// Dev page: every shared component in one place, so both of us can check the look.
// Not linked from the nav. Open /design.

const SWATCHES: Array<{ group: string; tokens: string[] }> = [
  { group: "Pozadine", tokens: ["abyss", "deep", "surface", "raised", "line"] },
  { group: "Tekst", tokens: ["fg", "fg-muted", "fg-faint"] },
  { group: "Zlatna", tokens: ["gold-100", "gold-200", "gold-300", "gold-400", "gold-500", "gold-700"] },
  { group: "Hextech", tokens: ["hextech-100", "hextech-300", "hextech-500", "hextech-700", "hextech-900"] },
  { group: "Status", tokens: ["success", "danger", "pending", "boss", "boss-dark", "boss-trail"] },
];

const TIERS: RankTier[] = [
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Divider label={title} />
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <PageHeader
        title="Design system"
        subtitle="Svi zajednički delovi na jednom mestu. Ako nešto ne valja, popravlja se u src/components/ui, ne u feature-u."
      />

      <Section title="Boje">
        {SWATCHES.map(({ group, tokens }) => (
          <div key={group}>
            <p className="mb-2 text-sm text-fg-muted">{group}</p>
            <div className="grid grid-cols-3 gap-2">
              {tokens.map((token) => (
                <div key={token} className="flex flex-col gap-1">
                  <div
                    className="h-10 rounded-md ring-1 ring-line"
                    style={{ backgroundColor: `var(--color-${token})` }}
                  />
                  <code className="text-xs text-fg-muted">{token}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Tipografija">
        <div className="flex flex-col gap-3">
          <p className="font-display text-3xl font-bold text-gold-200">Baron Nashor</p>
          <p className="font-display text-xl font-semibold text-gold-200">Champ select za 42. nedelju</p>
          <p className="text-base text-fg">
            Tim je ove nedelje naneo 1.240 štete. Još dva dana do kraja, a fali nam 760 poena da oborimo bossa.
          </p>
          <p className="text-sm text-fg-muted">Sporedni tekst: ime, vreme, opis. Đorđe, Žarko, Šćepan, Čedomir.</p>
          <p className="text-sm text-fg-faint">Placeholder i onemogućeno.</p>
        </div>
      </Section>

      <Section title="Dugmad">
        <div className="flex flex-wrap gap-2">
          <Button>Završi task</Button>
          <Button variant="secondary">Predloži task</Button>
          <Button variant="ghost">Otkaži</Button>
          <Button variant="success">Legit</Button>
          <Button variant="danger">Cap</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Malo</Button>
          <Button size="md">Srednje</Button>
          <Button size="lg">Veliko</Button>
          <Button loading>Šaljem</Button>
          <Button disabled>Zaključano</Button>
        </div>
        <Button fullWidth size="lg">
          Pošalji dokaz
        </Button>
        <Link href="/tasks" className={buttonClasses({ variant: "secondary", fullWidth: true })}>
          Link koji izgleda kao dugme
        </Link>
      </Section>

      <Section title="Bedževi">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">+30</Badge>
          <Badge>Tim</Badge>
          <Badge tone="hextech">Solo</Badge>
          <Badge tone="pending">Na čekanju</Badge>
          <Badge tone="success">Legit</Badge>
          <Badge tone="danger">Cap</Badge>
        </div>
      </Section>

      <Section title="Rangovi">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {TIERS.map((tier, i) => (
            <RankBadge key={tier} tier={tier} division={i < 7 ? 2 : undefined} size="sm" />
          ))}
        </div>
        <div className="flex items-center justify-around pt-2">
          <RankBadge tier="gold" division={2} lp={64} size="lg" />
          <RankBadge tier="challenger" lp={1312} size="lg" />
        </div>
        <RankBadge tier="emerald" division={4} lp={12} />
      </Section>

      <Section title="Limenke">
        <div className="grid grid-cols-3 gap-y-4">
          {CAN_FLAVORS.map((flavor) => (
            <div key={flavor.id} className="flex flex-col items-center gap-1">
              <MonsterCan flavor={flavor.id} className="h-20" />
              <code className="text-xs text-fg-muted">{flavor.color}</code>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <MonsterCan flavor="original" locked className="h-20" />
          <p className="text-sm text-fg-muted">
            Zaključana: <code className="text-xs whitespace-nowrap">can-locked</code>. Poklopac i dno:{" "}
            <code className="text-xs whitespace-nowrap">can-metal</code>. Crno telo:{" "}
            <code className="text-xs whitespace-nowrap">can-body-dark</code>. Kandže na Ultra limenkama:{" "}
            <code className="text-xs whitespace-nowrap">can-claw-light</code>,{" "}
            <code className="text-xs whitespace-nowrap">can-claw-silver</code>.
          </p>
        </div>
      </Section>

      <Section title="Avatari">
        <div className="flex items-end gap-3">
          <Avatar name="Marko Petrović" size="sm" />
          <Avatar name="Luka" size="md" />
          <Avatar name="Nikola Ilić" size="lg" src="/icons/icon-192.png" />
          <Avatar name="Stefan" size="xl" />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar name="Marko Petrović" size="lg" highlight="mvp" />
            <span className="text-xs text-fg-muted">MVP</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Avatar name="Luka Jovanović" size="lg" highlight="feeder" />
            <span className="text-xs text-fg-muted">Feeder</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Avatar name="Nikola Ilić" size="lg" highlight="collector" />
            <span className="text-xs text-fg-muted">Kolekcionar</span>
          </div>
        </div>
      </Section>

      <Section title="Kartice">
        <Card as="article" padding="none">
          <div className="flex items-center gap-3 p-3">
            <Avatar name="Marko Petrović" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Marko</p>
              <p className="text-xs text-fg-muted">pre 2 h · Trening u teretani</p>
            </div>
            <Badge tone="pending">Na čekanju</Badge>
          </div>
          <div className="flex aspect-[4/5] items-center justify-center bg-raised text-sm text-fg-muted">
            Slika
          </div>
          <p className="p-3 text-sm text-fg">Noge danas. Sutra ne mogu da hodam.</p>
        </Card>

        <Card>
          <p className="font-semibold text-fg">Obična kartica</p>
          <p className="mt-1 text-sm text-fg-muted">Za većinu sadržaja: lista taskova, objava, profil.</p>
          <Card variant="inset" padding="sm" className="mt-3">
            <p className="text-sm text-fg-muted">Inset: tiša kutija unutar kartice.</p>
          </Card>
        </Card>

        <Card variant="framed">
          <div className="flex items-center gap-4">
            <Avatar name="Marko Petrović" size="lg" highlight="mvp" />
            <div>
              <p className="font-display text-lg font-bold text-gold-200">MVP nedelje</p>
              <p className="text-sm text-fg-muted">Marko · 340 poena</p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Boss i progres">
        <Card variant="framed">
          <BossDemo />
        </Card>
        <ProgressBar label="Taskovi ove nedelje" value={7} max={12} showValue />
        <ProgressBar label="Do Gold I" value={64} max={100} tone="gold" showValue />
        <ProgressBar label="Legit glasovi" value={2} max={2} tone="success" size="sm" />
      </Section>

      <Section title="Forme">
        <Input label="Nadimak" placeholder="npr. Faker iz kraja" hint="Vide ga svi u feedu." />
        <Input label="Poeni" type="number" defaultValue={0} error="Task mora da nosi bar 1 poen." />
        <Textarea label="Opis taska" placeholder="Šta tačno treba da se uradi?" />
        <Card>
          <TaskListDemo />
        </Card>
      </Section>

      <Section title="Sheet">
        <SheetDemo />
      </Section>

      <Section title="Prazno i učitavanje">
        <EmptyState
          title="Još nema objava"
          description="Završi task sa slikom i biće prvi u feedu."
          action={<Button variant="secondary">Otvori taskove</Button>}
        />
        <div className="flex items-center gap-3">
          <Skeleton rounded="full" className="size-10" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <Skeleton rounded="lg" className="aspect-[4/5] w-full" />
      </Section>
    </div>
  );
}

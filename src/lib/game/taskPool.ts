// Team tasks that fill a week up when champ select didn't approve enough (fillTasks() in champSelect.ts).
// Pure data, no DB or UI imports. The same ideas as the dev seed (scripts/seed-dev.mjs), team tasks only:
// a filled-in task has no proposer, so nobody would be the obvious owner of a solo one.
// Ordered so that taking them one after another mixes the categories. Points must be valid proposal points.

import type { TaskCategory } from "./titles";

export type PoolTask = {
  title: string;
  type: "check" | "proof";
  points: number;
  category: TaskCategory;
};

export const FILL_TASK_POOL: readonly PoolTask[] = [
  { title: "Prošetaj 10.000 koraka u jednom danu", type: "check", points: 20, category: "gym" },
  { title: "Popij prvu kafu pre 9h", type: "check", points: 10, category: "caffeine" },
  { title: "Napravi doručak umesto pekare", type: "check", points: 15, category: "chef" },
  { title: "Pročitaj 30 strana knjige", type: "check", points: 15, category: "grind" },
  { title: "Ceo dan bez društvenih mreža", type: "check", points: 15, category: "random" },
  { title: "Uradi 50 sklekova u jednom danu", type: "check", points: 15, category: "gym" },
  { title: "Probaj ukus Monstera koji nisi pio", type: "check", points: 10, category: "caffeine" },
  { title: "Spremi obrok za sutra", type: "check", points: 20, category: "chef" },
  { title: "Uči 2 sata bez telefona", type: "check", points: 20, category: "grind" },
  { title: "Nauči jednu rečenicu na novom jeziku", type: "check", points: 10, category: "random" },
  { title: "Odradi 100 čučnjeva", type: "check", points: 15, category: "gym" },
  { title: "Izdrži jedan dan bez kafe", type: "check", points: 20, category: "caffeine" },
  { title: "Skuvaj ručak od nule", type: "proof", points: 30, category: "chef" },
  { title: "Završi zadatak koji odlažeš", type: "proof", points: 25, category: "grind" },
  { title: "Slikaj najčudniju stvar koju vidiš danas", type: "proof", points: 20, category: "random" },
  { title: "Odradi trening u teretani", type: "proof", points: 25, category: "gym" },
  { title: "Popij Monster pre treninga", type: "proof", points: 10, category: "caffeine" },
];

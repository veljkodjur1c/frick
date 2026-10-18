// Team tasks that fill a week up when champ select didn't approve enough (fillTasks() in champSelect.ts).
// Pure data, no DB or UI imports. Team tasks only: a filled-in task has no proposer, so nobody would be the obvious
// owner of a solo one. Mostly Gymbro and Caffeine addict (the group's focus), a few of the other categories so their
// titles stay reachable. Ordered so that any run of tasks taken one after another is mostly gym and caffeine.
// Points must be valid proposal points (5-50, steps of 5).

import type { TaskCategory } from "./titles";

export type PoolTask = {
  title: string;
  type: "check" | "proof";
  points: number;
  category: TaskCategory;
};

export const FILL_TASK_POOL: readonly PoolTask[] = [
  { title: "Istrči 5 km ispod 30 minuta", type: "proof", points: 40, category: "gym" },
  { title: "Probaj ukus Monstera koji nikad nisi pio", type: "proof", points: 15, category: "caffeine" },
  { title: "Odradi 500 sklekova u toku dana", type: "check", points: 45, category: "gym" },
  { title: "Odradi 3 sata učenja ili rada bez telefona", type: "check", points: 25, category: "grind" },
  { title: "Izdrži ceo dan bez kafe i energetskog pića", type: "check", points: 30, category: "caffeine" },
  { title: "Odradi trening nogu, bez preskakanja", type: "proof", points: 30, category: "gym" },
  { title: "Popij pre-workout pa odradi trening", type: "proof", points: 20, category: "caffeine" },
  { title: "Obori lični rekord na benchu, čučnju ili mrtvom dizanju", type: "proof", points: 40, category: "gym" },
  { title: "Skuvaj obrok sa bar 40 g proteina", type: "proof", points: 25, category: "chef" },
  { title: "Popij kafu u kafiću u kom nikad nisi bio", type: "proof", points: 15, category: "caffeine" },
  { title: "Napravi 15.000 koraka u jednom danu", type: "proof", points: 25, category: "gym" },
  { title: "Popij Monster sa bar dvojicom iz ekipe", type: "proof", points: 25, category: "caffeine" },
  { title: "Odradi 50 zgibova u toku dana", type: "check", points: 30, category: "gym" },
  { title: "Odigraj partiju LoL-a sa šampionom kog nikad nisi igrao", type: "proof", points: 20, category: "random" },
  { title: "Drži plank 3 minuta u komadu", type: "check", points: 20, category: "gym" },
  { title: "Odradi 5 treninga u teretani ove nedelje", type: "proof", points: 50, category: "gym" },
  { title: "Popij prvu kafu pre 8h radnim danom", type: "check", points: 10, category: "caffeine" },
  { title: "Istuširaj se hladnom vodom posle treninga", type: "check", points: 15, category: "gym" },
  {
    title: "Ceo dan manje od pola sata TikToka i Instagrama ukupno (skrinšot vremena ekrana)",
    type: "proof",
    points: 25,
    category: "random",
  },
  { title: "Odradi trening u 7h ujutru ili ranije", type: "proof", points: 35, category: "gym" },
  { title: "Probaj energetsko piće koje nije Monster i oceni ga", type: "proof", points: 10, category: "caffeine" },
  { title: "Odradi 45 minuta kardija u komadu", type: "proof", points: 30, category: "gym" },
  { title: "Pomešaj dva ukusa Monstera u jednu čašu", type: "proof", points: 15, category: "caffeine" },
  { title: "Odradi 200 čučnjeva u toku dana", type: "check", points: 25, category: "gym" },
  { title: "Popij kafu uživo sa nekim iz ekipe", type: "proof", points: 15, category: "caffeine" },
  { title: "Popij 3 litra vode u jednom danu", type: "check", points: 15, category: "gym" },
];

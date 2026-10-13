// Dev seed for the hosted Supabase project: the current week, its boss and a set of tasks in every category.
//
//   node --env-file=.env.local scripts/seed-dev.mjs           # dry run: prints the plan, writes nothing
//   node --env-file=.env.local scripts/seed-dev.mjs --yes     # writes
//   node --env-file=.env.local scripts/seed-dev.mjs --yes --reset
//                                                             # deletes this week's tasks (and their completions) first
//   node --env-file=.env.local scripts/seed-dev.mjs --yes --titles-for <display name>
//                                                             # also ticks DEMO_TITLE_CATEGORIES tasks for that player
//
// Idempotent: the week and boss are upserted. Tasks are matched by title: missing ones are added and existing ones
// get the category from TASKS. Uses the service role key (bypasses RLS). Never touches profiles, votes or users;
// writes completions only with --titles-for (check tasks, so the player can untick them in /tasks).
// Plain .mjs on purpose: it can't import src/ code, which is "server-only".

import { createClient } from "@supabase/supabase-js";

const TIMEZONE = "Europe/Belgrade";
const BOSS = { name: "Baron Nashor", hp: 500 };
// Object in the public boss-images bucket (migration 20261013114549_boss_images.sql), uploaded once by hand.
const BOSS_IMAGE = "baron-nashor.jpg";

/** @type {{ title: string, type: "check" | "proof", scope: "team" | "solo", points: number, category: "caffeine" | "gym" | "grind" | "chef" | "random" }[]} */
const TASKS = [
  // Gymbro
  { title: "Prošetaj 10.000 koraka u jednom danu", type: "check", scope: "team", points: 20, category: "gym" },
  { title: "Uradi 50 sklekova u jednom danu", type: "check", scope: "team", points: 15, category: "gym" },
  { title: "Odradi 100 čučnjeva", type: "check", scope: "team", points: 15, category: "gym" },
  { title: "Odradi trening u teretani", type: "proof", scope: "team", points: 25, category: "gym" },
  { title: "Istrči 5 km", type: "proof", scope: "solo", points: 50, category: "gym" },
  // Caffeine addict
  { title: "Popij prvu kafu pre 9h", type: "check", scope: "team", points: 10, category: "caffeine" },
  { title: "Probaj ukus Monstera koji nisi pio", type: "check", scope: "team", points: 10, category: "caffeine" },
  { title: "Izdrži jedan dan bez kafe", type: "check", scope: "team", points: 20, category: "caffeine" },
  { title: "Popij Monster pre treninga", type: "proof", scope: "team", points: 10, category: "caffeine" },
  { title: "Skuvaj kafu u džezvi", type: "proof", scope: "solo", points: 15, category: "caffeine" },
  // Masterchef
  { title: "Napravi doručak umesto pekare", type: "check", scope: "team", points: 15, category: "chef" },
  { title: "Spremi obrok za sutra", type: "check", scope: "team", points: 20, category: "chef" },
  { title: "Skuvaj ručak od nule", type: "proof", scope: "team", points: 30, category: "chef" },
  { title: "Ispeci nešto slatko", type: "proof", scope: "solo", points: 40, category: "chef" },
  // Grinder
  { title: "Pročitaj 30 strana knjige", type: "check", scope: "team", points: 15, category: "grind" },
  { title: "Uči 2 sata bez telefona", type: "check", scope: "team", points: 20, category: "grind" },
  { title: "Završi zadatak koji odlažeš", type: "proof", scope: "team", points: 25, category: "grind" },
  { title: "Završi domaći do srede", type: "check", scope: "solo", points: 20, category: "grind" },
  // Randomac
  { title: "Ceo dan bez društvenih mreža", type: "check", scope: "team", points: 15, category: "random" },
  { title: "Nauči jednu rečenicu na novom jeziku", type: "check", scope: "team", points: 10, category: "random" },
  { title: "Slikaj najčudniju stvar koju vidiš danas", type: "proof", scope: "team", points: 20, category: "random" },
  { title: "Javi se baki ili deki", type: "check", scope: "solo", points: 10, category: "random" },
  { title: "Sredi sobu", type: "proof", scope: "solo", points: 35, category: "random" },
];

// --titles-for ticks every team check task of these categories: 3 each, TITLE_MIN_TASKS in src/lib/game/config.ts.
const DEMO_TITLE_CATEGORIES = ["gym", "caffeine"];

// Duplicated from weekStartOf() in src/lib/game/week.ts; keep the two in sync.
function currentWeekStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  const day = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  const isoDow = day.getUTCDay() || 7;
  return new Date(day.getTime() - (isoDow - 1) * 86_400_000).toISOString().slice(0, 10);
}

/** Throws on a Supabase error, returns data otherwise. */
function unwrap(label, { data, error }) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

/** The value after `flag` in argv, or undefined. Exits when the flag is there without a value. */
function flagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} needs a value, e.g. ${flag} "Velja"`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const argv = process.argv.slice(2);
  const confirmed = argv.includes("--yes");
  const reset = argv.includes("--reset");
  const titlesFor = flagValue(argv, "--titles-for");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local and run:\n" +
        "  node --env-file=.env.local scripts/seed-dev.mjs",
    );
    process.exit(1);
  }

  const demoTasks = TASKS.filter(
    (t) => t.type === "check" && t.scope === "team" && DEMO_TITLE_CATEGORIES.includes(t.category),
  );
  const startsOn = currentWeekStart();
  const teamCount = TASKS.filter((t) => t.scope === "team").length;
  console.log(`Supabase project: ${url}`);
  console.log(`Week: ${startsOn} (status active)`);
  console.log(`Boss: ${BOSS.name}, ${BOSS.hp} HP, image boss-images/${BOSS_IMAGE}`);
  console.log(
    `Tasks: ${TASKS.length} (${teamCount} team, ${TASKS.length - teamCount} solo, solo ones go to existing profiles)` +
      (reset
        ? ", after deleting this week's tasks and their completions"
        : ", missing ones added, existing ones (same title) get their category"),
  );
  if (titlesFor) {
    console.log(`Titles demo: "${titlesFor}" completes ${demoTasks.length} check tasks (${DEMO_TITLE_CATEGORIES.join(", ")})`);
  }

  if (!confirmed) {
    console.log("\nDry run, nothing written. Run again with --yes to write.");
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const week = unwrap(
    "Upsert week",
    await supabase
      .from("weeks")
      .upsert({ starts_on: startsOn, status: "active" }, { onConflict: "starts_on" })
      .select("id, starts_on, ends_on, status")
      .single(),
  );
  console.log(`\n✓ Week ${week.starts_on} -> ${week.ends_on} (${week.status})`);

  unwrap(
    "Upsert boss",
    await supabase
      .from("bosses")
      .upsert(
        { week_id: week.id, ...BOSS, image_url: `${url}/storage/v1/object/public/boss-images/${BOSS_IMAGE}` },
        { onConflict: "week_id", ignoreDuplicates: true },
      ),
  );
  const boss = unwrap(
    "Read boss",
    await supabase.from("bosses").select("name, hp").eq("week_id", week.id).single(),
  );
  console.log(`✓ Boss ${boss.name}, ${boss.hp} HP`);

  if (reset) {
    const deleted = unwrap(
      "Delete tasks",
      await supabase.from("tasks").delete().eq("week_id", week.id).select("id"),
    );
    console.log(`✓ Deleted ${deleted.length} task(s) and their completions`);
  }

  const profiles = unwrap(
    "Read profiles",
    await supabase.from("profiles").select("id, display_name").order("created_at"),
  );
  if (profiles.length === 0) {
    console.warn("! No profiles yet, skipping solo tasks. Sign up in the app, then run with --yes again.");
  }

  const existing = unwrap(
    "Read tasks",
    await supabase.from("tasks").select("id, title, category").eq("week_id", week.id),
  );
  const existingByTitle = new Map(existing.map((t) => [t.title, t]));

  let soloIndex = 0;
  const rows = [];
  for (const task of TASKS) {
    const found = existingByTitle.get(task.title);
    if (found) {
      if (found.category !== task.category) {
        unwrap(
          `Set category of "${task.title}"`,
          await supabase.from("tasks").update({ category: task.category }).eq("id", found.id),
        );
        console.log(`✓ [${task.category}] ${task.title} (category set)`);
      }
    } else if (task.scope === "team") {
      rows.push({ week_id: week.id, ...task, assignee_id: null });
    } else if (profiles.length > 0) {
      const assignee = profiles[soloIndex++ % profiles.length];
      rows.push({ week_id: week.id, ...task, assignee_id: assignee.id });
    }
  }

  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  if (rows.length === 0) {
    console.log("• No new tasks, the week already has all of them.");
  } else {
    const inserted = unwrap(
      "Insert tasks",
      await supabase.from("tasks").insert(rows).select("title, scope, type, points, category, assignee_id"),
    );
    for (const t of inserted) {
      const who = t.assignee_id ? ` -> ${names.get(t.assignee_id)}` : "";
      console.log(`✓ [${t.category}] [${t.scope}/${t.type}] ${t.title} (${t.points})${who}`);
    }
  }

  if (titlesFor) {
    await seedDemoTitles(supabase, week.id, profiles, titlesFor, demoTasks);
  }
}

/** Ticks demoTasks for one player, so they hold the DEMO_TITLE_CATEGORIES titles on /profile and in the feed. */
async function seedDemoTitles(supabase, weekId, profiles, displayName, demoTasks) {
  const player = profiles.find((p) => p.display_name.toLowerCase() === displayName.toLowerCase());
  if (!player) {
    throw new Error(
      `No profile named "${displayName}". Profiles: ${profiles.map((p) => p.display_name).join(", ") || "none"}`,
    );
  }

  const tasks = unwrap(
    "Read demo tasks",
    await supabase
      .from("tasks")
      .select("id, title")
      .eq("week_id", weekId)
      .in(
        "title",
        demoTasks.map((t) => t.title),
      ),
  );
  // The completions_before_insert trigger approves check tasks. Already ticked ones are kept as they are.
  unwrap(
    "Insert demo completions",
    await supabase
      .from("completions")
      .upsert(
        tasks.map((t) => ({ task_id: t.id, user_id: player.id })),
        { onConflict: "task_id,user_id", ignoreDuplicates: true },
      ),
  );
  for (const t of tasks) {
    console.log(`✓ ${player.display_name} completed: ${t.title}`);
  }
  console.log(`  Untick them in /tasks to undo. Until then they count toward the boss and this week's LP.`);
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

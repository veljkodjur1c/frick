// Dev seed for the hosted Supabase project: the current week, its boss and a set of tasks.
//
//   node --env-file=.env.local scripts/seed-dev.mjs           # dry run: prints the plan, writes nothing
//   node --env-file=.env.local scripts/seed-dev.mjs --yes     # writes
//   node --env-file=.env.local scripts/seed-dev.mjs --yes --reset
//                                                             # deletes this week's tasks (and their completions) first
//
// Idempotent: the week and boss are upserted, tasks are skipped if the week already has some.
// Uses the service role key (bypasses RLS). Never touches profiles, completions, votes or users.
// Plain .mjs on purpose: it can't import src/ code, which is "server-only".

import { createClient } from "@supabase/supabase-js";

const TIMEZONE = "Europe/Belgrade";
const BOSS = { name: "Baron Nashor", hp: 500 };

/** @type {{ title: string, type: "check" | "proof", scope: "team" | "solo", points: number }[]} */
const TASKS = [
  { title: "Prošetaj 10.000 koraka u jednom danu", type: "check", scope: "team", points: 20 },
  { title: "Pročitaj 30 strana knjige", type: "check", scope: "team", points: 15 },
  { title: "Skuvaj ručak od nule", type: "proof", scope: "team", points: 30 },
  { title: "Odradi trening u teretani", type: "proof", scope: "team", points: 25 },
  { title: "Javi se baki ili deki", type: "check", scope: "solo", points: 10 },
  { title: "Završi domaći do srede", type: "check", scope: "solo", points: 20 },
  { title: "Sredi sobu", type: "proof", scope: "solo", points: 35 },
  { title: "Istrči 5 km", type: "proof", scope: "solo", points: 50 },
];

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

async function main() {
  const args = new Set(process.argv.slice(2));
  const confirmed = args.has("--yes");
  const reset = args.has("--reset");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local and run:\n" +
        "  node --env-file=.env.local scripts/seed-dev.mjs",
    );
    process.exit(1);
  }

  const startsOn = currentWeekStart();
  const teamCount = TASKS.filter((t) => t.scope === "team").length;
  console.log(`Supabase project: ${url}`);
  console.log(`Week: ${startsOn} (status active)`);
  console.log(`Boss: ${BOSS.name}, ${BOSS.hp} HP`);
  console.log(
    `Tasks: ${TASKS.length} (${teamCount} team, ${TASKS.length - teamCount} solo, solo ones go to existing profiles)` +
      (reset ? ", after deleting this week's tasks and their completions" : ", skipped if the week already has tasks"),
  );

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
      .upsert({ week_id: week.id, ...BOSS }, { onConflict: "week_id", ignoreDuplicates: true }),
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

  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("week_id", week.id);
  if (countError) {
    throw new Error(`Count tasks: ${countError.message}`);
  }
  if (count) {
    console.log(`• Week already has ${count} task(s), skipping. Use --reset to recreate them.`);
    return;
  }

  const profiles = unwrap(
    "Read profiles",
    await supabase.from("profiles").select("id, display_name").order("created_at"),
  );
  if (profiles.length === 0) {
    console.warn("! No profiles yet, skipping solo tasks. Sign up in the app, then run with --yes --reset.");
  }

  let soloIndex = 0;
  const rows = [];
  for (const task of TASKS) {
    if (task.scope === "team") {
      rows.push({ week_id: week.id, ...task, assignee_id: null });
    } else if (profiles.length > 0) {
      const assignee = profiles[soloIndex++ % profiles.length];
      rows.push({ week_id: week.id, ...task, assignee_id: assignee.id });
    }
  }

  const inserted = unwrap(
    "Insert tasks",
    await supabase.from("tasks").insert(rows).select("title, scope, type, points, assignee_id"),
  );
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  for (const t of inserted) {
    const who = t.assignee_id ? ` -> ${names.get(t.assignee_id)}` : "";
    console.log(`✓ [${t.scope}/${t.type}] ${t.title} (${t.points})${who}`);
  }
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

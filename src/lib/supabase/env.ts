// Public Supabase config, safe for the browser. Each variable must be read as a literal
// `process.env.NEXT_PUBLIC_*` so Next.js can inline it into the client bundle.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env variable ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

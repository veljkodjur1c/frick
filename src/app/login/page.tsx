import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { AuthForm } from "@/features/auth/AuthForm";
import { safeNextPath } from "@/lib/redirect";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PageHeader title="Nexus" subtitle="Prijavi se da vidiš taskove, bossa i ekipu." />
      {/* searchParams are request data, so with Cache Components they are read behind a boundary. */}
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <AuthForm next={safeNextPath(next) ?? "/feed"} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-[4.5rem] w-full" />
      <Skeleton className="h-[4.5rem] w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

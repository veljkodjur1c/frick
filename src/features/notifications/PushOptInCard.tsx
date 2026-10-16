"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { savePushSubscription } from "./actions";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** localStorage: the player tapped "Ne sada" on this phone. */
const DISMISSED_KEY = "frick:push-card-dismissed";
/** sessionStorage: this phone's subscription was sent to the server in this session. */
const SYNCED_KEY = "frick:push-synced";

const ERROR = "Obaveštenja nisu uključena. Pokušaj ponovo.";

// offer: ask to turn them on. install: iPhone in Safari, where push works only from the home screen app.
// blocked: the phone said no before, only its settings can change that. done: just turned on.
// hidden: on already, "Ne sada" tapped, not supported or not set up.
type View = "hidden" | "offer" | "install" | "blocked" | "done";

/**
 * Card at the top of the feed that turns on push notifications for this phone (new posts, proofs to vote on,
 * comments on your posts). Renders nothing on the server; decides in the browser whether to show itself.
 */
export function PushOptInCard({ className }: { className?: string }) {
  const [view, setView] = useState<View>("hidden");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void initialView().then((next) => {
      if (!cancelled) setView(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        // Ask straight from the tap: an iPhone only shows the prompt for a user action.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          // "denied": only the phone's settings can change it now. "default": the prompt was closed, try again.
          if (permission === "denied") setView("blocked");
          else setError("Obaveštenja nisu uključena. Dozvoli ih kad telefon pita.");
          return;
        }
        // Registered here too, so it also works in development (ServiceWorkerRegister only runs in production).
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(PUBLIC_KEY!),
          }));
        const message = await savePushSubscription(subscription.toJSON());
        if (message) {
          setError(message);
          return;
        }
        store("session", SYNCED_KEY);
        setView("done");
      } catch (caught) {
        console.error("PushOptInCard: turning notifications on failed", caught);
        setError(ERROR);
      }
    });
  }

  function dismiss() {
    store("local", DISMISSED_KEY);
    setView("hidden");
  }

  if (view === "hidden") return null;

  if (view === "done") {
    return (
      <Card padding="sm" role="status" className={className}>
        <p className="text-sm text-fg-muted">
          Obaveštenja su uključena. Stižu ti nove objave, dokazi za glasanje i komentari na tvoje objave.
        </p>
      </Card>
    );
  }

  if (view === "install" || view === "blocked") {
    return (
      <Card className={cn("flex flex-col gap-3", className)}>
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-fg">
            {view === "install" ? "Obaveštenja na iPhone-u" : "Obaveštenja su blokirana"}
          </p>
          <p className="text-sm text-fg-muted">
            {view === "install"
              ? "Stižu samo kad je FRICK na početnom ekranu: Podeli, pa Dodaj na početni ekran. Onda otvori FRICK odatle i uključi ih."
              : "Telefon ih je odbio za FRICK. Dozvoli ih u podešavanjima telefona, pa se vrati ovde da ih uključiš."}
          </p>
        </div>
        <Button variant="ghost" onClick={dismiss} className="self-end">
          U redu
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-fg">Obaveštenja</p>
        <p className="text-sm text-fg-muted">
          Javi mi kad neko objavi sliku, pošalje dokaz za glasanje ili komentariše moju objavu.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={pending} onClick={enable} className="flex-1">
          Uključi obaveštenja
        </Button>
        <Button variant="ghost" onClick={dismiss} disabled={pending}>
          Ne sada
        </Button>
      </div>
    </Card>
  );
}

/** What the card shows on this phone. */
async function initialView(): Promise<View> {
  if (!PUBLIC_KEY || read("local", DISMISSED_KEY)) return "hidden";

  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) {
    // iPhone Safari has navigator.standalone; it is false outside the home screen app.
    const iosBrowser = (navigator as Navigator & { standalone?: boolean }).standalone === false;
    return iosBrowser ? "install" : "hidden";
  }
  if (Notification.permission === "denied") return "blocked";

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription || Notification.permission !== "granted") return "offer";
    // On already. Send it once per session anyway: the server may have dropped it, or another player used this phone.
    if (!read("session", SYNCED_KEY)) {
      const message = await savePushSubscription(subscription.toJSON());
      if (!message) store("session", SYNCED_KEY);
    }
    return "hidden";
  } catch (error) {
    console.error("PushOptInCard: reading the subscription failed", error);
    return "hidden";
  }
}

/** The VAPID public key (base64url) as bytes, the form every browser accepts for applicationServerKey. */
function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type StorageKind = "local" | "session";

// Browser storage can throw (private mode, blocked site data); the card then just shows again next time.
function read(kind: StorageKind, key: string): boolean {
  try {
    return (kind === "local" ? localStorage : sessionStorage).getItem(key) === "1";
  } catch {
    return false;
  }
}

function store(kind: StorageKind, key: string): void {
  try {
    (kind === "local" ? localStorage : sessionStorage).setItem(key, "1");
  } catch {
    // See read().
  }
}

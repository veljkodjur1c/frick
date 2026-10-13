"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BossHealthBar, Skeleton } from "@/components/ui";

type AnimatedBossBarProps = {
  bossId: string;
  name: string;
  hp: number;
  damage: number;
};

// localStorage is per device and may be blocked (private mode), so every access is wrapped.
function seenKey(bossId: string) {
  return `nexus:boss-seen-damage:${bossId}`;
}

function readSeenDamage(bossId: string): number | null {
  try {
    const value = Number(localStorage.getItem(seenKey(bossId)) ?? Number.NaN);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSeenDamage(bossId: string, damage: number) {
  try {
    localStorage.setItem(seenKey(bossId), String(damage));
  } catch {
    // Not saved: next visit simply shows the bar without the drop.
  }
}

const subscribeNever = () => () => {};

/**
 * BossHealthBar that starts at the damage this device saw last time and then drops to the
 * current value, so you see the hits the team landed since your last visit.
 * Rendered only in the browser, because the starting point comes from localStorage.
 */
export function AnimatedBossBar(props: AnimatedBossBarProps) {
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false);
  return inBrowser ? <BarFromLastVisit {...props} /> : <BossBarSkeleton />;
}

function BarFromLastVisit({ bossId, name, hp, damage }: AnimatedBossBarProps) {
  const [shown, setShown] = useState(() => {
    const seen = readSeenDamage(bossId);
    return seen !== null && seen < damage ? seen : damage;
  });

  useEffect(() => {
    writeSeenDamage(bossId, damage);
    if (shown === damage) return;
    // Let the old value paint first, then drop to the new one so the hit is visible.
    const timer = setTimeout(() => setShown(damage), 400);
    return () => clearTimeout(timer);
  }, [bossId, damage, shown]);

  return <BossHealthBar hp={hp} damage={shown} label={name} />;
}

export function BossBarSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-5 w-full" />
    </div>
  );
}

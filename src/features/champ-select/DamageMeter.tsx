"use client";

import { useState } from "react";
import { Badge, Button, Card, ProgressBar, Sheet, type BadgeTone, type ProgressTone } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { damageZone, type DamageRange, type DamageZone } from "@/lib/game/champSelect";
import { PLAYERS, PROPOSAL_APPROVALS_NEEDED } from "@/lib/game/config";

const ZONES: Record<DamageZone, { label: string; badge: BadgeTone; bar: ProgressTone }> = {
  low: { label: "Malo", badge: "pending", bar: "gold" },
  ok: { label: "Taman", badge: "success", bar: "success" },
  high: { label: "Previše", badge: "danger", bar: "danger" },
};

type DamageMeterProps = {
  /** Max damage of the proposals that pass right now. */
  damage: number;
  range: DamageRange;
  boss: { name: string; hp: number };
  teamCount: number;
  soloCount: number;
  /** Pool tasks that would be added at midnight if nothing changes (empty unless the damage is below the range). */
  fill: ReadonlyArray<{ title: string; points: number }>;
};

/**
 * How much the proposals that pass now could hit next week's boss, against the acceptable range.
 * A short status line in champ select; the details open in a sheet. Warns without a tap when it is too much.
 */
export function DamageMeter({ damage, range, boss, teamCount, soloCount, fill }: DamageMeterProps) {
  const [open, setOpen] = useState(false);
  const zone = damageZone(damage, range);
  const { label, badge, bar } = ZONES[zone];
  // Share of all tasks the team has to finish to kill the boss, at the top and the bottom of the range.
  const shareAtMax = Math.round((boss.hp / range.max) * 100);
  const shareAtMin = Math.round((boss.hp / range.min) * 100);
  const rangeText = `${formatNumber(range.min)}–${formatNumber(range.max)}`;

  return (
    <>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-fg-muted">Moguća šteta</p>
            <p className="text-fg tabular-nums">
              <span className="font-semibold">{formatNumber(damage)}</span>
              <span className="text-fg-muted"> / {rangeText}</span>
            </p>
          </div>
          <Badge tone={badge}>{label}</Badge>
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Detalji
          </Button>
        </div>
        {zone === "high" && (
          <p role="alert" className="text-sm text-danger">
            Prolazi previše taskova, pa će boss pasti prelako. Skinite Za glas sa nekih predloga.
          </p>
        )}
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="Moguća šteta">
        <div className="flex flex-col gap-4">
          <ProgressBar label="Do gornje granice" value={damage} max={range.max} tone={bar} showValue />

          <p className="text-sm text-fg-muted">
            Računa se samo ono što sada prolazi (bar {formatNumber(PROPOSAL_APPROVALS_NEEDED)} Za):{" "}
            {formatNumber(teamCount)} tim i {formatNumber(soloCount)} solo taskova. Tim task udara bossa jednom po
            igraču (poeni × {formatNumber(PLAYERS)}), solo jednom.
          </p>
          <p className="text-sm text-fg-muted">
            {boss.name} ima {formatNumber(boss.hp)} HP. Taman je od {rangeText}: tada tim mora da uradi otprilike{" "}
            {formatNumber(shareAtMax)}–{formatNumber(shareAtMin)}% svega da ga obori.
          </p>

          {zone === "ok" && <p className="text-sm text-success">U opsegu ste. Ovako može u ponoć.</p>}

          {zone === "high" && (
            <p className="text-sm text-danger">
              Preko {formatNumber(range.max)} boss pada prelako. Skinite Za glas sa nekih predloga dok ne padnete
              ispod {formatNumber(range.max)}. Nijedan task se ne skida sam.
            </p>
          )}

          {zone === "low" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-fg">
                Ispod {formatNumber(range.min)}: u ponoć se nedelja sama dopunjava tim taskovima iz bazena, bez
                glasanja.
              </p>
              {fill.length > 0 && (
                <>
                  <p className="text-sm text-fg-muted">Ako ostane ovako, dodaće se:</p>
                  <ul className="flex flex-col gap-1.5">
                    {fill.map((task) => (
                      <li key={task.title} className="flex items-center gap-3 text-sm text-fg">
                        <span className="min-w-0 flex-1">{task.title}</span>
                        <Badge tone="gold">+{formatNumber(task.points)}</Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

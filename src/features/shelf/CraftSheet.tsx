"use client";

import { useState, useTransition } from "react";
import { Button, Sheet } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { CAN_FLAVORS } from "@/lib/game/cans";
import { CAN_CRAFT_COST } from "@/lib/game/config";
import { craftCan } from "./actions";
import { MonsterCan } from "./MonsterCan";
import { RARITY_LABEL, RARITY_TEXT } from "./rarity";

/** "Spoji duplikate" on the viewer's shelf: spends CAN_CRAFT_COST duplicates and reveals the new can. */
export function CraftSheet({ spareCount }: { spareCount: number }) {
  const [open, setOpen] = useState(false);
  const [crafted, setCrafted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flavor = CAN_FLAVORS.find((f) => f.id === crafted);
  const enough = spareCount >= CAN_CRAFT_COST;

  function close() {
    setOpen(false);
    setCrafted(null);
    setError(null);
  }

  function craft() {
    setError(null);
    startTransition(async () => {
      const result = await craftCan();
      if (result.ok) setCrafted(result.flavor);
      else setError(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted tabular-nums">
          Duplikati: {formatNumber(spareCount)} od {formatNumber(CAN_CRAFT_COST)}
        </p>
        <Button variant="secondary" disabled={!enough} onClick={() => setOpen(true)}>
          Spoji duplikate
        </Button>
      </div>

      <Sheet
        open={open}
        onClose={close}
        title={flavor ? "Nova limenka" : "Spajanje"}
        footer={
          flavor ? (
            <Button size="lg" fullWidth onClick={close}>
              Stavi na policu
            </Button>
          ) : (
            <Button size="lg" fullWidth loading={pending} onClick={craft}>
              Spoji {formatNumber(CAN_CRAFT_COST)} duplikata
            </Button>
          )
        }
      >
        {flavor ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MonsterCan flavor={flavor.id} className="h-36 animate-can-reveal" />
            <p className="font-display text-xl font-semibold text-gold-200">{flavor.name}</p>
            <p className={cn("text-sm font-semibold", RARITY_TEXT[flavor.rarity])}>{RARITY_LABEL[flavor.rarity]}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-fg">
              {formatNumber(CAN_CRAFT_COST)} duplikata postaju jedna nova limenka, uvek ukus koji još nemaš.
            </p>
            <p className="text-sm text-fg-muted">
              Retke i legendarne i dalje padaju ređe. Poslednja limenka nekog ukusa se nikad ne troši.
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

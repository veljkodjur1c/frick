"use client";

import { useState, useTransition } from "react";
import { Button, Input, SegmentedControl, Sheet, Textarea } from "@/components/ui";
import type { TaskScope, TaskType } from "@/features/tasks/queries";
import { PROPOSAL_MAX_POINTS, PROPOSAL_MIN_POINTS } from "@/lib/game/config";
import { createProposal } from "./actions";
import { PROPOSAL_DESCRIPTION_MAX_LENGTH, PROPOSAL_TITLE_MAX_LENGTH } from "./constants";

const TYPES = [
  { value: "check", label: "Štikliranje" },
  { value: "proof", label: "Sa slikom" },
] as const;

const SCOPES = [
  { value: "team", label: "Ceo tim" },
  { value: "solo", label: "Samo ja" },
] as const;

/** "Predloži task" button and the sheet with the proposal form. */
export function NewProposalSheet() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("check");
  const [scope, setScope] = useState<TaskScope>("team");
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createProposal({ title, description, type, scope, points: Number(points) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      setType("check");
      setScope("team");
      setPoints("");
      setOpen(false);
    });
  }

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)}>
        Predloži task
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Novi predlog"
        footer={
          <Button size="lg" fullWidth loading={pending} disabled={!title.trim() || !points} onClick={submit}>
            Pošalji predlog
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Naziv"
            placeholder="npr. Istrči 5 km"
            value={title}
            maxLength={PROPOSAL_TITLE_MAX_LENGTH}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            label="Opis"
            hint="Nije obavezno"
            value={description}
            maxLength={PROPOSAL_DESCRIPTION_MAX_LENGTH}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Kako se završava</span>
            <SegmentedControl label="Kako se završava" options={TYPES} value={type} onChange={setType} fullWidth />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Za koga</span>
            <SegmentedControl label="Za koga" options={SCOPES} value={scope} onChange={setScope} fullWidth />
          </div>
          <Input
            label="Poeni"
            type="number"
            inputMode="numeric"
            min={PROPOSAL_MIN_POINTS}
            max={PROPOSAL_MAX_POINTS}
            hint={`Od ${PROPOSAL_MIN_POINTS} do ${PROPOSAL_MAX_POINTS}`}
            value={points}
            disabled={pending}
            onChange={(event) => setPoints(event.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}

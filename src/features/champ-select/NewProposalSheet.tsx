"use client";

import { useState, useTransition } from "react";
import { Button, Input, SegmentedControl, Sheet, Textarea } from "@/components/ui";
import type { TaskScope, TaskType } from "@/features/tasks/queries";
import { formatNumber } from "@/lib/format";
import { stepProposalPoints } from "@/lib/game/champSelect";
import {
  PROPOSAL_DEFAULT_POINTS,
  PROPOSAL_MAX_POINTS,
  PROPOSAL_MIN_POINTS,
  PROPOSAL_POINTS_STEP,
} from "@/lib/game/config";
import { CATEGORY_INFO, TASK_CATEGORIES, type TaskCategory } from "@/lib/game/titles";
import { createProposal } from "./actions";
import { PROPOSAL_DESCRIPTION_MAX_LENGTH, PROPOSAL_TITLE_MAX_LENGTH } from "./constants";
import type { ChampSelectPlayer } from "./queries";

const TYPES = [
  { value: "check", label: "Štikliranje" },
  { value: "proof", label: "Sa slikom" },
] as const;

const SCOPES = [
  { value: "team", label: "Ceo tim" },
  { value: "solo", label: "Jedan igrač" },
] as const;

const CATEGORIES = TASK_CATEGORIES.map((value) => ({ value, label: CATEGORY_INFO[value].title }));

/** "Predloži task" button and the sheet with the proposal form. `players` are who a solo task can be for. */
export function NewProposalSheet({ players }: { players: ChampSelectPlayer[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("check");
  const [scope, setScope] = useState<TaskScope>("team");
  // No default: a solo task for the wrong friend is easy to miss.
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [points, setPoints] = useState(PROPOSAL_DEFAULT_POINTS);
  // No default: the proposer has to think about which title the task counts toward.
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const playerOptions = players.map((p) => ({ value: p.id, label: p.isViewer ? `${p.displayName} (ti)` : p.displayName }));
  const needsAssignee = scope === "solo" && !assigneeId;

  function submit() {
    if (!category || needsAssignee) return;
    setError(null);
    startTransition(async () => {
      const result = await createProposal({ title, description, type, scope, points, category, assigneeId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      setType("check");
      setScope("team");
      setAssigneeId(null);
      setPoints(PROPOSAL_DEFAULT_POINTS);
      setCategory(null);
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
          <Button size="lg" fullWidth loading={pending} disabled={!title.trim() || !category || needsAssignee} onClick={submit}>
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
            <span className="text-sm font-medium text-fg">Kategorija</span>
            <SegmentedControl
              label="Kategorija"
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
              fullWidth
              columns={2}
            />
            <span className="text-sm text-fg-muted">
              {category ? CATEGORY_INFO[category].description : "Za koju titulu se task broji."}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Kako se završava</span>
            <SegmentedControl label="Kako se završava" options={TYPES} value={type} onChange={setType} fullWidth />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Za koga</span>
            <SegmentedControl label="Za koga" options={SCOPES} value={scope} onChange={setScope} fullWidth />
            {scope === "solo" && (
              <>
                <SegmentedControl
                  label="Igrač"
                  options={playerOptions}
                  value={assigneeId}
                  onChange={setAssigneeId}
                  fullWidth
                  columns={2}
                />
                <span className="text-sm text-fg-muted">Task dobija samo izabrani igrač.</span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="proposal-points-label" className="text-sm font-medium text-fg">
              Poeni
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                aria-label={`Manje poena (-${PROPOSAL_POINTS_STEP})`}
                disabled={pending || points <= PROPOSAL_MIN_POINTS}
                onClick={() => setPoints((current) => stepProposalPoints(current, -1))}
              >
                −
              </Button>
              <output
                aria-labelledby="proposal-points-label"
                aria-live="polite"
                className="flex-1 text-center font-display text-2xl text-gold-200 tabular-nums"
              >
                +{formatNumber(points)}
              </output>
              <Button
                variant="secondary"
                size="icon"
                aria-label={`Više poena (+${PROPOSAL_POINTS_STEP})`}
                disabled={pending || points >= PROPOSAL_MAX_POINTS}
                onClick={() => setPoints((current) => stepProposalPoints(current, 1))}
              >
                +
              </Button>
            </div>
            <span className="text-sm text-fg-muted">
              Od {formatNumber(PROPOSAL_MIN_POINTS)} do {formatNumber(PROPOSAL_MAX_POINTS)}, korak{" "}
              {formatNumber(PROPOSAL_POINTS_STEP)}. Tim task: svaki igrač koji ga uradi udara bossa ovoliko.
            </span>
          </div>

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

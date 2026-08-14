"use client";

import { useTransition } from "react";
import { updateStatus } from "@/app/boxes/recruitment/actions";
import { CANDIDATE_STATUS_LABELS, type CandidateStatus } from "@/lib/types";

export function CandidateStatusSelect({
  candidateId,
  status,
}: {
  candidateId: string;
  status: CandidateStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as CandidateStatus;
        startTransition(() => {
          updateStatus(candidateId, next);
        });
      }}
      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
    >
      {Object.entries(CANDIDATE_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  resumeId: string;
  disabled?: boolean;
};

export function ParseResumeButton({ resumeId, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onParse() {
    setPending(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/parse`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(body.error ?? "Could not parse resume");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" disabled={disabled || pending} onClick={onParse}>
      {pending ? "Parsing…" : "Parse with AI"}
    </Button>
  );
}

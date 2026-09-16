"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-16">
      <ErrorState
        title="Analysis unavailable"
        description="This view could not be rendered. Your workspace changes are safe in this browser. Try again, or return to the investigation center."
        onRetry={() => retry()}
        raw={[error.message, error.digest ? `digest: ${error.digest}` : ""].filter(Boolean).join("\n")}
      />
      <ButtonLink href="/overview" size="sm" variant="ghost" className="mt-4">
        Back to the investigation center
      </ButtonLink>
    </div>
  );
}

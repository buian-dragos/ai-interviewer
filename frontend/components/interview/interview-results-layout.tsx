import Link from "next/link";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatInterviewDate, type Interview } from "@/lib/interviews";

export const outerPageClassName = "flex flex-1 flex-col items-center p-6";
export const innerPageClassName = "flex w-full max-w-4xl flex-col";
export const sectionTitleClassName =
  "text-xl font-semibold tracking-tight text-balance text-pretty md:text-2xl";
export const sectionDescriptionClassName =
  "text-base text-muted-foreground md:text-lg";

export function InterviewResultsPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={outerPageClassName}>
      <div className={innerPageClassName}>{children}</div>
    </div>
  );
}

export function InterviewResultsSectionDivider() {
  return <Separator className="my-10" />;
}

export function InterviewResultsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h2 className={sectionTitleClassName}>{title}</h2>
        {description ? (
          <p className={sectionDescriptionClassName}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function InterviewResultsHeader({
  interview,
  title,
  actionLabel,
  actionHref,
}: {
  interview: Interview;
  title: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {title}
        </h1>
        <p className="text-base text-muted-foreground">
          Topic: {interview.category}
        </p>
        <p className="text-base text-muted-foreground">
          Started: {formatInterviewDate(interview.started_at)}
        </p>
        {interview.completed_at ? (
          <p className="text-base text-muted-foreground">
            Completed: {formatInterviewDate(interview.completed_at)}
          </p>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="shrink-0"
        nativeButton={false}
        render={<Link href={actionHref} />}
      >
        {actionLabel}
      </Button>
    </header>
  );
}

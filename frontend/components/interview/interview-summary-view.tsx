"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { SentimentOverview } from "@/components/interview/sentiment-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  formatInterviewDate,
  type InterviewSummaryResponse,
} from "@/lib/interviews";

type InterviewSummaryViewProps = {
  interviewId: string;
  initialData: InterviewSummaryResponse;
};

const outerPageClassName = "flex flex-1 flex-col items-center p-6";
const innerPageClassName = "flex w-full max-w-4xl flex-col";
const sectionTitleClassName =
  "text-xl font-semibold tracking-tight text-balance text-pretty md:text-2xl";
const themeTitleClassName =
  "text-lg font-semibold tracking-tight text-pretty md:text-xl";
const sectionDescriptionClassName =
  "text-base text-muted-foreground md:text-lg";

function SummaryPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={outerPageClassName}>
      <div className={innerPageClassName}>{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <Separator className="my-10" />;
}

function InsightColumn({
  title,
  items,
  idPrefix,
}: {
  title: string;
  items: string[];
  idPrefix: string;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-6">
      <h2 className={`${sectionTitleClassName} text-center`}>{title}</h2>
      <ul className="list-disc space-y-3 pl-3 text-sm leading-relaxed md:text-base">
        {items.map((item, index) => (
          <li key={`${idPrefix}-${index}`} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightsRow({
  highlights,
  strengths,
  growthAreas,
}: {
  highlights: string[];
  strengths: string[];
  growthAreas: string[];
}) {
  const columns = [
    highlights.length > 0
      ? { title: "Highlights", items: highlights, idPrefix: "highlight" }
      : null,
    strengths.length > 0
      ? { title: "Strengths", items: strengths, idPrefix: "strength" }
      : null,
    growthAreas.length > 0
      ? { title: "Growth Areas", items: growthAreas, idPrefix: "growth" }
      : null,
  ].filter((column) => column !== null);

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-stretch">
      {columns.map((column, index) => (
        <Fragment key={column.idPrefix}>
          {index > 0 ? (
            <Separator
              orientation="vertical"
              className="hidden md:mx-3 md:block"
            />
          ) : null}
          <InsightColumn
            title={column.title}
            items={column.items}
            idPrefix={column.idPrefix}
          />
        </Fragment>
      ))}
    </div>
  );
}

function SummarySection({
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

function SummaryPendingSkeleton() {
  return (
    <div className="space-y-10" aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 motion-reduce:animate-none" />
        <Skeleton className="h-4 w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
      </div>
      <Separator />
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 motion-reduce:animate-none" />
        <Skeleton className="h-5 w-2/3 motion-reduce:animate-none" />
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full rounded-xl motion-reduce:animate-none" />
          <Skeleton className="h-24 w-full rounded-xl motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export function InterviewSummaryView({
  interviewId,
  initialData,
}: InterviewSummaryViewProps) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (data.summary.status !== "pending") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const next = await api.getInterviewSummary(interviewId);
        setData(next);
        if (next.summary.status !== "pending") {
          window.clearInterval(intervalId);
        }
      } catch {
        // Keep polling on transient errors while generation runs.
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [data.summary.status, interviewId]);

  const { interview, summary } = data;

  if (summary.status === "pending") {
    return (
      <SummaryPageShell>
        <SummaryHeader interview={interview} />
        <SectionDivider />
        <p
          className="text-base text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Generating your interview summary…
        </p>
        <SummaryPendingSkeleton />
      </SummaryPageShell>
    );
  }

  if (summary.status === "failed") {
    return (
      <SummaryPageShell>
        <SummaryHeader interview={interview} />
        <SectionDivider />
        <SummarySection title="Summary Unavailable">
          <p className="text-base leading-relaxed text-muted-foreground">
            {summary.error ??
              "Something went wrong while generating your summary."}{" "}
            Refresh the page to try again.
          </p>
        </SummarySection>
      </SummaryPageShell>
    );
  }

  const themes = summary.themes ?? [];
  const highlights = summary.highlights ?? [];
  const strengths = summary.strengths ?? [];
  const growthAreas = summary.growth_areas ?? [];
  const topKeywords = summary.top_keywords ?? [];
  const allKeywords = summary.keywords ?? [];

  const sections: ReactNode[] = [];

  if (summary.summary) {
    sections.push(
      <SummarySection key="overview" title="Overview">
        <p className="text-base leading-relaxed break-words md:text-lg">
          {summary.summary}
        </p>
      </SummarySection>,
    );
  }

  if (themes.length > 0) {
    sections.push(
      <SummarySection
        key="themes"
        title="Themes"
        description="Patterns that emerged across your answers"
      >
        <div className="flex w-full flex-col gap-4">
          {themes.map((theme, index) => (
            <Card key={`${theme.title}-${index}`} className="w-full">
              <CardContent className="space-y-3">
                <h3 className={themeTitleClassName}>{theme.title}</h3>
                <p className="text-sm leading-relaxed break-words text-muted-foreground md:text-base">
                  {theme.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SummarySection>,
    );
  }

  if (
    summary.overall_sentiment_label != null &&
    summary.overall_sentiment_score != null
  ) {
    sections.push(
      <SummarySection
        key="sentiment"
        title="Overall Sentiment"
        description="Tone detected across your answers"
      >
        <SentimentOverview
          label={summary.overall_sentiment_label}
          score={summary.overall_sentiment_score}
          answersScored={summary.answers_scored ?? 0}
          answerSentiments={summary.answer_sentiments ?? []}
        />
      </SummarySection>,
    );
  }

  if (
    highlights.length > 0 ||
    strengths.length > 0 ||
    growthAreas.length > 0
  ) {
    sections.push(
      <InsightsRow
        key="insights"
        highlights={highlights}
        strengths={strengths}
        growthAreas={growthAreas}
      />,
    );
  }

  if (topKeywords.length > 0) {
    sections.push(
      <SummarySection
        key="keywords"
        title="Top Keywords"
        description="Most frequent terms extracted from your answers"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {topKeywords.map((keyword) => (
              <Badge
                key={keyword.term}
                variant="outline"
                className="h-8 px-3.5 py-1 text-sm md:text-base"
              >
                {keyword.term}
              </Badge>
            ))}
          </div>
          {allKeywords.length > topKeywords.length ? (
            <details>
              <summary className="cursor-pointer text-base text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                Show all keywords ({allKeywords.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {allKeywords.map((keyword) => (
                  <Badge
                    key={`all-${keyword.term}`}
                    variant="outline"
                    className="h-8 px-3.5 py-1 text-sm md:text-base"
                  >
                    {keyword.term}
                  </Badge>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </SummarySection>,
    );
  }

  return (
    <SummaryPageShell>
      <SummaryHeader interview={interview} />
      {sections.length > 0 ? (
        <>
          <SectionDivider />
          <div className="space-y-10">
            {sections.map((section, index) => (
              <div key={index}>
                {section}
                {index < sections.length - 1 ? <SectionDivider /> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </SummaryPageShell>
  );
}

function SummaryHeader({
  interview,
}: {
  interview: InterviewSummaryResponse["interview"];
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Interview Summary
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
        render={<Link href={`/interview/${interview.id}/transcript`} />}
      >
        View Transcript
      </Button>
    </header>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { INTERVIEW_CATEGORIES } from "@/lib/interview-categories";
import { cn } from "@/lib/utils";

export function CategoryPicker() {
  const router = useRouter();
  const [customTopic, setCustomTopic] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  async function startInterview(category: string) {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    try {
      const interview = await api.createInterview(category);
      router.push(`/interview/${interview.id}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not start interview. Please try again.";
      toast.error(message);
      setIsStarting(false);
    }
  }

  const startingLabel = "Preparing interview…";

  function handleCustomStart() {
    const topic = customTopic.trim();
    if (!topic) {
      toast.error("Enter a topic to start your interview.");
      return;
    }
    void startInterview(topic);
  }

  return (
    <div className="flex flex-col gap-14">
      {isStarting ? (
        <p className="text-center text-sm text-muted-foreground">{startingLabel}</p>
      ) : null}
      <div className="mx-auto flex w-full flex-wrap justify-center gap-4">
        {INTERVIEW_CATEGORIES.map((category) => {
          const Icon = category.icon;

          return (
            <Card
              key={category.slug}
              className={cn(
                "w-full max-w-xs sm:w-72",
                "cursor-pointer transition-colors hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isStarting && "pointer-events-none opacity-50",
              )}
              role="button"
              tabIndex={0}
              aria-disabled={isStarting}
              onClick={() => void startInterview(category.label)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void startInterview(category.label);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon />
                  <CardTitle className="text-base">{category.label}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <FieldGroup className="mx-auto w-full max-w-xl gap-4">
        <Field className="gap-4">
          <FieldLabel
            htmlFor="custom-topic"
            className="text-center text-base font-medium"
          >
            Or enter your own topic
          </FieldLabel>
          <div className="flex items-center gap-4">
            <Input
              id="custom-topic"
              className="h-10 min-w-0 flex-1 px-3 text-base"
              placeholder="e.g. Negotiation skills, startup fundraising…"
              value={customTopic}
              disabled={isStarting}
              onChange={(event) => setCustomTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCustomStart();
                }
              }}
            />
            <Button
              type="button"
              size="lg"
              disabled={!customTopic.trim() || isStarting}
              onClick={handleCustomStart}
              className="h-10 shrink-0 px-5"
            >
              {isStarting ? startingLabel : "Start"}
              {!isStarting ? <ArrowRightIcon data-icon="inline-end" /> : null}
            </Button>
          </div>
        </Field>
      </FieldGroup>
    </div>
  );
}

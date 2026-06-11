import { cookies } from "next/headers";

import { LogoutButton } from "@/components/auth/logout-button";
import { CategoryPicker } from "@/components/interview/category-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMeServer } from "@/lib/api";

export default async function HomePage() {
  const cookieStore = await cookies();
  const user = await getMeServer(cookieStore.getAll());

  return (
    <main className="flex flex-col items-center p-6">
      <div className="flex w-full max-w-4xl flex-col">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Interviewer</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email ?? "your account"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Practice interview questions on a topic you choose, with an AI
            interviewer that adapts to your answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each session focuses on one topic and walks you through{" "}
            <span className="font-medium text-foreground">five core questions</span>
            . Answer in your own words; there is no time pressure.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How follow-ups work</p>
            <p className="leading-relaxed">
              If the interviewer decides an answer needs more depth it may ask a follow-up before
              moving on. Follow-ups do not count toward the five main questions;
              they help you elaborate, similar to a real interview.
            </p>
          </div>
        </CardContent>
      </Card>
      <section className="mt-14 flex flex-col gap-10">
        <p className="text-center text-base font-medium text-foreground">
          Choose a topic and start when you are ready.
        </p>

        <CategoryPicker />
      </section>
      </div>
    </main>
  );
}

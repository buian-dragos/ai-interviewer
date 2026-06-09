import { cookies } from "next/headers";

import { LogoutButton } from "@/components/auth/logout-button";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Interviewer</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email ?? "your account"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Your dashboard will live here — past interviews, starting new ones,
            and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Authentication is set up. Next up: interview menu and session
            flows.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

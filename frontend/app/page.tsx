import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getApiUrl } from "@/lib/api";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) {
    return false;
  }

  try {
    const response = await fetch(`${getApiUrl()}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default async function RootPage() {
  if (await isAuthenticated()) {
    redirect("/home");
  }

  redirect("/login");
}

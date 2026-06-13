export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function isLocalApiUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/** Browser fetch base URL — proxied through Next.js in production for first-party cookies. */
export function getBrowserApiUrl(): string {
  if (isLocalApiUrl(PUBLIC_API_URL)) {
    return PUBLIC_API_URL;
  }
  return "/api";
}

/** Server-side fetch base URL — direct backend with cookies forwarded manually. */
export function getServerApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? PUBLIC_API_URL;
}

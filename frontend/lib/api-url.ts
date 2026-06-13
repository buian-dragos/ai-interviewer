export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getServerApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? PUBLIC_API_URL;
}

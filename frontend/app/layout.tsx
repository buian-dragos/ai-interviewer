import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "AI Interviewer",
  description: "Practice interviews powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${roboto.variable} ${robotoMono.variable} h-full min-h-svh antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-svh flex-col bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

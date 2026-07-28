import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ProfileProvider } from "@/components/ProfileContext";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HackerConnect",
  description: "Find your next teammates and events, grounded in real chemistry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ProfileProvider>
          <header className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold">
                  HackerConnect
                </Link>
                <nav className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                  <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">
                    Dashboard
                  </Link>
                  <Link href="/onboarding" className="hover:text-neutral-900 dark:hover:text-neutral-100">
                    Onboarding
                  </Link>
                </nav>
              </div>
              <ProfileSwitcher />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        </ProfileProvider>
      </body>
    </html>
  );
}

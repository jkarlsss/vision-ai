import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { editorPath, signInPath, signUpPath } from "@/lib/auth-routes";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vision AI",
  description:
    "A real-time collaborative system design workspace powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-full antialiased">
        <ClerkProvider
          appearance={clerkAppearance}
          signInFallbackRedirectUrl={editorPath}
          signInUrl={signInPath}
          signUpFallbackRedirectUrl={editorPath}
          signUpUrl={signUpPath}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

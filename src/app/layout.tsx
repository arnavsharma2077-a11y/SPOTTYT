import type { Metadata } from "next";

import NextAuthProvider from "@/components/NextAuthProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cross-Platform Music Blend",
  description: "Blend your music taste across Spotify and YouTube Music",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}

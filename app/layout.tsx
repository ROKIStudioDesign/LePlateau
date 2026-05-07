import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LePlateau — Virtual Office",
  description: "Espace de travail virtuel pour équipes hybrides",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

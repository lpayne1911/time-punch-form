import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velvet — Private Dating & Community",
  description:
    "A private, consent-first dating and community app for verified adults seeking intentional connection.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
